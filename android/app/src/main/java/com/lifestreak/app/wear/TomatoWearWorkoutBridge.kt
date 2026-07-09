package com.lifestreak.app.wear

import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import com.lifestreak.app.MainActivity
import org.json.JSONArray
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.nio.charset.StandardCharsets
import java.util.UUID

object TomatoWearWorkoutBridge {
    const val PATH_RUN_COMPLETE = "/tomato/workout/run/complete"
    private const val QUEUE_PREFS = "tomato_wear_workout_queue"
    private const val QUEUE_KEY = "pending_payloads"
    private const val MAX_PAYLOAD_BYTES = 512 * 1024
    private const val MAX_QUEUE_SIZE = 20
    private const val MAX_DRAIN_ATTEMPTS = 6
    private const val MAX_PERSISTED_ROUTE_POINTS = 2_161
    private val mainHandler: Handler by lazy { Handler(Looper.getMainLooper()) }
    private val volatilePayloadQueue = mutableListOf<JSONObject>()
    private var activityRef: WeakReference<MainActivity>? = null

    @JvmStatic
    fun registerActivity(activity: MainActivity) {
        activityRef = WeakReference(activity)
        drainPendingToWebView(activity, 900L)
    }

    @JvmStatic
    fun unregisterActivity(activity: MainActivity) {
        if (activityRef?.get() === activity) activityRef = null
    }

    @JvmStatic
    fun enqueueFromWear(context: android.content.Context, payloadBytes: ByteArray) {
        if (payloadBytes.isEmpty() || payloadBytes.size > MAX_PAYLOAD_BYTES) return
        val payload = String(payloadBytes, StandardCharsets.UTF_8)
        val id = stablePayloadId(payload)
        val queuedAt = System.currentTimeMillis()
        val volatileEntry = JSONObject()
            .put("id", id)
            .put("payload", payload)
            .put("queuedAt", queuedAt)
        val persistedEntry = JSONObject()
            .put("id", id)
            .put("payload", sanitizePayloadForPrefs(payload))
            .put("queuedAt", queuedAt)
        synchronized(this) {
            volatilePayloadQueue.removeAll { it.optString("id") == id }
            volatilePayloadQueue.add(volatileEntry)
            while (volatilePayloadQueue.size > MAX_QUEUE_SIZE) volatilePayloadQueue.removeAt(0)
            val queue = readQueue(context).filterNot { it.optString("id") == id }
            val next = (queue + persistedEntry).takeLast(MAX_QUEUE_SIZE)
            writeQueue(context, next)
        }
        activityRef?.get()?.let { drainPendingToWebView(it, 0L) }
    }

    @JvmStatic
    fun drainPendingToWebView(activity: MainActivity, delayMs: Long = 0L) {
        val runnable = Runnable { drainOne(activity, 0) }
        if (delayMs > 0L) mainHandler.postDelayed(runnable, delayMs) else mainHandler.post(runnable)
    }

    private fun drainOne(activity: MainActivity, attempt: Int) {
        val entry = synchronized(this) {
            volatilePayloadQueue.firstOrNull() ?: readQueue(activity).firstOrNull()
        } ?: return
        val entryId = entry.optString("id")
        val webView = activity.bridge?.webView
        if (webView == null) {
            retry(activity, attempt)
            return
        }
        val script = buildJavascript(entry.optString("payload"))
        webView.post {
            evaluateBridge(webView, script) { accepted ->
                if (accepted) {
                    synchronized(this) {
                        volatilePayloadQueue.removeAll { it.optString("id") == entryId }
                        val remaining = readQueue(activity).filterNot { it.optString("id") == entryId }
                        writeQueue(activity, remaining)
                    }
                    drainOne(activity, 0)
                } else {
                    retry(activity, attempt)
                }
            }
        }
    }

    private fun evaluateBridge(webView: WebView, script: String, callback: (Boolean) -> Unit) {
        webView.evaluateJavascript(script) { result ->
            callback(result?.contains("ACCEPTED") == true)
        }
    }

    private fun retry(activity: MainActivity, attempt: Int) {
        if (attempt >= MAX_DRAIN_ATTEMPTS) return
        val delayMs = 1_000L * (attempt + 1)
        mainHandler.postDelayed({ drainOne(activity, attempt + 1) }, delayMs)
    }

    private fun buildJavascript(payload: String): String {
        return """
            (function(){
              var bridge = window.__tomatoWearWorkoutBridge;
              if (!bridge || typeof bridge.saveFromNative !== 'function') return 'BRIDGE_NOT_READY';
              try {
                bridge.saveFromNative(${JSONObject.quote(payload)});
                return 'ACCEPTED';
              } catch (error) {
                return 'ERROR:' + (error && error.message ? error.message : String(error));
              }
            })()
        """.trimIndent()
    }

    private fun sanitizedQueueEntry(entry: JSONObject): JSONObject {
        return JSONObject()
            .put("id", entry.optString("id"))
            .put("payload", sanitizePayloadForPrefs(entry.optString("payload")))
            .put("queuedAt", entry.optLong("queuedAt", System.currentTimeMillis()))
    }

    private fun sanitizePayloadForPrefs(payload: String): String {
        return try {
            val json = JSONObject(payload)
            val startedAt = json.optLong("startedAt", 0L)
            val endedAt = json.optLong("endedAt", startedAt)
            val route = json.optJSONArray("route")
            val sanitizedRoute = sanitizeRouteForPrefs(route, startedAt, endedAt)
            val originalSummary = json.optJSONObject("routeSummary") ?: JSONObject()
            val pointCount = if (sanitizedRoute.length() > 0) {
                sanitizedRoute.length()
            } else {
                originalSummary.optInt("pointCount", 0)
            }
            val gapSummary = routeGapSummary(sanitizedRoute, originalSummary)
            val summary = JSONObject()
                .put(
                    "source",
                    originalSummary.optString(
                        "source",
                        if (pointCount > 0) "wear-gps-redacted" else "unavailable",
                    ),
                )
                .put("pointCount", pointCount)
                .put("segmentCount", gapSummary.segmentCount)
                .put("gapCount", gapSummary.gapCount)
                .put("interrupted", gapSummary.interrupted)
                .put("distanceKm", json.optDouble("distanceKm", originalSummary.optDouble("distanceKm", 0.0)))
                .put("durationSec", json.optLong("durationSec", originalSummary.optLong("durationSec", 0L)))
                .put("startedAt", json.optLong("startedAt", originalSummary.optLong("startedAt", 0L)))
                .put("endedAt", json.optLong("endedAt", originalSummary.optLong("endedAt", 0L)))
                .put("redacted", false)
            val safe = JSONObject()
                .put("type", json.optString("type", "running"))
                .put("source", json.optString("source", "wear"))
                .put("dateKey", json.optString("dateKey"))
                .put("startedAt", json.optLong("startedAt", originalSummary.optLong("startedAt", 0L)))
                .put("endedAt", json.optLong("endedAt", originalSummary.optLong("endedAt", 0L)))
                .put("durationSec", json.optLong("durationSec", originalSummary.optLong("durationSec", 0L)))
                .put("distanceKm", json.optDouble("distanceKm", originalSummary.optDouble("distanceKm", 0.0)))
                .put("route", sanitizedRoute)
                .put("samples10s", JSONArray())
                .put("routeSummary", summary)
            copyOptionalNumber(json, safe, "avgPaceSecPerKm")
            copyOptionalNumber(json, safe, "avgHeartRateBpm")
            copyOptionalNumber(json, safe, "maxHeartRateBpm")
            safe.toString()
        } catch (_: Exception) {
            JSONObject()
                .put("route", JSONArray())
                .put("samples10s", JSONArray())
                .put("routeSummary", JSONObject().put("redacted", true))
                .toString()
        }
    }

    internal fun sanitizePayloadForPrefsForTest(payload: String): String {
        return sanitizePayloadForPrefs(payload)
    }

    private fun sanitizeRouteForPrefs(route: JSONArray?, startedAt: Long, endedAt: Long): JSONArray {
        val sanitized = JSONArray()
        if (route == null) return sanitized
        if (endedAt <= startedAt) return sanitized
        val count = minOf(route.length(), MAX_PERSISTED_ROUTE_POINTS)
        for (index in 0 until count) {
            val point = route.optJSONObject(index) ?: continue
            val lat = point.optDouble("lat", Double.NaN)
            val lng = point.optDouble("lng", Double.NaN)
            if (!lat.isFinite() || !lng.isFinite() || lat !in -90.0..90.0 || lng !in -180.0..180.0) continue
            val timestampMs = point.optLong("timestampMs", 0L)
            if (timestampMs <= 0L) continue
            if (timestampMs !in startedAt..endedAt) continue
            val item = JSONObject()
                .put("timestampMs", timestampMs)
                .put("lat", roundTo(lat, 6))
                .put("lng", roundTo(lng, 6))
            val altitude = point.optDouble("altitude", Double.NaN)
            if (altitude.isFinite()) item.put("altitude", roundTo(altitude, 1))
            val bearing = point.optDouble("bearing", Double.NaN)
            if (bearing.isFinite()) item.put("bearing", roundTo(bearing, 1))
            if (point.has("segmentId") && !point.isNull("segmentId")) {
                item.put("segmentId", point.optInt("segmentId").coerceIn(0, MAX_PERSISTED_ROUTE_POINTS - 1))
            }
            if (point.optBoolean("gapBefore", false)) {
                item.put("gapBefore", true)
                item.put("gapReason", sanitizeGapReason(point.optString("gapReason", "watch-gap")))
            }
            sanitized.put(item)
        }
        return sanitized
    }

    private fun routeGapSummary(route: JSONArray, originalSummary: JSONObject): RouteGapSummary {
        if (route.length() == 0) {
            val gapCount = originalSummary.optInt("gapCount", 0).coerceAtLeast(0)
            val segmentCount = originalSummary.optInt(
                "segmentCount",
                if (gapCount > 0) gapCount + 1 else 0,
            ).coerceAtLeast(0)
            return RouteGapSummary(segmentCount, gapCount)
        }

        var gapCount = 0
        val segments = mutableSetOf<Int>()
        var previousSegmentId = 0
        for (index in 0 until route.length()) {
            val point = route.optJSONObject(index) ?: continue
            val segmentId = if (point.has("segmentId") && !point.isNull("segmentId")) {
                point.optInt("segmentId", previousSegmentId).coerceAtLeast(0)
            } else {
                previousSegmentId
            }
            segments.add(segmentId)
            if (index > 0 && (point.optBoolean("gapBefore", false) || segmentId != previousSegmentId)) {
                gapCount += 1
            }
            previousSegmentId = segmentId
        }
        return RouteGapSummary(
            segmentCount = maxOf(1, segments.size, gapCount + 1),
            gapCount = gapCount,
        )
    }

    private fun sanitizeGapReason(reason: String): String {
        val normalized = reason.lowercase().trim()
        return if (Regex("^[a-z0-9-]{1,40}$").matches(normalized)) normalized else "watch-gap"
    }

    private fun copyOptionalNumber(source: JSONObject, target: JSONObject, key: String) {
        if (!source.has(key) || source.isNull(key)) return
        val value = source.optDouble(key, Double.NaN)
        if (value.isFinite()) target.put(key, value)
    }

    private fun roundTo(value: Double, digits: Int): Double {
        val p = Math.pow(10.0, digits.toDouble())
        return kotlin.math.round(value * p) / p
    }

    private data class RouteGapSummary(
        val segmentCount: Int,
        val gapCount: Int,
    ) {
        val interrupted: Boolean = gapCount > 0
    }

    private fun readQueue(context: android.content.Context): List<JSONObject> {
        val prefs = context.getSharedPreferences(QUEUE_PREFS, android.content.Context.MODE_PRIVATE)
        val raw = prefs.getString(QUEUE_KEY, "[]") ?: "[]"
        val array = try {
            JSONArray(raw)
        } catch (_: Exception) {
            JSONArray()
        }
        return (0 until array.length()).mapNotNull { index ->
            array.optJSONObject(index)
        }.map { sanitizedQueueEntry(it) }
    }

    private fun writeQueue(context: android.content.Context, queue: List<JSONObject>) {
        val array = JSONArray()
        queue.takeLast(MAX_QUEUE_SIZE).forEach { array.put(sanitizedQueueEntry(it)) }
        context.getSharedPreferences(QUEUE_PREFS, android.content.Context.MODE_PRIVATE)
            .edit()
            .putString(QUEUE_KEY, array.toString())
            .apply()
    }

    private fun stablePayloadId(payload: String): String {
        return try {
            val json = JSONObject(payload)
            "${json.optLong("startedAt")}-${json.optLong("endedAt")}"
        } catch (_: Exception) {
            UUID.nameUUIDFromBytes(payload.toByteArray(StandardCharsets.UTF_8)).toString()
        }
    }
}


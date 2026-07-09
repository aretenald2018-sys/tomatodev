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
    private const val MAX_PAYLOAD_BYTES = 32 * 1024
    private const val MAX_QUEUE_SIZE = 20
    private const val MAX_DRAIN_ATTEMPTS = 6
    private val mainHandler = Handler(Looper.getMainLooper())
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
        val entry = JSONObject()
            .put("id", stablePayloadId(payload))
            .put("payload", payload)
            .put("queuedAt", System.currentTimeMillis())
        synchronized(this) {
            val queue = readQueue(context).filterNot { it.optString("id") == entry.optString("id") }
            val next = (queue + entry).takeLast(MAX_QUEUE_SIZE)
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
        val entry = synchronized(this) { readQueue(activity).firstOrNull() } ?: return
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
                        val remaining = readQueue(activity).filterNot { it.optString("id") == entry.optString("id") }
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
        }
    }

    private fun writeQueue(context: android.content.Context, queue: List<JSONObject>) {
        val array = JSONArray()
        queue.takeLast(MAX_QUEUE_SIZE).forEach { array.put(it) }
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


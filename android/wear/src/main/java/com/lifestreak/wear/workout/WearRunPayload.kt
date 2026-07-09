package com.lifestreak.wear.workout

import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import kotlin.math.round
import kotlin.math.roundToInt

enum class WearWorkoutType(val wireValue: String) {
    RUNNING("running"),
}

data class HeartRateSample(
    val timestampMs: Long,
    val bpm: Int,
)

data class WearRoutePoint(
    val timestampMs: Long,
    val lat: Double,
    val lng: Double,
    val altitude: Double? = null,
    val bearing: Double? = null,
)

data class WearRouteSummary(
    val source: String,
    val pointCount: Int,
    val distanceKm: Double,
    val durationSec: Long,
    val startedAtMs: Long,
    val endedAtMs: Long,
)

data class WearRunSession(
    val dateKey: String,
    val startedAtMs: Long,
    val endedAtMs: Long,
    val distanceMeters: Double,
    val heartRateSamples: List<HeartRateSample> = emptyList(),
    val routePoints: List<WearRoutePoint> = emptyList(),
) {
    fun toPayload(): Result<WearWorkoutPayload> = WearWorkoutPayload.fromSession(this)
}

data class WearRunSummary(
    val durationSec: Long,
    val distanceKm: Double,
    val avgPaceSecPerKm: Int?,
    val avgHeartRateBpm: Int?,
    val maxHeartRateBpm: Int?,
    val samples10s: List<HeartRateSample>,
    val route: List<WearRoutePoint>,
    val routeSummary: WearRouteSummary,
)

data class WearWorkoutPayload(
    val workoutType: WearWorkoutType,
    val source: String,
    val dateKey: String,
    val startedAtMs: Long,
    val endedAtMs: Long,
    val summary: WearRunSummary,
) {
    fun toJsonString(): String {
        return JSONObject()
            .put("type", workoutType.wireValue)
            .put("source", source)
            .put("dateKey", dateKey)
            .put("startedAt", startedAtMs)
            .put("endedAt", endedAtMs)
            .put("durationSec", summary.durationSec)
            .put("distanceKm", summary.distanceKm)
            .putNullable("avgPaceSecPerKm", summary.avgPaceSecPerKm)
            .putNullable("avgHeartRateBpm", summary.avgHeartRateBpm)
            .putNullable("maxHeartRateBpm", summary.maxHeartRateBpm)
            .put(
                "route",
                JSONArray().apply {
                    summary.route.forEach { point ->
                        put(
                            JSONObject()
                                .put("timestampMs", point.timestampMs)
                                .put("lat", point.lat)
                                .put("lng", point.lng)
                                .putNullable("altitude", point.altitude)
                                .putNullable("bearing", point.bearing),
                        )
                    }
                },
            )
            .put(
                "routeSummary",
                JSONObject()
                    .put("source", summary.routeSummary.source)
                    .put("pointCount", summary.routeSummary.pointCount)
                    .put("distanceKm", summary.routeSummary.distanceKm)
                    .put("durationSec", summary.routeSummary.durationSec)
                    .put("startedAt", summary.routeSummary.startedAtMs)
                    .put("endedAt", summary.routeSummary.endedAtMs),
            )
            .put(
                "samples10s",
                JSONArray().apply {
                    summary.samples10s.forEach { sample ->
                        put(
                            JSONObject()
                                .put("timestampMs", sample.timestampMs)
                                .put("bpm", sample.bpm),
                        )
                    }
                },
            )
            .toString()
    }

    companion object {
        const val SOURCE_WEAR = "wear"

        private const val HEART_RATE_BUCKET_MS = 10_000L
        private const val MAX_RUN_DURATION_SEC = 6L * 60L * 60L
        private const val MAX_HEART_RATE_BUCKETS = 2_161
        private const val MAX_HEART_RATE_SAMPLE_COUNT = 50_000
        private const val MAX_ROUTE_POINT_COUNT = 2_161
        private val DATE_KEY_PATTERN = Regex("""\d{4}-\d{2}-\d{2}""")

        fun fromSession(session: WearRunSession): Result<WearWorkoutPayload> = runCatching {
            validateDateKey(session.dateKey)
            require(session.startedAtMs >= 0L) { "startedAtMs must be positive" }
            require(session.endedAtMs > session.startedAtMs) { "endedAtMs must be after startedAtMs" }
            require(session.distanceMeters.isFinite() && session.distanceMeters >= 0.0) {
                "distanceMeters must be finite and non-negative"
            }
            require(session.heartRateSamples.size <= MAX_HEART_RATE_SAMPLE_COUNT) {
                "heartRateSamples exceeds payload limit"
            }
            require(session.routePoints.size <= MAX_ROUTE_POINT_COUNT) {
                "routePoints exceeds payload limit"
            }

            val durationSec = (session.endedAtMs - session.startedAtMs) / 1_000L
            require(durationSec > 0L) { "durationSec must be positive" }
            require(durationSec <= MAX_RUN_DURATION_SEC) { "durationSec exceeds payload limit" }
            val route = normalizeRoute(session)
            val distanceMeters = session.distanceMeters.takeIf { it > 0.0 }
                ?: distanceMetersFromRoute(route)
            val distanceKm = roundTo(distanceMeters / 1_000.0, digits = 2)
            val validHeartRateSamples = session.heartRateSamples
                .filter { sample ->
                    sample.timestampMs in session.startedAtMs..session.endedAtMs &&
                        sample.bpm in 30..240
                }
                .sortedBy { it.timestampMs }
            val bucketedSamples = bucketHeartRates(session.startedAtMs, validHeartRateSamples)
            require(bucketedSamples.size <= MAX_HEART_RATE_BUCKETS) {
                "samples10s exceeds payload limit"
            }

            WearWorkoutPayload(
                workoutType = WearWorkoutType.RUNNING,
                source = SOURCE_WEAR,
                dateKey = session.dateKey,
                startedAtMs = session.startedAtMs,
                endedAtMs = session.endedAtMs,
                summary = WearRunSummary(
                    durationSec = durationSec,
                    distanceKm = distanceKm,
                    avgPaceSecPerKm = if (distanceMeters > 0.0) {
                        (durationSec / (distanceMeters / 1_000.0)).roundToInt()
                    } else {
                        null
                    },
                    avgHeartRateBpm = bucketedSamples.averageBpmOrNull(),
                    maxHeartRateBpm = validHeartRateSamples.maxOfOrNull { it.bpm },
                    samples10s = bucketedSamples,
                    route = route,
                    routeSummary = WearRouteSummary(
                        source = if (route.isNotEmpty()) "wear-gps" else "unavailable",
                        pointCount = route.size,
                        distanceKm = distanceKm,
                        durationSec = durationSec,
                        startedAtMs = session.startedAtMs,
                        endedAtMs = session.endedAtMs,
                    ),
                ),
            )
        }

        private fun validateDateKey(dateKey: String) {
            require(DATE_KEY_PATTERN.matches(dateKey)) { "dateKey must use yyyy-MM-dd" }
            LocalDate.parse(dateKey)
        }

        private fun bucketHeartRates(
            startedAtMs: Long,
            samples: List<HeartRateSample>,
        ): List<HeartRateSample> {
            return samples
                .groupBy { sample ->
                    startedAtMs + ((sample.timestampMs - startedAtMs) / HEART_RATE_BUCKET_MS) *
                        HEART_RATE_BUCKET_MS
                }
                .toSortedMap()
                .map { (bucketStartMs, bucketSamples) ->
                    HeartRateSample(
                        timestampMs = bucketStartMs,
                        bpm = bucketSamples.map { it.bpm }.average().roundToInt(),
                    )
                }
        }

        private fun normalizeRoute(session: WearRunSession): List<WearRoutePoint> {
            return session.routePoints
                .asSequence()
                .filter { point ->
                    point.timestampMs in session.startedAtMs..session.endedAtMs &&
                        point.lat.isFinite() &&
                        point.lng.isFinite() &&
                        point.lat in -90.0..90.0 &&
                        point.lng in -180.0..180.0
                }
                .sortedBy { it.timestampMs }
                .take(MAX_ROUTE_POINT_COUNT)
                .toList()
        }

        private fun distanceMetersFromRoute(route: List<WearRoutePoint>): Double {
            if (route.size < 2) return 0.0
            return route.zipWithNext().sumOf { (a, b) -> haversineMeters(a, b) }
        }

        private fun haversineMeters(a: WearRoutePoint, b: WearRoutePoint): Double {
            val radiusMeters = 6_371_000.0
            val dLat = Math.toRadians(b.lat - a.lat)
            val dLng = Math.toRadians(b.lng - a.lng)
            val lat1 = Math.toRadians(a.lat)
            val lat2 = Math.toRadians(b.lat)
            val h = kotlin.math.sin(dLat / 2) * kotlin.math.sin(dLat / 2) +
                kotlin.math.cos(lat1) * kotlin.math.cos(lat2) *
                kotlin.math.sin(dLng / 2) * kotlin.math.sin(dLng / 2)
            return 2 * radiusMeters * kotlin.math.atan2(kotlin.math.sqrt(h), kotlin.math.sqrt(1 - h))
        }

        private fun List<HeartRateSample>.averageBpmOrNull(): Int? {
            if (isEmpty()) return null
            return map { it.bpm }.average().roundToInt()
        }

        private fun roundTo(value: Double, digits: Int): Double {
            val multiplier = (1..digits).fold(1.0) { acc, _ -> acc * 10.0 }
            return round(value * multiplier) / multiplier
        }
    }
}

private fun JSONObject.putNullable(name: String, value: Any?): JSONObject {
    return put(name, value ?: JSONObject.NULL)
}

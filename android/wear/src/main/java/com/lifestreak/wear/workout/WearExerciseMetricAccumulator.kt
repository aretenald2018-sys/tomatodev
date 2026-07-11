package com.lifestreak.wear.workout

import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class WearExerciseMetricsSnapshot(
    val startedAtWallClockMs: Long,
    val distanceMeters: Double,
    val latestHeartRateBpm: Int?,
    val activeDurationMs: Long,
    val distanceSamples: List<WearDistanceSample>,
    val heartRateSamples: List<HeartRateSample>,
    val routePoints: List<WearRoutePoint>,
) {
    val distanceKm: Double = distanceMeters / 1_000.0
}

class WearExerciseMetricAccumulator(
    private val startedAtWallClockMs: Long,
    private val startedAtElapsedRealtimeMs: Long,
) {
    private var distanceMeters = 0.0
    private var latestHeartRateBpm: Int? = null
    private var activeDurationMs = 0L
    private val distanceSamplesByBucket = linkedMapOf<Long, WearDistanceSample>()
    private val heartRateSamplesByBucket = linkedMapOf<Long, HeartRateSample>()
    private val routePoints = linkedSetOf<WearRoutePoint>()

    fun applyMetricUpdate(
        elapsedRealtimeMs: Long,
        distanceMeters: Double? = null,
        heartRateBpm: Int? = null,
        activeDurationMs: Long? = null,
        routePoint: WearRoutePoint? = null,
    ) {
        if (distanceMeters != null && distanceMeters.isFinite() && distanceMeters >= 0.0) {
            this.distanceMeters = distanceMeters
            val bucketStartMs = bucketStartFor(elapsedRealtimeMs)
            distanceSamplesByBucket[bucketStartMs] = WearDistanceSample(
                timestampMs = bucketStartMs,
                distanceKm = distanceMeters / 1_000.0,
            )
        }
        if (activeDurationMs != null && activeDurationMs >= 0L) {
            this.activeDurationMs = activeDurationMs
        }
        if (heartRateBpm != null && heartRateBpm in MIN_HEART_RATE_BPM..MAX_HEART_RATE_BPM) {
            latestHeartRateBpm = heartRateBpm
            val bucketStartMs = bucketStartFor(elapsedRealtimeMs)
            heartRateSamplesByBucket[bucketStartMs] = HeartRateSample(
                timestampMs = bucketStartMs,
                bpm = heartRateBpm,
            )
        }
        if (routePoint != null && isValidRoutePoint(routePoint)) {
            routePoints.add(routePoint)
        }
    }

    fun snapshot(): WearExerciseMetricsSnapshot {
        return WearExerciseMetricsSnapshot(
            startedAtWallClockMs = startedAtWallClockMs,
            distanceMeters = distanceMeters,
            latestHeartRateBpm = latestHeartRateBpm,
            activeDurationMs = activeDurationMs,
            distanceSamples = distanceSamplesByBucket.values.sortedBy { it.timestampMs },
            heartRateSamples = heartRateSamplesByBucket.values.sortedBy { it.timestampMs },
            routePoints = normalizedRoutePoints(),
        )
    }

    fun toRunSession(dateKey: String, endedAtWallClockMs: Long): WearRunSession {
        val snapshot = snapshot()
        return WearRunSession(
            dateKey = dateKey,
            startedAtMs = startedAtWallClockMs,
            endedAtMs = endedAtWallClockMs,
            distanceMeters = snapshot.distanceMeters,
            heartRateSamples = snapshot.heartRateSamples,
            routePoints = snapshot.routePoints,
        )
    }

    private fun isValidRoutePoint(point: WearRoutePoint): Boolean {
        return point.lat.isFinite() &&
            point.lng.isFinite() &&
            point.lat in -90.0..90.0 &&
            point.lng in -180.0..180.0 &&
            (point.accuracy == null || (point.accuracy.isFinite() && point.accuracy > 0.0 && point.accuracy <= MAX_GPS_ACCURACY_M)) &&
            point.timestampMs >= 0L
    }

    private fun normalizedRoutePoints(): List<WearRoutePoint> {
        var lastRouteTimestampMs: Long? = null
        var currentRouteSegmentId = 0
        val accepted = mutableListOf<WearRoutePoint>()
        routePoints
            .sortedBy { point -> point.timestampMs }
            .forEach { routePoint ->
                val previous = accepted.lastOrNull()
                if (previous != null) {
                    val elapsedMs = routePoint.timestampMs - previous.timestampMs
                    if (elapsedMs < 0L) return@forEach
                    val distanceM = haversineMeters(previous, routePoint)
                    val accuracyAllowance = maxOf(
                        80.0,
                        previous.accuracy ?: 0.0,
                        routePoint.accuracy ?: 0.0,
                    )
                    if (elapsedMs > 0L && distanceM > accuracyAllowance && distanceM / (elapsedMs / 1_000.0) > MAX_RUNNING_SPEED_MPS) {
                        return@forEach
                    }
                }
                val previousTimestampMs = lastRouteTimestampMs
                val inferredGap = previousTimestampMs != null &&
                    routePoint.timestampMs - previousTimestampMs > ROUTE_GAP_MS
                val explicitGap = routePoint.gapBefore
                if ((inferredGap || explicitGap) && previousTimestampMs != routePoint.timestampMs) {
                    currentRouteSegmentId += 1
                }
                lastRouteTimestampMs = routePoint.timestampMs
                accepted.add(routePoint.copy(
                    segmentId = routePoint.segmentId ?: currentRouteSegmentId,
                    gapBefore = explicitGap || inferredGap,
                    gapReason = routePoint.gapReason ?: if (inferredGap) "time-gap" else null,
                ))
            }
        return accepted
    }

    private fun haversineMeters(a: WearRoutePoint, b: WearRoutePoint): Double {
        val earthRadiusM = 6_371_000.0
        val lat1 = Math.toRadians(a.lat)
        val lat2 = Math.toRadians(b.lat)
        val dLat = lat2 - lat1
        val dLng = Math.toRadians(b.lng - a.lng)
        val h = sin(dLat / 2) * sin(dLat / 2) +
            cos(lat1) * cos(lat2) * sin(dLng / 2) * sin(dLng / 2)
        return 2 * earthRadiusM * atan2(sqrt(h), sqrt(1 - h))
    }

    private fun bucketStartFor(elapsedRealtimeMs: Long): Long {
        val elapsedSinceStartMs = (elapsedRealtimeMs - startedAtElapsedRealtimeMs).coerceAtLeast(0L)
        val wallClockMs = startedAtWallClockMs + elapsedSinceStartMs
        return startedAtWallClockMs + ((wallClockMs - startedAtWallClockMs) / HEART_RATE_BUCKET_MS) *
            HEART_RATE_BUCKET_MS
    }

    private companion object {
        const val HEART_RATE_BUCKET_MS = 10_000L
        const val ROUTE_GAP_MS = 45_000L
        const val MAX_GPS_ACCURACY_M = 100.0
        const val MAX_RUNNING_SPEED_MPS = 15.0
        const val MIN_HEART_RATE_BPM = 30
        const val MAX_HEART_RATE_BPM = 240
    }
}

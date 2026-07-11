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
        val normalizedRoute = normalizedRoutePoints()
        return WearExerciseMetricsSnapshot(
            startedAtWallClockMs = startedAtWallClockMs,
            distanceMeters = routeDistanceMeters(normalizedRoute),
            latestHeartRateBpm = latestHeartRateBpm,
            activeDurationMs = activeDurationMs,
            distanceSamples = distanceSamplesByBucket.values.sortedBy { it.timestampMs },
            heartRateSamples = heartRateSamplesByBucket.values.sortedBy { it.timestampMs },
            routePoints = normalizedRoute,
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
                    if (!isConfidentRunningMovement(previous, routePoint)) return@forEach
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

    private fun isConfidentRunningMovement(previous: WearRoutePoint, point: WearRoutePoint): Boolean {
        val elapsedMs = point.timestampMs - previous.timestampMs
        if (elapsedMs <= 0L) return false
        val distanceM = haversineMeters(previous, point)
        val errorRadiusM = maxOf(
            MIN_ROUTE_DISPLACEMENT_M,
            minOf(MAX_GPS_ERROR_RADIUS_M, maxOf(previous.accuracy ?: 0.0, point.accuracy ?: 0.0) * 2.0),
        )
        if (distanceM <= errorRadiusM) return false
        val inferredSpeedMps = distanceM / (elapsedMs / 1_000.0)
        return inferredSpeedMps in MIN_CONFIDENT_RUNNING_SPEED_MPS..MAX_RUNNING_SPEED_MPS
    }

    private fun routeDistanceMeters(route: List<WearRoutePoint>): Double {
        if (route.size < 2) return 0.0
        return route.zipWithNext().sumOf { (previous, point) ->
            if (point.gapBefore || previous.segmentId != point.segmentId) 0.0
            else haversineMeters(previous, point)
        }
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
        const val MAX_GPS_ACCURACY_M = 35.0
        const val MIN_ROUTE_DISPLACEMENT_M = 12.0
        const val MAX_GPS_ERROR_RADIUS_M = 30.0
        const val MIN_CONFIDENT_RUNNING_SPEED_MPS = 0.8
        const val MAX_RUNNING_SPEED_MPS = 15.0
        const val MIN_HEART_RATE_BPM = 30
        const val MAX_HEART_RATE_BPM = 240
    }
}

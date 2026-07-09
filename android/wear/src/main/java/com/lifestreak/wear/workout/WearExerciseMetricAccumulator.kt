package com.lifestreak.wear.workout

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
    private val routePointsByBucket = linkedMapOf<Long, WearRoutePoint>()
    private var lastRoutePointBucketMs: Long? = null
    private var currentRouteSegmentId = 0

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
            val bucketStartMs = bucketStartFor(elapsedRealtimeMs)
            val previousBucketMs = lastRoutePointBucketMs
            val inferredGap = previousBucketMs != null && bucketStartMs - previousBucketMs > ROUTE_GAP_MS
            val explicitGap = routePoint.gapBefore
            if ((inferredGap || explicitGap) && previousBucketMs != bucketStartMs) {
                currentRouteSegmentId += 1
            }
            routePointsByBucket[bucketStartMs] = routePoint.copy(
                timestampMs = bucketStartMs,
                segmentId = routePoint.segmentId ?: currentRouteSegmentId,
                gapBefore = explicitGap || inferredGap,
                gapReason = routePoint.gapReason ?: if (inferredGap) "time-gap" else null,
            )
            lastRoutePointBucketMs = bucketStartMs
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
            routePoints = routePointsByBucket.values.sortedBy { it.timestampMs },
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
            point.timestampMs >= 0L
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
        const val MIN_HEART_RATE_BPM = 30
        const val MAX_HEART_RATE_BPM = 240
    }
}

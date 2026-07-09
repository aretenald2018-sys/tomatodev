package com.lifestreak.wear.workout

import org.junit.Assert.assertEquals
import org.junit.Test

class WearExerciseMetricAccumulatorTest {
    @Test
    fun keepsLatestUiMetricsAndStoresHeartRateAtTenSecondCadence() {
        val accumulator = WearExerciseMetricAccumulator(
            startedAtWallClockMs = 10_000L,
            startedAtElapsedRealtimeMs = 1_000L,
        )

        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 1_000L,
            distanceMeters = 0.0,
            heartRateBpm = 88,
            activeDurationMs = 0L,
        )
        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 5_000L,
            distanceMeters = 250.4,
            heartRateBpm = 150,
            activeDurationMs = 4_000L,
        )
        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 12_500L,
            distanceMeters = 502.0,
            heartRateBpm = 152,
            activeDurationMs = 11_500L,
            routePoint = WearRoutePoint(timestampMs = 22_500L, lat = 37.5665, lng = 126.9780),
        )
        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 13_000L,
            distanceMeters = Double.NaN,
            heartRateBpm = 999,
            activeDurationMs = -1L,
        )

        val snapshot = accumulator.snapshot()

        assertEquals(502.0, snapshot.distanceMeters, 0.0001)
        assertEquals(152, snapshot.latestHeartRateBpm)
        assertEquals(11_500L, snapshot.activeDurationMs)
        assertEquals(
            listOf(
                HeartRateSample(timestampMs = 10_000L, bpm = 150),
                HeartRateSample(timestampMs = 20_000L, bpm = 152),
            ),
            snapshot.heartRateSamples,
        )
        assertEquals(
            listOf(WearRoutePoint(timestampMs = 20_000L, lat = 37.5665, lng = 126.9780, segmentId = 0)),
            snapshot.routePoints,
        )
    }

    @Test
    fun marksRouteGapWhenLocationUpdatesResumeAfterLongPause() {
        val accumulator = WearExerciseMetricAccumulator(
            startedAtWallClockMs = 10_000L,
            startedAtElapsedRealtimeMs = 1_000L,
        )

        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 1_000L,
            routePoint = WearRoutePoint(timestampMs = 10_000L, lat = 37.5665, lng = 126.9780),
        )
        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 11_000L,
            routePoint = WearRoutePoint(timestampMs = 20_000L, lat = 37.5666, lng = 126.9781),
        )
        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 71_000L,
            routePoint = WearRoutePoint(timestampMs = 80_000L, lat = 37.5700, lng = 126.9800),
        )

        val route = accumulator.snapshot().routePoints

        assertEquals(listOf(0, 0, 1), route.map { it.segmentId })
        assertEquals(false, route[1].gapBefore)
        assertEquals(true, route[2].gapBefore)
        assertEquals("time-gap", route[2].gapReason)
    }

    @Test
    fun convertsAccumulatedMetricsToWearRunSession() {
        val accumulator = WearExerciseMetricAccumulator(
            startedAtWallClockMs = 10_000L,
            startedAtElapsedRealtimeMs = 1_000L,
        )

        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 11_000L,
            distanceMeters = 1_000.0,
            heartRateBpm = 140,
            activeDurationMs = 10_000L,
        )

        val session = accumulator.toRunSession(
            dateKey = "2026-07-06",
            endedAtWallClockMs = 20_000L,
        )

        assertEquals("2026-07-06", session.dateKey)
        assertEquals(10_000L, session.startedAtMs)
        assertEquals(20_000L, session.endedAtMs)
        assertEquals(1_000.0, session.distanceMeters, 0.0001)
        assertEquals(listOf(HeartRateSample(timestampMs = 20_000L, bpm = 140)), session.heartRateSamples)
        assertEquals(emptyList<WearRoutePoint>(), session.routePoints)
    }
}

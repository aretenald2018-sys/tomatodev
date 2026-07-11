package com.lifestreak.wear.workout

import org.junit.Assert.assertEquals
import org.junit.Test

class WearExerciseMetricAccumulatorTest {
    @Test
    fun keepsEachConfirmedRunningLocationInsideOneTenSecondWindow() {
        val accumulator = WearExerciseMetricAccumulator(
            startedAtWallClockMs = 10_000L,
            startedAtElapsedRealtimeMs = 1_000L,
        )

        repeat(6) { index ->
            accumulator.applyMetricUpdate(
                elapsedRealtimeMs = 1_000L + index * 1_000L,
                routePoint = WearRoutePoint(
                    timestampMs = 10_000L + index * 1_000L,
                    lat = 37.5665,
                    lng = 126.9780 + index * 0.00015,
                ),
            )
        }

        val route = accumulator.snapshot().routePoints
        assertEquals(6, route.size)
        assertEquals(
            listOf(10_000L, 11_000L, 12_000L, 13_000L, 14_000L, 15_000L),
            route.map { it.timestampMs },
        )
        assertEquals(6, route.map { it.lat to it.lng }.distinct().size)
    }

    @Test
    fun rejectsSameTimestampLocationsUntilAConfirmedMoveArrives() {
        val accumulator = WearExerciseMetricAccumulator(
            startedAtWallClockMs = 10_000L,
            startedAtElapsedRealtimeMs = 1_000L,
        )
        val first = WearRoutePoint(timestampMs = 11_000L, lat = 37.5665, lng = 126.9780)
        val second = WearRoutePoint(timestampMs = 11_000L, lat = 37.5666, lng = 126.9781)
        val later = WearRoutePoint(timestampMs = 21_000L, lat = 37.5666, lng = 126.9781)

        listOf(later, first, second, first).forEach { point ->
            accumulator.applyMetricUpdate(
                elapsedRealtimeMs = point.timestampMs - 9_000L,
                routePoint = point,
            )
        }

        val route = accumulator.snapshot().routePoints
        assertEquals(listOf(11_000L, 21_000L), route.map { it.timestampMs })
        assertEquals(
            listOf(
                37.5665 to 126.9780,
                37.5666 to 126.9781,
            ),
            route.map { it.lat to it.lng },
        )
    }

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

        assertEquals(0.0, snapshot.distanceMeters, 0.0001)
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
            listOf(WearRoutePoint(timestampMs = 22_500L, lat = 37.5665, lng = 126.9780, segmentId = 0)),
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
    fun detectsRouteGapFromExactPriorTimestampInsteadOfTenSecondBucket() {
        val accumulator = WearExerciseMetricAccumulator(
            startedAtWallClockMs = 10_000L,
            startedAtElapsedRealtimeMs = 1_000L,
        )

        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 1_001L,
            routePoint = WearRoutePoint(timestampMs = 10_001L, lat = 37.5665, lng = 126.9780),
        )
        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 50_999L,
            routePoint = WearRoutePoint(timestampMs = 59_999L, lat = 37.5700, lng = 126.9800),
        )

        val route = accumulator.snapshot().routePoints
        assertEquals(listOf(0, 1), route.map { it.segmentId })
        assertEquals(true, route[1].gapBefore)
        assertEquals("time-gap", route[1].gapReason)
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
        assertEquals(0.0, session.distanceMeters, 0.0001)
        assertEquals(listOf(HeartRateSample(timestampMs = 20_000L, bpm = 140)), session.heartRateSamples)
        assertEquals(emptyList<WearRoutePoint>(), session.routePoints)
    }

    @Test
    fun ignoresStationaryGpsDriftInsteadOfCreatingDistance() {
        val accumulator = WearExerciseMetricAccumulator(
            startedAtWallClockMs = 10_000L,
            startedAtElapsedRealtimeMs = 1_000L,
        )

        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 1_000L,
            routePoint = WearRoutePoint(timestampMs = 10_000L, lat = 37.5665, lng = 126.9780, accuracy = 10.0),
        )
        accumulator.applyMetricUpdate(
            elapsedRealtimeMs = 62_000L,
            routePoint = WearRoutePoint(timestampMs = 71_000L, lat = 37.56677, lng = 126.9780, accuracy = 10.0),
        )

        val snapshot = accumulator.snapshot()
        assertEquals(1, snapshot.routePoints.size)
        assertEquals(0.0, snapshot.distanceMeters, 0.0001)
    }
}

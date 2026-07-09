package com.lifestreak.wear.workout

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WearRunPayloadTest {
    @Test
    fun buildsPayloadWithTenSecondHeartRateBuckets() {
        val session = WearRunSession(
            dateKey = "2026-07-06",
            startedAtMs = 1_000L,
            endedAtMs = 31_000L,
            distanceMeters = 500.0,
            heartRateSamples = listOf(
                HeartRateSample(timestampMs = 1_000L, bpm = 100),
                HeartRateSample(timestampMs = 5_000L, bpm = 190),
                HeartRateSample(timestampMs = 13_000L, bpm = 140),
                HeartRateSample(timestampMs = 20_000L, bpm = 160),
                HeartRateSample(timestampMs = 21_000L, bpm = 260),
                HeartRateSample(timestampMs = 40_000L, bpm = 150),
            ),
        )

        val payload = session.toPayload().getOrThrow()

        assertEquals(WearWorkoutType.RUNNING, payload.workoutType)
        assertEquals("wear", payload.source)
        assertEquals("2026-07-06", payload.dateKey)
        assertEquals(30L, payload.summary.durationSec)
        assertEquals(0.5, payload.summary.distanceKm, 0.0001)
        assertEquals(60, payload.summary.avgPaceSecPerKm)
        assertEquals(148, payload.summary.avgHeartRateBpm)
        assertEquals(190, payload.summary.maxHeartRateBpm)
        assertEquals(
            listOf(
                HeartRateSample(timestampMs = 1_000L, bpm = 145),
                HeartRateSample(timestampMs = 11_000L, bpm = 150),
            ),
            payload.summary.samples10s,
        )

        val json = JSONObject(payload.toJsonString())
        assertEquals("running", json.getString("type"))
        assertEquals("wear", json.getString("source"))
        assertEquals(31_000L, json.getLong("endedAt"))
        assertEquals(2, json.getJSONArray("samples10s").length())
        assertEquals(145, json.getJSONArray("samples10s").getJSONObject(0).getInt("bpm"))
    }

    @Test
    fun acceptsMissingDistanceAndHeartRateWithoutInventingMetrics() {
        val payload = WearRunSession(
            dateKey = "2026-07-06",
            startedAtMs = 1_000L,
            endedAtMs = 11_000L,
            distanceMeters = 0.0,
            heartRateSamples = emptyList(),
        ).toPayload().getOrThrow()

        assertEquals(10L, payload.summary.durationSec)
        assertEquals(0.0, payload.summary.distanceKm, 0.0001)
        assertNull(payload.summary.avgPaceSecPerKm)
        assertNull(payload.summary.avgHeartRateBpm)
        assertNull(payload.summary.maxHeartRateBpm)
        assertTrue(payload.summary.samples10s.isEmpty())
    }

    @Test
    fun includesGpsRouteAndUsesRouteDistanceWhenDistanceMetricIsMissing() {
        val payload = WearRunSession(
            dateKey = "2026-07-06",
            startedAtMs = 1_000L,
            endedAtMs = 21_000L,
            distanceMeters = 0.0,
            routePoints = listOf(
                WearRoutePoint(timestampMs = 1_000L, lat = 37.5665, lng = 126.9780, altitude = 34.1, bearing = 91.2),
                WearRoutePoint(timestampMs = 11_000L, lat = 37.5666, lng = 126.9790, altitude = 35.0, bearing = 94.4),
                WearRoutePoint(timestampMs = 50_000L, lat = 37.0, lng = 126.0),
            ),
        ).toPayload().getOrThrow()

        assertEquals(2, payload.summary.route.size)
        assertEquals("wear-gps", payload.summary.routeSummary.source)
        assertEquals(2, payload.summary.routeSummary.pointCount)
        assertTrue(payload.summary.distanceKm > 0.0)
        assertTrue((payload.summary.avgPaceSecPerKm ?: 0) > 0)

        val json = JSONObject(payload.toJsonString())
        assertEquals(2, json.getJSONArray("route").length())
        assertEquals("wear-gps", json.getJSONObject("routeSummary").getString("source"))
        assertEquals(2, json.getJSONObject("routeSummary").getInt("pointCount"))
        assertFalse(json.isNull("avgPaceSecPerKm"))
    }

    @Test
    fun liveDisplayOnlyFieldsDoNotLeakIntoPhoneSavePayload() {
        var now = 1_000L
        val state = WearRunUiState { now }
        val distanceSamples = listOf(
            WearDistanceSample(timestampMs = 1_000L, distanceKm = 0.0),
            WearDistanceSample(timestampMs = 61_000L, distanceKm = 0.12),
            WearDistanceSample(timestampMs = 121_000L, distanceKm = 0.25),
            WearDistanceSample(timestampMs = 181_000L, distanceKm = 0.42),
            WearDistanceSample(timestampMs = 241_000L, distanceKm = 0.62),
            WearDistanceSample(timestampMs = 301_000L, distanceKm = 0.75),
        )
        val heartRateSamples = listOf(
            HeartRateSample(timestampMs = 1_000L, bpm = 110),
            HeartRateSample(timestampMs = 61_000L, bpm = 130),
            HeartRateSample(timestampMs = 121_000L, bpm = 145),
            HeartRateSample(timestampMs = 181_000L, bpm = 165),
            HeartRateSample(timestampMs = 241_000L, bpm = 185),
        )
        val routePoints = listOf(
            WearRoutePoint(timestampMs = 1_000L, lat = 37.56650, lng = 126.97800),
            WearRoutePoint(timestampMs = 61_000L, lat = 37.56685, lng = 126.97840),
            WearRoutePoint(timestampMs = 121_000L, lat = 37.56720, lng = 126.97890),
        )
        state.start()
        now += 300_000L
        state.updateLiveMetrics(
            distanceKm = 0.75,
            distanceSamples = distanceSamples,
            heartRateSamples = heartRateSamples,
            routePoints = routePoints,
        )

        val snapshot = state.snapshot()
        assertTrue(snapshot.estimatedCaloriesKcal > 0)
        assertTrue(snapshot.calorieText.endsWith("kcal"))
        assertTrue(snapshot.heartZoneRows.isNotEmpty())
        assertTrue(snapshot.paceTrend.isNotEmpty())
        assertTrue(snapshot.heartRateTrend.isNotEmpty())
        assertTrue(snapshot.routeProjection.isReady)
        assertTrue(snapshot.averagePaceText.contains("'"))
        assertTrue(snapshot.fastestPaceText.contains("'"))

        val session = buildWearRunSessionForSummary(
            exerciseSnapshot = WearExerciseSessionSnapshot(
                startedAtWallClockMs = 1_000L,
                distanceMeters = 750.0,
                latestHeartRateBpm = 185,
                activeDurationMs = 300_000L,
                heartRateSamples = heartRateSamples,
                routePoints = routePoints,
            ),
            uiSnapshot = snapshot,
            nowWallClockMs = 301_000L,
            dateKeyFor = { "2026-07-09" },
        )

        val json = JSONObject(session.toPayload().getOrThrow().toJsonString())
        listOf(
            "durationSec",
            "distanceKm",
            "avgPaceSecPerKm",
            "avgHeartRateBpm",
            "maxHeartRateBpm",
            "samples10s",
            "route",
            "routeSummary",
        ).forEach { key ->
            assertTrue("missing phone-save key: $key", json.has(key))
        }
        listOf(
            "calorieText",
            "estimatedCaloriesKcal",
            "heartZoneRows",
            "paceTrend",
            "heartRateTrend",
            "routeProjection",
            "averagePaceText",
            "fastestPaceText",
        ).forEach { key ->
            assertFalse("display-only key leaked into phone-save payload: $key", json.has(key))
        }
    }

    @Test
    fun rejectsMalformedRunSessions() {
        assertTrue(
            WearRunSession(
                dateKey = "2026/07/06",
                startedAtMs = 1_000L,
                endedAtMs = 11_000L,
                distanceMeters = 100.0,
            ).toPayload().isFailure,
        )
        assertTrue(
            WearRunSession(
                dateKey = "2026-99-99",
                startedAtMs = 1_000L,
                endedAtMs = 11_000L,
                distanceMeters = 100.0,
            ).toPayload().isFailure,
        )
        assertTrue(
            WearRunSession(
                dateKey = "2026-07-06",
                startedAtMs = 11_000L,
                endedAtMs = 1_000L,
                distanceMeters = 100.0,
            ).toPayload().isFailure,
        )
        assertTrue(
            WearRunSession(
                dateKey = "2026-07-06",
                startedAtMs = 1_000L,
                endedAtMs = 11_000L,
                distanceMeters = -1.0,
            ).toPayload().isFailure,
        )
        assertTrue(
            WearRunSession(
                dateKey = "2026-07-06",
                startedAtMs = 1_000L,
                endedAtMs = 1_500L,
                distanceMeters = 100.0,
            ).toPayload().isFailure,
        )
        assertTrue(
            WearRunSession(
                dateKey = "2026-07-06",
                startedAtMs = 1_000L,
                endedAtMs = 11_000L,
                distanceMeters = Double.POSITIVE_INFINITY,
            ).toPayload().isFailure,
        )
        assertTrue(
            WearRunSession(
                dateKey = "2026-07-06",
                startedAtMs = 1_000L,
                endedAtMs = 1_000L + (7L * 60L * 60L * 1_000L),
                distanceMeters = 1_000.0,
            ).toPayload().isFailure,
        )
        assertTrue(
            WearRunSession(
                dateKey = "2026-07-06",
                startedAtMs = 1_000L,
                endedAtMs = 11_000L,
                distanceMeters = 100.0,
                heartRateSamples = List(50_001) { index ->
                    HeartRateSample(timestampMs = 1_000L + index, bpm = 120)
                },
            ).toPayload().isFailure,
        )
        assertTrue(
            WearRunSession(
                dateKey = "2026-07-06",
                startedAtMs = 1_000L,
                endedAtMs = 11_000L,
                distanceMeters = 100.0,
                routePoints = List(2_162) { index ->
                    WearRoutePoint(timestampMs = 1_000L + index, lat = 37.0, lng = 126.0)
                },
            ).toPayload().isFailure,
        )
    }
}

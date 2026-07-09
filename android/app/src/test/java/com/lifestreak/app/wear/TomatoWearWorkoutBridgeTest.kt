package com.lifestreak.app.wear

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TomatoWearWorkoutBridgeTest {
    @Test
    fun sanitizedPrefsPayloadKeepsRouteGapsWithoutArbitraryCoordinateFields() {
        val payload = JSONObject()
            .put("type", "running")
            .put("source", "wear")
            .put("dateKey", "2026-07-09")
            .put("startedAt", 1_000L)
            .put("endedAt", 91_000L)
            .put("durationSec", 90L)
            .put("distanceKm", 0.42)
            .put("avgPaceSecPerKm", 214)
            .put("lat", 37.123456)
            .put("gpsDump", JSONObject().put("lat", 37.999999).put("lng", 127.999999))
            .put(
                "route",
                JSONArray()
                    .put(JSONObject().put("timestampMs", 999L).put("lat", 37.1111).put("lng", 126.1111))
                    .put(JSONObject().put("timestampMs", 1_000L).put("lat", 37.5665).put("lng", 126.9780).put("segmentId", 0))
                    .put(JSONObject().put("timestampMs", 11_000L).put("lat", 37.5666).put("lng", 126.9781).put("segmentId", 0))
                    .put(
                        JSONObject()
                            .put("timestampMs", 81_000L)
                            .put("lat", 37.5700)
                            .put("lng", 126.9800)
                            .put("segmentId", 1)
                            .put("gapBefore", true)
                            .put("gapReason", "time-gap"),
                    )
                    .put(JSONObject().put("timestampMs", 91_001L).put("lat", 37.2222).put("lng", 126.2222)),
            )
            .put(
                "samples10s",
                JSONArray().put(JSONObject().put("timestampMs", 1_000L).put("bpm", 130)),
            )
            .put(
                "routeSummary",
                JSONObject()
                    .put("source", "wear-gps")
                    .put("pointCount", 3)
                    .put("segmentCount", 2)
                    .put("gapCount", 1)
                    .put("interrupted", true),
            )

        val sanitized = JSONObject(TomatoWearWorkoutBridge.sanitizePayloadForPrefsForTest(payload.toString()))

        assertFalse(sanitized.has("lat"))
        assertFalse(sanitized.has("gpsDump"))
        assertEquals(0, sanitized.getJSONArray("samples10s").length())
        val route = sanitized.getJSONArray("route")
        assertEquals(3, route.length())
        assertEquals(1, route.getJSONObject(2).getInt("segmentId"))
        assertTrue(route.getJSONObject(2).getBoolean("gapBefore"))
        assertEquals("time-gap", route.getJSONObject(2).getString("gapReason"))

        val summary = sanitized.getJSONObject("routeSummary")
        assertEquals(3, summary.getInt("pointCount"))
        assertEquals(2, summary.getInt("segmentCount"))
        assertEquals(1, summary.getInt("gapCount"))
        assertTrue(summary.getBoolean("interrupted"))
        assertEquals(false, summary.getBoolean("redacted"))
    }

    @Test
    fun sanitizedPrefsPayloadDropsRouteWhenTimeWindowIsInvalid() {
        val route = JSONArray()
            .put(JSONObject().put("timestampMs", 2_000L).put("lat", 37.5665).put("lng", 126.9780))

        val missingWindow = JSONObject()
            .put("type", "running")
            .put("source", "wear")
            .put("dateKey", "2026-07-09")
            .put("durationSec", 60L)
            .put("distanceKm", 0.1)
            .put("route", route)

        val equalWindow = JSONObject(missingWindow.toString())
            .put("startedAt", 2_000L)
            .put("endedAt", 2_000L)

        val invertedWindow = JSONObject(missingWindow.toString())
            .put("startedAt", 3_000L)
            .put("endedAt", 2_000L)

        listOf(missingWindow, equalWindow, invertedWindow).forEach { payload ->
            val sanitized = JSONObject(TomatoWearWorkoutBridge.sanitizePayloadForPrefsForTest(payload.toString()))
            assertEquals(0, sanitized.getJSONArray("route").length())
            assertEquals(0, sanitized.getJSONObject("routeSummary").getInt("pointCount"))
        }
    }
}

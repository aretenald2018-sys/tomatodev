package com.lifestreak.wear.workout

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WearRouteMapProjectionTest {
    @Test
    fun projectsSeoulRouteIntoRealMapViewportWithTheLatestPointVisible() {
        val route = listOf(
            WearRoutePoint(timestampMs = 1_000L, lat = 37.52070, lng = 127.11900),
            WearRoutePoint(timestampMs = 11_000L, lat = 37.52098, lng = 127.11938),
            WearRoutePoint(timestampMs = 21_000L, lat = 37.52120, lng = 127.11972),
        )

        val viewport = WearRouteMapProjection.viewport(route, widthPx = 320, heightPx = 320)

        assertNotNull(viewport)
        assertTrue(viewport!!.zoom in WearRouteMapProjection.MIN_ZOOM..WearRouteMapProjection.MAX_ZOOM)
        val latest = WearRouteMapProjection.worldPoint(route.last(), viewport.zoom)
        assertTrue(latest.x.isFinite())
        assertTrue(latest.y.isFinite())
    }

    @Test
    fun wrapsTileIndicesAtTheInternationalDateLine() {
        assertEquals(0, WearRouteMapProjection.normalizedTileX(1 shl 16, 16))
        assertEquals((1 shl 16) - 1, WearRouteMapProjection.normalizedTileX(-1, 16))
    }
}

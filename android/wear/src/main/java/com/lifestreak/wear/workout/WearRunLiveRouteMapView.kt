package com.lifestreak.wear.workout

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.tan

internal data class WearRouteMapViewport(
    val zoom: Int,
    val centerWorldX: Double,
    val centerWorldY: Double,
)

internal data class WearRouteMapWorldPoint(
    val x: Double,
    val y: Double,
)

internal data class WearRouteMapTileKey(
    val zoom: Int,
    val x: Int,
    val y: Int,
)

internal object WearRouteMapProjection {
    const val TILE_SIZE_PX = 256
    const val MIN_ZOOM = 12
    const val MAX_ZOOM = 17

    fun worldPoint(point: WearRoutePoint, zoom: Int): WearRouteMapWorldPoint {
        val tileCount = 2.0.pow(zoom.toDouble())
        val boundedLatitude = point.lat.coerceIn(-85.05112878, 85.05112878)
        val latitudeRad = Math.toRadians(boundedLatitude)
        val x = ((point.lng + 180.0) / 360.0) * tileCount * TILE_SIZE_PX
        val y = (1.0 - ln(tan(latitudeRad) + 1.0 / kotlin.math.cos(latitudeRad)) / Math.PI) / 2.0 *
            tileCount * TILE_SIZE_PX
        return WearRouteMapWorldPoint(x, y)
    }

    fun viewport(points: List<WearRoutePoint>, widthPx: Int, heightPx: Int): WearRouteMapViewport? {
        if (points.isEmpty() || widthPx <= 0 || heightPx <= 0) return null
        val safeWidth = widthPx.coerceAtLeast(1) * 0.66
        val safeHeight = heightPx.coerceAtLeast(1) * 0.60
        var selectedZoom = MIN_ZOOM
        for (zoom in MAX_ZOOM downTo MIN_ZOOM) {
            val projected = points.map { worldPoint(it, zoom) }
            val spanX = projected.maxOf { it.x } - projected.minOf { it.x }
            val spanY = projected.maxOf { it.y } - projected.minOf { it.y }
            selectedZoom = zoom
            if (spanX <= safeWidth && spanY <= safeHeight) break
        }
        val projected = points.map { worldPoint(it, selectedZoom) }
        return WearRouteMapViewport(
            zoom = selectedZoom,
            centerWorldX = (projected.maxOf { it.x } + projected.minOf { it.x }) / 2.0,
            centerWorldY = (projected.maxOf { it.y } + projected.minOf { it.y }) / 2.0,
        )
    }

    fun normalizedTileX(tileX: Int, zoom: Int): Int {
        val tileCount = 1 shl zoom
        return ((tileX % tileCount) + tileCount) % tileCount
    }
}

/**
 * A live OSM-backed map view for a Wear running session. It only draws received GPS points;
 * when the network is unavailable the background explicitly remains an offline grid.
 */
class WearRunLiveRouteMapView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {
    private val routePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(87, 241, 122)
        strokeWidth = 4f
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        style = Paint.Style.STROKE
    }
    private val tilePaint = Paint(Paint.FILTER_BITMAP_FLAG)
    private val markerPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
        textSize = 10f
    }
    private val routePath = Path()
    private var routePoints: List<WearRoutePoint> = emptyList()
    private var viewport: WearRouteMapViewport? = null
    private val tiles = ConcurrentHashMap<WearRouteMapTileKey, Bitmap>()
    private val tileRequests = ConcurrentHashMap.newKeySet<WearRouteMapTileKey>()

    fun setRouteProjection(routeProjection: WearRouteProjection) {
        val next = routeProjection.geoPoints
            .filter { it.lat.isFinite() && it.lng.isFinite() }
            .sortedBy { it.timestampMs }
        if (routePoints == next) return
        routePoints = next
        updateViewport()
        invalidate()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        updateViewport()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawColor(Color.rgb(7, 18, 18))
        val activeViewport = viewport
        if (activeViewport == null) {
            drawCenteredLabel(canvas, "GPS 위치 수신 대기", Color.rgb(124, 132, 153))
            return
        }

        drawMapGrid(canvas, activeViewport)
        drawTiles(canvas, activeViewport)
        drawRoute(canvas, activeViewport)
        drawAttribution(canvas)
    }

    private fun updateViewport() {
        val nextViewport = WearRouteMapProjection.viewport(routePoints, width, height)
        if (viewport == nextViewport) return
        viewport = nextViewport
        nextViewport?.let(::requestVisibleTiles)
    }

    private fun requestVisibleTiles(activeViewport: WearRouteMapViewport) {
        val centerTileX = floor(activeViewport.centerWorldX / WearRouteMapProjection.TILE_SIZE_PX).toInt()
        val centerTileY = floor(activeViewport.centerWorldY / WearRouteMapProjection.TILE_SIZE_PX).toInt()
        val tileCount = 1 shl activeViewport.zoom
        for (dy in -1..1) {
            val tileY = centerTileY + dy
            if (tileY !in 0 until tileCount) continue
            for (dx in -1..1) {
                val tileX = centerTileX + dx
                val key = WearRouteMapTileKey(
                    zoom = activeViewport.zoom,
                    x = WearRouteMapProjection.normalizedTileX(tileX, activeViewport.zoom),
                    y = tileY,
                )
                requestTile(key)
            }
        }
    }

    private fun requestTile(key: WearRouteMapTileKey) {
        if (tiles.containsKey(key) || !tileRequests.add(key)) return
        TILE_EXECUTOR.execute {
            val bitmap = downloadTile(key)
            if (bitmap != null) tiles[key] = bitmap
            tileRequests.remove(key)
            post { invalidate() }
        }
    }

    private fun downloadTile(key: WearRouteMapTileKey): Bitmap? {
        return runCatching {
            val connection = (URL("https://tile.openstreetmap.org/${key.zoom}/${key.x}/${key.y}.png").openConnection() as HttpURLConnection)
            connection.connectTimeout = TILE_CONNECT_TIMEOUT_MS
            connection.readTimeout = TILE_READ_TIMEOUT_MS
            connection.setRequestProperty("User-Agent", "TomatoFarmWear/1.0 (personal activity tracker)")
            connection.inputStream.use(BitmapFactory::decodeStream)
        }.getOrNull()
    }

    private fun drawMapGrid(canvas: Canvas, activeViewport: WearRouteMapViewport) {
        val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(20, 63, 58)
            strokeWidth = 1f
            style = Paint.Style.STROKE
        }
        val centerTileX = floor(activeViewport.centerWorldX / WearRouteMapProjection.TILE_SIZE_PX).toInt()
        val centerTileY = floor(activeViewport.centerWorldY / WearRouteMapProjection.TILE_SIZE_PX).toInt()
        for (dy in -1..1) {
            for (dx in -1..1) {
                val left = width / 2f + ((centerTileX + dx) * WearRouteMapProjection.TILE_SIZE_PX - activeViewport.centerWorldX).toFloat()
                val top = height / 2f + ((centerTileY + dy) * WearRouteMapProjection.TILE_SIZE_PX - activeViewport.centerWorldY).toFloat()
                canvas.drawRect(
                    RectF(left, top, left + WearRouteMapProjection.TILE_SIZE_PX, top + WearRouteMapProjection.TILE_SIZE_PX),
                    gridPaint,
                )
            }
        }
    }

    private fun drawTiles(canvas: Canvas, activeViewport: WearRouteMapViewport) {
        val centerTileX = floor(activeViewport.centerWorldX / WearRouteMapProjection.TILE_SIZE_PX).toInt()
        val centerTileY = floor(activeViewport.centerWorldY / WearRouteMapProjection.TILE_SIZE_PX).toInt()
        val tileCount = 1 shl activeViewport.zoom
        for (dy in -1..1) {
            val actualY = centerTileY + dy
            if (actualY !in 0 until tileCount) continue
            for (dx in -1..1) {
                val actualX = centerTileX + dx
                val key = WearRouteMapTileKey(
                    activeViewport.zoom,
                    WearRouteMapProjection.normalizedTileX(actualX, activeViewport.zoom),
                    actualY,
                )
                val bitmap = tiles[key] ?: continue
                val left = width / 2f + (actualX * WearRouteMapProjection.TILE_SIZE_PX - activeViewport.centerWorldX).toFloat()
                val top = height / 2f + (actualY * WearRouteMapProjection.TILE_SIZE_PX - activeViewport.centerWorldY).toFloat()
                canvas.drawBitmap(
                    bitmap,
                    null,
                    RectF(left, top, left + WearRouteMapProjection.TILE_SIZE_PX, top + WearRouteMapProjection.TILE_SIZE_PX),
                    tilePaint,
                )
            }
        }
    }

    private fun drawRoute(canvas: Canvas, activeViewport: WearRouteMapViewport) {
        if (routePoints.isEmpty()) return
        routePath.reset()
        routePoints.forEachIndexed { index, point ->
            val screen = screenPoint(point, activeViewport)
            if (index == 0) {
                routePath.moveTo(screen.x.toFloat(), screen.y.toFloat())
            } else {
                routePath.lineTo(screen.x.toFloat(), screen.y.toFloat())
            }
        }
        if (routePoints.size >= 2) canvas.drawPath(routePath, routePaint)

        routePoints.firstOrNull()?.let { start ->
            val point = screenPoint(start, activeViewport)
            markerPaint.color = Color.rgb(244, 247, 255)
            markerPaint.style = Paint.Style.FILL
            canvas.drawCircle(point.x.toFloat(), point.y.toFloat(), 4f, markerPaint)
        }
        routePoints.lastOrNull()?.let { current ->
            val point = screenPoint(current, activeViewport)
            markerPaint.color = Color.rgb(15, 32, 27)
            markerPaint.style = Paint.Style.FILL
            canvas.drawCircle(point.x.toFloat(), point.y.toFloat(), 9f, markerPaint)
            markerPaint.color = Color.rgb(87, 241, 122)
            canvas.drawCircle(point.x.toFloat(), point.y.toFloat(), 6f, markerPaint)
            markerPaint.color = Color.WHITE
            canvas.drawCircle(point.x.toFloat(), point.y.toFloat(), 2.2f, markerPaint)
        }
    }

    private fun screenPoint(point: WearRoutePoint, activeViewport: WearRouteMapViewport): WearRouteMapWorldPoint {
        val world = WearRouteMapProjection.worldPoint(point, activeViewport.zoom)
        return WearRouteMapWorldPoint(
            x = width / 2.0 + world.x - activeViewport.centerWorldX,
            y = height / 2.0 + world.y - activeViewport.centerWorldY,
        )
    }

    private fun drawCenteredLabel(canvas: Canvas, text: String, color: Int) {
        labelPaint.color = color
        canvas.drawText(text, width / 2f, height / 2f + 4f, labelPaint)
    }

    private fun drawAttribution(canvas: Canvas) {
        labelPaint.color = Color.argb(210, 255, 255, 255)
        labelPaint.textAlign = Paint.Align.LEFT
        labelPaint.textSize = 7f
        canvas.drawText("© OpenStreetMap", 6f, height - 7f, labelPaint)
        labelPaint.textAlign = Paint.Align.CENTER
        labelPaint.textSize = 10f
    }

    private companion object {
        val TILE_EXECUTOR = Executors.newFixedThreadPool(2)
        const val TILE_CONNECT_TIMEOUT_MS = 4_000
        const val TILE_READ_TIMEOUT_MS = 6_000
    }
}

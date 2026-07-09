package com.lifestreak.wear.workout

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import kotlin.math.min

class WearRunPaceGraphView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var values: List<Float> = emptyList()

    fun setTrend(trend: List<WearPaceTrendPoint>) {
        values = trend
            .takeLast(MAX_TREND_POINTS)
            .map { it.secondsPerKm.toFloat() }
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val left = paddingLeft.toFloat()
        val right = (width - paddingRight).toFloat()
        val top = paddingTop.toFloat()
        val bottom = (height - paddingBottom).toFloat()
        val chartWidth = (right - left).coerceAtLeast(1f)
        val chartHeight = (bottom - top).coerceAtLeast(1f)
        val bars = values.takeIf { it.isNotEmpty() } ?: listOf(0.28f, 0.42f, 0.34f, 0.58f, 0.46f)
        val maxValue = bars.maxOrNull()?.coerceAtLeast(1f) ?: 1f
        val gap = 3f
        val barWidth = ((chartWidth - gap * (bars.size - 1)) / bars.size).coerceAtLeast(2f)

        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 1.2f
        paint.color = Color.rgb(22, 78, 86)
        canvas.drawLine(left, bottom - 1f, right, bottom - 1f, paint)

        paint.style = Paint.Style.FILL
        bars.forEachIndexed { index, rawValue ->
            val normalized = (rawValue / maxValue).coerceIn(0.08f, 1f)
            val barLeft = left + index * (barWidth + gap)
            val barTop = bottom - normalized * chartHeight
            paint.color = if (values.isEmpty()) Color.rgb(25, 96, 105) else Color.rgb(66, 220, 224)
            canvas.drawRoundRect(
                barLeft,
                barTop,
                barLeft + barWidth,
                bottom,
                2.6f,
                2.6f,
                paint,
            )
        }
    }
}

class WearRunHeartGraphView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val path = Path()
    private var values: List<Float> = emptyList()

    fun setTrend(trend: List<HeartRateSample>) {
        values = trend
            .takeLast(MAX_TREND_POINTS)
            .map { it.bpm.toFloat() }
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val left = paddingLeft.toFloat()
        val right = (width - paddingRight).toFloat()
        val top = paddingTop.toFloat()
        val bottom = (height - paddingBottom).toFloat()
        val chartWidth = (right - left).coerceAtLeast(1f)
        val chartHeight = (bottom - top).coerceAtLeast(1f)
        val samples = values.takeIf { it.size >= 2 } ?: listOf(92f, 108f, 116f, 128f, 122f, 136f)
        val minValue = samples.minOrNull() ?: 80f
        val maxValue = samples.maxOrNull()?.takeIf { it > minValue } ?: (minValue + 1f)

        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 1f
        paint.color = Color.rgb(64, 43, 35)
        for (line in 1..3) {
            val y = top + chartHeight * line / 4f
            canvas.drawLine(left, y, right, y, paint)
        }

        path.reset()
        samples.forEachIndexed { index, value ->
            val x = left + chartWidth * index / (samples.size - 1).coerceAtLeast(1)
            val y = bottom - ((value - minValue) / (maxValue - minValue)).coerceIn(0f, 1f) * chartHeight
            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        paint.strokeWidth = 3f
        paint.strokeCap = Paint.Cap.ROUND
        paint.strokeJoin = Paint.Join.ROUND
        paint.color = if (values.isEmpty()) Color.rgb(108, 68, 43) else Color.rgb(255, 128, 54)
        canvas.drawPath(path, paint)

        paint.style = Paint.Style.FILL
        val lastX = left + chartWidth
        val lastY = samples.last().let { value ->
            bottom - ((value - minValue) / (maxValue - minValue)).coerceIn(0f, 1f) * chartHeight
        }
        canvas.drawCircle(lastX, lastY, 4f, paint)
    }
}

class WearRunHeartZonesView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var rows: List<ZoneRow> = DEFAULT_ZONE_ROWS

    fun setZoneRows(zoneRows: List<WearHeartZoneRow>) {
        rows = zoneRows.toZoneRows().ifEmpty { DEFAULT_ZONE_ROWS }
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val left = paddingLeft.toFloat()
        val right = (width - paddingRight).toFloat()
        val top = paddingTop.toFloat()
        val rowHeight = ((height - paddingTop - paddingBottom).toFloat() / 5f).coerceAtLeast(14f)
        val barLeft = left + 28f
        val timeRight = right
        val barRight = (right - 38f).coerceAtLeast(barLeft + 1f)

        rows.take(5).forEachIndexed { index, row ->
            val centerY = top + rowHeight * index + rowHeight / 2f
            paint.style = Paint.Style.FILL
            paint.textAlign = Paint.Align.LEFT
            paint.textSize = 11f
            paint.color = Color.rgb(214, 218, 230)
            canvas.drawText(row.label, left, centerY + 4f, paint)

            val track = RectF(barLeft, centerY - 5f, barRight, centerY + 5f)
            paint.color = Color.rgb(30, 34, 44)
            canvas.drawRoundRect(track, 5f, 5f, paint)

            val fillRight = barLeft + (barRight - barLeft) * row.fraction.coerceIn(0f, 1f)
            paint.color = row.color
            canvas.drawRoundRect(RectF(barLeft, centerY - 5f, fillRight, centerY + 5f), 5f, 5f, paint)

            paint.textAlign = Paint.Align.RIGHT
            paint.textSize = 10f
            paint.color = Color.rgb(124, 132, 153)
            canvas.drawText(row.timeText, timeRight, centerY + 4f, paint)
        }
    }
}

class WearRunRouteView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val path = Path()
    private var points: List<RoutePoint> = emptyList()

    fun setRouteProjection(routeProjection: WearRouteProjection) {
        points = routeProjection.points.map { point ->
            RoutePoint(
                x = point.x.toFloat(),
                y = point.y.toFloat(),
            )
        }
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val left = paddingLeft.toFloat() + 4f
        val right = (width - paddingRight).toFloat() - 4f
        val top = paddingTop.toFloat() + 4f
        val bottom = (height - paddingBottom).toFloat() - 4f
        val centerX = (left + right) / 2f
        val centerY = (top + bottom) / 2f
        val radius = min(right - left, bottom - top) / 2f

        paint.style = Paint.Style.FILL
        paint.color = Color.rgb(8, 16, 14)
        canvas.drawCircle(centerX, centerY, radius.coerceAtLeast(1f), paint)

        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 1f
        paint.color = Color.rgb(22, 56, 43)
        canvas.drawCircle(centerX, centerY, radius * 0.72f, paint)
        canvas.drawCircle(centerX, centerY, radius * 0.42f, paint)

        if (points.size < 2) {
            paint.style = Paint.Style.FILL
            paint.textAlign = Paint.Align.CENTER
            paint.textSize = 11f
            paint.color = Color.rgb(124, 132, 153)
            canvas.drawText("GPS 대기", centerX, centerY + 4f, paint)
            return
        }

        path.reset()
        points.forEachIndexed { index, point ->
            val x = left + point.x.coerceIn(0f, 1f) * (right - left)
            val y = top + point.y.coerceIn(0f, 1f) * (bottom - top)
            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 4f
        paint.strokeCap = Paint.Cap.ROUND
        paint.strokeJoin = Paint.Join.ROUND
        paint.color = Color.rgb(87, 241, 122)
        canvas.drawPath(path, paint)

        paint.style = Paint.Style.FILL
        paint.color = Color.rgb(244, 247, 255)
        points.firstOrNull()?.let { start ->
            canvas.drawCircle(left + start.x * (right - left), top + start.y * (bottom - top), 4f, paint)
        }
        paint.color = Color.rgb(87, 241, 122)
        points.lastOrNull()?.let { current ->
            canvas.drawCircle(left + current.x * (right - left), top + current.y * (bottom - top), 5f, paint)
        }
    }
}

private const val MAX_TREND_POINTS = 18

private data class ZoneRow(
    val label: String,
    val timeText: String,
    val fraction: Float,
    val color: Int,
)

private data class RoutePoint(
    val x: Float,
    val y: Float,
)

private val DEFAULT_ZONE_ROWS = listOf(
    ZoneRow("Z5", "--", 0f, Color.rgb(255, 78, 78)),
    ZoneRow("Z4", "--", 0f, Color.rgb(255, 129, 54)),
    ZoneRow("Z3", "--", 0f, Color.rgb(255, 190, 64)),
    ZoneRow("Z2", "--", 0f, Color.rgb(108, 215, 116)),
    ZoneRow("Z1", "--", 0f, Color.rgb(87, 166, 255)),
)

private fun List<WearHeartZoneRow>.toZoneRows(): List<ZoneRow> {
    val maxDurationMs = maxOfOrNull { it.durationMs }?.takeIf { it > 0L } ?: 1L
    return mapIndexedNotNull { index, row ->
        val default = DEFAULT_ZONE_ROWS.getOrNull(index) ?: return@mapIndexedNotNull null
        ZoneRow(
            label = "Z${row.zoneLabel}",
            timeText = row.durationText,
            fraction = row.durationMs.toFloat() / maxDurationMs,
            color = default.color,
        )
    }
}

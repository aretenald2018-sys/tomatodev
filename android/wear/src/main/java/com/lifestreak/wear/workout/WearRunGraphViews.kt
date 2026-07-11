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
        if (values.isEmpty()) {
            drawEmptyState(canvas, left, right, top, bottom, "페이스 수집 중")
            return
        }
        val bars = values
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
        if (values.size < 2) {
            drawEmptyState(canvas, left, right, top, bottom, "심박 수집 중")
            return
        }
        val samples = values
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
    private var rows: List<ZoneRow> = emptyList()

    fun setZoneRows(zoneRows: List<WearHeartZoneRow>) {
        rows = zoneRows.toZoneRows()
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (rows.isEmpty()) {
            drawEmptyState(
                canvas,
                paddingLeft.toFloat(),
                (width - paddingRight).toFloat(),
                paddingTop.toFloat(),
                (height - paddingBottom).toFloat(),
                "심박 수집 중",
            )
            return
        }
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

private const val MAX_TREND_POINTS = 18

private data class ZoneRow(
    val label: String,
    val timeText: String,
    val fraction: Float,
    val color: Int,
)

private val HEART_ZONE_COLORS = listOf(
    Color.rgb(255, 78, 78),
    Color.rgb(255, 129, 54),
    Color.rgb(255, 190, 64),
    Color.rgb(108, 215, 116),
    Color.rgb(87, 166, 255),
)

private fun List<WearHeartZoneRow>.toZoneRows(): List<ZoneRow> {
    val maxDurationMs = maxOfOrNull { it.durationMs }?.takeIf { it > 0L } ?: 1L
    return mapIndexedNotNull { index, row ->
        val color = HEART_ZONE_COLORS.getOrNull(index) ?: return@mapIndexedNotNull null
        ZoneRow(
            label = "Z${row.zoneLabel}",
            timeText = row.durationText,
            fraction = row.durationMs.toFloat() / maxDurationMs,
            color = color,
        )
    }
}

private fun drawEmptyState(
    canvas: Canvas,
    left: Float,
    right: Float,
    top: Float,
    bottom: Float,
    text: String,
) {
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(124, 132, 153)
        textAlign = Paint.Align.CENTER
        textSize = 11f
        style = Paint.Style.FILL
    }
    canvas.drawText(text, (left + right) / 2f, (top + bottom) / 2f + 4f, paint)
}

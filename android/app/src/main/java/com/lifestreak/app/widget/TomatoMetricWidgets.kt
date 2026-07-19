package com.lifestreak.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import com.lifestreak.app.MainActivity
import com.lifestreak.app.R
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

class FoodIntakeWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) =
        ids.forEach { TomatoMetricWidgetRenderer.update(context, manager, it, javaClass) }
}

class HealthGoalWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) =
        ids.forEach { TomatoMetricWidgetRenderer.update(context, manager, it, javaClass) }
}

class RunningTrendWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) =
        ids.forEach { TomatoMetricWidgetRenderer.update(context, manager, it, javaClass) }
}

object TomatoMetricWidgetRenderer {
    private const val STALE_AFTER_MS = 12L * 60L * 60L * 1000L

    fun update(context: Context, manager: AppWidgetManager, widgetId: Int, provider: Class<*>) {
        val views = RemoteViews(context.packageName, R.layout.widget_tomato_metric)
        val (sectionKey, title, action, requestOffset) = when (provider) {
            FoodIntakeWidget::class.java -> Quadruple("food", "일일 음식 섭취", "diet", 0)
            HealthGoalWidget::class.java -> Quadruple("strength", "주간 헬스 목표", "season-overview", 1)
            else -> Quadruple("running", "러닝 추이", "running", 2)
        }
        views.setOnClickPendingIntent(R.id.tomato_metric_widget_root, openIntent(context, action, widgetId * 10 + requestOffset))
        val raw = SeasonWidgetStore.read(context)
        if (raw.isNullOrBlank()) renderEmpty(views, title)
        else try { renderSnapshot(views, JSONObject(raw), sectionKey, title) }
        catch (_: Exception) { renderEmpty(views, title) }
        manager.updateAppWidget(widgetId, views)
    }

    private fun openIntent(context: Context, action: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            putExtra("widgetAction", action)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= 23) flags = flags or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getActivity(context, requestCode, intent, flags)
    }

    private fun renderSnapshot(views: RemoteViews, snapshot: JSONObject, key: String, title: String) {
        val section = snapshot.optJSONObject(key) ?: run {
            renderEmpty(views, title)
            return
        }
        val generatedAt = snapshot.optLong("generatedAt", 0L)
        views.setTextViewText(R.id.tomato_metric_widget_kicker, "TOMATO DEV")
        views.setTextViewText(R.id.tomato_metric_widget_title, title)
        views.setTextViewText(R.id.tomato_metric_widget_meta, metaFor(key, section))
        if (generatedAt <= 0L) {
            renderEmpty(views, title)
            return
        }
        when (key) {
            "food" -> renderFood(views, section)
            "strength" -> renderStrength(views, section)
            else -> renderRunning(views, section)
        }
        views.setTextViewText(
            R.id.tomato_metric_widget_sync,
            if (System.currentTimeMillis() - generatedAt > STALE_AFTER_MS) {
                "마지막 동기화 ${SimpleDateFormat("MM/dd HH:mm", Locale.KOREA).format(Date(generatedAt))}"
            } else {
                "${SimpleDateFormat("HH:mm", Locale.KOREA).format(Date(generatedAt))} 동기화"
            },
        )
    }

    private fun renderFood(views: RemoteViews, food: JSONObject) {
        val actual = food.optInt("actualKcal", 0)
        val target = food.optInt("targetKcal", 0)
        views.setTextViewText(R.id.tomato_metric_widget_value, if (target > 0) "$actual / $target kcal" else "$actual kcal")
        views.setProgressBar(R.id.tomato_metric_widget_progress, 100, food.optInt("progress", 0).coerceIn(0, 100), false)
        views.setTextViewText(R.id.tomato_metric_widget_detail, "P${food.optInt("proteinG", 0)} · C${food.optInt("carbsG", 0)} · F${food.optInt("fatG", 0)}")
        views.setTextViewText(R.id.tomato_metric_widget_secondary, "기록된 식사 ${food.optInt("recordedMeals", 0)}회")
    }

    private fun renderStrength(views: RemoteViews, strength: JSONObject) {
        val sessions = strength.optJSONObject("sessions") ?: JSONObject()
        val actual = sessions.optInt("actual", 0)
        val target = sessions.optInt("target", 0)
        views.setTextViewText(R.id.tomato_metric_widget_value, "운동 $actual / $target회")
        views.setProgressBar(R.id.tomato_metric_widget_progress, 100, percent(sessions), false)
        val volume = strength.optJSONObject("volumeTrend")
        val volumeText = volume?.takeIf { it.optString("status") == "ready" }?.let { signed(it.optDouble("volumeDeltaPct", 0.0), "% 볼륨") } ?: "볼륨 기준 수집 중"
        views.setTextViewText(R.id.tomato_metric_widget_detail, volumeText)
        views.setTextViewText(R.id.tomato_metric_widget_secondary, "1RM ${signed(strength.optDouble("liftDeltaKg", Double.NaN), "kg")}")
    }

    private fun renderRunning(views: RemoteViews, running: JSONObject) {
        val distance = running.optJSONObject("distance") ?: JSONObject()
        val sessions = running.optJSONObject("sessions") ?: JSONObject()
        views.setTextViewText(R.id.tomato_metric_widget_value, "${number(distance.optDouble("actual", 0.0))} / ${number(distance.optDouble("target", 0.0))} km")
        views.setProgressBar(R.id.tomato_metric_widget_progress, 100, percent(distance), false)
        val trend = running.optJSONObject("trend")
        val trendText = trend?.takeIf { it.optString("status") == "ready" }?.let {
            "거리 ${signed(it.optDouble("distanceDeltaPct", 0.0), "%")}"
        } ?: "최근 추이 기준 수집 중"
        views.setTextViewText(R.id.tomato_metric_widget_detail, trendText)
        views.setTextViewText(R.id.tomato_metric_widget_secondary, "${sessions.optInt("actual", 0)} / ${sessions.optInt("target", 0)}회 · ${paceText(running)}")
    }

    private fun renderEmpty(views: RemoteViews, title: String) {
        views.setTextViewText(R.id.tomato_metric_widget_kicker, "TOMATO DEV")
        views.setTextViewText(R.id.tomato_metric_widget_title, title)
        views.setTextViewText(R.id.tomato_metric_widget_meta, "앱 기록을 기다리는 중")
        views.setTextViewText(R.id.tomato_metric_widget_value, "아직 기록 없음")
        views.setProgressBar(R.id.tomato_metric_widget_progress, 100, 0, false)
        views.setTextViewText(R.id.tomato_metric_widget_detail, "앱을 열어 오늘 데이터를 동기화하세요")
        views.setTextViewText(R.id.tomato_metric_widget_secondary, "")
        views.setTextViewText(R.id.tomato_metric_widget_sync, "동기화 대기")
    }

    private fun metaFor(key: String, section: JSONObject): String = when (key) {
        "food" -> section.optString("dateKey", "오늘")
        "strength" -> "이번 주"
        else -> "이번 주"
    }

    private fun percent(value: JSONObject): Int = value.optDouble("percent", 0.0).roundToInt().coerceIn(0, 100)

    private fun number(value: Double, digits: Int = 1): String {
        if (!value.isFinite()) return "0"
        val formatted = String.format(Locale.KOREA, "%.${digits}f", value)
        return if (digits == 0) formatted else formatted.trimEnd('0').trimEnd('.')
    }

    private fun signed(value: Double, suffix: String): String {
        if (!value.isFinite()) return "기준 수집 중"
        val sign = if (value > 0) "+" else ""
        return "$sign${number(value)}$suffix"
    }

    private fun paceText(running: JSONObject): String {
        val goal = running.optJSONObject("goal") ?: return "페이스 기준 수집 중"
        val actual = goal.optDouble("actualPaceSecPerKm", Double.NaN)
        val target = goal.optDouble("targetPaceSecPerKm", Double.NaN)
        return if (actual.isFinite() && target.isFinite()) "페이스 ${number(actual - target, 0)}초 차이" else "페이스 기준 수집 중"
    }

    private data class Quadruple(val first: String, val second: String, val third: String, val fourth: Int)
}

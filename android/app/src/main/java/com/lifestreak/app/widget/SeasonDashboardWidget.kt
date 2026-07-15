package com.lifestreak.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import androidx.core.content.ContextCompat
import com.lifestreak.app.MainActivity
import com.lifestreak.app.R
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

class SeasonDashboardWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { update(context, manager, it) }
    }

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
        update(context, manager, id)
    }

    companion object {
        private const val STALE_AFTER_MS = 12L * 60L * 60L * 1000L

        private fun actionIntent(context: Context, action: String, requestCode: Int): PendingIntent {
            val intent = Intent(context, MainActivity::class.java).apply {
                putExtra("widgetAction", action)
                putExtra("tab", "workout")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        private fun number(value: Double, digits: Int = 1): String {
            if (!value.isFinite()) return "0"
            return if (digits == 0 || value % 1.0 == 0.0) value.roundToInt().toString()
            else String.format(Locale.KOREA, "%.1f", value)
        }

        private fun signed(value: Double?, suffix: String): String {
            if (value == null || !value.isFinite()) return "기준 수집 중"
            val sign = if (value > 0) "+" else ""
            return "$sign${number(value)}$suffix"
        }

        private fun progress(value: JSONObject?): Int =
            (value?.optDouble("percent", 0.0) ?: 0.0).roundToInt().coerceIn(0, 100)

        private fun renderWeek(context: Context, views: RemoteViews, rows: JSONArray?) {
            val dayIds = intArrayOf(R.id.widget_day_1, R.id.widget_day_2, R.id.widget_day_3, R.id.widget_day_4, R.id.widget_day_5, R.id.widget_day_6, R.id.widget_day_7)
            for (index in dayIds.indices) {
                val row = rows?.optJSONObject(index)
                val inSeason = row?.optBoolean("inSeason", false) == true
                val done = row?.optBoolean("done", false) == true
                val today = row?.optBoolean("today", false) == true
                views.setTextViewText(dayIds[index], if (!inSeason) "·" else if (done) "●" else "○")
                val color = when {
                    done -> R.color.widget_success
                    today -> R.color.widget_accent
                    else -> R.color.widget_muted
                }
                views.setTextColor(dayIds[index], ContextCompat.getColor(context, color))
            }
        }

        private fun renderEmpty(context: Context, views: RemoteViews, message: String) {
            views.setTextViewText(R.id.widget_season_title, "운동 시즌")
            views.setTextViewText(R.id.widget_season_meta, message)
            views.setTextViewText(R.id.widget_streak, "🔥 —")
            views.setTextViewText(R.id.widget_today_state, "앱에서 시즌 시작")
            views.setTextViewText(R.id.widget_running_value, "러닝 목표 —")
            views.setTextViewText(R.id.widget_running_detail, "새 시즌 계획이 필요합니다")
            views.setTextViewText(R.id.widget_strength_value, "헬스 목표 —")
            views.setTextViewText(R.id.widget_strength_detail, "새 시즌 계획이 필요합니다")
            views.setTextViewText(R.id.widget_next_plan, "앱을 열어 시즌을 설정하세요")
            views.setTextViewText(R.id.widget_sync_time, "동기화 대기")
            views.setProgressBar(R.id.widget_running_progress, 100, 0, false)
            views.setProgressBar(R.id.widget_strength_progress, 100, 0, false)
            renderWeek(context, views, null)
        }

        private fun renderSnapshot(context: Context, views: RemoteViews, snapshot: JSONObject) {
            val generatedAt = snapshot.optLong("generatedAt", 0L)
            if (generatedAt <= 0L || System.currentTimeMillis() - generatedAt > STALE_AFTER_MS) {
                renderEmpty(context, views, "업데이트가 필요합니다")
                views.setTextViewText(R.id.widget_today_state, "앱을 열어 업데이트")
                views.setTextViewText(R.id.widget_sync_time, "오래된 데이터")
                return
            }
            if (snapshot.optString("state") != "ready") {
                renderEmpty(context, views, snapshot.optString("message", "새 시즌을 설정해 주세요"))
                return
            }

            val season = snapshot.optJSONObject("season") ?: JSONObject()
            val streak = snapshot.optJSONObject("streak") ?: JSONObject()
            val running = snapshot.optJSONObject("running") ?: JSONObject()
            val strength = snapshot.optJSONObject("strength") ?: JSONObject()
            val nextPlan = snapshot.optJSONObject("nextPlan") ?: JSONObject()
            val week = season.optInt("week", 0)
            val days = season.optInt("daysRemaining", 0)
            views.setTextViewText(R.id.widget_season_title, season.optString("name", "운동 시즌"))
            views.setTextViewText(R.id.widget_season_meta, listOfNotNull(if (week > 0) "W$week" else null, "${days}일 남음").joinToString(" · "))
            views.setTextViewText(R.id.widget_streak, "🔥 ${streak.optInt("current", 0)}일 연속")
            views.setTextViewText(R.id.widget_today_state, if (streak.optBoolean("todayDone", false)) "오늘 완료" else "오늘 기록 전")
            renderWeek(context, views, streak.optJSONArray("week"))

            val runDistance = running.optJSONObject("distance") ?: JSONObject()
            val runSessions = running.optJSONObject("sessions") ?: JSONObject()
            views.setTextViewText(R.id.widget_running_value, "${number(runDistance.optDouble("actual", 0.0))} / ${number(runDistance.optDouble("target", 0.0))} km")
            val runTrend = running.optJSONObject("trend")
            val runTrendText = if (runTrend?.optString("status") == "ready") {
                val pace = runTrend.optDouble("paceImprovementSecPerKm", Double.NaN).takeIf { it.isFinite() }
                if (pace != null) "최근 페이스 ${signed(pace, "초 향상")}" else "거리 ${signed(runTrend.optDouble("distanceDeltaPct", 0.0), "%")}"
            } else "기준 수집 중"
            views.setTextViewText(R.id.widget_running_detail, "${runSessions.optInt("actual", 0)} / ${runSessions.optInt("target", 0)}회 · $runTrendText")
            views.setProgressBar(R.id.widget_running_progress, 100, progress(runDistance), false)

            val strengthSessions = strength.optJSONObject("sessions") ?: JSONObject()
            views.setTextViewText(R.id.widget_strength_value, "계획 ${strengthSessions.optInt("actual", 0)} / ${strengthSessions.optInt("target", 0)}")
            val volumeTrend = strength.optJSONObject("volumeTrend")
            val volumeText = if (volumeTrend?.optString("status") == "ready") signed(volumeTrend.optDouble("volumeDeltaPct", 0.0), "% 볼륨") else "볼륨 기준 수집 중"
            val lift = strength.optDouble("liftDeltaKg", Double.NaN).takeIf { it.isFinite() }
            views.setTextViewText(R.id.widget_strength_detail, "$volumeText · 1RM ${signed(lift, "kg")}")
            views.setProgressBar(R.id.widget_strength_progress, 100, progress(strengthSessions), false)
            views.setTextViewText(R.id.widget_next_plan, "${nextPlan.optString("health", "헬스 계획")} · ${nextPlan.optString("running", "러닝 계획")}")
            views.setTextViewText(R.id.widget_sync_time, "${SimpleDateFormat("HH:mm", Locale.KOREA).format(Date(generatedAt))} 동기화")
        }

        fun update(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val options = manager.getAppWidgetOptions(widgetId)
            val compact = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 360) < 300
            val layout = if (compact) R.layout.widget_season_dashboard_compact else R.layout.widget_season_dashboard
            val views = RemoteViews(context.packageName, layout)
            views.setOnClickPendingIntent(R.id.widget_root, actionIntent(context, "workout", widgetId * 10))
            views.setOnClickPendingIntent(R.id.widget_refresh, actionIntent(context, "refresh", widgetId * 10 + 1))
            views.setOnClickPendingIntent(R.id.widget_running_card, actionIntent(context, "running", widgetId * 10 + 2))
            views.setOnClickPendingIntent(R.id.widget_strength_card, actionIntent(context, "workout", widgetId * 10 + 3))
            val raw = SeasonWidgetStore.read(context)
            if (raw.isNullOrBlank()) renderEmpty(context, views, "앱을 열어 동기화하세요")
            else try { renderSnapshot(context, views, JSONObject(raw)) }
            catch (_: Exception) { renderEmpty(context, views, "데이터를 다시 동기화하세요") }
            views.setViewVisibility(R.id.widget_next_section, if (compact) View.GONE else View.VISIBLE)
            manager.updateAppWidget(widgetId, views)
        }
    }
}

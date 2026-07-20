package com.lifestreak.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.RemoteViews
import com.lifestreak.app.MainActivity
import com.lifestreak.app.R
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
                context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        private fun number(value: Double, digits: Int = 1): String {
            if (!value.isFinite()) return "0"
            return String.format(Locale.KOREA, if (digits == 0) "%.0f" else "%.1f", value)
        }

        private fun signed(value: Double?, suffix: String): String {
            if (value == null || !value.isFinite()) return "집계 중"
            return (if (value > 0) "+" else "") + number(value) + suffix
        }

        private fun progress(metric: JSONObject?, field: String = "percent"): Int {
            return (metric?.optDouble(field, 0.0) ?: 0.0).roundToInt().coerceIn(0, 100)
        }

        private fun empty(views: RemoteViews, message: String, sync: String = "동기화 대기") {
            views.setTextViewText(R.id.widget_season_title, "오늘/이번 주 요약")
            views.setTextViewText(R.id.widget_season_meta, message)
            views.setTextViewText(R.id.widget_diet_value, "식단 목표 미설정")
            views.setTextViewText(R.id.widget_diet_macros, "식단 목표를 설정하면 진행률이 표시됩니다")
            views.setTextViewText(R.id.widget_diet_meals, "오늘 식단 기록을 기다리는 중")
            views.setProgressBar(R.id.widget_diet_progress, 100, 0, false)
            views.setTextViewText(R.id.widget_strength_value, "근력 —")
            views.setTextViewText(R.id.widget_strength_detail, message)
            views.setProgressBar(R.id.widget_strength_progress, 100, 0, false)
            views.setTextViewText(R.id.widget_running_value, "러닝 —")
            views.setTextViewText(R.id.widget_running_detail, message)
            views.setProgressBar(R.id.widget_running_progress, 100, 0, false)
            views.setTextViewText(R.id.widget_change_protein, "—")
            views.setTextViewText(R.id.widget_change_protein_detail, "단백질 평균")
            views.setTextViewText(R.id.widget_change_strength, "—")
            views.setTextViewText(R.id.widget_change_strength_detail, "근력 볼륨")
            views.setTextViewText(R.id.widget_change_running, "—")
            views.setTextViewText(R.id.widget_change_running_detail, "러닝 거리")
            views.setTextViewText(R.id.widget_sync_time, sync)
        }

        private fun render(views: RemoteViews, snapshot: JSONObject) {
            val created = snapshot.optLong("generatedAt", 0L)
            if (created <= 0L || System.currentTimeMillis() - created > STALE_AFTER_MS) {
                empty(views, "앱을 열어 업데이트하세요", "오래된 데이터")
                return
            }
            if (snapshot.optString("state") != "ready") {
                empty(views, snapshot.optString("message", "새 시즌을 설정해 주세요"))
                return
            }

            val season = snapshot.optJSONObject("season") ?: JSONObject()
            val diet = snapshot.optJSONObject("diet") ?: JSONObject()
            val strength = snapshot.optJSONObject("strength") ?: JSONObject()
            val running = snapshot.optJSONObject("running") ?: JSONObject()
            val week = season.optInt("week", 0)
            val seasonName = season.optString("name", "")
            views.setTextViewText(R.id.widget_season_title, "오늘/이번 주 요약")
            views.setTextViewText(
                R.id.widget_season_meta,
                if (seasonName.isBlank()) "운동 시즌" else seasonName + if (week > 0) " · W" + week else "",
            )

            if (diet.optString("state") == "ready") {
                val today = diet.optJSONObject("today") ?: JSONObject()
                val actual = today.optJSONObject("actual") ?: JSONObject()
                val target = today.optJSONObject("target") ?: JSONObject()
                val p = today.optJSONObject("progress") ?: JSONObject()
                views.setTextViewText(
                    R.id.widget_diet_value,
                    String.format(Locale.KOREA, "%,.0f / %,.0f kcal", actual.optDouble("kcal", 0.0), target.optDouble("kcal", 0.0)),
                )
                views.setTextViewText(
                    R.id.widget_diet_macros,
                    "탄 " + number(actual.optDouble("carbsG", 0.0), 0) + "/" + number(target.optDouble("carbsG", 0.0), 0) +
                        " · 단 " + number(actual.optDouble("proteinG", 0.0), 0) + "/" + number(target.optDouble("proteinG", 0.0), 0) +
                        " · 지 " + number(actual.optDouble("fatG", 0.0), 0) + "/" + number(target.optDouble("fatG", 0.0), 0),
                )
                views.setTextViewText(
                    R.id.widget_diet_meals,
                    actual.optInt("mealCount", 0).toString() + " / " + target.optInt("mealCount", 4) + "끼 기록",
                )
                views.setProgressBar(R.id.widget_diet_progress, 100, progress(p, "kcal"), false)
            } else {
                views.setTextViewText(R.id.widget_diet_value, diet.optString("message", "식단 목표 미설정"))
                views.setTextViewText(R.id.widget_diet_macros, "오늘 식단 목표를 설정해 주세요")
                views.setTextViewText(R.id.widget_diet_meals, "기록이 저장되면 여기에 표시됩니다")
                views.setProgressBar(R.id.widget_diet_progress, 100, 0, false)
            }

            val ss = strength.optJSONObject("sessions") ?: JSONObject()
            if (strength.optInt("benchmarkCount", 0) <= 0) {
                views.setTextViewText(R.id.widget_strength_value, "종목 미등록")
                views.setTextViewText(R.id.widget_strength_detail, "벤치마크를 등록해 주세요")
                views.setProgressBar(R.id.widget_strength_progress, 100, 0, false)
            } else {
                val actual = ss.optInt("actual", 0)
                val target = ss.optInt("target", 0)
                views.setTextViewText(R.id.widget_strength_value, actual.toString() + " / " + target + "회 달성")
                val trend = strength.optJSONObject("volumeTrend")
                val detail = if (trend?.optString("status") == "ready") {
                    signed(trend.optDouble("volumeDeltaPct", Double.NaN), "%")
                } else {
                    "볼륨 " + number(strength.optDouble("totalVolumeKg", 0.0), 0) + "kg"
                }
                views.setTextViewText(R.id.widget_strength_detail, detail)
                views.setProgressBar(R.id.widget_strength_progress, 100, progress(ss), false)
            }

            val distance = running.optJSONObject("distance") ?: JSONObject()
            val sessions = running.optJSONObject("sessions") ?: JSONObject()
            val runDistance = distance.optDouble("actual", 0.0)
            val runTarget = distance.optDouble("target", 0.0)
            val runSessions = sessions.optInt("actual", 0)
            val runTargetSessions = sessions.optInt("target", 0)
            if (runTarget <= 0.0 && runTargetSessions <= 0) {
                views.setTextViewText(R.id.widget_running_value, "러닝 계획 없음")
                views.setTextViewText(R.id.widget_running_detail, "이번 주 계획을 설정해 주세요")
                views.setProgressBar(R.id.widget_running_progress, 100, 0, false)
            } else if (runDistance <= 0.0 && runSessions <= 0) {
                views.setTextViewText(R.id.widget_running_value, "기록 없음")
                views.setTextViewText(R.id.widget_running_detail, "러닝을 기록하면 현황이 표시됩니다")
                views.setProgressBar(R.id.widget_running_progress, 100, 0, false)
            } else {
                views.setTextViewText(
                    R.id.widget_running_value,
                    String.format(Locale.KOREA, "%.1f / %.1f km", runDistance, runTarget),
                )
                val trend = running.optJSONObject("trend")
                val detail = if (trend?.optString("status") == "ready") {
                    signed(trend.optDouble("distanceDeltaPct", Double.NaN), "%")
                } else "기준 수집 중"
                views.setTextViewText(R.id.widget_running_detail, runSessions.toString() + " / " + runTargetSessions + "회 · " + detail)
                views.setProgressBar(R.id.widget_running_progress, 100, progress(distance), false)
            }

            val protein = diet.optJSONObject("proteinChange") ?: JSONObject()
            val proteinDelta = protein.optDouble("deltaPct", Double.NaN)
            views.setTextViewText(
                R.id.widget_change_protein,
                if (protein.optString("status") == "ready" && proteinDelta.isFinite()) signed(proteinDelta, "%") else "집계 중",
            )
            val volume = strength.optJSONObject("volumeTrend")
            val volumeDelta = volume?.optDouble("volumeDeltaPct", Double.NaN) ?: Double.NaN
            val liftDelta = strength.optDouble("liftDeltaKg", Double.NaN)
            views.setTextViewText(
                R.id.widget_change_strength,
                when {
                    volume?.optString("status") == "ready" && volumeDelta.isFinite() -> signed(volumeDelta, "%")
                    liftDelta.isFinite() -> signed(liftDelta, "kg")
                    else -> "집계 중"
                },
            )
            val runTrend = running.optJSONObject("trend")
            val runDelta = runTrend?.optDouble("distanceDeltaPct", Double.NaN) ?: Double.NaN
            views.setTextViewText(
                R.id.widget_change_running,
                if (runTrend?.optString("status") == "ready" && runDelta.isFinite()) signed(runDelta, "%") else "집계 중",
            )
            views.setTextViewText(R.id.widget_sync_time, SimpleDateFormat("HH:mm", Locale.KOREA).format(Date(created)) + " 동기화")
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
            if (raw.isNullOrBlank()) empty(views, "앱을 열어 동기화하세요")
            else try { render(views, JSONObject(raw)) } catch (_: Exception) { empty(views, "데이터를 다시 동기화하세요") }
            manager.updateAppWidget(widgetId, views)
        }
    }
}

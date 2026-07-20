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

        private fun pace(value: Double?): String {
            if (value == null || !value.isFinite() || value <= 0) return "\u2014"
            val total = value.roundToInt()
            return (total / 60).toString() + "'" + String.format(Locale.KOREA, "%02d", total % 60) + "\""
        }

        private fun strengthChecks(views: RemoteViews, strength: JSONObject, completed: Int) {
            val ids = intArrayOf(
                R.id.widget_strength_check_1,
                R.id.widget_strength_check_2,
                R.id.widget_strength_check_3,
                R.id.widget_strength_check_4,
                R.id.widget_strength_check_5,
            )
            val lifts = strength.optJSONArray("liftDeltas")
            ids.forEachIndexed { index, id ->
                val row = lifts?.optJSONObject(index)
                val label = row?.optString("label")?.takeIf { it.isNotBlank() }
                    ?: row?.optString("name")?.takeIf { it.isNotBlank() }
                    ?: "\uC885\uBAA9 \uBAA9\uD45C"
                val done = row != null && index < completed
                views.setTextViewText(id, (if (done) "\u2713 " else "\u25CB ") + label)
            }
        }

        private fun empty(views: RemoteViews, message: String, sync: String = "동기화 대기") {
            views.setTextViewText(R.id.widget_season_title, "오늘/이번 주 요약")
            views.setTextViewText(R.id.widget_season_meta, message)
            views.setTextViewText(R.id.widget_diet_value, "\u2014")
            views.setTextViewText(R.id.widget_diet_kcal_target, "\uBAA9\uD45C \uBBF8\uC124\uC815")
            views.setTextViewText(R.id.widget_diet_kcal_percent, "0%")
            views.setTextViewText(R.id.widget_diet_meals, "\uAE30\uB85D\uD55C \uC2DD\uC0AC 0\uD68C")
            listOf(
                R.id.widget_diet_carbs_value,
                R.id.widget_diet_protein_value,
                R.id.widget_diet_fat_value,
            ).forEach { views.setTextViewText(it, "\u2014") }
            listOf(
                R.id.widget_diet_carbs_percent,
                R.id.widget_diet_protein_percent,
                R.id.widget_diet_fat_percent,
            ).forEach { views.setTextViewText(it, "0%") }
            listOf(
                R.id.widget_diet_carbs_progress,
                R.id.widget_diet_protein_progress,
                R.id.widget_diet_fat_progress,
            ).forEach { views.setProgressBar(it, 100, 0, false) }
            views.setTextViewText(R.id.widget_diet_macros, "")
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
            views.setTextViewText(R.id.widget_change_protein_detail, "\uD0C4\uBC31\uC9C8 \uBAA9\uD45C \uCDA9\uC871\uB960")
            views.setTextViewText(R.id.widget_change_protein_note, "\uC9C0\uB09C\uC8FC \uB300\uBE44")
            views.setTextViewText(R.id.widget_change_strength_detail, "\uC2E0\uADDC \uC6B4\uB3D9 \uBAA9\uD45C")
            views.setTextViewText(R.id.widget_change_strength_note, "\uC9C0\uB09C\uC8FC 2 / 5")
            views.setTextViewText(R.id.widget_change_running_detail, "\uD3C9\uADE0 \uD398\uC774\uC2A4 \uAC1C\uC120")
            views.setTextViewText(R.id.widget_change_running_note, "\uC9C0\uB09C\uC8FC \uB300\uBE44")
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
                val kcalProgress = progress(p, "kcal")
                views.setTextViewText(R.id.widget_diet_value, number(actual.optDouble("kcal", 0.0), 0))
                views.setTextViewText(R.id.widget_diet_kcal_target, String.format(Locale.KOREA, "/ %,.0f kcal", target.optDouble("kcal", 0.0)))
                views.setTextViewText(R.id.widget_diet_kcal_percent, kcalProgress.toString() + "%")
                views.setTextViewText(R.id.widget_diet_meals, "\uAE30\uB85D\uD55C \uC2DD\uC0AC " + actual.optInt("mealCount", 0) + "\uD68C")
                views.setTextViewText(R.id.widget_diet_macros, "")
                views.setTextViewText(R.id.widget_diet_carbs_value, number(actual.optDouble("carbsG", 0.0), 0) + " / " + number(target.optDouble("carbsG", 0.0), 0) + " g")
                views.setTextViewText(R.id.widget_diet_carbs_percent, progress(p, "carbs").toString() + "%")
                views.setProgressBar(R.id.widget_diet_carbs_progress, 100, progress(p, "carbs"), false)
                views.setTextViewText(R.id.widget_diet_protein_value, number(actual.optDouble("proteinG", 0.0), 0) + " / " + number(target.optDouble("proteinG", 0.0), 0) + " g")
                views.setTextViewText(R.id.widget_diet_protein_percent, progress(p, "protein").toString() + "%")
                views.setProgressBar(R.id.widget_diet_protein_progress, 100, progress(p, "protein"), false)
                views.setTextViewText(R.id.widget_diet_fat_value, number(actual.optDouble("fatG", 0.0), 0) + " / " + number(target.optDouble("fatG", 0.0), 0) + " g")
                views.setTextViewText(R.id.widget_diet_fat_percent, progress(p, "fat").toString() + "%")
                views.setProgressBar(R.id.widget_diet_fat_progress, 100, progress(p, "fat"), false)
                views.setProgressBar(R.id.widget_diet_progress, 100, kcalProgress, false)
            } else {
                views.setTextViewText(R.id.widget_diet_value, "\u2014")
                views.setTextViewText(R.id.widget_diet_kcal_target, "\uBAA9\uD45C \uBBF8\uC124\uC815")
                views.setTextViewText(R.id.widget_diet_kcal_percent, "0%")
                views.setTextViewText(R.id.widget_diet_meals, "\uAE30\uB85D\uD55C \uC2DD\uC0AC 0\uD68C")
                listOf(R.id.widget_diet_carbs_value, R.id.widget_diet_protein_value, R.id.widget_diet_fat_value).forEach { views.setTextViewText(it, "\u2014") }
                listOf(R.id.widget_diet_carbs_percent, R.id.widget_diet_protein_percent, R.id.widget_diet_fat_percent).forEach { views.setTextViewText(it, "0%") }
                listOf(R.id.widget_diet_carbs_progress, R.id.widget_diet_protein_progress, R.id.widget_diet_fat_progress).forEach { views.setProgressBar(it, 100, 0, false) }
                views.setProgressBar(R.id.widget_diet_progress, 100, 0, false)
            }

            val ss = strength.optJSONObject("sessions") ?: JSONObject()
            val strengthActual = ss.optInt("actual", 0)
            if (strength.optInt("benchmarkCount", 0) <= 0) {
                views.setTextViewText(R.id.widget_strength_value, "0 / 0 \uBAA9\uD45C \uB2EC\uC131")
                views.setTextViewText(R.id.widget_strength_detail, "")
                views.setProgressBar(R.id.widget_strength_progress, 100, 0, false)
                strengthChecks(views, strength, 0)
            } else {
                val target = ss.optInt("target", 0)
                views.setTextViewText(R.id.widget_strength_value, strengthActual.toString() + " / " + target + "\uD68C \uB2EC\uC131")
                val trend = strength.optJSONObject("volumeTrend")
                val detail = if (trend?.optString("status") == "ready") {
                    signed(trend.optDouble("volumeDeltaPct", Double.NaN), "%")
                } else {
                    "\uC9D1\uACC4 \uC911"
                }
                views.setTextViewText(R.id.widget_strength_detail, detail)
                views.setProgressBar(R.id.widget_strength_progress, 100, progress(ss), false)
                strengthChecks(views, strength, strengthActual)
            }

            val distance = running.optJSONObject("distance") ?: JSONObject()
            val sessions = running.optJSONObject("sessions") ?: JSONObject()
            val runDistance = distance.optDouble("actual", 0.0)
            val runTarget = distance.optDouble("target", 0.0)
            val runSessions = sessions.optInt("actual", 0)
            val runTargetSessions = sessions.optInt("target", 0)
            val goal = running.optJSONObject("goal") ?: JSONObject()
            val actualPace = goal.optDouble("actualPaceSecPerKm", Double.NaN)
            val baselinePace = goal.optDouble("baselinePaceSecPerKm", Double.NaN)
            views.setTextViewText(R.id.widget_running_subtitle, "\uD3C9\uADE0 \uD398\uC774\uC2A4 (km\uB2F9)")
            views.setTextViewText(R.id.widget_running_period, "\uC774\uBC88 \uC8FC")
            if (runTarget <= 0.0 && runTargetSessions <= 0) {
                views.setTextViewText(R.id.widget_running_value, "\uACC4\uD68D \uC5C6\uC74C")
                views.setTextViewText(R.id.widget_running_last, "\uC8FC\uAC04 \uACC4\uD68D\uC744 \uC124\uC815\uD574 \uC8FC\uC138\uC694")
                views.setTextViewText(R.id.widget_running_improvement, "\uD398\uC774\uC2A4 \uAC1C\uC120\n\u2014")
                views.setProgressBar(R.id.widget_running_progress, 100, 0, false)
            } else if (runDistance <= 0.0 && runSessions <= 0) {
                views.setTextViewText(R.id.widget_running_value, "\uAE30\uB85D \uC5C6\uC74C")
                views.setTextViewText(R.id.widget_running_last, "\uB7EC\uB2DD\uC744 \uAE30\uB85D\uD558\uBA74 \uD604\uD669\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4")
                views.setTextViewText(R.id.widget_running_improvement, "\uD398\uC774\uC2A4 \uAC1C\uC120\n\u2014")
                views.setProgressBar(R.id.widget_running_progress, 100, 0, false)
            } else {
                views.setTextViewText(R.id.widget_running_value, if (actualPace.isFinite()) pace(actualPace) + "/km" else number(runDistance, 1) + " km")
                views.setTextViewText(
                    R.id.widget_running_last,
                    if (baselinePace.isFinite()) "\uC9C0\uB09C\uC8FC " + pace(baselinePace) + "/km"
                    else runSessions.toString() + " / " + runTargetSessions + "\uD68C",
                )
                val diff = if (actualPace.isFinite() && baselinePace.isFinite()) (actualPace - baselinePace).roundToInt() else null
                val diffText = if (diff != null) (if (diff > 0) "+" else "") + diff + "\uCD08" else "\u2014"
                views.setTextViewText(R.id.widget_running_improvement, "\uD398\uC774\uC2A4 \uAC1C\uC120\n" + diffText + "\n/km")
                views.setTextViewText(R.id.widget_running_detail, runSessions.toString() + " / " + runTargetSessions + "\uD68C")
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

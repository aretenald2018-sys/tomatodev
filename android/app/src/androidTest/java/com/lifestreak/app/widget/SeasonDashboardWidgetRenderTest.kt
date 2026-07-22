package com.lifestreak.app.widget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import android.widget.FrameLayout
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.FileOutputStream

@RunWith(AndroidJUnit4::class)
class SeasonDashboardWidgetRenderTest {

    private fun sampleSnapshot(): String {
        val now = System.currentTimeMillis()
        return """
        {
          "generatedAt": $now,
          "state": "ready",
          "season": { "name": "2026 시즌", "week": 3 },
          "food": {
            "actualKcal": 2250, "targetKcal": 2500, "progress": 90, "recordedMeals": 3,
            "carbsG": 45, "carbsTargetG": 220,
            "proteinG": 32, "proteinTargetG": 160,
            "fatG": 12, "fatTargetG": 60
          },
          "weeklyGoal": {
            "achievedCount": 3, "totalCount": 5,
            "items": [
              { "label": "바벨 벤치프레스", "detail": "볼륨 · 90kg 12회", "state": "achieved" },
              { "label": "바벨 벤치프레스", "detail": "강도 · 105kg 8회", "state": "achieved" },
              { "label": "스쿼트(와이드)", "detail": "볼륨 · 80kg 8회", "state": "achieved" },
              { "label": "루마니안 데드리프트", "detail": "볼륨 · 55kg 12회", "state": "not-achieved" },
              { "label": "오버헤드 프레스", "detail": "볼륨 · 45kg 8회", "state": "not-achieved" }
            ]
          },
          "recentRunning": [
            { "dateKey": "2026-07-18", "distanceKm": 4.08, "avgPaceSecPerKm": 557 },
            { "dateKey": "2026-07-16", "distanceKm": 3.65, "avgPaceSecPerKm": 464 },
            { "dateKey": "2026-07-14", "distanceKm": 1.29, "avgPaceSecPerKm": 592 },
            { "dateKey": "2026-07-13", "distanceKm": 1.01, "avgPaceSecPerKm": 609 },
            { "dateKey": "2026-07-12", "distanceKm": 2.16, "avgPaceSecPerKm": 596 }
          ],
          "running": { "goal": { "baselinePaceSecPerKm": 489 } }
        }
        """.trimIndent()
    }

    // 도넛이 잘리는지는 큰 위젯 한 장으로는 못 본다. 홈 화면에서 실제로 쓰는
    // 크기대로 여러 장을 그려 두고 눈으로 확인한다.
    private fun renderToPng(name: String, widthDp: Int, heightDp: Int, compact: Boolean) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val density = context.resources.displayMetrics.density
        val remoteViews = SeasonDashboardWidget.buildRemoteViewsForTest(context, sampleSnapshot(), widthDp, heightDp, compact)
        val root = FrameLayout(context)
        val view = remoteViews.apply(context, root)

        val widthPx = (widthDp * density).toInt()
        val heightPx = (heightDp * density).toInt()
        view.measure(
            View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(heightPx, View.MeasureSpec.EXACTLY),
        )
        view.layout(0, 0, widthPx, heightPx)
        val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        view.draw(Canvas(bitmap))

        val outDir = context.getExternalFilesDir(null) ?: context.filesDir
        val outFile = File(outDir, "widget-render-$name.png")
        FileOutputStream(outFile).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        android.util.Log.i("WidgetRenderTest", "wrote ${outFile.absolutePath}")
    }

    @Test
    fun renderSampleWidgetToPng() {
        renderToPng("tall", 360, 440, compact = false)
        renderToPng("medium", 340, 340, compact = false)
        renderToPng("short", 320, 300, compact = false)
        renderToPng("compact", 320, 250, compact = true)
    }
}

package com.lifestreak.app.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context

object TomatoMetricWidgetStore {
    fun updateAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        listOf(
            FoodIntakeWidget::class.java,
            HealthGoalWidget::class.java,
            RunningTrendWidget::class.java,
        ).forEach { provider ->
            val component = ComponentName(context, provider)
            manager.getAppWidgetIds(component).forEach { id ->
                TomatoMetricWidgetRenderer.update(context, manager, id, provider)
            }
        }
    }
}

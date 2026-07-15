package com.lifestreak.app.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context

object SeasonWidgetStore {
    private const val PREFS = "season_dashboard_widget"
    private const val SNAPSHOT = "snapshot_json"

    fun save(context: Context, snapshotJson: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(SNAPSHOT, snapshotJson)
            .apply()
        updateAll(context)
    }

    fun read(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(SNAPSHOT, null)

    fun updateAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val component = ComponentName(context, SeasonDashboardWidget::class.java)
        val ids = manager.getAppWidgetIds(component)
        ids.forEach { SeasonDashboardWidget.update(context, manager, it) }
    }
}

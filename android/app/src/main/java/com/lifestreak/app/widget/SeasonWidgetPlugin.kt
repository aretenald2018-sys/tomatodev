package com.lifestreak.app.widget

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject

@CapacitorPlugin(name = "SeasonWidget")
class SeasonWidgetPlugin : Plugin() {
    @PluginMethod
    fun saveSnapshot(call: PluginCall) {
        val raw = call.getString("snapshotJson")?.trim().orEmpty()
        if (raw.isEmpty()) {
            call.reject("snapshotJson is required")
            return
        }
        try {
            val snapshot = JSONObject(raw)
            if (snapshot.optInt("schemaVersion", 0) != 1) {
                call.reject("unsupported season widget snapshot")
                return
            }
            SeasonWidgetStore.save(context, snapshot.toString())
            call.resolve(JSObject().put("saved", true))
        } catch (error: Exception) {
            call.reject("invalid season widget snapshot", error)
        }
    }
}

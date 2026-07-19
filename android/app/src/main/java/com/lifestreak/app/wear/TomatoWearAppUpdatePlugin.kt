package com.lifestreak.app.wear

import android.content.Intent
import android.net.Uri
import androidx.core.content.ContextCompat
import androidx.wear.remote.interactions.RemoteActivityHelper
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.Wearable
import org.json.JSONArray
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executor

@CapacitorPlugin(name = "TomatoWearAppUpdate")
class TomatoWearAppUpdatePlugin : Plugin() {
    @PluginMethod
    fun requestRefreshOrInstall(call: PluginCall) {
        val hostActivity = activity
        if (hostActivity == null) {
            call.resolve(summary(emptyList(), emptyList(), 0, 0, arrayOf("activity unavailable")))
            return
        }

        val appContext = hostActivity.applicationContext
        Wearable.getNodeClient(appContext).connectedNodes
            .addOnSuccessListener { connectedNodes ->
                Wearable.getCapabilityClient(appContext)
                    .getCapability(CAPABILITY_WEAR_APP, CapabilityClient.FILTER_REACHABLE)
                    .addOnSuccessListener { capability ->
                        val installedIds = capability.nodes.map { it.id }.toSet()
                        val installedNodes = connectedNodes.filter { installedIds.contains(it.id) }
                        val missingNodes = connectedNodes.filterNot { installedIds.contains(it.id) }
                        dispatchWearRequests(call, hostActivity, connectedNodes, installedNodes, missingNodes)
                    }
                    .addOnFailureListener { error ->
                        call.resolve(
                            summary(
                                connectedNodes,
                                emptyList(),
                                refreshSent = 0,
                                installPrompted = 0,
                                failures = arrayOf(error.message ?: "capability lookup failed"),
                            ),
                        )
                    }
            }
            .addOnFailureListener { error ->
                call.resolve(summary(emptyList(), emptyList(), 0, 0, arrayOf(error.message ?: "node lookup failed")))
            }
    }

    private fun dispatchWearRequests(
        call: PluginCall,
        hostActivity: android.app.Activity,
        connectedNodes: List<Node>,
        installedNodes: List<Node>,
        missingNodes: List<Node>,
    ) {
        var pending = installedNodes.size + missingNodes.size
        if (pending == 0) {
            call.resolve(summary(connectedNodes, installedNodes, 0, 0, emptyArray()))
            return
        }

        val executor = ContextCompat.getMainExecutor(hostActivity)
        val messageClient = Wearable.getMessageClient(context)
        val remoteActivityHelper = RemoteActivityHelper(hostActivity, executor)
        val payload = buildPayload(call)
        val failures = mutableListOf<String>()
        var refreshSent = 0
        var installPrompted = 0

        fun finishIfReady() {
            if (pending > 0) return
            call.resolve(summary(connectedNodes, installedNodes, refreshSent, installPrompted, failures.toTypedArray()))
        }

        installedNodes.forEach { node ->
            messageClient.sendMessage(node.id, PATH_APP_REFRESH, payload)
                .addOnSuccessListener {
                    refreshSent += 1
                    pending -= 1
                    finishIfReady()
                }
                .addOnFailureListener { error ->
                    failures.add("${node.displayName}: ${error.message ?: "refresh message failed"}")
                    pending -= 1
                    finishIfReady()
                }
        }

        val intent = Intent(Intent.ACTION_VIEW)
            .setData(Uri.parse(WATCH_MARKET_URI))
            .addCategory(Intent.CATEGORY_BROWSABLE)
        missingNodes.forEach { node ->
            try {
                val future = remoteActivityHelper.startRemoteActivity(intent, node.id)
                future.addListener({
                    try {
                        future.get()
                        installPrompted += 1
                    } catch (error: Exception) {
                        failures.add("${node.displayName}: ${error.message ?: "install prompt failed"}")
                    } finally {
                        pending -= 1
                        finishIfReady()
                    }
                }, executor)
            } catch (error: Exception) {
                failures.add("${node.displayName}: ${error.message ?: "install prompt failed"}")
                pending -= 1
                finishIfReady()
            }
        }
    }

    private fun buildPayload(call: PluginCall): ByteArray {
        val payload = JSObject()
        payload.put("type", "app-refresh")
        payload.put("source", call.getString("source") ?: "manual")
        payload.put("cacheVersion", call.getString("cacheVersion") ?: "unknown")
        payload.put("commit", call.getString("commit") ?: "unknown")
        payload.put("requestedAt", System.currentTimeMillis())
        return payload.toString().toByteArray(StandardCharsets.UTF_8)
    }

    private fun summary(
        connectedNodes: List<Node>,
        installedNodes: List<Node>,
        refreshSent: Int,
        installPrompted: Int,
        failures: Array<String>,
    ): JSObject {
        val result = JSObject()
        result.put("connectedNodes", nodesToArray(connectedNodes))
        result.put("installedNodes", nodesToArray(installedNodes))
        result.put("refreshSent", refreshSent)
        result.put("installPrompted", installPrompted)
        result.put("failures", JSONArray(failures.toList()))
        return result
    }

    private fun nodesToArray(nodes: List<Node>): JSONArray {
        val array = JSONArray()
        nodes.forEach { node ->
            val item = JSObject()
            item.put("id", node.id)
            item.put("displayName", node.displayName)
            item.put("nearby", node.isNearby)
            array.put(item)
        }
        return array
    }

    private companion object {
        const val CAPABILITY_WEAR_APP = "tomato_farm_wear_app"
        const val PATH_APP_REFRESH = "/tomato/app/refresh"
        const val WATCH_MARKET_URI = "market://details?id=com.lifestreak.app"
    }
}

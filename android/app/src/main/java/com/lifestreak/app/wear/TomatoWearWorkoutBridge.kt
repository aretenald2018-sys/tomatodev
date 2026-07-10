package com.lifestreak.app.wear

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.lifestreak.app.MainActivity
import org.json.JSONObject
import java.io.File
import java.lang.ref.WeakReference

object TomatoWearWorkoutBridge {
    const val PATH_RUN_COMPLETE = "/tomato/workout/run/complete"
    const val ASSET_KEY = "routePayload"
    const val TRANSFER_ID_KEY = "transferId"
    const val BYTE_LENGTH_KEY = "byteLength"
    const val SHA256_KEY = "sha256"

    private const val NATIVE_ACK_NAME = "__tomatoWearWorkoutNativeAck"
    private const val MAX_DRAIN_ATTEMPTS = 6
    private val transferIdPattern = Regex("^[A-Za-z0-9_-]{1,128}$")
    private val mainHandler: Handler by lazy { Handler(Looper.getMainLooper()) }
    private val pendingAcknowledgements = mutableSetOf<String>()
    private val nativeAck = NativeAck()
    private var activityRef: WeakReference<MainActivity>? = null

    @JvmStatic
    fun registerActivity(activity: MainActivity) {
        synchronized(this) {
            activityRef = WeakReference(activity)
            pendingAcknowledgements.clear()
        }
        TomatoWearWorkoutFileQueue.reconcile(activity)
        activity.bridge?.webView?.addJavascriptInterface(nativeAck, NATIVE_ACK_NAME)
        drainPendingToWebView(activity, 900L)
    }

    @JvmStatic
    fun unregisterActivity(activity: MainActivity) {
        activity.bridge?.webView?.removeJavascriptInterface(NATIVE_ACK_NAME)
        synchronized(this) {
            if (activityRef?.get() === activity) activityRef = null
            pendingAcknowledgements.clear()
        }
    }

    @JvmStatic
    fun enqueueFromWearFile(
        context: android.content.Context,
        transferId: String,
        sourceFile: File,
        byteLength: Long,
        sha256: String,
    ): Boolean {
        val queued = TomatoWearWorkoutFileQueue.enqueue(
            context.applicationContext,
            transferId,
            sourceFile,
            byteLength,
            sha256,
        )
        if (queued) activityRef?.get()?.let { drainPendingToWebView(it, 0L) }
        return queued
    }

    @JvmStatic
    fun drainPendingToWebView(activity: MainActivity, delayMs: Long = 0L) {
        val runnable = Runnable { drainOne(activity, 0) }
        if (delayMs > 0L) mainHandler.postDelayed(runnable, delayMs) else mainHandler.post(runnable)
    }

    private fun drainOne(activity: MainActivity, attempt: Int) {
        val entry = synchronized(this) {
            val next = TomatoWearWorkoutFileQueue.first(activity) ?: return
            if (pendingAcknowledgements.contains(next.id)) return
            next
        }
        val payload = TomatoWearWorkoutFileQueue.readPayload(activity.filesDir, entry)
        if (payload == null) {
            Log.e("TomatoWearBridge", "Queued Wear payload is missing, corrupt, or outside app storage: ${entry.id}")
            return
        }
        val webView = activity.bridge?.webView
        if (webView == null) {
            retry(activity, attempt)
            return
        }
        synchronized(this) { pendingAcknowledgements.add(entry.id) }
        val script = buildJavascript(entry.id, payload)
        webView.post {
            evaluateBridge(webView, script) { dispatched ->
                if (!dispatched) {
                    synchronized(this) { pendingAcknowledgements.remove(entry.id) }
                    retry(activity, attempt)
                }
            }
        }
    }

    private fun evaluateBridge(webView: WebView, script: String, callback: (Boolean) -> Unit) {
        webView.evaluateJavascript(script) { result -> callback(result?.contains("DISPATCHED") == true) }
    }

    private fun retry(activity: MainActivity, attempt: Int) {
        if (attempt >= MAX_DRAIN_ATTEMPTS) return
        mainHandler.postDelayed({ drainOne(activity, attempt + 1) }, 1_000L * (attempt + 1))
    }

    private fun buildJavascript(id: String, payload: String): String {
        return """
            (function(){
              var bridge = window.__tomatoWearWorkoutBridge;
              var nativeAck = window.$NATIVE_ACK_NAME;
              if (!bridge || typeof bridge.saveFromNative !== 'function' || !nativeAck) return 'BRIDGE_NOT_READY';
              try {
                Promise.resolve(bridge.saveFromNative(${JSONObject.quote(payload)}))
                  .then(function(result){
                    if (result && result.ok === true) nativeAck.accept(${JSONObject.quote(id)});
                    else nativeAck.reject(${JSONObject.quote(id)});
                  })
                  .catch(function(){ nativeAck.reject(${JSONObject.quote(id)}); });
                return 'DISPATCHED';
              } catch (error) {
                nativeAck.reject(${JSONObject.quote(id)});
                return 'ERROR:' + (error && error.message ? error.message : String(error));
              }
            })()
        """.trimIndent()
    }

    private class NativeAck {
        @JavascriptInterface
        fun accept(id: String) = handleNativeAck(id, accepted = true)

        @JavascriptInterface
        fun reject(id: String) = handleNativeAck(id, accepted = false)
    }

    private fun handleNativeAck(id: String, accepted: Boolean) {
        if (!transferIdPattern.matches(id)) return
        val activity = synchronized(this) { activityRef?.get() } ?: return
        if (!synchronized(this) { pendingAcknowledgements.remove(id) }) return
        if (!accepted) {
            mainHandler.postDelayed({ drainOne(activity, 1) }, 1_000L)
            return
        }
        if (!synchronized(this) { TomatoWearWorkoutFileQueue.acknowledge(activity, id) }) {
            Log.e("TomatoWearBridge", "Failed to durably acknowledge Wear payload: $id")
            mainHandler.postDelayed({ drainOne(activity, 1) }, 1_000L)
            return
        }
        mainHandler.post { drainOne(activity, 0) }
    }

    internal fun buildJavascriptForTest(id: String, payload: String): String = buildJavascript(id, payload)
}

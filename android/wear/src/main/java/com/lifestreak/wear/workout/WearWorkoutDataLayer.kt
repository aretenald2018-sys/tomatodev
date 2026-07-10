package com.lifestreak.wear.workout

import android.content.Context
import com.google.android.gms.wearable.Asset
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import java.security.MessageDigest

data class WearWorkoutSendResult(
    val success: Boolean,
    val message: String,
)

object WearWorkoutDataLayer {
    const val PATH_RUN_COMPLETE = "/tomato/workout/run/complete"
    private const val ASSET_KEY = "routePayload"
    private const val TRANSFER_ID_KEY = "transferId"
    private const val BYTE_LENGTH_KEY = "byteLength"
    private const val SHA256_KEY = "sha256"

    fun sendRunComplete(
        context: Context,
        payload: WearWorkoutPayload,
        onComplete: (WearWorkoutSendResult) -> Unit,
    ) {
        val payloadBytes = payload.toJsonString().toByteArray(Charsets.UTF_8)
        val sha256 = MessageDigest.getInstance("SHA-256")
            .digest(payloadBytes)
            .joinToString("") { "%02x".format(it) }
        val transferId = "${payload.startedAtMs}-${payload.endedAtMs}-$sha256"
        val request = PutDataMapRequest.create("$PATH_RUN_COMPLETE/$transferId").apply {
            dataMap.putString(TRANSFER_ID_KEY, transferId)
            dataMap.putLong(BYTE_LENGTH_KEY, payloadBytes.size.toLong())
            dataMap.putString(SHA256_KEY, sha256)
            dataMap.putAsset(ASSET_KEY, Asset.createFromBytes(payloadBytes))
        }.asPutDataRequest().setUrgent()

        Wearable.getDataClient(context.applicationContext).putDataItem(request)
            .addOnSuccessListener {
                onComplete(WearWorkoutSendResult(true, "폰 저장 대기열 등록 완료"))
            }
            .addOnFailureListener { error ->
                onComplete(WearWorkoutSendResult(false, error.message ?: "전송 대기열 등록 실패"))
            }
    }
}

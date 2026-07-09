package com.lifestreak.wear.workout

import android.content.Context
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Wearable

data class WearWorkoutSendResult(
    val success: Boolean,
    val message: String,
)

object WearWorkoutDataLayer {
    const val PATH_RUN_COMPLETE = "/tomato/workout/run/complete"

    fun sendRunComplete(
        context: Context,
        payload: WearWorkoutPayload,
        onComplete: (WearWorkoutSendResult) -> Unit,
    ) {
        val appContext = context.applicationContext
        Wearable.getNodeClient(appContext).connectedNodes
            .addOnSuccessListener { nodes ->
                if (nodes.isEmpty()) {
                    onComplete(WearWorkoutSendResult(false, "폰 연결 대기"))
                    return@addOnSuccessListener
                }
                sendToNodes(
                    messageClient = Wearable.getMessageClient(appContext),
                    nodeIds = nodes.map { it.id },
                    payloadBytes = payload.toJsonString().toByteArray(Charsets.UTF_8),
                    onComplete = onComplete,
                )
            }
            .addOnFailureListener { error ->
                onComplete(WearWorkoutSendResult(false, error.message ?: "폰 연결 실패"))
            }
    }

    private fun sendToNodes(
        messageClient: MessageClient,
        nodeIds: List<String>,
        payloadBytes: ByteArray,
        onComplete: (WearWorkoutSendResult) -> Unit,
    ) {
        var pending = nodeIds.size
        var sent = false
        var lastError = ""
        nodeIds.forEach { nodeId ->
            messageClient.sendMessage(nodeId, PATH_RUN_COMPLETE, payloadBytes)
                .addOnSuccessListener {
                    sent = true
                    pending -= 1
                    if (pending == 0) onComplete(WearWorkoutSendResult(true, "폰 저장 전송 완료"))
                }
                .addOnFailureListener { error ->
                    lastError = error.message ?: "전송 실패"
                    pending -= 1
                    if (pending == 0) {
                        onComplete(
                            WearWorkoutSendResult(
                                success = sent,
                                message = if (sent) "폰 저장 전송 완료" else lastError,
                            ),
                        )
                    }
                }
        }
    }
}


package com.lifestreak.app.wear

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

class TomatoWearWorkoutListenerService : WearableListenerService() {
    override fun onMessageReceived(messageEvent: MessageEvent) {
        if (messageEvent.path != TomatoWearWorkoutBridge.PATH_RUN_COMPLETE) {
            super.onMessageReceived(messageEvent)
            return
        }
        TomatoWearWorkoutBridge.enqueueFromWear(applicationContext, messageEvent.data)
    }
}


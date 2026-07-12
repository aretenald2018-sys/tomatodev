package com.lifestreak.wear.debug

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.lifestreak.wear.workout.WearExerciseService

class WearRouteReplayReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return
        val serviceIntent = Intent(context, WearExerciseService::class.java)
            .setAction(WearExerciseService.ACTION_DEBUG_ROUTE_POINT)
        listOf(
            WearExerciseService.EXTRA_DEBUG_LAT,
            WearExerciseService.EXTRA_DEBUG_LNG,
            WearExerciseService.EXTRA_DEBUG_TIMESTAMP_MS,
            WearExerciseService.EXTRA_DEBUG_ACTIVE_DURATION_MS,
            WearExerciseService.EXTRA_DEBUG_ACCURACY,
            WearExerciseService.EXTRA_DEBUG_ALTITUDE,
            WearExerciseService.EXTRA_DEBUG_BEARING,
        ).forEach { name -> intent.getStringExtra(name)?.let { serviceIntent.putExtra(name, it) } }
        context.startService(serviceIntent)
    }

    companion object {
        const val ACTION = "com.lifestreak.wear.DEBUG_ROUTE_POINT"
    }
}

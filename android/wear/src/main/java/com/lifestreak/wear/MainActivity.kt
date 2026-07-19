package com.lifestreak.wear

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.lifestreak.wear.workout.WearExerciseService
import com.lifestreak.wear.workout.WearExerciseSessionPersistence
import com.lifestreak.wear.workout.WearExerciseSessionStatus
import com.lifestreak.wear.workout.WearExerciseSessionStore
import com.lifestreak.wear.workout.WearWorkoutUiController

class MainActivity : AppCompatActivity() {
    private val handler = Handler(Looper.getMainLooper())
    private val wearWorkoutUi = WearWorkoutUiController(handler)
    private var restoredRunStatus: WearExerciseSessionStatus? = null
    private var runHost: View? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        val restoredRun = WearExerciseSessionPersistence.load(this)
        if (restoredRun != null) {
            WearExerciseSessionStore.restore(restoredRun)
            restoredRunStatus = restoredRun.status
        }

        runHost = findViewById<View>(R.id.wearRunHost)
            ?: findViewById(android.R.id.content)
        wearWorkoutUi.bind(requireNotNull(runHost))
        if (requestWearExercisePermissionsIfNeeded()) {
            if (!restoreRunServiceIfNeeded() &&
                WearExerciseSessionStore.current().status == WearExerciseSessionStatus.IDLE
            ) {
                WearExerciseService.prepareRun(this)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        runHost?.let(wearWorkoutUi::onHostResumed)
    }

    override fun onPause() {
        runHost?.let(wearWorkoutUi::onHostPaused)
        super.onPause()
    }

    private fun requestWearExercisePermissionsIfNeeded(): Boolean {
        val permissions = mutableListOf(
            Manifest.permission.ACTIVITY_RECOGNITION,
            Manifest.permission.ACCESS_FINE_LOCATION,
        )
        if (Build.VERSION.SDK_INT >= 36) {
            permissions.add(WearExerciseService.PERMISSION_READ_HEART_RATE)
        } else {
            permissions.add(Manifest.permission.BODY_SENSORS)
        }
        val missing = permissions.filter { permission ->
            ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                missing.toTypedArray(),
                REQUEST_EXERCISE_PERMISSIONS,
            )
        }
        return missing.isEmpty()
    }

    private fun restoreRunServiceIfNeeded(): Boolean {
        if (restoredRunStatus !in setOf(
                WearExerciseSessionStatus.STARTING,
                WearExerciseSessionStatus.ACTIVE,
                WearExerciseSessionStatus.PAUSED,
                WearExerciseSessionStatus.FALLBACK,
            )
        ) {
            return false
        }
        restoredRunStatus = null
        WearExerciseService.restoreRun(this)
        return true
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_EXERCISE_PERMISSIONS &&
            grantResults.isNotEmpty() &&
            grantResults.all { result -> result == PackageManager.PERMISSION_GRANTED }
        ) {
            if (!restoreRunServiceIfNeeded() &&
                WearExerciseSessionStore.current().status == WearExerciseSessionStatus.IDLE
            ) {
                WearExerciseService.prepareRun(this)
            }
        }
    }

    override fun onDestroy() {
        if (isFinishing && WearExerciseSessionStore.current().status == WearExerciseSessionStatus.IDLE) {
            WearExerciseService.cancelPreparation(this)
        }
        super.onDestroy()
        wearWorkoutUi.dispose()
    }

    private companion object {
        const val REQUEST_EXERCISE_PERMISSIONS = 2001
    }
}

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
import com.lifestreak.wear.workout.WearWorkoutUiController

class MainActivity : AppCompatActivity() {
    private val handler = Handler(Looper.getMainLooper())
    private val wearWorkoutUi = WearWorkoutUiController(handler)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val runHost = findViewById<View>(R.id.wearRunHost)
            ?: findViewById(android.R.id.content)
        wearWorkoutUi.bind(runHost)
        requestWearExercisePermissionsIfNeeded()
    }

    private fun requestWearExercisePermissionsIfNeeded() {
        val permissions = mutableListOf(
            Manifest.permission.ACTIVITY_RECOGNITION,
            Manifest.permission.BODY_SENSORS,
            Manifest.permission.ACCESS_FINE_LOCATION,
        )
        if (Build.VERSION.SDK_INT >= 36) {
            permissions.add(WearExerciseService.PERMISSION_READ_HEART_RATE)
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
    }

    override fun onDestroy() {
        super.onDestroy()
        wearWorkoutUi.dispose()
    }

    private companion object {
        const val REQUEST_EXERCISE_PERMISSIONS = 2001
    }
}

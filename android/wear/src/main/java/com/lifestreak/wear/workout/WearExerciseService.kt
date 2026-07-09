package com.lifestreak.wear.workout

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.health.services.client.ExerciseClient
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseType
import androidx.health.services.client.data.ExerciseUpdate
import kotlin.math.roundToInt

class WearExerciseService : Service() {
    private lateinit var exerciseClient: ExerciseClient
    private val healthCallbackExecutor by lazy { ContextCompat.getMainExecutor(this) }
    private var exerciseCallback: ExerciseUpdateCallback? = null
    private var accumulator: WearExerciseMetricAccumulator? = null
    private var exerciseStarted = false

    override fun onCreate() {
        super.onCreate()
        exerciseClient = HealthServices.getClient(this).exerciseClient
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_RUN -> handleStartRun()
            ACTION_PAUSE_RUN -> handlePauseRun()
            ACTION_RESUME_RUN -> handleResumeRun()
            ACTION_END_RUN -> handleEndRun()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        clearExerciseCallback()
        super.onDestroy()
    }

    private fun handleStartRun() {
        val startedAtWallClockMs = System.currentTimeMillis()
        val startedAtElapsedRealtimeMs = SystemClock.elapsedRealtime()
        val nextAccumulator = WearExerciseMetricAccumulator(
            startedAtWallClockMs = startedAtWallClockMs,
            startedAtElapsedRealtimeMs = startedAtElapsedRealtimeMs,
        )
        accumulator = nextAccumulator
        exerciseStarted = false
        WearExerciseSessionStore.resetForStart(startedAtWallClockMs)

        if (!hasActivityRecognitionPermission()) {
            WearExerciseSessionStore.markFallback("ACTIVITY_RECOGNITION permission missing")
            stopSelf()
            return
        }

        startForegroundWithHealthType(buildNotification())
        registerExerciseCallback()
        startHealthExercise(nextAccumulator)
    }

    private fun startHealthExercise(nextAccumulator: WearExerciseMetricAccumulator) {
        val capabilitiesFuture = exerciseClient.getCapabilitiesAsync()
        capabilitiesFuture.addListener(
            {
                val dataTypes = try {
                    val runningCapabilities = capabilitiesFuture.get()
                        .getExerciseTypeCapabilities(ExerciseType.RUNNING)
                    requestedDataTypes().intersect(runningCapabilities.supportedDataTypes)
                } catch (_: Exception) {
                    requestedDataTypes()
                }

                if (dataTypes.isEmpty()) {
                    WearExerciseSessionStore.markFallback("RUNNING metrics unsupported")
                    return@addListener
                }

                val config = ExerciseConfig(
                    exerciseType = ExerciseType.RUNNING,
                    dataTypes = dataTypes,
                    isAutoPauseAndResumeEnabled = false,
                    isGpsEnabled = hasLocationPermission(),
                    exerciseGoals = emptyList(),
                )
                val startFuture = exerciseClient.startExerciseAsync(config)
                startFuture.addListener(
                    {
                        try {
                            startFuture.get()
                            exerciseStarted = true
                            WearExerciseSessionStore.publishFromAccumulator(
                                status = WearExerciseSessionStatus.ACTIVE,
                                accumulator = nextAccumulator,
                                message = locationStatusMessage(),
                            )
                        } catch (error: Exception) {
                            WearExerciseSessionStore.markFallback(
                                "Health Services start failed: ${error.message ?: error.javaClass.simpleName}",
                            )
                        }
                    },
                    healthCallbackExecutor,
                )
            },
            healthCallbackExecutor,
        )
    }

    private fun handlePauseRun() {
        WearExerciseSessionStore.markPaused()
        if (!exerciseStarted) return
        val pauseFuture = exerciseClient.pauseExerciseAsync()
        pauseFuture.addListener(
            {
                try {
                    pauseFuture.get()
                } catch (error: Exception) {
                    WearExerciseSessionStore.markError(
                        "Health Services pause failed: ${error.message ?: error.javaClass.simpleName}",
                    )
                }
            },
            healthCallbackExecutor,
        )
    }

    private fun handleResumeRun() {
        accumulator?.let {
            WearExerciseSessionStore.publishFromAccumulator(
                status = WearExerciseSessionStatus.ACTIVE,
                accumulator = it,
            )
        }
        if (!exerciseStarted) return
        val resumeFuture = exerciseClient.resumeExerciseAsync()
        resumeFuture.addListener(
            {
                try {
                    resumeFuture.get()
                } catch (error: Exception) {
                    WearExerciseSessionStore.markError(
                        "Health Services resume failed: ${error.message ?: error.javaClass.simpleName}",
                    )
                }
            },
            healthCallbackExecutor,
        )
    }

    private fun handleEndRun() {
        WearExerciseSessionStore.markEnded()
        if (exerciseStarted) {
            val endFuture = exerciseClient.endExerciseAsync()
            endFuture.addListener(
                {
                    try {
                        endFuture.get()
                    } catch (_: Exception) {
                    } finally {
                        finishService()
                    }
                },
                healthCallbackExecutor,
            )
        } else {
            finishService()
        }
    }

    private fun finishService() {
        clearExerciseCallback()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    private fun registerExerciseCallback() {
        if (exerciseCallback != null) return
        exerciseCallback = object : ExerciseUpdateCallback {
            override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
                publishExerciseUpdate(update)
            }

            override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) = Unit

            override fun onRegistered() = Unit

            override fun onRegistrationFailed(throwable: Throwable) {
                WearExerciseSessionStore.markFallback(
                    "Health Services callback failed: ${throwable.message ?: throwable.javaClass.simpleName}",
                )
            }

            override fun onAvailabilityChanged(
                dataType: DataType<*, *>,
                availability: Availability,
            ) = Unit
        }
        exerciseCallback?.let { callback -> exerciseClient.setUpdateCallback(callback) }
    }

    private fun publishExerciseUpdate(update: ExerciseUpdate) {
        val nextAccumulator = accumulator ?: return
        val metrics = update.latestMetrics
        val heartRateBpm = metrics.getData(DataType.HEART_RATE_BPM)
            .lastOrNull()
            ?.value
            ?.roundToInt()
        val distanceMeters = metrics.getData(DataType.DISTANCE_TOTAL)?.total
        val activeDurationMs = update.activeDurationCheckpoint?.activeDuration?.toMillis()
        val locationPoint = metrics.getData(DataType.LOCATION)
            .lastOrNull()
            ?.let { point ->
                WearRoutePoint(
                    timestampMs = wallClockMsForElapsed(point.timeDurationFromBoot.toMillis()),
                    lat = point.value.latitude,
                    lng = point.value.longitude,
                    altitude = point.value.altitude.takeIf { it.isFinite() },
                    bearing = point.value.bearing.takeIf { it.isFinite() },
                )
            }

        nextAccumulator.applyMetricUpdate(
            elapsedRealtimeMs = SystemClock.elapsedRealtime(),
            distanceMeters = distanceMeters,
            heartRateBpm = heartRateBpm,
            activeDurationMs = activeDurationMs,
            routePoint = locationPoint,
        )

        val status = if (update.exerciseStateInfo.state.isEnded) {
            WearExerciseSessionStatus.ENDED
        } else {
            WearExerciseSessionStatus.ACTIVE
        }
        WearExerciseSessionStore.publishFromAccumulator(
            status = status,
            accumulator = nextAccumulator,
            message = locationStatusMessage(),
        )

        if (update.exerciseStateInfo.state.isEnded) {
            finishService()
        }
    }

    private fun clearExerciseCallback() {
        exerciseCallback?.let { callback ->
            exerciseClient.clearUpdateCallbackAsync(callback)
        }
        exerciseCallback = null
    }

    private fun requestedDataTypes(): Set<DataType<*, *>> {
        val dataTypes = mutableSetOf<DataType<*, *>>(
            DataType.DISTANCE_TOTAL,
            DataType.SPEED,
            DataType.ACTIVE_EXERCISE_DURATION_TOTAL,
        )
        if (hasHeartRatePermission()) {
            dataTypes.add(DataType.HEART_RATE_BPM)
        }
        if (hasLocationPermission()) {
            dataTypes.add(DataType.LOCATION)
        }
        return dataTypes
    }

    private fun hasActivityRecognitionPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACTIVITY_RECOGNITION,
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun hasHeartRatePermission(): Boolean {
        val hasGranularPermission = ContextCompat.checkSelfPermission(
            this,
            PERMISSION_READ_HEART_RATE,
        ) == PackageManager.PERMISSION_GRANTED
        val hasLegacyPermission = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.BODY_SENSORS,
        ) == PackageManager.PERMISSION_GRANTED
        return hasGranularPermission || hasLegacyPermission
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun locationStatusMessage(): String? {
        return if (hasLocationPermission()) null else "location permission missing"
    }

    private fun wallClockMsForElapsed(elapsedRealtimeMs: Long): Long {
        val currentElapsed = SystemClock.elapsedRealtime()
        return System.currentTimeMillis() - (currentElapsed - elapsedRealtimeMs).coerceAtLeast(0L)
    }

    private fun buildNotification(): Notification {
        ensureNotificationChannel()
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("Tomato Farm")
            .setContentText("런닝/조깅 기록 중")
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun startForegroundWithHealthType(notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val foregroundType = ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH or
                if (hasLocationPermission()) ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0
            startForeground(
                NOTIFICATION_ID,
                notification,
                foregroundType,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(NOTIFICATION_CHANNEL_ID) != null) return
        manager.createNotificationChannel(
            NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Workout tracking",
                NotificationManager.IMPORTANCE_LOW,
            ),
        )
    }

    companion object {
        private const val ACTION_START_RUN = "com.lifestreak.wear.workout.START_RUN"
        private const val ACTION_PAUSE_RUN = "com.lifestreak.wear.workout.PAUSE_RUN"
        private const val ACTION_RESUME_RUN = "com.lifestreak.wear.workout.RESUME_RUN"
        private const val ACTION_END_RUN = "com.lifestreak.wear.workout.END_RUN"
        private const val NOTIFICATION_CHANNEL_ID = "wear-exercise"
        private const val NOTIFICATION_ID = 2001
        const val PERMISSION_READ_HEART_RATE = "android.permission.health.READ_HEART_RATE"

        fun startRun(context: Context) {
            ContextCompat.startForegroundService(context, intentFor(context, ACTION_START_RUN))
        }

        fun pauseRun(context: Context) {
            context.startService(intentFor(context, ACTION_PAUSE_RUN))
        }

        fun resumeRun(context: Context) {
            context.startService(intentFor(context, ACTION_RESUME_RUN))
        }

        fun endRun(context: Context) {
            context.startService(intentFor(context, ACTION_END_RUN))
        }

        private fun intentFor(context: Context, action: String): Intent {
            return Intent(context, WearExerciseService::class.java).setAction(action)
        }
    }
}

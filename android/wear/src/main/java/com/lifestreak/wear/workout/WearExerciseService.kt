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
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
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
import androidx.health.services.client.data.DeltaDataType
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseType
import androidx.health.services.client.data.ExerciseUpdate
import androidx.health.services.client.data.WarmUpConfig
import kotlin.math.roundToInt

class WearExerciseService : Service() {
    private lateinit var exerciseClient: ExerciseClient
    private val healthCallbackExecutor by lazy { ContextCompat.getMainExecutor(this) }
    private var exerciseCallback: ExerciseUpdateCallback? = null
    private var accumulator: WearExerciseMetricAccumulator? = null
    private var exerciseStarted = false
    private var endRequested = false
    private var wallClockOffsetMs = 0L
    private val activeDurationTracker = WearExerciseActiveDurationTracker()
    private var lastDirectLocationElapsedRealtimeMs = 0L
    private var lastGpsStatusPublishedElapsedRealtimeMs = 0L
    private var gpsStatusMessage = GPS_STATUS_SEARCHING
    private var directLocationManager: LocationManager? = null
    private var directLocationListener: LocationListener? = null
    private var directHeartRateManager: SensorManager? = null
    private var directHeartRateListener: SensorEventListener? = null
    private var persistenceUnsubscribe: (() -> Unit)? = null

    override fun onCreate() {
        super.onCreate()
        exerciseClient = HealthServices.getClient(this).exerciseClient
        directLocationManager = getSystemService(LocationManager::class.java)
        directHeartRateManager = getSystemService(SensorManager::class.java)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_RUN -> handleStartRun()
            ACTION_RESTORE_RUN -> handleRestoreRun()
            ACTION_PAUSE_RUN -> handlePauseRun()
            ACTION_RESUME_RUN -> handleResumeRun()
            ACTION_END_RUN -> handleEndRun()
            else -> handleRestoreRun()
        }
        // addListener immediately emits the in-memory snapshot. Restore first so a
        // fresh service process cannot overwrite a saved workout with IDLE.
        ensurePersistenceListener()
        return START_STICKY
    }

    override fun onDestroy() {
        persistenceUnsubscribe?.invoke()
        persistenceUnsubscribe = null
        clearExerciseCallback()
        stopDirectLocationUpdates()
        stopDirectHeartRateUpdates()
        super.onDestroy()
    }

    private fun handleStartRun() {
        if (!hasLocationPermission()) {
            WearExerciseSessionPersistence.clear(this)
            WearExerciseSessionStore.markError("location permission missing")
            stopSelf()
            return
        }
        val startedAtWallClockMs = System.currentTimeMillis()
        val startedAtElapsedRealtimeMs = SystemClock.elapsedRealtime()
        wallClockOffsetMs = startedAtWallClockMs - startedAtElapsedRealtimeMs
        activeDurationTracker.start(startedAtElapsedRealtimeMs)
        lastDirectLocationElapsedRealtimeMs = 0L
        lastGpsStatusPublishedElapsedRealtimeMs = 0L
        gpsStatusMessage = GPS_STATUS_SEARCHING
        val nextAccumulator = WearExerciseMetricAccumulator(
            startedAtWallClockMs = startedAtWallClockMs,
            startedAtElapsedRealtimeMs = startedAtElapsedRealtimeMs,
        )
        accumulator = nextAccumulator
        exerciseStarted = false
        endRequested = false
        WearExerciseSessionStore.resetForStart(startedAtWallClockMs)

        startForegroundWithHealthType(buildNotification())
        startDirectLocationUpdates()
        startDirectHeartRateUpdates()
        if (!hasActivityRecognitionPermission()) {
            WearExerciseSessionStore.publishFromAccumulator(
                status = WearExerciseSessionStatus.ACTIVE,
                accumulator = nextAccumulator,
                message = "$gpsStatusMessage · activity permission missing",
            )
            return
        }
        registerExerciseCallback()
        startHealthExercise(nextAccumulator)
    }

    private fun handleRestoreRun() {
        val restored = restorePersistedSessionIfMissing(markRestartGap = true) ?: run {
            stopSelf()
            return
        }
        if (!hasLocationPermission() && restored.status in setOf(
                WearExerciseSessionStatus.STARTING,
                WearExerciseSessionStatus.ACTIVE,
                WearExerciseSessionStatus.FALLBACK,
            )
        ) {
            publishEndedSnapshot("location permission missing")
            finishService()
            return
        }
        when (restored.status) {
            WearExerciseSessionStatus.STARTING,
            WearExerciseSessionStatus.ACTIVE,
            WearExerciseSessionStatus.FALLBACK,
            -> {
                startForegroundWithHealthType(buildNotification())
                startDirectLocationUpdates()
                startDirectHeartRateUpdates()
                if (hasActivityRecognitionPermission()) {
                    registerExerciseCallback()
                    exerciseStarted = true
                }
            }
            WearExerciseSessionStatus.PAUSED -> {
                startForegroundWithHealthType(buildNotification("러닝 기록 일시정지"))
                stopDirectLocationUpdates()
                stopDirectHeartRateUpdates()
                if (hasActivityRecognitionPermission()) {
                    registerExerciseCallback()
                    exerciseStarted = true
                }
            }
            WearExerciseSessionStatus.ENDED -> stopSelf()
            WearExerciseSessionStatus.IDLE,
            WearExerciseSessionStatus.ERROR,
            -> stopSelf()
        }
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
                prepareThenStartExercise(config, nextAccumulator)
            },
            healthCallbackExecutor,
        )
    }

    private fun prepareThenStartExercise(
        config: ExerciseConfig,
        nextAccumulator: WearExerciseMetricAccumulator,
    ) {
        val warmUpTypes = warmUpDataTypes(config.dataTypes)
        if (warmUpTypes.isEmpty()) {
            startConfiguredExercise(config, nextAccumulator)
            return
        }
        val warmUpFuture = exerciseClient.prepareExerciseAsync(
            WarmUpConfig(ExerciseType.RUNNING, warmUpTypes),
        )
        warmUpFuture.addListener(
            {
                try {
                    warmUpFuture.get()
                } catch (_: Exception) {
                } finally {
                    startConfiguredExercise(config, nextAccumulator)
                }
            },
            healthCallbackExecutor,
        )
    }

    private fun startConfiguredExercise(
        config: ExerciseConfig,
        nextAccumulator: WearExerciseMetricAccumulator,
    ) {
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
                } catch (_: Exception) {
                    exerciseStarted = false
                    WearExerciseSessionStore.publishFromAccumulator(
                        status = WearExerciseSessionStatus.ACTIVE,
                        accumulator = nextAccumulator,
                        message = "GPS direct · Health Services unavailable",
                    )
                }
            },
            healthCallbackExecutor,
        )
    }

    private fun handlePauseRun() {
        restorePersistedSessionIfMissing(markRestartGap = true)
        val nowElapsedRealtimeMs = SystemClock.elapsedRealtime()
        accumulator?.let { currentAccumulator ->
            currentAccumulator.markRouteGap("pause")
            currentAccumulator.applyMetricUpdate(
                elapsedRealtimeMs = nowElapsedRealtimeMs,
                activeDurationMs = activeDurationTracker.pause(nowElapsedRealtimeMs),
            )
            WearExerciseSessionStore.publishFromAccumulator(
                status = WearExerciseSessionStatus.PAUSED,
                accumulator = currentAccumulator,
            )
        } ?: WearExerciseSessionStore.markPaused()
        stopDirectLocationUpdates()
        stopDirectHeartRateUpdates()
        if (!exerciseStarted) return
        val pauseFuture = exerciseClient.pauseExerciseAsync()
        pauseFuture.addListener(
            {
                try {
                    pauseFuture.get()
                } catch (error: Exception) {
                    WearExerciseSessionStore.markPaused(
                        "GPS direct · Health Services pause failed: ${error.message ?: error.javaClass.simpleName}",
                    )
                }
            },
            healthCallbackExecutor,
        )
    }

    private fun handleResumeRun() {
        restorePersistedSessionIfMissing(markRestartGap = true)
        val nowElapsedRealtimeMs = SystemClock.elapsedRealtime()
        accumulator?.let {
            it.applyMetricUpdate(
                elapsedRealtimeMs = nowElapsedRealtimeMs,
                activeDurationMs = activeDurationTracker.resume(nowElapsedRealtimeMs),
            )
            WearExerciseSessionStore.publishFromAccumulator(
                status = WearExerciseSessionStatus.ACTIVE,
                accumulator = it,
            )
        }
        startForegroundWithHealthType(buildNotification())
        startDirectLocationUpdates()
        startDirectHeartRateUpdates()
        if (!exerciseStarted) return
        val resumeFuture = exerciseClient.resumeExerciseAsync()
        resumeFuture.addListener(
            {
                try {
                    resumeFuture.get()
                } catch (error: Exception) {
                    accumulator?.let {
                        WearExerciseSessionStore.publishFromAccumulator(
                            status = WearExerciseSessionStatus.ACTIVE,
                            accumulator = it,
                            message = "GPS direct · Health Services resume failed: ${error.message ?: error.javaClass.simpleName}",
                        )
                    }
                }
            },
            healthCallbackExecutor,
        )
    }

    private fun handleEndRun() {
        restorePersistedSessionIfMissing(markRestartGap = true)
        val nowElapsedRealtimeMs = SystemClock.elapsedRealtime()
        accumulator?.applyMetricUpdate(
            elapsedRealtimeMs = nowElapsedRealtimeMs,
            activeDurationMs = activeDurationTracker.pause(nowElapsedRealtimeMs),
        )
        endRequested = true
        if (exerciseStarted) {
            val endFuture = exerciseClient.endExerciseAsync()
            endFuture.addListener(
                {
                    try {
                        endFuture.get()
                        WearExerciseEndPolicy.afterEndFuture(success = true)
                    } catch (error: Exception) {
                        WearExerciseEndPolicy.afterEndFuture(success = false)
                        publishEndFailure(error)
                        finishService()
                    }
                },
                healthCallbackExecutor,
            )
        } else {
            publishEndedSnapshot()
            finishService()
        }
    }

    private fun publishEndFailure(error: Exception) {
        publishEndedSnapshot(
            "GPS direct · Health Services end failed: ${error.message ?: error.javaClass.simpleName}",
        )
    }

    private fun publishEndedSnapshot(message: String? = null) {
        val currentAccumulator = accumulator
        if (currentAccumulator == null) {
            WearExerciseSessionStore.markEnded(message)
            return
        }
        WearExerciseSessionStore.publishFromAccumulator(
            status = WearExerciseSessionStatus.ENDED,
            accumulator = currentAccumulator,
            message = message,
        )
    }

    private fun finishService() {
        stopDirectLocationUpdates()
        stopDirectHeartRateUpdates()
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
        if (update.exerciseStateInfo.state.isEnded && !endRequested) {
            val currentStatus = WearExerciseSessionStore.current().status
            exerciseStarted = false
            clearExerciseCallback()
            WearExerciseSessionStore.publishFromAccumulator(
                status = WearExerciseEndPolicy.sessionStatusAfterExerciseUpdate(
                    action = WearExerciseEndAction.WAIT_FOR_FINAL_UPDATE,
                    currentStatus = currentStatus,
                ),
                accumulator = nextAccumulator,
                message = "GPS direct · Health Services ended",
            )
            return
        }
        val metrics = update.latestMetrics
        val heartRateBpm = metrics.getData(DataType.HEART_RATE_BPM)
            .lastOrNull()
            ?.value
            ?.roundToInt()
        val distanceMeters = metrics.getData(DataType.DISTANCE_TOTAL)?.total
        val elapsedRealtimeMs = SystemClock.elapsedRealtime()
        val healthActiveDurationMs = activeDurationTracker.plausibleHealthDuration(
            reportedDurationMs = update.activeDurationCheckpoint?.activeDuration?.toMillis(),
            nowElapsedRealtimeMs = elapsedRealtimeMs,
        )
        val activeDurationMs = maxOf(
            activeDurationTracker.activeDurationAt(elapsedRealtimeMs),
            healthActiveDurationMs ?: 0L,
        )
        val locationPoints = metrics.getData(DataType.LOCATION)
            .sortedBy { point -> point.timeDurationFromBoot }
        if (locationPoints.isNotEmpty()) gpsStatusMessage = GPS_STATUS_DIRECT

        nextAccumulator.applyMetricUpdate(
            elapsedRealtimeMs = elapsedRealtimeMs,
            distanceMeters = distanceMeters,
            heartRateBpm = heartRateBpm,
            activeDurationMs = activeDurationMs,
        )
        locationPoints.forEach { point ->
            val pointElapsedRealtimeMs = point.timeDurationFromBoot.toMillis()
            nextAccumulator.applyMetricUpdate(
                elapsedRealtimeMs = pointElapsedRealtimeMs,
                routePoint = WearRoutePoint(
                    timestampMs = wallClockMsForElapsed(pointElapsedRealtimeMs),
                    lat = point.value.latitude,
                    lng = point.value.longitude,
                    altitude = point.value.altitude.takeIf { it.isFinite() },
                    bearing = point.value.bearing.takeIf { it.isFinite() },
                ),
            )
        }

        val endAction = WearExerciseEndPolicy.afterExerciseUpdate(update.exerciseStateInfo.state.isEnded)
        val status = WearExerciseEndPolicy.sessionStatusAfterExerciseUpdate(
            action = endAction,
            currentStatus = WearExerciseSessionStore.current().status,
        )
        WearExerciseSessionStore.publishFromAccumulator(
            status = status,
            accumulator = nextAccumulator,
            message = locationStatusMessage(),
        )

        if (endAction == WearExerciseEndAction.PUBLISH_FINAL_UPDATE) {
            finishService()
        }
    }

    private fun clearExerciseCallback() {
        exerciseCallback?.let { callback ->
            exerciseClient.clearUpdateCallbackAsync(callback)
        }
        exerciseCallback = null
    }

    private fun restorePersistedSessionIfMissing(markRestartGap: Boolean = false): WearExerciseSessionSnapshot? {
        if (accumulator != null && WearExerciseSessionStore.current().status != WearExerciseSessionStatus.IDLE) {
            return WearExerciseSessionStore.current()
        }
        val persisted = WearExerciseSessionPersistence.load(this) ?: return null
        restoreRuntimeFromSnapshot(persisted, markRestartGap)
        return WearExerciseSessionStore.current()
    }

    private fun restoreRuntimeFromSnapshot(
        snapshot: WearExerciseSessionSnapshot,
        markRestartGap: Boolean,
    ) {
        val nowElapsedRealtimeMs = SystemClock.elapsedRealtime()
        wallClockOffsetMs = System.currentTimeMillis() - nowElapsedRealtimeMs
        lastDirectLocationElapsedRealtimeMs = snapshot.routePoints
            .maxOfOrNull { point -> (point.timestampMs - wallClockOffsetMs).coerceAtLeast(0L) }
            ?: 0L
        gpsStatusMessage = snapshot.message
            ?.takeIf { message -> message.startsWith("GPS ") }
            ?: if (snapshot.routePoints.isEmpty()) GPS_STATUS_SEARCHING else GPS_STATUS_DIRECT
        val runningStatus = snapshot.status in setOf(
            WearExerciseSessionStatus.STARTING,
            WearExerciseSessionStatus.ACTIVE,
            WearExerciseSessionStatus.FALLBACK,
        )
        activeDurationTracker.restore(
            persistedActiveDurationMs = snapshot.activeDurationMs,
            nowElapsedRealtimeMs = nowElapsedRealtimeMs,
            isRunning = runningStatus,
        )
        val restoredAccumulator = WearExerciseMetricAccumulator.fromSnapshot(
            snapshot = snapshot,
            startedAtElapsedRealtimeMs = (nowElapsedRealtimeMs - snapshot.activeDurationMs)
                .coerceAtLeast(0L),
            markRestartGap = markRestartGap && runningStatus,
        )
        accumulator = restoredAccumulator
        exerciseStarted = false
        endRequested = false
        if (runningStatus) {
            restoredAccumulator.applyMetricUpdate(
                elapsedRealtimeMs = nowElapsedRealtimeMs,
                activeDurationMs = activeDurationTracker.activeDurationAt(nowElapsedRealtimeMs),
            )
            WearExerciseSessionStore.publishFromAccumulator(
                status = snapshot.status,
                accumulator = restoredAccumulator,
                message = snapshot.message ?: "GPS direct · restored",
            )
        } else {
            WearExerciseSessionStore.restore(snapshot)
        }
    }

    private fun ensurePersistenceListener() {
        if (persistenceUnsubscribe != null) return
        persistenceUnsubscribe = WearExerciseSessionStore.addListener { snapshot ->
            WearExerciseSessionPersistence.saveOrClear(this, snapshot)
        }
    }

    private fun startDirectLocationUpdates() {
        if (!hasLocationPermission() || directLocationListener != null) return
        val manager = directLocationManager ?: return
        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                publishDirectLocation(location)
            }

            override fun onProviderEnabled(provider: String) {
                publishGpsStatus(GPS_STATUS_SEARCHING)
            }

            override fun onProviderDisabled(provider: String) {
                publishGpsStatus("GPS provider unavailable")
            }
        }
        try {
            val gpsEnabled = manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            if (gpsEnabled) {
                manager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1_000L, 2f, listener)
                directLocationListener = listener
            } else if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                manager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 2_000L, 5f, listener)
                directLocationListener = listener
            } else {
                gpsStatusMessage = "GPS provider unavailable"
                WearExerciseSessionStore.markFallback("GPS provider unavailable")
            }
        } catch (_: SecurityException) {
            directLocationListener = null
            gpsStatusMessage = "location permission missing"
            WearExerciseSessionStore.markFallback("location permission missing")
        } catch (_: IllegalArgumentException) {
            directLocationListener = null
            gpsStatusMessage = "GPS provider unavailable"
            WearExerciseSessionStore.markFallback("GPS provider unavailable")
        }
    }

    private fun stopDirectLocationUpdates() {
        val listener = directLocationListener ?: return
        try {
            directLocationManager?.removeUpdates(listener)
        } catch (_: SecurityException) {
        }
        directLocationListener = null
    }

    private fun publishDirectLocation(location: Location) {
        val accuracy = location.accuracy.takeIf { location.hasAccuracy() && it.isFinite() && it > 0f } ?: return
        val now = System.currentTimeMillis()
        val locationTime = location.time.takeIf { it > 0L } ?: now
        if (now - locationTime > MAX_DIRECT_GPS_AGE_MS || locationTime - now > 10_000L) return
        if (accuracy > MAX_DIRECT_GPS_ACCURACY_M) {
            publishGpsStatus("GPS weak ±${accuracy.roundToInt()}m")
            return
        }
        val currentAccumulator = accumulator ?: return
        val reportedElapsedRealtimeMs = if (location.elapsedRealtimeNanos > 0L) {
            location.elapsedRealtimeNanos / 1_000_000L
        } else {
            0L
        }
        val systemElapsedRealtimeMs = SystemClock.elapsedRealtime()
        val elapsedRealtimeMs = when {
            reportedElapsedRealtimeMs > lastDirectLocationElapsedRealtimeMs -> reportedElapsedRealtimeMs
            else -> systemElapsedRealtimeMs
        }.coerceAtLeast(lastDirectLocationElapsedRealtimeMs + 1L)
        lastDirectLocationElapsedRealtimeMs = elapsedRealtimeMs
        val activeDurationMs = activeDurationTracker.activeDurationAt(elapsedRealtimeMs)
        currentAccumulator.applyMetricUpdate(
            elapsedRealtimeMs = elapsedRealtimeMs,
            activeDurationMs = activeDurationMs,
            routePoint = WearRoutePoint(
                timestampMs = wallClockMsForElapsed(elapsedRealtimeMs),
                lat = location.latitude,
                lng = location.longitude,
                altitude = location.altitude.takeIf { location.hasAltitude() && it.isFinite() },
                bearing = location.bearing.toDouble().takeIf { location.hasBearing() && it.isFinite() },
                accuracy = accuracy.toDouble(),
            ),
        )
        currentAccumulator.applyMetricUpdate(
            elapsedRealtimeMs = elapsedRealtimeMs,
            distanceMeters = currentAccumulator.snapshot().distanceMeters,
            activeDurationMs = activeDurationMs,
        )
        WearExerciseSessionStore.publishFromAccumulator(
            status = WearExerciseSessionStatus.ACTIVE,
            accumulator = currentAccumulator,
            message = GPS_STATUS_DIRECT,
        )
        gpsStatusMessage = GPS_STATUS_DIRECT
    }

    private fun publishGpsStatus(message: String) {
        gpsStatusMessage = message
        val elapsedRealtimeMs = SystemClock.elapsedRealtime()
        if (elapsedRealtimeMs - lastGpsStatusPublishedElapsedRealtimeMs < GPS_STATUS_PUBLISH_INTERVAL_MS) return
        val currentAccumulator = accumulator ?: return
        lastGpsStatusPublishedElapsedRealtimeMs = elapsedRealtimeMs
        WearExerciseSessionStore.publishFromAccumulator(
            status = WearExerciseSessionStatus.ACTIVE,
            accumulator = currentAccumulator,
            message = message,
        )
    }

    private fun startDirectHeartRateUpdates() {
        if (!hasHeartRatePermission() || directHeartRateListener != null) return
        val manager = directHeartRateManager ?: return
        val sensor = manager.getDefaultSensor(Sensor.TYPE_HEART_RATE) ?: return
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                if (event.sensor.type != Sensor.TYPE_HEART_RATE) return
                val bpm = event.values.firstOrNull()
                    ?.takeIf { value -> value.isFinite() && value in MIN_HEART_RATE_BPM..MAX_HEART_RATE_BPM }
                    ?.roundToInt()
                    ?: return
                publishDirectHeartRate(bpm, event.timestamp)
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
        }
        try {
            if (manager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)) {
                directHeartRateListener = listener
            }
        } catch (_: SecurityException) {
            directHeartRateListener = null
        }
    }

    private fun stopDirectHeartRateUpdates() {
        val listener = directHeartRateListener ?: return
        directHeartRateManager?.unregisterListener(listener)
        directHeartRateListener = null
    }

    private fun publishDirectHeartRate(bpm: Int, timestampNanos: Long) {
        if (WearExerciseSessionStore.current().status !in setOf(
                WearExerciseSessionStatus.STARTING,
                WearExerciseSessionStatus.ACTIVE,
                WearExerciseSessionStatus.FALLBACK,
            )
        ) return
        val currentAccumulator = accumulator ?: return
        val elapsedRealtimeMs = (timestampNanos / 1_000_000L)
            .takeIf { timestampMs -> timestampMs > 0L }
            ?: SystemClock.elapsedRealtime()
        currentAccumulator.applyMetricUpdate(
            elapsedRealtimeMs = elapsedRealtimeMs,
            heartRateBpm = bpm,
            activeDurationMs = activeDurationTracker.activeDurationAt(elapsedRealtimeMs),
        )
        WearExerciseSessionStore.publishFromAccumulator(
            status = WearExerciseSessionStatus.ACTIVE,
            accumulator = currentAccumulator,
            message = locationStatusMessage(),
        )
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

    private fun warmUpDataTypes(dataTypes: Set<DataType<*, *>>): Set<DeltaDataType<*, *>> {
        val warmUpTypes = mutableSetOf<DeltaDataType<*, *>>()
        if (dataTypes.contains(DataType.LOCATION)) warmUpTypes.add(DataType.LOCATION)
        if (dataTypes.contains(DataType.HEART_RATE_BPM)) warmUpTypes.add(DataType.HEART_RATE_BPM)
        return warmUpTypes
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
        return if (hasLocationPermission()) gpsStatusMessage else "location permission missing"
    }

    private fun wallClockMsForElapsed(elapsedRealtimeMs: Long): Long {
        return wallClockOffsetMs + elapsedRealtimeMs
    }

    private fun buildNotification(contentText: String = "런닝/조깅 기록 중"): Notification {
        ensureNotificationChannel()
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("Tomato Farm")
            .setContentText(contentText)
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
        private const val ACTION_RESTORE_RUN = "com.lifestreak.wear.workout.RESTORE_RUN"
        private const val ACTION_PAUSE_RUN = "com.lifestreak.wear.workout.PAUSE_RUN"
        private const val ACTION_RESUME_RUN = "com.lifestreak.wear.workout.RESUME_RUN"
        private const val ACTION_END_RUN = "com.lifestreak.wear.workout.END_RUN"
        private const val NOTIFICATION_CHANNEL_ID = "wear-exercise"
        private const val NOTIFICATION_ID = 2001
        private const val MAX_DIRECT_GPS_ACCURACY_M = 35f
        private const val MAX_DIRECT_GPS_AGE_MS = 30_000L
        private const val GPS_STATUS_PUBLISH_INTERVAL_MS = 5_000L
        private const val GPS_STATUS_SEARCHING = "GPS searching"
        private const val GPS_STATUS_DIRECT = "GPS direct"
        private const val MIN_HEART_RATE_BPM = 30f
        private const val MAX_HEART_RATE_BPM = 240f
        const val PERMISSION_READ_HEART_RATE = "android.permission.health.READ_HEART_RATE"

        fun startRun(context: Context) {
            ContextCompat.startForegroundService(context, intentFor(context, ACTION_START_RUN))
        }

        fun restoreRun(context: Context) {
            ContextCompat.startForegroundService(context, intentFor(context, ACTION_RESTORE_RUN))
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

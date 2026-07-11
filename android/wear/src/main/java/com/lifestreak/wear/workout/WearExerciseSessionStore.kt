package com.lifestreak.wear.workout

import android.os.Handler
import android.os.Looper

enum class WearExerciseSessionStatus {
    IDLE,
    STARTING,
    ACTIVE,
    PAUSED,
    ENDED,
    FALLBACK,
    ERROR,
}

data class WearExerciseSessionSnapshot(
    val status: WearExerciseSessionStatus = WearExerciseSessionStatus.IDLE,
    val startedAtWallClockMs: Long = 0L,
    val distanceMeters: Double = 0.0,
    val latestHeartRateBpm: Int? = null,
    val activeDurationMs: Long = 0L,
    val distanceSamples: List<WearDistanceSample> = emptyList(),
    val heartRateSamples: List<HeartRateSample> = emptyList(),
    val routePoints: List<WearRoutePoint> = emptyList(),
    val message: String? = null,
)

object WearExerciseSessionStore {
    private val lock = Any()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val listeners = linkedSetOf<(WearExerciseSessionSnapshot) -> Unit>()
    private var snapshot = WearExerciseSessionSnapshot()

    fun addListener(listener: (WearExerciseSessionSnapshot) -> Unit): () -> Unit {
        val current = synchronized(lock) {
            listeners.add(listener)
            snapshot
        }
        dispatch(listener, current)
        return {
            synchronized(lock) {
                listeners.remove(listener)
            }
        }
    }

    fun resetForStart(startedAtWallClockMs: Long) {
        publish(
            WearExerciseSessionSnapshot(
                status = WearExerciseSessionStatus.STARTING,
                startedAtWallClockMs = startedAtWallClockMs,
            ),
        )
    }

    fun publishFromAccumulator(
        status: WearExerciseSessionStatus,
        accumulator: WearExerciseMetricAccumulator,
        message: String? = null,
    ) {
        val metrics = accumulator.snapshot()
        publish(
            WearExerciseSessionSnapshot(
                status = status,
                startedAtWallClockMs = metrics.startedAtWallClockMs,
                distanceMeters = metrics.distanceMeters,
                latestHeartRateBpm = metrics.latestHeartRateBpm,
                activeDurationMs = metrics.activeDurationMs,
                distanceSamples = metrics.distanceSamples,
                heartRateSamples = metrics.heartRateSamples,
                routePoints = metrics.routePoints,
                message = message,
            ),
        )
    }

    fun markPaused(message: String? = null) {
        updateStatus(WearExerciseSessionStatus.PAUSED, message)
    }

    fun markEnded(message: String? = null) {
        updateStatus(WearExerciseSessionStatus.ENDED, message)
    }

    fun reset() {
        publish(WearExerciseSessionSnapshot())
    }

    fun markFallback(message: String) {
        updateStatus(WearExerciseSessionStatus.FALLBACK, message)
    }

    fun markError(message: String) {
        updateStatus(WearExerciseSessionStatus.ERROR, message)
    }

    fun current(): WearExerciseSessionSnapshot = synchronized(lock) { snapshot }

    private fun updateStatus(status: WearExerciseSessionStatus, message: String?) {
        val next = synchronized(lock) {
            snapshot.copy(status = status, message = message)
        }
        publish(next)
    }

    private fun publish(next: WearExerciseSessionSnapshot) {
        val targets = synchronized(lock) {
            snapshot = next
            listeners.toList()
        }
        targets.forEach { listener -> dispatch(listener, next) }
    }

    private fun dispatch(
        listener: (WearExerciseSessionSnapshot) -> Unit,
        next: WearExerciseSessionSnapshot,
    ) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            listener(next)
        } else {
            mainHandler.post { listener(next) }
        }
    }
}

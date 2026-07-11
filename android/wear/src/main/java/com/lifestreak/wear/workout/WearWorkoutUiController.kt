package com.lifestreak.wear.workout

import android.Manifest
import android.content.pm.PackageManager
import android.os.Handler
import android.os.SystemClock
import android.util.Log
import android.view.View
import androidx.core.content.ContextCompat
import android.widget.TextView
import androidx.viewpager2.widget.ViewPager2
import com.lifestreak.wear.R
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class WearWorkoutUiController(
    private val handler: Handler,
    nowMs: () -> Long = { SystemClock.elapsedRealtime() },
) {
    private val runState = WearRunUiState(nowMs)
    private var sessionStoreUnsubscribe: (() -> Unit)? = null
    private var runEndUnsubscribe: (() -> Unit)? = null
    private var metricPagerAdapter: WearRunMetricPagerAdapter? = null
    private var summarySyncStatus = ""
    private var gpsStatus = "GPS 대기"

    private companion object {
        const val TAG = "TomatoWearRun"
    }

    fun bind(v: View) {
        clearRunTick(v)
        bindAttachCleanup(v)
        bindExerciseStore(v)
        initializeMetricPager(v)

        v.findViewById<View>(R.id.runStartButton)?.setOnClickListener {
            startRun(v)
        }
        v.findViewById<View>(R.id.runPauseButton)?.setOnClickListener {
            pauseRun(v)
        }
        v.findViewById<View>(R.id.runResumeButton)?.setOnClickListener {
            resumeRun(v)
        }
        v.findViewById<View>(R.id.runFinalStopButton)?.setOnClickListener {
            finishRun(v)
        }
        v.findViewById<View>(R.id.runSummaryDoneButton)?.setOnClickListener {
            runState.reset()
            render(v)
        }

        render(v)
        if (runState.screen == WearRunUiScreen.ACTIVE) scheduleRunTick(v)
    }

    fun dispose() {
        sessionStoreUnsubscribe?.invoke()
        sessionStoreUnsubscribe = null
        runEndUnsubscribe?.invoke()
        runEndUnsubscribe = null
        handler.removeCallbacksAndMessages(null)
    }

    private fun bindExerciseStore(v: View) {
        sessionStoreUnsubscribe?.invoke()
        sessionStoreUnsubscribe = WearExerciseSessionStore.addListener { snapshot ->
            updateRunLiveMetrics(snapshot)
            gpsStatus = when {
                snapshot.routePoints.isNotEmpty() -> "GPS ${snapshot.routePoints.size}점"
                snapshot.message?.contains("location", ignoreCase = true) == true -> "GPS 권한 필요"
                snapshot.status == WearExerciseSessionStatus.ACTIVE -> "GPS 대기"
                else -> gpsStatus
            }
            render(v)
        }
    }

    private fun bindAttachCleanup(v: View) {
        v.getTag(R.id.wear_run_attach_listener)?.let { existing ->
            v.removeOnAttachStateChangeListener(existing as View.OnAttachStateChangeListener)
        }
        val attachListener = object : View.OnAttachStateChangeListener {
            override fun onViewAttachedToWindow(view: View) {
                render(view)
                if (runState.screen == WearRunUiScreen.ACTIVE) scheduleRunTick(view)
            }

            override fun onViewDetachedFromWindow(view: View) {
                clearRunTick(view)
            }
        }
        v.addOnAttachStateChangeListener(attachListener)
        v.setTag(R.id.wear_run_attach_listener, attachListener)
    }

    private fun startRun(v: View) {
        if (ContextCompat.checkSelfPermission(v.context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            gpsStatus = "GPS 권한 필요"
            summarySyncStatus = "워치 설정에서 정확한 위치를 허용해주세요"
            render(v)
            return
        }
        runEndUnsubscribe?.invoke()
        runEndUnsubscribe = null
        summarySyncStatus = ""
        gpsStatus = "GPS 대기"
        runState.start()
        WearExerciseService.startRun(v.context)
        render(v)
        scheduleRunTick(v)
    }

    private fun pauseRun(v: View) {
        runState.pause()
        WearExerciseService.pauseRun(v.context)
        clearRunTick(v)
        render(v)
    }

    private fun resumeRun(v: View) {
        runState.resume()
        WearExerciseService.resumeRun(v.context)
        render(v)
        scheduleRunTick(v)
    }

    private fun finishRun(v: View) {
        runState.finish()
        clearRunTick(v)
        summarySyncStatus = "운동 종료 중"
        render(v)
        waitForFinalExerciseSnapshot(v)
        WearExerciseService.endRun(v.context)
    }

    private fun waitForFinalExerciseSnapshot(v: View) {
        runEndUnsubscribe?.invoke()
        lateinit var unsubscribe: () -> Unit
        unsubscribe = WearExerciseSessionStore.addListener { snapshot ->
            if (snapshot.status !in setOf(
                    WearExerciseSessionStatus.ENDED,
                    WearExerciseSessionStatus.ERROR,
                    WearExerciseSessionStatus.FALLBACK,
                )
            ) {
                return@addListener
            }
            handler.post {
                if (runEndUnsubscribe == null) return@post
                runEndUnsubscribe?.invoke()
                runEndUnsubscribe = null
                updateRunLiveMetrics(snapshot)
                if (snapshot.status == WearExerciseSessionStatus.ENDED) {
                    syncRunSummary(v)
                } else {
                    summarySyncStatus = "운동 종료 실패"
                    render(v)
                }
            }
        }
        runEndUnsubscribe = { unsubscribe() }
    }

    private fun render(v: View) {
        val snapshot = runState.snapshot()
        v.findViewById<View>(R.id.runReadyScreen)?.visibility =
            if (snapshot.screen == WearRunUiScreen.READY) View.VISIBLE else View.GONE
        v.findViewById<View>(R.id.runActiveScreen)?.visibility =
            if (snapshot.screen == WearRunUiScreen.ACTIVE) View.VISIBLE else View.GONE
        v.findViewById<View>(R.id.runPausedScreen)?.visibility =
            if (snapshot.screen == WearRunUiScreen.PAUSED) View.VISIBLE else View.GONE
        v.findViewById<View>(R.id.runSummaryScreen)?.visibility =
            if (snapshot.screen == WearRunUiScreen.SUMMARY) View.VISIBLE else View.GONE

        v.findViewById<TextView>(R.id.runActiveElapsed)?.text = snapshot.durationText
        v.findViewById<TextView>(R.id.runActiveDistance)?.text = snapshot.distanceText
        v.findViewById<TextView>(R.id.runActivePace)?.text = snapshot.paceText
        v.findViewById<TextView>(R.id.runActiveHeartRate)?.text = snapshot.heartRateText
        v.findViewById<TextView>(R.id.runActiveGpsStatus)?.text = gpsStatus
        initializeMetricPager(v)?.submitSnapshot(snapshot, gpsStatus)

        v.findViewById<TextView>(R.id.runPausedElapsed)?.text = snapshot.durationText

        v.findViewById<TextView>(R.id.runSummaryDuration)?.text = snapshot.durationText
        v.findViewById<TextView>(R.id.runSummaryDistance)?.text = snapshot.distanceSummaryText
        v.findViewById<TextView>(R.id.runSummaryPace)?.text = snapshot.paceText
        v.findViewById<TextView>(R.id.runSummaryHeartRate)?.text = snapshot.heartRateText
        v.findViewById<TextView>(R.id.runSummarySyncStatus)?.text = summarySyncStatus
        v.findViewById<TextView>(R.id.runSummaryGpsStatus)?.text = gpsStatus
    }

    private fun syncRunSummary(v: View) {
        summarySyncStatus = "폰 저장 전송 중"
        render(v)
        val session = buildWearRunSessionForSummary(
            exerciseSnapshot = WearExerciseSessionStore.current(),
            uiSnapshot = runState.snapshot(),
            nowWallClockMs = System.currentTimeMillis(),
            dateKeyFor = ::dateKeyFor,
        )
        session.toPayload()
            .onSuccess { payload ->
                WearWorkoutDataLayer.sendRunComplete(v.context, payload) { result ->
                    handler.post {
                        summarySyncStatus = result.message
                        render(v)
                    }
                }
            }
            .onFailure { error ->
                Log.w(TAG, "Wear run payload build failed", error)
                summarySyncStatus = "폰 저장 payload 오류"
                render(v)
            }
    }

    private fun initializeMetricPager(v: View): WearRunMetricPagerAdapter? {
        val pager = v.findViewById<ViewPager2>(R.id.runMetricPager) ?: return null
        val adapter = metricPagerAdapter ?: WearRunMetricPagerAdapter().also { metricPagerAdapter = it }
        if (pager.adapter !== adapter) {
            pager.adapter = adapter
            pager.offscreenPageLimit = 1
        }
        return adapter
    }

    private fun updateRunLiveMetrics(snapshot: WearExerciseSessionSnapshot) {
        runState.updateLiveMetrics(
            distanceKm = snapshot.distanceMeters / 1_000.0,
            distanceSamples = snapshot.distanceSamples,
            heartRateSamples = snapshot.heartRateSamples,
            routePoints = snapshot.routePoints,
        )
    }

    private fun scheduleRunTick(v: View) {
        if (runState.screen != WearRunUiScreen.ACTIVE || !v.isAttachedToWindow) return
        clearRunTick(v)
        val tick = object : Runnable {
            override fun run() {
                if (runState.screen != WearRunUiScreen.ACTIVE || !v.isAttachedToWindow) return
                render(v)
                handler.postDelayed(this, 1_000L)
            }
        }
        v.setTag(R.id.wear_run_tick_runnable, tick)
        handler.postDelayed(tick, 1_000L)
    }

    private fun clearRunTick(v: View) {
        val tick = v.getTag(R.id.wear_run_tick_runnable) as? Runnable ?: return
        handler.removeCallbacks(tick)
        v.setTag(R.id.wear_run_tick_runnable, null)
    }

    private fun dateKeyFor(epochMs: Long): String {
        return Instant.ofEpochMilli(epochMs)
            .atZone(ZoneId.systemDefault())
            .toLocalDate()
            .format(DateTimeFormatter.ISO_LOCAL_DATE)
    }
}

internal fun buildWearRunSessionForSummary(
    exerciseSnapshot: WearExerciseSessionSnapshot,
    uiSnapshot: WearRunUiSnapshot,
    nowWallClockMs: Long,
    dateKeyFor: (Long) -> String,
): WearRunSession {
    val uiDurationMs = uiSnapshot.durationMs.coerceAtLeast(1_000L)
    val startedAt = if (exerciseSnapshot.startedAtWallClockMs > 0L) {
        exerciseSnapshot.startedAtWallClockMs
    } else {
        (nowWallClockMs - uiDurationMs).coerceAtLeast(0L)
    }
    val durationMs = maxOf(
        exerciseSnapshot.activeDurationMs,
        uiSnapshot.durationMs,
        1_000L,
    )
    val latestSampleAt = maxOf(
        exerciseSnapshot.routePoints.maxOfOrNull { it.timestampMs } ?: startedAt,
        exerciseSnapshot.heartRateSamples.maxOfOrNull { it.timestampMs } ?: startedAt,
        exerciseSnapshot.distanceSamples.maxOfOrNull { it.timestampMs } ?: startedAt,
    )
    val endedAt = maxOf(startedAt + durationMs, latestSampleAt, nowWallClockMs)
    return WearRunSession(
        dateKey = dateKeyFor(startedAt),
        startedAtMs = startedAt,
        endedAtMs = endedAt,
        activeDurationMs = durationMs,
        distanceMeters = exerciseSnapshot.distanceMeters,
        heartRateSamples = exerciseSnapshot.heartRateSamples,
        routePoints = exerciseSnapshot.routePoints,
    )
}

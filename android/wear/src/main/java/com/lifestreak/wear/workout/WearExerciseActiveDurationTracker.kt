package com.lifestreak.wear.workout

/**
 * Owns the elapsed exercise clock used when direct GPS is the live source.
 * Health Services checkpoints are accepted only when they are plausible for
 * this session, because a delayed callback can belong to an older exercise.
 */
class WearExerciseActiveDurationTracker {
    private var accumulatedDurationMs = 0L
    private var resumedAtElapsedRealtimeMs: Long? = null

    fun start(nowElapsedRealtimeMs: Long) {
        accumulatedDurationMs = 0L
        resumedAtElapsedRealtimeMs = nowElapsedRealtimeMs.coerceAtLeast(0L)
    }

    fun restore(
        persistedActiveDurationMs: Long,
        nowElapsedRealtimeMs: Long,
        isRunning: Boolean,
    ) {
        accumulatedDurationMs = persistedActiveDurationMs.coerceAtLeast(0L)
        resumedAtElapsedRealtimeMs = if (isRunning) nowElapsedRealtimeMs.coerceAtLeast(0L) else null
    }

    fun pause(nowElapsedRealtimeMs: Long): Long {
        accumulatedDurationMs = activeDurationAt(nowElapsedRealtimeMs)
        resumedAtElapsedRealtimeMs = null
        return accumulatedDurationMs
    }

    fun resume(nowElapsedRealtimeMs: Long): Long {
        if (resumedAtElapsedRealtimeMs == null) {
            resumedAtElapsedRealtimeMs = nowElapsedRealtimeMs.coerceAtLeast(0L)
        }
        return activeDurationAt(nowElapsedRealtimeMs)
    }

    fun activeDurationAt(nowElapsedRealtimeMs: Long): Long {
        val resumedAt = resumedAtElapsedRealtimeMs ?: return accumulatedDurationMs
        return accumulatedDurationMs + (nowElapsedRealtimeMs - resumedAt).coerceAtLeast(0L)
    }

    fun plausibleHealthDuration(
        reportedDurationMs: Long?,
        nowElapsedRealtimeMs: Long,
    ): Long? {
        val reported = reportedDurationMs?.takeIf { it >= 0L } ?: return null
        val expected = activeDurationAt(nowElapsedRealtimeMs)
        return reported.takeIf { it <= expected + MAX_HEALTH_DURATION_LEAD_MS }
    }

    private companion object {
        const val MAX_HEALTH_DURATION_LEAD_MS = 15_000L
    }
}

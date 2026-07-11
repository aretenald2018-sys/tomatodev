package com.lifestreak.wear.workout

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WearExerciseActiveDurationTrackerTest {
    @Test
    fun excludesPausedWallClockTimeFromDirectGpsDuration() {
        val tracker = WearExerciseActiveDurationTracker()

        tracker.start(1_000L)
        assertEquals(4_000L, tracker.activeDurationAt(5_000L))

        tracker.pause(5_000L)
        assertEquals(4_000L, tracker.activeDurationAt(35_000L))

        tracker.resume(35_000L)
        assertEquals(7_000L, tracker.activeDurationAt(38_000L))
    }

    @Test
    fun rejectsDelayedHealthDurationFromAnotherExercise() {
        val tracker = WearExerciseActiveDurationTracker()
        tracker.start(1_000L)

        assertNull(tracker.plausibleHealthDuration(600_000L, 30_000L))
        assertEquals(28_000L, tracker.plausibleHealthDuration(28_000L, 30_000L))
        assertEquals(40_000L, tracker.plausibleHealthDuration(40_000L, 30_000L))
    }
}

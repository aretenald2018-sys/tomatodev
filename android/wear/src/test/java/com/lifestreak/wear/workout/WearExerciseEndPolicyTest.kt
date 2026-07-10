package com.lifestreak.wear.workout

import org.junit.Assert.assertEquals
import org.junit.Test

class WearExerciseEndPolicyTest {
    @Test
    fun waitsForFinalExerciseUpdateWhenEndFutureCompletesFirst() {
        assertEquals(
            WearExerciseEndAction.WAIT_FOR_FINAL_UPDATE,
            WearExerciseEndPolicy.afterEndFuture(success = true),
        )
        assertEquals(
            WearExerciseEndAction.PUBLISH_FINAL_UPDATE,
            WearExerciseEndPolicy.afterExerciseUpdate(isEnded = true),
        )
    }

    @Test
    fun reportsEndFailureWithoutPublishingSyntheticEndedState() {
        assertEquals(
            WearExerciseEndAction.PUBLISH_ERROR,
            WearExerciseEndPolicy.afterEndFuture(success = false),
        )
    }
}

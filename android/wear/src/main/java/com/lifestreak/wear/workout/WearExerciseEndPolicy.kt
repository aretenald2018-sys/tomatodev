package com.lifestreak.wear.workout

internal enum class WearExerciseEndAction {
    WAIT_FOR_FINAL_UPDATE,
    PUBLISH_FINAL_UPDATE,
    PUBLISH_ERROR,
}

internal object WearExerciseEndPolicy {
    fun afterEndFuture(success: Boolean): WearExerciseEndAction =
        if (success) {
            WearExerciseEndAction.WAIT_FOR_FINAL_UPDATE
        } else {
            WearExerciseEndAction.PUBLISH_ERROR
        }

    fun afterExerciseUpdate(isEnded: Boolean): WearExerciseEndAction =
        if (isEnded) {
            WearExerciseEndAction.PUBLISH_FINAL_UPDATE
        } else {
            WearExerciseEndAction.WAIT_FOR_FINAL_UPDATE
        }
}

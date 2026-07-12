import {
  WORKOUT_RUNNING_SESSION_INDEX,
  isRunningWorkoutSessionIndex,
  normalizeWorkoutSessionIndex,
} from './session-policy.js';
import {
  hasRunningSessionRecord,
  runningOnlySessionFields,
} from './running-model.js';

export function isWorkoutRunningTabIndex(index) {
  return isRunningWorkoutSessionIndex(index);
}
export function runningTrackSessionInfo(sessions = []) {
  const list = Array.isArray(sessions) ? sessions : [];
  const runningSessions = list.slice(WORKOUT_RUNNING_SESSION_INDEX)
    .map((session, offset) => ({ index: WORKOUT_RUNNING_SESSION_INDEX + offset, session }))
    .filter(item => hasRunningSessionRecord(item.session));
  if (runningSessions.length) {
    return {
      index: WORKOUT_RUNNING_SESSION_INDEX,
      session: runningSessions[0].session,
      runningSessions,
      hasRecord: true,
    };
  }
  const legacyIndex = list.findIndex(hasRunningSessionRecord);
  if (legacyIndex >= 0) {
    const legacy = { index: legacyIndex, session: list[legacyIndex] };
    return { index: legacyIndex, session: legacy.session, runningSessions: [legacy], hasRecord: true };
  }
  return {
    index: WORKOUT_RUNNING_SESSION_INDEX,
    session: list[WORKOUT_RUNNING_SESSION_INDEX] || {},
    runningSessions: [],
    hasRecord: false,
  };
}

export function runningStackSessionIndex(index) {
  return normalizeWorkoutSessionIndex(index, WORKOUT_RUNNING_SESSION_INDEX);
}

export function runningStackSession({ session = {}, activities = [] } = {}, activityRows) {
  if (typeof activityRows !== 'function') {
    throw new TypeError('running stack requires an activity row selector');
  }
  const rows = (Array.isArray(activities) ? activities : [])
    .map((item) => {
      const sourceSession = item?.session || {};
      const row = activityRows(runningOnlySessionFields(sourceSession))
        .find(candidate => candidate?.key === 'running');
      if (!row) return null;
      return {
        ...row,
        sessionIndex: runningStackSessionIndex(item.index),
      };
    })
    .filter(Boolean);
  return {
    session: runningOnlySessionFields(session),
    rows,
  };
}

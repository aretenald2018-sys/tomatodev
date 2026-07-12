let _runningLiveState = null;

export function setRunningLiveState(nextState) {
  _runningLiveState = nextState || null;
  return _runningLiveState;
}

export function getRunningLiveState() {
  return _runningLiveState;
}

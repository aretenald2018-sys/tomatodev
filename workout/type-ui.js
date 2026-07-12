import { wtOpenManualCardioInput } from './exercises.js';
import { wtOpenRunningSession } from './running-session.js';
import { wtRestTimerHideIdle, wtRestTimerShowIdle, wtStartWorkoutTimer } from './timers.js';

let activeType = 'gym';

const TYPE_SECTIONS = {
  gym: 'wt-gym-section',
  cf: 'wt-cf-section',
  stretch: 'wt-stretch-section',
  swimming: 'wt-swim-section',
};

const TYPE_TABS = {
  gym: 'wt-chip-gym',
  running: 'wt-chip-running',
  'manual-cardio': 'wt-chip-cardio',
  cf: 'wt-chip-cf',
  stretch: 'wt-chip-stretch',
  swimming: 'wt-chip-swimming',
};

function isKnownType(type) {
  return type === 'running' || type === 'manual-cardio' || !!TYPE_SECTIONS[type];
}

function applyActiveType(type) {
  Object.entries(TYPE_TABS).forEach(([candidate, id]) => {
    document.getElementById(id)?.classList.toggle('active', candidate === type);
  });
  Object.entries(TYPE_SECTIONS).forEach(([candidate, id]) => {
    document.getElementById(id)?.classList.toggle('wt-open', candidate === type);
  });
  if (type === 'running' || type === 'manual-cardio') return;
  document.getElementById('wt-workout-timer-bar')?.classList.add('wt-open');
  document.getElementById('wt-memo-section')?.classList.add('wt-open');
  document.getElementById('wt-save-section')?.classList.add('wt-open');
}

export function wtSwitchType(type) {
  if (!isKnownType(type)) return;
  const isReclick = activeType === type;
  activeType = type;
  applyActiveType(type);

  if (type === 'running') return wtOpenRunningSession();
  if (type === 'manual-cardio') return wtOpenManualCardioInput();
  if (type === 'gym' && !isReclick) {
    wtStartWorkoutTimer();
    wtRestTimerShowIdle();
  }
}

export function setActiveWorkoutType(type) {
  activeType = isKnownType(type) ? type : 'gym';
  applyActiveType(activeType);
}

export function resetWorkoutTypeUi() {
  activeType = 'gym';
  applyActiveType(activeType);
  wtRestTimerHideIdle();
  Object.values(TYPE_TABS).forEach(id => document.getElementById(id)?.classList.remove('has-record'));
}

export function restoreWorkoutTypes(types) {
  if (!Array.isArray(types) || types.length === 0) return;
  setActiveWorkoutType(types.find(isKnownType) || 'gym');
}

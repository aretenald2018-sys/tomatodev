import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const timersJs = readFileSync(new URL('../workout/timers.js', import.meta.url), 'utf8');
const loadJs = readFileSync(new URL('../workout/load.js', import.meta.url), 'utf8');
const exercisesJs = readFileSync(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const buildInfoJs = readFileSync(new URL('../utils/build-info.js', import.meta.url), 'utf8');
const swJs = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('active workout draft persists the full in-progress session locally', () => {
  assert.match(timersJs, /_LS_ACTIVE_WORKOUT_DRAFT_KEY_PREFIX\s*=\s*'tomatofarm_active_workout_draft_'/);
  assert.match(timersJs, /export function wtPersistActiveWorkoutDraft/);
  assert.match(timersJs, /export function wtApplyActiveWorkoutDraft/);
  assert.match(timersJs, /export function wtHasActiveWorkoutDraft/);
  assert.match(timersJs, /exercises:\s*_cloneJson\(w\.exercises,\s*\[\]\)/);
  assert.match(timersJs, /workoutStartTime:\s*Number\(S\.workout\.workoutStartTime\)/);
  assert.match(timersJs, /workoutTimeline:\s*_cloneJson\(w\.workoutTimeline,\s*null\)/);
  assert.match(timersJs, /workoutTimerDate:\s*timerDate/);
  assert.match(timersJs, /memo,/);
  assert.match(timersJs, /gymId:\s*w\.currentGymId/);
  assert.match(timersJs, /pickerGymFilter:\s*w\.pickerGymFilter/);
  assert.match(timersJs, /routineMeta:\s*_cloneJson\(w\.routineMeta/);
  assert.match(timersJs, /maxMeta:\s*_cloneJson\(w\.maxMeta/);
});

test('reload recovery applies same-date same-session draft during workout load', () => {
  assert.match(loadJs, /wtApplyActiveWorkoutDraft\(sessions\[targetSessionIndex\]/);
  assert.match(loadJs, /date:\s*\{\s*y,\s*m,\s*d\s*\}/);
  assert.match(loadJs, /sessionIndex:\s*targetSessionIndex/);
  assert.match(loadJs, /진행 중이던 운동 기록을 복구했어요/);
  assert.match(loadJs, /memoEl\.addEventListener\('input',\s*\(\)\s*=>\s*wtPersistActiveWorkoutDraft\('memo input'\)\)/);
});

test('saved workout sheet session can replace stale active draft for the same date and session', () => {
  const start = timersJs.indexOf('export function wtReplaceActiveWorkoutDraftSession');
  const end = timersJs.indexOf('export function wtHasActiveWorkoutDraft', start);
  assert.ok(start >= 0 && end > start, 'draft replacement helper should exist');
  const helper = timersJs.slice(start, end);

  assert.match(helper, /const existingDraft = _readValidActiveWorkoutDraft\(\)/);
  assert.match(helper, /!_sameTimerDate\(existingDraft\.date, date\) \|\| existingDraft\.sessionIndex !== targetSessionIndex/);
  assert.match(helper, /session:\s*\{\s*[\s\S]*\.\.\.nextSession/);
  assert.match(helper, /_sessionHasDraftData\(nextDraft\.session, nextDraft\)/);
  assert.match(helper, /_lsWriteActiveWorkoutDraft\(nextDraft\)/);
  assert.match(helper, /_lsClearActiveWorkoutDraft\(\)/);
});

test('set editing paths write local draft before relying on async save', () => {
  assert.match(exercisesJs, /wtPersistActiveWorkoutDraft\('set add'\)/);
  assert.match(exercisesJs, /wtPersistActiveWorkoutDraft\('set remove'\)/);
  assert.match(exercisesJs, /wtPersistActiveWorkoutDraft\(`set draft \$\{field\}`\)/);
  assert.match(exercisesJs, /wtPersistActiveWorkoutDraft\(`set update \$\{field\}`\)/);
  assert.match(exercisesJs, /wtPersistActiveWorkoutDraft\('set done toggle'\)/);
  assert.match(exercisesJs, /stampSetCompletedAt\(set\)/);
  assert.match(exercisesJs, /clearSetCompletedAt\(set\)/);
  assert.match(exercisesJs, /wtPersistActiveWorkoutDraft\('exercise add'\)/);
  assert.match(exercisesJs, /wtPersistActiveWorkoutDraft\('exercise remove'\)/);
});

test('workout timer duration uses set completion timeline instead of live elapsed', () => {
  assert.match(timersJs, /syncWorkoutTimeline\(S\.workout\)/);
  assert.doesNotMatch(timersJs, /Date\.now\(\) - S\.workout\.workoutStartTime\)\s*\/\s*1000\)\s*\+\s*S\.workout\.workoutDuration/);
  assert.match(timersJs, /pauseBtn\)\s*pauseBtn\.style\.display = 'none'/);
  assert.match(timersJs, /playBtn\)\s*playBtn\.style\.display\s+= 'none'/);
});

test('app update reload flushes workout draft and changes copy while workout is active', () => {
  assert.match(buildInfoJs, /window\.__wtHasActiveDraft/);
  assert.match(buildInfoJs, /운동 기록 저장됨/);
  assert.match(buildInfoJs, /업데이트 후에도 방금 하던 운동을 이어서 끝낼 수 있어요/);
  assert.match(buildInfoJs, /기록 보존 후 업데이트/);
  assert.match(buildInfoJs, /window\.__wtPersistActiveDraft/);
  assert.match(buildInfoJs, /await Promise\.resolve\(window\.__wtPersistActiveDraft\(\)\)/);
});

test('service worker cache version was bumped for recovery assets', () => {
  assert.match(swJs, /tomatofarm-v20260703z11-selection-detail-contract/);
});

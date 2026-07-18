#!/usr/bin/env node
import { CONFIG } from '../config.js';

const API_KEY = CONFIG.FIREBASE.apiKey;
const PROJECT_ID = CONFIG.FIREBASE.projectId;
if (PROJECT_ID !== 'tomatodev-arete') {
  throw new Error(`Refusing PITR access outside TomatoDev: ${PROJECT_ID}`);
}
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const WORKOUT_FIELDS = [
  'exercises',
  'workoutSessions',
  'workoutDuration',
  'workoutTimeline',
  'workoutPhoto',
  'cf',
  'cf_skip',
  'cf_health',
  'cfWod',
  'cfDurationMin',
  'cfDurationSec',
  'cfMemo',
  'stretching',
  'stretchDuration',
  'stretchMemo',
  'swimming',
  'swimDistance',
  'swimDurationMin',
  'swimDurationSec',
  'swimStroke',
  'swimMemo',
  'running',
  'runDistance',
  'runDurationMin',
  'runDurationSec',
  'runMemo',
  'gymId',
  'pickerGymFilter',
  'routineMeta',
  'maxMeta',
  'memo',
  'lifeZoneWorkoutActivity',
];

function usage() {
  console.error('usage: node scripts/restore-workout-from-pitr.mjs <ownerId> <dateKey> <readTimeIso> [--write]');
  process.exit(2);
}

const [ownerId, dateKey, readTime, mode] = process.argv.slice(2);
if (!ownerId || !dateKey || !readTime) usage();
const shouldWrite = mode === '--write';

function decodeValue(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) {
    const out = {};
    for (const [key, child] of Object.entries(value.mapValue.fields || {})) {
      out[key] = decodeValue(child);
    }
    return out;
  }
  return undefined;
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [key, child] of Object.entries(value)) fields[key] = encodeValue(child);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function decodeDoc(doc) {
  const out = {};
  for (const [key, value] of Object.entries(doc.fields || {})) out[key] = decodeValue(value);
  return out;
}

async function getDoc({ at = null } = {}) {
  const path = `users/${encodeURIComponent(ownerId)}/workouts/${dateKey}`;
  const params = new URLSearchParams({ key: API_KEY });
  if (at) params.set('readTime', at);
  const res = await fetch(`${BASE}/${path}?${params}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed ${res.status}: ${await res.text()}`);
  return decodeDoc(await res.json());
}

function workoutSummary(day) {
  if (!day) return { exists: false };
  const exercises = Array.isArray(day.exercises) ? day.exercises : [];
  const sessions = Array.isArray(day.workoutSessions) ? day.workoutSessions : [];
  const sessionExercises = sessions.reduce((sum, session) => (
    sum + (Array.isArray(session?.exercises) ? session.exercises.length : 0)
  ), 0);
  const topSets = exercises.reduce((sum, entry) => sum + (Array.isArray(entry?.sets) ? entry.sets.length : 0), 0);
  const sessionSets = sessions.reduce((sum, session) => {
    const entries = Array.isArray(session?.exercises) ? session.exercises : [];
    return sum + entries.reduce((inner, entry) => inner + (Array.isArray(entry?.sets) ? entry.sets.length : 0), 0);
  }, 0);
  return {
    exists: true,
    exercises: exercises.length,
    sessions: sessions.length,
    sessionExercises,
    sets: topSets + sessionSets,
    workoutDuration: Number(day.workoutDuration) || 0,
    gymId: day.gymId || null,
    hasMaxMeta: Boolean(day.maxMeta),
  };
}

const source = await getDoc({ at: readTime });
const current = await getDoc();
if (!source) throw new Error(`No PITR source for ${ownerId} ${dateKey} at ${readTime}`);

const patch = {};
for (const field of WORKOUT_FIELDS) {
  if (Object.prototype.hasOwnProperty.call(source, field)) patch[field] = source[field];
}

const updateMask = Object.keys(patch);
if (!updateMask.length) throw new Error('PITR source did not contain workout fields to restore');

if (shouldWrite) {
  const path = `users/${encodeURIComponent(ownerId)}/workouts/${dateKey}`;
  const params = new URLSearchParams({ key: API_KEY });
  updateMask.forEach((field) => params.append('updateMask.fieldPaths', field));
  const fields = {};
  for (const [key, value] of Object.entries(patch)) fields[key] = encodeValue(value);

  const res = await fetch(`${BASE}/${path}?${params}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed ${res.status}: ${await res.text()}`);
}

const after = shouldWrite ? await getDoc() : current;
console.log(JSON.stringify({
  ownerId,
  dateKey,
  readTime,
  mode: shouldWrite ? 'write' : 'dry-run',
  restoredFields: updateMask,
  before: workoutSummary(current),
  source: workoutSummary(source),
  after: workoutSummary(after),
}, null, 2));

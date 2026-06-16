import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { CONFIG } from '../config.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCk2czvJ8DRautrUput8TLjdrArpQm7BBk',
  authDomain: 'exercise-management.firebaseapp.com',
  projectId: 'exercise-management',
  storageBucket: 'exercise-management.firebasestorage.app',
  messagingSenderId: '867781711662',
  appId: '1:867781711662:web:8fe1e9904c94d021f2ccbf',
};

const OWNER_ID = process.argv[2] || '김_태우';
const GUEST_ID = process.argv[3] === '-'
  ? ''
  : (process.argv[3] || (OWNER_ID === '김_태우' ? '김_태우(guest)' : ''));
const UNTIL_DATE = process.argv[4] || '2026-05-08';
const DEFAULT_FILE_SLUG = OWNER_ID === '김_태우' ? 'kim_taewoo' : OWNER_ID;
const FILE_SLUG = (process.argv[5] || DEFAULT_FILE_SLUG)
  .normalize('NFKD')
  .replace(/[^\p{Letter}\p{Number}]+/gu, '_')
  .replace(/^_+|_+$/g, '')
  .toLowerCase();

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

async function readUserCollection(userId, collectionName) {
  const snap = await getDocs(collection(db, 'users', userId, collectionName));
  const rows = [];
  snap.forEach((docSnap) => rows.push({ id: docSnap.id, ...docSnap.data() }));
  return rows;
}

function isEmptyValue(value) {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value === '';
  if (typeof value === 'number') return value === 0;
  if (typeof value === 'boolean') return value === false;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function activeWorkoutFields(day) {
  const fields = [
    'exercises', 'cf', 'swimming', 'running', 'stretching',
    'runDistance', 'runDurationMin', 'runDurationSec', 'runMemo',
    'swimDistance', 'swimDurationMin', 'swimDurationSec', 'swimStroke', 'swimMemo',
    'cfWod', 'cfDurationMin', 'cfDurationSec', 'cfMemo',
    'stretchDuration', 'stretchMemo', 'workoutDuration', 'workoutPhoto',
    'gymId', 'routineMeta',
  ];
  const out = {};
  for (const field of fields) {
    if (!isEmptyValue(day[field])) out[field] = day[field];
  }
  return out;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(fileName, header, rows) {
  const outDir = path.join(process.cwd(), 'exports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, fileName);
  const body = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  fs.writeFileSync(filePath, `\ufeff${body}`, 'utf8');
  return filePath;
}

function num(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

const CHECKIN_WEIGHT_KEYS = ['weight', 'weightKg', 'weight_kg', 'bodyWeight', 'currentWeight'];
const CHECKIN_BODY_FAT_KEYS = ['bodyFatPct', 'bodyFatPercent', 'body_fat_pct'];

function firstFiniteNumber(row, keys) {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (value === '' || value === null || value === undefined) continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function checkinWeight(row) {
  return firstFiniteNumber(row, CHECKIN_WEIGHT_KEYS);
}

function checkinBodyFatPct(row) {
  return firstFiniteNumber(row, CHECKIN_BODY_FAT_KEYS);
}

function sameDayWeights(rows = []) {
  return rows
    .map((row) => checkinWeight(row))
    .filter((value) => value !== null)
    .join('|');
}

function yesNo(value) {
  if (value === true) return 'Y';
  if (value === false) return 'N';
  return '';
}

function formatFoods(foods) {
  if (!Array.isArray(foods) || foods.length === 0) return '';
  return foods.map((food) => {
    if (typeof food === 'string') return food;
    const grams = food.grams || food.amount || food.weight || '';
    const kcal = food.kcal ?? food.calories ?? '';
    return [
      food.name || food.foodName || food.label || '',
      grams ? `${grams}g` : '',
      kcal ? `${kcal}kcal` : '',
    ].filter(Boolean).join(' ');
  }).join(' | ');
}

function workoutSummary(day, exerciseMap) {
  const parts = [];
  if (Array.isArray(day.exercises) && day.exercises.length > 0) {
    parts.push(day.exercises.map((entry) => {
      const name = exerciseMap.get(entry.exerciseId)?.name || entry.exerciseId || '';
      const sets = (entry.sets || []).map((set) => {
        const suffix = set.done === false ? '(미완료)' : '';
        return `${set.kg ?? ''}kgx${set.reps ?? ''}${suffix}`;
      }).join('/');
      return `${name}:${sets}`;
    }).join(' ; '));
  }
  if (day.cf) parts.push(`크로스핏 ${day.cfWod || ''}`.trim());
  if (day.running) {
    parts.push(`러닝 ${day.runDistance || ''}km ${day.runDurationMin || 0}:${String(day.runDurationSec || 0).padStart(2, '0')}`);
  }
  if (day.swimming) {
    parts.push(`수영 ${day.swimDistance || ''}m ${day.swimDurationMin || 0}:${String(day.swimDurationSec || 0).padStart(2, '0')}`);
  }
  if (day.stretching) parts.push(`스트레칭 ${day.stretchDuration || ''}분`);
  return parts.join(' | ');
}

const [mainWorkouts, guestWorkouts, mainCheckins, guestCheckins, customExercises] = await Promise.all([
  readUserCollection(OWNER_ID, 'workouts'),
  GUEST_ID ? readUserCollection(GUEST_ID, 'workouts') : Promise.resolve([]),
  readUserCollection(OWNER_ID, 'body_checkins'),
  GUEST_ID ? readUserCollection(GUEST_ID, 'body_checkins') : Promise.resolve([]),
  readUserCollection(OWNER_ID, 'exercises'),
]);

const workoutsByDate = new Map();
for (const row of mainWorkouts) {
  if (row.id <= UNTIL_DATE) workoutsByDate.set(row.id, row);
}
for (const row of guestWorkouts) {
  if (row.id > UNTIL_DATE) continue;
  const existing = workoutsByDate.get(row.id) || {};
  workoutsByDate.set(row.id, { ...row, ...existing, ...activeWorkoutFields(row) });
}

const checkins = [...mainCheckins, ...guestCheckins]
  .filter((row) => (row.date || '') <= UNTIL_DATE)
  .sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '');
    if (dateCompare) return dateCompare;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
const checkinsByDate = new Map();
for (const checkin of checkins) {
  if (!checkinsByDate.has(checkin.date)) checkinsByDate.set(checkin.date, []);
  checkinsByDate.get(checkin.date).push(checkin);
}
const checkinByDate = new Map([...checkinsByDate.entries()].map(([date, rows]) => [date, rows.at(-1)]));

const exerciseMap = new Map();
for (const entry of CONFIG.DEFAULT_EXERCISES || []) exerciseMap.set(entry.id, entry);
for (const entry of customExercises) exerciseMap.set(entry.id, { ...exerciseMap.get(entry.id), ...entry });

const mealDefs = [
  ['breakfast', '아침', 'b'],
  ['lunch', '점심', 'l'],
  ['dinner', '저녁', 'd'],
  ['snack', '간식', 's'],
];

const dates = [...new Set([...workoutsByDate.keys(), ...checkins.map((row) => row.date)])]
  .filter(Boolean)
  .sort();

const dailyRows = [];
const mealRows = [];
const setRows = [];
const checkinRows = [];
const combinedRows = [];
const combinedHeader = [
  'date', 'record_type',
  'meal_key', 'meal_label', 'meal_memo', 'foods',
  'kcal', 'protein_g', 'carbs_g', 'fat_g', 'target_ok', 'skipped',
  'exercise_order', 'set_order', 'exercise_id', 'exercise_name', 'muscle_id',
  'kg', 'reps', 'set_type', 'done', 'rpe', 'rom',
  'weight_kg', 'bodyFatPct', 'delta_from_previous_kg',
  'same_day_weights_kg', 'effective_weight_kg', 'weight_source_id',
  'workout_minutes', 'workout_flags', 'workout_summary',
  'memo_or_reason', 'note', 'source_id',
];

function combinedRecord(values) {
  return combinedHeader.map((key) => values[key] ?? '');
}

let previousWeight = null;
for (const checkin of checkins) {
  const weight = checkinWeight(checkin);
  const bodyFatPct = checkinBodyFatPct(checkin);
  const delta = previousWeight === null || weight === null
    ? ''
    : Number((weight - previousWeight).toFixed(1));
  checkinRows.push([
    checkin.date,
    weight ?? '',
    bodyFatPct ?? '',
    delta,
    checkin.note ?? '',
    checkin.id,
  ]);
  combinedRows.push(combinedRecord({
    date: checkin.date,
    record_type: 'body_checkin',
    weight_kg: weight ?? '',
    bodyFatPct: bodyFatPct ?? '',
    delta_from_previous_kg: delta,
    same_day_weights_kg: sameDayWeights(checkinsByDate.get(checkin.date) || []),
    effective_weight_kg: weight ?? '',
    weight_source_id: checkin.id,
    note: checkin.note ?? '',
    source_id: checkin.id,
  }));
  if (weight !== null) previousWeight = weight;
}

let carryCheckin = null;
let checkinCursor = 0;
for (const date of dates) {
  const day = workoutsByDate.get(date) || {};
  while (checkinCursor < checkins.length && (checkins[checkinCursor].date || '') <= date) {
    if (checkinWeight(checkins[checkinCursor]) !== null) carryCheckin = checkins[checkinCursor];
    checkinCursor++;
  }
  const sameDayCheckins = checkinsByDate.get(date) || [];
  const checkin = checkinByDate.get(date) || {};
  const exactWeight = checkinWeight(checkin);
  const exactBodyFatPct = checkinBodyFatPct(checkin);
  const effectiveWeight = exactWeight ?? checkinWeight(carryCheckin);
  const effectiveWeightSourceId = effectiveWeight === null
    ? ''
    : (exactWeight !== null ? checkin.id : (carryCheckin?.id ?? ''));
  const sameDayWeightValues = sameDayWeights(sameDayCheckins);
  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  const mealCells = [];

  for (const [key, label, prefix] of mealDefs) {
    const kcal = num(day[`${prefix}Kcal`]);
    const protein = num(day[`${prefix}Protein`]);
    const carbs = num(day[`${prefix}Carbs`]);
    const fat = num(day[`${prefix}Fat`]);
    const foods = formatFoods(day[`${prefix}Foods`]);

    totalKcal += kcal;
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;

    mealCells.push(
      day[key] || '',
      foods,
      kcal || '',
      protein || '',
      carbs || '',
      fat || '',
      yesNo(day[`${prefix}Ok`]),
      yesNo(day[`${key}_skipped`]),
      day[`${prefix}Reason`] || '',
    );

    if (day[key] || foods || kcal || day[`${key}_skipped`]) {
      mealRows.push([
        date,
        key,
        label,
        day[key] || '',
        foods,
        kcal || '',
        protein || '',
        carbs || '',
        fat || '',
        yesNo(day[`${prefix}Ok`]),
        yesNo(day[`${key}_skipped`]),
        day[`${prefix}Reason`] || '',
      ]);
      combinedRows.push(combinedRecord({
        date,
        record_type: 'meal',
        meal_key: key,
        meal_label: label,
        meal_memo: day[key] || '',
        foods,
        kcal: kcal || '',
        protein_g: protein || '',
        carbs_g: carbs || '',
        fat_g: fat || '',
        target_ok: yesNo(day[`${prefix}Ok`]),
        skipped: yesNo(day[`${key}_skipped`]),
        same_day_weights_kg: sameDayWeightValues,
        effective_weight_kg: effectiveWeight ?? '',
        weight_source_id: effectiveWeightSourceId,
        memo_or_reason: day[`${prefix}Reason`] || '',
      }));
    }
  }

  const exercises = Array.isArray(day.exercises) ? day.exercises : [];
  exercises.forEach((entry, exerciseIndex) => {
    const exercise = exerciseMap.get(entry.exerciseId) || {};
    (entry.sets || []).forEach((set, setIndex) => {
      setRows.push([
        date,
        exerciseIndex + 1,
        setIndex + 1,
        entry.exerciseId || '',
        exercise.name || '',
        entry.muscleId || exercise.muscleId || '',
        set.kg ?? '',
        set.reps ?? '',
        set.setType || '',
        yesNo(set.done),
        set.rpe ?? '',
        set.rom ?? '',
        set.memo || '',
      ]);
      combinedRows.push(combinedRecord({
        date,
        record_type: 'workout_set',
        exercise_order: exerciseIndex + 1,
        set_order: setIndex + 1,
        exercise_id: entry.exerciseId || '',
        exercise_name: exercise.name || '',
        muscle_id: entry.muscleId || exercise.muscleId || '',
        kg: set.kg ?? '',
        reps: set.reps ?? '',
        set_type: set.setType || '',
        done: yesNo(set.done),
        rpe: set.rpe ?? '',
        rom: set.rom ?? '',
        same_day_weights_kg: sameDayWeightValues,
        effective_weight_kg: effectiveWeight ?? '',
        weight_source_id: effectiveWeightSourceId,
        memo_or_reason: set.memo || '',
      }));
    });
  });

  const summary = workoutSummary(day, exerciseMap);
  if (summary || day.cf || day.running || day.swimming || day.stretching || day.workoutDuration || day.memo) {
    combinedRows.push(combinedRecord({
      date,
      record_type: 'daily_summary',
      weight_kg: effectiveWeight ?? '',
      bodyFatPct: exactBodyFatPct ?? '',
      same_day_weights_kg: sameDayWeightValues,
      effective_weight_kg: effectiveWeight ?? '',
      weight_source_id: effectiveWeightSourceId,
      workout_minutes: Math.round(num(day.workoutDuration) / 60) || '',
      workout_flags: [
        day.cf ? 'crossfit' : '',
        day.running ? `running:${day.runDistance || ''}km` : '',
        day.swimming ? `swimming:${day.swimDistance || ''}m` : '',
        day.stretching ? 'stretching' : '',
      ].filter(Boolean).join('|'),
      workout_summary: summary,
      memo_or_reason: day.memo || '',
    }));
  }

  dailyRows.push([
    date,
    effectiveWeight ?? '',
    exactBodyFatPct ?? '',
    totalKcal || '',
    totalProtein || '',
    totalCarbs || '',
    totalFat || '',
    ...mealCells,
    exercises.length,
    exercises.reduce((sum, entry) => sum + (entry.sets?.length || 0), 0),
    Math.round(num(day.workoutDuration) / 60) || '',
    yesNo(day.cf),
    yesNo(day.running),
    day.runDistance || '',
    yesNo(day.swimming),
    day.swimDistance || '',
    yesNo(day.stretching),
    workoutSummary(day, exerciseMap),
    day.memo || '',
    effectiveWeightSourceId,
  ]);
}

const mealHeader = [];
for (const [, label] of mealDefs) {
  mealHeader.push(
    `${label}_메모`,
    `${label}_음식목록`,
    `${label}_kcal`,
    `${label}_protein_g`,
    `${label}_carbs_g`,
    `${label}_fat_g`,
    `${label}_목표OK`,
    `${label}_건너뜀`,
    `${label}_판정사유`,
  );
}

const files = [
  writeCsv(
    `tomatofarm_${FILE_SLUG}_daily_to_${UNTIL_DATE}.csv`,
    [
      'date', 'weight_kg', 'bodyFatPct', 'total_kcal', 'total_protein_g', 'total_carbs_g', 'total_fat_g',
      ...mealHeader,
      'exercise_count', 'set_count', 'workout_minutes',
      'crossfit', 'running', 'run_distance_km', 'swimming', 'swim_distance_m', 'stretching',
      'workout_summary', 'memo', 'weight_source_id',
    ],
    dailyRows,
  ),
  writeCsv(
    `tomatofarm_${FILE_SLUG}_meals_to_${UNTIL_DATE}.csv`,
    ['date', 'meal_key', 'meal_label', 'memo', 'foods', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'target_ok', 'skipped', 'reason'],
    mealRows,
  ),
  writeCsv(
    `tomatofarm_${FILE_SLUG}_workout_sets_to_${UNTIL_DATE}.csv`,
    ['date', 'exercise_order', 'set_order', 'exercise_id', 'exercise_name', 'muscle_id', 'kg', 'reps', 'set_type', 'done', 'rpe', 'rom', 'memo'],
    setRows,
  ),
  writeCsv(
    `tomatofarm_${FILE_SLUG}_body_checkins_to_${UNTIL_DATE}.csv`,
    ['date', 'weight_kg', 'bodyFatPct', 'delta_from_previous_kg', 'note', 'id'],
    checkinRows,
  ),
];

combinedRows.sort((a, b) => {
  const dateCompare = String(a[0] || '').localeCompare(String(b[0] || ''));
  if (dateCompare) return dateCompare;
  const order = { body_checkin: 1, meal: 2, workout_set: 3, daily_summary: 4 };
  return (order[a[1]] || 99) - (order[b[1]] || 99);
});

files.unshift(writeCsv(
  `tomatofarm_${FILE_SLUG}_all_records_to_${UNTIL_DATE}.csv`,
  combinedHeader,
  combinedRows,
));

console.log(JSON.stringify({
  owner: OWNER_ID,
  until: UNTIL_DATE,
  workoutDays: workoutsByDate.size,
  checkins: checkins.length,
  dailyRows: dailyRows.length,
  mealRows: mealRows.length,
  setRows: setRows.length,
  combinedRows: combinedRows.length,
  files,
}, null, 2));

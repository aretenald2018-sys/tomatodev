export const CARDIO_EXERCISE_ID_PREFIX = 'cardio:';
export const CARDIO_PICKER_ASSET_BASE = './assets/workout/cardio/';
export const CARDIO_PICKER_EXERCISES = Object.freeze([
  { id: 'treadmill-running', label: '트레드밀 러닝', detail: '러닝머신', image: `${CARDIO_PICKER_ASSET_BASE}treadmill-running.png` },
  { id: 'my-mountain', label: '마이마운틴', detail: '각도 조절 유산소', image: `${CARDIO_PICKER_ASSET_BASE}my-mountain.png` },
  { id: 'step-machine', label: '스텝머신', detail: '계단 오르기', image: `${CARDIO_PICKER_ASSET_BASE}step-machine.png` },
  { id: 'stationary-bike', label: '실내 자전거', detail: '고정식 바이크', image: `${CARDIO_PICKER_ASSET_BASE}stationary-bike.png` },
  { id: 'rowing', label: '로잉', detail: '로잉 머신', image: `${CARDIO_PICKER_ASSET_BASE}rowing.png` },
  { id: 'indoor-cycling', label: '인도어 사이클링', detail: '스핀 바이크', image: `${CARDIO_PICKER_ASSET_BASE}indoor-cycling.png` },
  { id: 'recumbent-bike', label: '리컴번트 바이크', detail: '좌식 자전거', image: `${CARDIO_PICKER_ASSET_BASE}recumbent-bike.png` },
]);

export const CARDIO_INTENSITY_FIELDS = Object.freeze({
  'my-mountain': {
    key: 'angleDeg', inputId: 'ex-cardio-angle', label: '각도', unit: '°',
    min: 0, max: 40, step: 0.5, digits: 1,
    autoStatus: '거리/속도/각도 자동 산출',
  },
  'step-machine': {
    key: 'level', inputId: 'ex-cardio-level', label: '단계', unit: '단계',
    min: 1, max: 30, step: 1, digits: 0,
    autoStatus: '거리/속도/단계 자동 산출',
  },
});

export function manualCardioExerciseId(cardio) {
  return `${CARDIO_EXERCISE_ID_PREFIX}${String(cardio?.id || '').trim()}`;
}

export function pickerCardioById(id) {
  const cardioId = String(id || '').replace(CARDIO_EXERCISE_ID_PREFIX, '');
  return CARDIO_PICKER_EXERCISES.find(item => item.id === cardioId) || CARDIO_PICKER_EXERCISES[0];
}

export function isManualCardioEntry(entry) {
  return !!entry?.cardio || String(entry?.exerciseId || '').startsWith(CARDIO_EXERCISE_ID_PREFIX);
}

export function manualCardioRound(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const unit = 10 ** digits;
  return Math.round(n * unit) / unit;
}

export function manualCardioNumber(value, digits = 1) {
  const raw = String(value ?? '').trim();
  if (raw === '') return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return manualCardioRound(n, digits);
}

export function manualCardioInputValue(value, digits = 1) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? manualCardioRound(n, digits) : '';
}

export function manualCardioIntensityConfig(cardio) {
  const id = String(cardio?.id || cardio || '').replace(CARDIO_EXERCISE_ID_PREFIX, '');
  return CARDIO_INTENSITY_FIELDS[id] || null;
}

export function manualCardioIntensityNumber(value, config) {
  if (!config) return 0;
  const n = manualCardioNumber(value, config.digits);
  if (n == null) return null;
  if (n <= 0) return 0;
  return manualCardioRound(Math.min(config.max, Math.max(config.min, n)), config.digits);
}

export function manualCardioIntensityValue(data, config) {
  return config ? manualCardioIntensityNumber(data?.[config.key], config) : 0;
}

export function estimateManualCardioCalories(distanceKm, speedKmh, options = {}) {
  const distance = Number(distanceKm);
  const speed = Number(speedKmh);
  if (!Number.isFinite(distance) || !Number.isFinite(speed) || distance <= 0 || speed <= 0) return 0;
  const cardioId = String(options.cardioId || '').replace(CARDIO_EXERCISE_ID_PREFIX, '');
  let multiplier = 1;
  if (cardioId === 'my-mountain') multiplier += Math.min(40, Math.max(0, Number(options.angleDeg) || 0)) * 0.035;
  if (cardioId === 'step-machine') multiplier += Math.max(0, Math.min(30, Math.max(0, Number(options.level) || 0)) - 1) * 0.025;
  const durationHours = distance / speed;
  const met = speed < 4 ? 3.5 : speed < 6 ? 5 : speed < 8 ? 7 : speed < 10 ? 9 : 10.5;
  return Math.min(5000, Math.max(1, Math.round(met * 70 * durationHours * multiplier)));
}

export function manualCardioSummary(input = {}) {
  const cardio = pickerCardioById(input.cardio?.id || input.cardio);
  const intensityConfig = manualCardioIntensityConfig(cardio);
  const summary = {
    kcal: manualCardioNumber(input.kcal, 0),
    distanceKm: manualCardioNumber(input.distanceKm, 2),
    speedKmh: manualCardioNumber(input.speedKmh, 1),
    laps: manualCardioNumber(input.laps, 0),
  };
  if (Object.values(summary).some(value => value == null)) return null;
  if (intensityConfig) {
    const intensity = manualCardioIntensityNumber(input[intensityConfig.key], intensityConfig);
    if (intensity == null) return null;
    summary[intensityConfig.key] = intensity;
  }
  if (![summary.kcal, summary.distanceKm, summary.speedKmh, summary.laps].some(value => Number(value) > 0)) return null;
  return { ...summary, cardio, kcalMode: input.kcalMode === 'manual' ? 'manual' : 'auto' };
}

export function manualCardioEntryData(entry) {
  const raw = entry?.cardio || {};
  const cardio = pickerCardioById(raw.id || String(entry?.exerciseId || '').replace(CARDIO_EXERCISE_ID_PREFIX, ''));
  const summary = manualCardioSummary({ ...raw, cardio }) || { kcal: 0, distanceKm: 0, speedKmh: 0, laps: 0 };
  return { cardio, ...summary };
}

function _displayNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (Number.isInteger(number)) return String(number);
  return String(Math.round(number * (10 ** digits)) / (10 ** digits));
}

function _nonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function manualCardioDisplayData(entry = {}) {
  if (!isManualCardioEntry(entry)) return null;
  const raw = entry.cardio && typeof entry.cardio === 'object' ? entry.cardio : {};
  const kcal = Math.round(_nonNegativeNumber(raw.kcal));
  const distanceKm = _nonNegativeNumber(raw.distanceKm);
  const speedKmh = _nonNegativeNumber(raw.speedKmh);
  const laps = Math.round(_nonNegativeNumber(raw.laps));
  const angleDeg = _nonNegativeNumber(raw.angleDeg);
  const level = Math.round(_nonNegativeNumber(raw.level));
  const hasMetric = kcal > 0 || distanceKm > 0 || speedKmh > 0 || laps > 0;
  if (!hasMetric && raw.source !== 'manual-cardio') return null;
  const fallbackId = String(entry.exerciseId || '').replace(CARDIO_EXERCISE_ID_PREFIX, '');
  return {
    id: raw.id || fallbackId || 'manual',
    label: raw.label || entry.name || entry.exerciseName || '유산소',
    detail: raw.detail || '수기 입력',
    kcal,
    distanceKm,
    speedKmh,
    laps,
    angleDeg,
    level,
    source: raw.source || 'manual-cardio',
  };
}

export function formatManualCardioMetric(value, unit, digits = 1) {
  const number = _nonNegativeNumber(value);
  if (number <= 0) return '--';
  return `${_displayNumber(number, digits)}${unit}`;
}

export function manualCardioSummaryText(cardio) {
  if (!cardio) return '수기 유산소 기록';
  const parts = [
    cardio.kcal > 0 ? `${Math.round(cardio.kcal)} kcal` : '',
    cardio.distanceKm > 0 ? `${_displayNumber(cardio.distanceKm, 2)} km` : '',
    cardio.speedKmh > 0 ? `${_displayNumber(cardio.speedKmh, 1)} km/h` : '',
    cardio.id === 'my-mountain' && cardio.angleDeg > 0 ? `각도 ${_displayNumber(cardio.angleDeg, 1)}°` : '',
    cardio.id === 'step-machine' && cardio.level > 0 ? `${Math.round(cardio.level)}단계` : '',
    cardio.laps > 0 ? `${Math.round(cardio.laps)}회` : '',
  ].filter(Boolean);
  return parts.join(' · ') || '수기 유산소 기록';
}

export function buildManualCardioEntry(cardio, summary, recordedAt = Date.now()) {
  const intensityConfig = manualCardioIntensityConfig(cardio);
  const cardioData = {
    id: cardio.id, label: cardio.label, detail: cardio.detail,
    kcal: summary.kcal, distanceKm: summary.distanceKm, speedKmh: summary.speedKmh, laps: summary.laps,
    kcalMode: summary.kcalMode || 'auto', unit: 'metric', source: 'manual-cardio', recordedAt,
  };
  if (intensityConfig) cardioData[intensityConfig.key] = summary[intensityConfig.key] || 0;
  return {
    muscleId: 'cardio', muscleIds: [], movementId: null,
    exerciseId: manualCardioExerciseId(cardio), name: cardio.label, sets: [], cardio: cardioData,
  };
}

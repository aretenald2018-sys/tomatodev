import {
  findRunningSessionIndex,
  runningOnlySessionFields,
} from './running-model.js';
import {
  getWorkoutSessions,
  upsertWorkoutSession,
} from './sessions.js';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_ENCODED_LENGTH = 7 * 1024 * 1024;
const MAX_STORED_MAP_IMAGE_LENGTH = 320_000;

export class RunningRecordImportError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = 'RunningRecordImportError';
    this.code = code;
  }
}

function _finite(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const cleaned = typeof value === 'string'
    ? value.replace(/,/g, '').replace(/[^\d.+-]/g, '')
    : value;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : fallback;
}

function _bounded(value, min, max, fallback = null) {
  const number = _finite(value, fallback);
  return number != null && number >= min && number <= max ? number : fallback;
}

function _text(value, maxLength = 160) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function _normalizeMapCrop(value) {
  if (!value || typeof value !== 'object') return null;
  const x = _bounded(value.x, 0, 1);
  const y = _bounded(value.y, 0, 1);
  const width = _bounded(value.width, 0.08, 1);
  const height = _bounded(value.height, 0.08, 1);
  if (x == null || y == null || width == null || height == null) return null;
  const right = Math.min(1, x + width);
  const bottom = Math.min(1, y + height);
  if ((right - x) < 0.08 || (bottom - y) < 0.08) return null;
  return {
    x: Math.round(x * 10_000) / 10_000,
    y: Math.round(y * 10_000) / 10_000,
    width: Math.round((right - x) * 10_000) / 10_000,
    height: Math.round((bottom - y) * 10_000) / 10_000,
  };
}

function _safeMapImageDataUrl(value) {
  const dataUrl = String(value || '');
  if (dataUrl.length > MAX_STORED_MAP_IMAGE_LENGTH) return '';
  return /^data:image\/(?:jpeg|webp|png);base64,[a-z0-9+/=]+$/i.test(dataUrl) ? dataUrl : '';
}

function _durationSeconds(value) {
  const direct = _bounded(value, 1, 7 * 24 * 60 * 60);
  if (direct != null && typeof value !== 'string') return Math.round(direct);
  const text = String(value || '').trim();
  if (!text) return direct == null ? 0 : Math.round(direct);
  const parts = text.split(':').map(part => Number(part.trim()));
  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return Math.max(0, Math.round((parts[0] * 60) + parts[1]));
  }
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return Math.max(0, Math.round((parts[0] * 3600) + (parts[1] * 60) + parts[2]));
  }
  return direct == null ? 0 : Math.round(direct);
}

function _paceSeconds(value) {
  const direct = _bounded(value, 30, 3600);
  if (direct != null && typeof value !== 'string') return Math.round(direct);
  const text = String(value || '').trim();
  const match = text.match(/(\d{1,2})\s*(?:['′:분])\s*(\d{1,2})/u);
  if (match) return (Number(match[1]) * 60) + Number(match[2]);
  return direct == null ? 0 : Math.round(direct);
}

function _normalizeStartTime(value) {
  const text = _text(value, 32);
  if (!text) return '';
  const match = text.match(/(?:(오전|오후|AM|PM)\s*)?(\d{1,2})\s*:\s*(\d{2})/iu);
  if (!match) return '';
  let hour = Number(match[2]);
  const minute = Number(match[3]);
  if (hour > 23 || minute > 59) return '';
  const meridiem = String(match[1] || '').toUpperCase();
  if ((meridiem === '오후' || meridiem === 'PM') && hour < 12) hour += 12;
  if ((meridiem === '오전' || meridiem === 'AM') && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function _timestampForDate(dateKey, startTime) {
  if (!DATE_KEY_PATTERN.test(dateKey) || !startTime) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = startTime.split(':').map(Number);
  const value = new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
  return Number.isFinite(value) ? value : null;
}

function _assertTargetDate(dateKey, now = Date.now()) {
  if (!DATE_KEY_PATTERN.test(String(dateKey || ''))) {
    throw new RunningRecordImportError('DATE_REQUIRED', '저장할 날짜를 확인할 수 없어요.');
  }
  const [year, month, day] = dateKey.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(target.getTime()) || target > today) {
    throw new RunningRecordImportError('DATE_INVALID', '미래 날짜에는 러닝 기록을 업로드할 수 없어요.');
  }
  return dateKey;
}

function _normalizeSplit(split = {}, index = 0) {
  const distanceKm = _bounded(split.distanceKm ?? split.distance, 0.01, 100, 0);
  const paceSecPerKm = _paceSeconds(split.paceSecPerKm ?? split.pace);
  const explicitDuration = _durationSeconds(split.durationSec ?? split.duration);
  const durationSec = explicitDuration || (distanceKm > 0 && paceSecPerKm > 0
    ? Math.round(distanceKm * paceSecPerKm)
    : 0);
  if (distanceKm <= 0 || durationSec <= 0) return null;
  const elevation = _bounded(split.elevationM ?? split.elevationGainM, -5000, 5000);
  const heart = _bounded(split.avgHeartRateBpm ?? split.heartRateBpm, 30, 260);
  return {
    index: index + 1,
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationSec,
    paceSecPerKm: paceSecPerKm || Math.round(durationSec / distanceKm),
    elevationGainM: elevation == null ? null : Math.round(elevation),
    elevationLossM: null,
    avgHeartRateBpm: heart == null ? null : Math.round(heart),
  };
}

function _importFingerprint(record) {
  return [
    'running-screenshot-v1',
    record.targetDateKey,
    record.startTime || 'time-unknown',
    record.distanceKm.toFixed(3),
    record.durationSec,
  ].join('|');
}

export function normalizeRunningRecordParse(raw = {}, options = {}) {
  const targetDateKey = _assertTargetDate(String(options.targetDateKey || ''), options.now);
  if (raw?.isRunningRecord === false) {
    throw new RunningRecordImportError('NOT_RUNNING_RECORD', '러닝 결과 화면을 확인하지 못했어요.');
  }

  const distanceKm = _bounded(raw.distanceKm ?? raw.distance, 0.05, 500, 0);
  const durationSec = _durationSeconds(raw.durationSec ?? raw.duration);
  if (distanceKm <= 0 || durationSec <= 0) {
    throw new RunningRecordImportError('METRICS_REQUIRED', '거리와 시간을 읽지 못했어요. 러닝 결과 전체가 보이는 스크린샷을 선택해 주세요.');
  }
  const confidence = _bounded(raw.confidence, 0, 1);
  if (confidence != null && confidence < 0.55) {
    throw new RunningRecordImportError('LOW_CONFIDENCE', '기록이 선명하지 않아요. 글자가 크게 보이는 원본 스크린샷을 올려 주세요.');
  }

  const derivedPace = Math.round(durationSec / distanceKm);
  const parsedPace = _paceSeconds(raw.avgPaceSecPerKm ?? raw.avgPace);
  const avgPaceSecPerKm = parsedPace > 0 && Math.abs(parsedPace - derivedPace) <= Math.max(45, derivedPace * 0.2)
    ? parsedPace
    : derivedPace;
  const splits = (Array.isArray(raw.splits) ? raw.splits : [])
    .map(_normalizeSplit)
    .filter(Boolean)
    .slice(0, 100);
  const fullSplits = splits.filter(split => split.distanceKm >= 0.95 && split.paceSecPerKm > 0);
  const bestPaceSecPerKm = fullSplits.length
    ? Math.min(...fullSplits.map(split => split.paceSecPerKm))
    : avgPaceSecPerKm;
  const startTime = _normalizeStartTime(raw.startTime ?? raw.time);
  const startedAt = _timestampForDate(targetDateKey, startTime);
  const endedAt = startedAt == null ? null : startedAt + (durationSec * 1000);
  const calories = _bounded(raw.calories, 1, 20000);
  const elevationGainM = _bounded(raw.elevationGainM, 0, 30000);
  const elevationLossM = _bounded(raw.elevationLossM, 0, 30000);
  const cadenceSpm = _bounded(raw.cadenceSpm ?? raw.cadence, 20, 300);
  const avgHeartRateBpm = _bounded(raw.avgHeartRateBpm, 30, 260);
  const maxHeartRateBpm = _bounded(raw.maxHeartRateBpm, 30, 280);
  const location = _text(raw.location ?? raw.place, 120);
  const mapCrop = _normalizeMapCrop(raw.routeMapCrop ?? raw.mapCrop);
  const record = {
    targetDateKey,
    observedDate: _text(raw.observedDate ?? raw.dateText, 40),
    sourceApp: _text(raw.sourceApp ?? raw.appName, 60) || '외부 러닝 앱',
    title: _text(raw.title ?? raw.activityTitle, 120) || '업로드한 러닝 기록',
    startTime,
    startedAt,
    endedAt,
    distanceKm: Math.round(distanceKm * 1000) / 1000,
    durationSec,
    avgPaceSecPerKm,
    bestPaceSecPerKm,
    calories: calories == null ? null : Math.round(calories),
    elevationGainM: elevationGainM == null ? null : Math.round(elevationGainM),
    elevationLossM: elevationLossM == null ? null : Math.round(elevationLossM),
    cadenceSpm: cadenceSpm == null ? null : Math.round(cadenceSpm),
    avgHeartRateBpm: avgHeartRateBpm == null ? null : Math.round(avgHeartRateBpm),
    maxHeartRateBpm: maxHeartRateBpm == null ? null : Math.round(maxHeartRateBpm),
    location,
    mapCrop,
    splits,
    confidence,
    provider: _text(options.provider, 24) || null,
    importedAt: Number(options.now) || Date.now(),
  };
  record.fingerprint = _importFingerprint(record);
  return record;
}

function _readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new RunningRecordImportError('IMAGE_DECODE', '이미지를 열지 못했어요.'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new RunningRecordImportError('IMAGE_READ', '이미지를 읽지 못했어요.'));
    reader.readAsDataURL(file);
  });
}

export async function runningRecordImageBase64(file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new RunningRecordImportError('IMAGE_REQUIRED', '러닝 스크린샷 이미지를 선택해 주세요.');
  }
  if (Number(file.size) > MAX_IMAGE_BYTES) {
    throw new RunningRecordImportError('IMAGE_TOO_LARGE', '15MB 이하 이미지를 선택해 주세요.');
  }
  const image = await _readImage(file);
  const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
  const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
  const minWidthScale = Math.max(1, 900 / sourceWidth);
  const maxPixelScale = Math.sqrt(4_000_000 / (sourceWidth * sourceHeight));
  const scale = Math.max(0.1, Math.min(minWidthScale, maxPixelScale));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new RunningRecordImportError('IMAGE_CANVAS', '이미지를 처리하지 못했어요.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let encoded = canvas.toDataURL('image/jpeg', 0.9).split(',')[1] || '';
  if (encoded.length > MAX_ENCODED_LENGTH) {
    encoded = canvas.toDataURL('image/jpeg', 0.72).split(',')[1] || '';
  }
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH) {
    throw new RunningRecordImportError('IMAGE_TOO_LARGE', '이미지가 너무 커서 분석할 수 없어요.');
  }
  return encoded;
}

export async function runningRecordMapImageDataUrl(file, crop) {
  const normalizedCrop = _normalizeMapCrop(crop);
  if (!normalizedCrop) return '';
  const image = await _readImage(file);
  const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
  const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
  const sx = Math.max(0, Math.round(normalizedCrop.x * sourceWidth));
  const sy = Math.max(0, Math.round(normalizedCrop.y * sourceHeight));
  const sw = Math.max(1, Math.min(sourceWidth - sx, Math.round(normalizedCrop.width * sourceWidth)));
  const sh = Math.max(1, Math.min(sourceHeight - sy, Math.round(normalizedCrop.height * sourceHeight)));
  const scale = Math.min(1, 720 / sw, 540 / sh);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return '';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const attempts = [
    ['image/webp', 0.82],
    ['image/webp', 0.68],
    ['image/jpeg', 0.72],
    ['image/jpeg', 0.56],
  ];
  for (const [type, quality] of attempts) {
    const dataUrl = canvas.toDataURL(type, quality);
    const safe = _safeMapImageDataUrl(dataUrl);
    if (safe) return safe;
  }
  return '';
}

export async function parseRunningRecordImage(file, options = {}) {
  const targetDateKey = _assertTargetDate(String(options.targetDateKey || ''), options.now);
  const imageBase64 = await runningRecordImageBase64(file);
  const prompt = `이미지는 러닝 앱의 활동 결과 스크린샷이다. 화면에 실제로 표시된 값만 읽어 JSON 객체 하나로 반환하라.
저장 대상 날짜는 ${targetDateKey}이다. 화면에 '오늘'만 보이면 observedDate는 '오늘'로 두고 날짜를 추측하지 마라.

필드:
{"isRunningRecord":true,"sourceApp":"Nike Run Club","title":"화요일 아침 러닝","observedDate":"오늘","startTime":"06:52","distanceKm":5.5,"durationSec":2118,"avgPaceSecPerKm":385,"calories":382,"elevationGainM":33,"elevationLossM":null,"avgHeartRateBpm":null,"maxHeartRateBpm":null,"cadenceSpm":119,"location":"송파구, 서울특별시","routeMapVisible":true,"routeMapCrop":{"x":0.06,"y":0.68,"width":0.88,"height":0.30},"splits":[{"distanceKm":1,"paceSecPerKm":427,"durationSec":427,"elevationM":-5,"avgHeartRateBpm":null}],"confidence":0.98}

규칙:
- 거리는 km, 시간과 페이스는 초, 고도는 m, 심박은 bpm, 케이던스는 spm 숫자로 변환하라.
- 화면에 '--'로 표시되거나 보이지 않는 값은 null로 두고 추측하지 마라.
- 긴 스크린샷에 구간 표가 보이면 보이는 행을 splits에 모두 넣어라. 0.50km 같은 부분 구간도 보존하라.
- 경로 지도가 보이면 routeMapVisible=true로 두고, 지도 이미지 사각형 전체의 x/y/width/height를 이미지 너비·높이 대비 0~1 비율로 routeMapCrop에 기록하라. 앱 헤더, 지표, 하단 내비게이션은 제외하되 지도 안의 경로와 지도 라벨은 모두 포함하라.
- 지도가 없으면 routeMapVisible=false, routeMapCrop=null로 두라. 지도 이미지만으로 GPS 좌표나 이동 경로를 만들지 마라.
- 러닝 결과 화면이 아니면 isRunningRecord=false로 반환하라.`;
  try {
    const { _callGeminiJSON } = await import('../ai/llm-core.js');
    const { data, provider } = await _callGeminiJSON([
      { text: prompt },
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
    ], 3200);
    const record = normalizeRunningRecordParse(data, { ...options, targetDateKey, provider });
    if (record.mapCrop) {
      try {
        record.mapImageDataUrl = await runningRecordMapImageDataUrl(file, record.mapCrop);
      } catch (error) {
        console.warn('[running-record-import] route map crop skipped:', error);
      }
    }
    return record;
  } catch (error) {
    if (error instanceof RunningRecordImportError) throw error;
    throw new RunningRecordImportError('PARSE_FAILED', '스크린샷에서 러닝 기록을 읽지 못했어요.', error);
  }
}

export function buildImportedRunningSession(record = {}) {
  const durationSec = Math.max(0, Math.floor(Number(record.durationSec) || 0));
  const routeSummary = {
    analyticsVersion: 1,
    source: 'screenshot-import',
    importMethod: 'ai-screenshot',
    importFingerprint: record.fingerprint,
    importedAt: record.importedAt || Date.now(),
    importProvider: record.provider || null,
    sourceApp: record.sourceApp || null,
    activityTitle: record.title || null,
    observedDate: record.observedDate || null,
    startedAt: record.startedAt || null,
    endedAt: record.endedAt || null,
    durationSec,
    elapsedDurationSec: durationSec,
    distanceM: Math.round((Number(record.distanceKm) || 0) * 1000),
    distanceKm: Number(record.distanceKm) || 0,
    avgPaceSecPerKm: Number(record.avgPaceSecPerKm) || 0,
    bestPaceSecPerKm: Number(record.bestPaceSecPerKm) || Number(record.avgPaceSecPerKm) || 0,
    speedKmh: durationSec > 0 ? Math.round(((Number(record.distanceKm) || 0) / (durationSec / 3600)) * 100) / 100 : 0,
    pointCount: 0,
    segmentCount: 0,
    gapCount: 0,
    interrupted: false,
    bbox: null,
    centroid: null,
    elevationGainM: record.elevationGainM ?? null,
    elevationLossM: record.elevationLossM ?? null,
    calories: record.calories ?? null,
    calorieSource: record.calories > 0 ? 'device' : null,
    calorieMethod: null,
    avgHeartRateBpm: record.avgHeartRateBpm ?? null,
    maxHeartRateBpm: record.maxHeartRateBpm ?? null,
    cadenceSpm: record.cadenceSpm ?? null,
    maxCadenceSpm: null,
    splits: Array.isArray(record.splits) ? record.splits.map(split => ({ ...split })) : [],
    confidence: record.confidence ?? null,
    mapImageDataUrl: _safeMapImageDataUrl(record.mapImageDataUrl) || null,
    mapImageSource: _safeMapImageDataUrl(record.mapImageDataUrl) ? 'screenshot-crop' : null,
  };
  return runningOnlySessionFields({
    running: true,
    runDistance: Number(record.distanceKm) || 0,
    runDurationMin: Math.floor(durationSec / 60),
    runDurationSec: durationSec % 60,
    runMemo: record.title || '',
    runSource: 'screenshot-import',
    runStartedAt: record.startedAt || null,
    runEndedAt: record.endedAt || null,
    runRoute: [],
    runRouteRef: null,
    runRouteSummary: routeSummary,
    runPlaceSummary: record.location ? {
      label: record.location,
      source: 'screenshot-import',
    } : null,
    runAvgPaceSecPerKm: Number(record.avgPaceSecPerKm) || 0,
    runGpsAccuracySummary: null,
  });
}

export function planImportedRunningRecordSave(day = {}, record = {}, options = {}) {
  const now = Number(options.now) || Date.now();
  const sessions = getWorkoutSessions(day, { minCount: 3 });
  const sessionIndex = findRunningSessionIndex(sessions, session => (
    session?.runSource === 'screenshot-import'
    && session?.runRouteSummary?.importFingerprint === record.fingerprint
  ));
  const result = upsertWorkoutSession(day, buildImportedRunningSession(record), sessionIndex, { now });
  const snapshot = { state: 'running', updatedAt: now };
  return {
    sessionIndex,
    payload: {
      ...result.aggregate,
      workoutSessions: result.workoutSessions,
      lifeZoneWorkoutActivity: snapshot,
      lifeZoneLastActivity: snapshot,
    },
  };
}

export async function saveImportedRunningRecord(dateKey, record, options = {}) {
  const targetDateKey = _assertTargetDate(String(dateKey || ''), options.now);
  const { getCache, saveDay } = await import('../data.js');
  const cache = getCache() || {};
  const day = cache[targetDateKey] && typeof cache[targetDateKey] === 'object'
    ? cache[targetDateKey]
    : {};
  const plan = planImportedRunningRecordSave(day, record, options);
  await saveDay(targetDateKey, plan.payload, { mode: 'merge', rethrow: true });
  return { ...plan, dateKey: targetDateKey };
}

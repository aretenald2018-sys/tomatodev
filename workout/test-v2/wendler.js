// ================================================================
// workout/test-v2/wendler.js — 웬들러 프로그램 엔진 (순수 함수만)
// ----------------------------------------------------------------
// v1 workout/expert/max-wendler.js에서 복사(계획 문서 금지 목록: v1 import
// 금지·순수 로직 복사 허용). v2 변경점:
//   - defaultWendlerIncrement: 하체/둔부 +10 (보드 defaults.incrementLowerKg),
//     상체 +2.5 — "6주에 한 번" 정산 기준.
//   - 보조(BBB)는 메인 직후 같은 세션 수행(timing:'after-main')이 기본.
// DOM/Firebase 접근 금지 — node:test 단위 테스트 대상.
// ================================================================

const _round1 = (v) => Math.round((Number(v) || 0) * 10) / 10;

export function roundToPlate(kg, step = 2.5) {
  const s = Number(step) > 0 ? Number(step) : 2.5;
  return _round1(Math.round((Number(kg) || 0) / s) * s);
}

const _wave = (sets) => ({ sets: sets.map(([pct, reps], idx) => ({ pct, reps, ...(idx === sets.length - 1 ? { amrap: true } : {}) })) });

export const WENDLER_SCHEMES = {
  w531: {
    label: '5/3/1',
    weekMap: [
      _wave([[65, 5], [75, 5], [85, 5]]),
      _wave([[70, 3], [80, 3], [90, 3]]),
      _wave([[75, 5], [85, 3], [95, 1]]),
      _wave([[65, 5], [75, 5], [85, 5]]),
      _wave([[70, 3], [80, 3], [90, 3]]),
      _wave([[75, 5], [85, 3], [95, 1]]),
    ],
  },
  w863: {
    label: '8/6/3',
    weekMap: [
      _wave([[60, 8], [65, 8], [70, 8]]),
      _wave([[65, 6], [70, 6], [75, 6]]),
      _wave([[70, 3], [75, 3], [80, 3]]),
      _wave([[60, 8], [65, 8], [70, 8]]),
      _wave([[65, 6], [70, 6], [75, 6]]),
      _wave([[70, 3], [75, 3], [80, 3]]),
    ],
  },
};

export const WENDLER_SCHEME_IDS = [...Object.keys(WENDLER_SCHEMES), 'custom'];

export const WENDLER_SUPPLEMENTS = {
  none: { label: '보조 없음' },
  bbb: { label: 'BBB', pct: 50, sets: 5, reps: 10 },
  fsl: { label: 'FSL', sets: 3, reps: 5 },
};

// 웬들러 허용 부위 — 대근육 컴파운드만 (볼륨 전용 부위 제외)
export const WENDLER_ALLOWED_MAJORS = new Set(['chest', 'back', 'lower', 'shoulder', 'glute']);

export function isWendlerAllowedMajor(major) {
  return WENDLER_ALLOWED_MAJORS.has(String(major || '').trim());
}

function _cloneWeekMap(weekMap) {
  return (weekMap || []).map(week => ({
    sets: (week?.sets || []).map(set => ({ ...set })),
  }));
}

function _clampPct(pct, fallback = 65) {
  const n = Number(pct);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(30, Math.min(110, _round1(n)));
}

function _clampReps(reps, fallback = 5) {
  const n = Math.round(Number(reps));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.min(20, n));
}

function _normalizeWeekMap(weekMap, scheme = 'w531', weeks = 6) {
  const preset = _cloneWeekMap((WENDLER_SCHEMES[scheme] || WENDLER_SCHEMES.w531).weekMap);
  const source = Array.isArray(weekMap) && weekMap.length ? _cloneWeekMap(weekMap) : preset;
  return Array.from({ length: weeks }, (_, idx) => {
    const week = source[idx] || preset[idx % preset.length] || { sets: [] };
    const presetWeek = preset[idx % preset.length] || { sets: [] };
    const sets = (week.sets || []).length ? week.sets : presetWeek.sets;
    return {
      sets: sets.map((set, setIdx) => ({
        pct: _clampPct(set?.pct, presetWeek.sets[setIdx]?.pct || 65),
        reps: _clampReps(set?.reps, presetWeek.sets[setIdx]?.reps || 5),
        ...(set?.amrap || (setIdx === sets.length - 1 && set?.amrap !== false) ? { amrap: true } : {}),
      })),
    };
  });
}

export function weekMapMatchesScheme(weekMap, scheme) {
  const preset = WENDLER_SCHEMES[scheme]?.weekMap;
  if (!preset) return false;
  const normalized = _normalizeWeekMap(weekMap, scheme, preset.length);
  return normalized.every((week, idx) => {
    const presetWeek = preset[idx];
    if (week.sets.length !== presetWeek.sets.length) return false;
    return week.sets.every((set, setIdx) => (
      set.pct === presetWeek.sets[setIdx].pct && set.reps === presetWeek.sets[setIdx].reps
    ));
  });
}

// v2: 보드 기본값과 동일 — 하체/둔부 +10, 그 외 +2.5 (6주 정산 1회 기준)
export function defaultWendlerIncrement(primaryMajor) {
  return primaryMajor === 'lower' || primaryMajor === 'glute' ? 10 : 2.5;
}

/**
 * 최근 실측/트랙 설정으로 TM 제안.
 * Epley e1RM × 0.9, roundKg 라운딩. 실측 없으면 트랙 시작무게×반복으로 추정.
 */
export function suggestWendlerTm({ latest = null, trackSpec = null, roundKg = 2.5 } = {}) {
  const fromPoint = (kg, reps) => {
    const k = Number(kg) || 0;
    const r = Number(reps) || 0;
    if (k <= 0 || r <= 0) return 0;
    const e1rm = r === 1 ? k : k * (1 + r / 30);
    return roundToPlate(e1rm * 0.9, roundKg);
  };
  const fromLatest = fromPoint(latest?.kg, latest?.reps);
  if (fromLatest > 0) return fromLatest;
  return fromPoint(trackSpec?.startKg, trackSpec?.startReps || trackSpec?.targetReps || 12);
}

/** 벤치마크에 붙는 wendler 설정 정규화(필드 보충 + weekMap 6주 보장). */
export function normalizeWendlerConfig(wendler = {}, { primaryMajor = null, trackSpec = null, latest = null } = {}) {
  const scheme = WENDLER_SCHEME_IDS.includes(wendler?.scheme) ? wendler.scheme : 'w863';
  const roundKg = Number(wendler?.roundKg) > 0 ? Number(wendler.roundKg) : 2.5;
  const incrementKg = Number(wendler?.incrementKg) > 0 ? Number(wendler.incrementKg) : defaultWendlerIncrement(primaryMajor);
  const tmKg = Number(wendler?.tmKg) > 0
    ? _round1(Number(wendler.tmKg))
    : suggestWendlerTm({ latest, trackSpec, roundKg });
  const baseScheme = scheme === 'custom' ? 'w863' : scheme;
  const weekMap = _normalizeWeekMap(wendler?.weekMap, baseScheme, 6);
  const suppKind = ['none', 'bbb', 'fsl'].includes(wendler?.supplemental?.kind) ? wendler.supplemental.kind : 'bbb';
  const suppDefaults = WENDLER_SUPPLEMENTS[suppKind] || {};
  const supplemental = {
    kind: suppKind,
    pct: _clampPct(wendler?.supplemental?.pct, suppDefaults.pct || 50),
    sets: _clampReps(wendler?.supplemental?.sets, suppDefaults.sets || 5),
    reps: _clampReps(wendler?.supplemental?.reps, suppDefaults.reps || 10),
    timing: 'after-main',   // 메인 직후 같은 세션 (계약 8)
  };
  const effectiveScheme = weekMapMatchesScheme(weekMap, baseScheme) ? baseScheme : 'custom';
  return { scheme: effectiveScheme, tmKg, incrementKg, roundKg, weekMap, supplemental };
}

/** 특정 주차의 처방 — 메인 세트(kg 환산) + 보조 모듈 세트. */
export function wendlerWeekPrescription(wendler = {}, weekIndex = 1) {
  const cfg = normalizeWendlerConfig(wendler);
  const weeks = cfg.weekMap.length;
  const idx = Math.max(1, Math.min(weeks, Math.round(Number(weekIndex) || 1))) - 1;
  const sets = (cfg.weekMap[idx]?.sets || []).map(set => ({
    ...set,
    kg: roundToPlate(cfg.tmKg * set.pct / 100, cfg.roundKg),
  }));
  const topSet = sets[sets.length - 1] || null;
  let supplemental = null;
  if (cfg.supplemental.kind === 'bbb') {
    supplemental = {
      kind: 'bbb',
      label: 'BBB',
      pct: cfg.supplemental.pct,
      kg: roundToPlate(cfg.tmKg * cfg.supplemental.pct / 100, cfg.roundKg),
      sets: cfg.supplemental.sets,
      reps: cfg.supplemental.reps,
    };
  } else if (cfg.supplemental.kind === 'fsl' && sets.length) {
    supplemental = {
      kind: 'fsl',
      label: 'FSL',
      pct: sets[0].pct,
      kg: sets[0].kg,
      sets: cfg.supplemental.sets,
      reps: cfg.supplemental.reps,
    };
  }
  return { week: idx + 1, weeks, tmKg: cfg.tmKg, roundKg: cfg.roundKg, sets, topSet, supplemental };
}

/** 6주 전체 톱세트 요약 — 주차표 시각화용. */
export function wendlerCycleOverview(wendler = {}) {
  const cfg = normalizeWendlerConfig(wendler);
  return cfg.weekMap.map((week, idx) => {
    const rx = wendlerWeekPrescription(cfg, idx + 1);
    return {
      week: idx + 1,
      sets: rx.sets,
      topSet: rx.topSet,
      pctLabel: week.sets.map(s => `${Number.isInteger(s.pct) ? s.pct : s.pct.toFixed(1)}`).join('·'),
      repsLabel: week.sets.map((s, i) => `${s.reps}${i === week.sets.length - 1 && s.amrap ? '+' : ''}`).join('/'),
    };
  });
}

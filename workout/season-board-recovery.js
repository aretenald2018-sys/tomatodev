// ================================================================
// workout/season-board-recovery.js — 2026-07-28 시즌 보드 유실 일회성 복구
// ================================================================
//
// 2026-07-28T06:40:45Z, 주간 목표 소급 색칠이 지난 시즌 보드를 현재 시즌 슬롯에
// 덮어썼다(saveTestBoardV2가 저장 대상 시즌을 인자가 아니라 "오늘 날짜의 시즌"으로
// 정하는데, 모든 시즌을 돌며 각 시즌 보드를 넘겼다). 그 결과 현재 시즌에 등록된
// 웬들러 종목 설정이 사라졌다.
//
// 운동 기록에 남은 처방 메타데이터로 설정값을 되살린다. 값이 맞는지는 기록에 남은
// 실제 처방 세 건을 재현해서 확인하고, 하나라도 어긋나면 아무것도 쓰지 않는다.
//
// 일회성이다. 복구가 끝나면 이 모듈과 호출부를 지운다.
import {
  buildExerciseProgramWorkoutPrescription,
  upsertExerciseProgramBenchmark,
} from './test-v2/board-core.js';

const SEASON_ID = 'season-2026-07-15-140256dac0';
const PROGRAM_START = '2026-07-13';
const LOWER_CYCLE_ID = 'cy_lower_mrr8n0zr_8';

// 기록에서 읽어낸 원래 설정. roundKg 1.25가 유일하게 세 처방을 모두 재현한다.
const SPECS = [
  {
    benchmarkId: 'bm_mrm55nct_1',
    oneRmKg: 130,
    exercise: { id: 'custom_1778990759855', name: '스모데드', muscleId: 'lower', groupId: 'lower', movementId: null },
    expect: [{ weekStart: '2026-07-13', kg: 95, reps: 8 }],
  },
  {
    benchmarkId: 'bm_mrr8n0zq_2',
    oneRmKg: 126.7,
    exercise: { id: 'lower_1', name: '스쿼트(와이드)', muscleId: 'lower', groupId: 'lower', movementId: 'squat_machine' },
    expect: [
      { weekStart: '2026-07-13', kg: 92.5, reps: 8 },
      { weekStart: '2026-07-27', kg: 103.8, reps: 3 },
    ],
  },
];

const TARGET_EXERCISE_IDS = new Set(SPECS.map(spec => spec.exercise.id));

function _clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

/** 빈 보드 위에 원래 설정으로 두 종목을 세운다. 벤치마크 id는 기록의 링크를 유지한다. */
export function buildRecoveredBenchmarks({ todayKey = PROGRAM_START } = {}) {
  let board = null;
  for (const spec of SPECS) {
    const result = upsertExerciseProgramBenchmark(board, spec.exercise, {
      program: 'wendler',
      groupId: 'lower',
      label: spec.exercise.name,
      setsDefault: 4,
      programStartDate: PROGRAM_START,
      wendler: {
        scheme: 'w863',
        templateVersion: 'w863-original-v1',
        profileId: 'squat',
        oneRmKg: spec.oneRmKg,
        roundKg: 1.25,
        programStartDate: PROGRAM_START,
        startWeek: 1,
      },
    }, { todayKey, movements: [], source: 'season-board-recovery' });
    board = result.board;
    if (result.benchmark) result.benchmark.id = spec.benchmarkId;
  }
  return board;
}

/** 기록에 남은 실제 처방을 재현하는지 확인한다. 하나라도 어긋나면 false. */
export function verifyRecoveredBoard(board) {
  for (const spec of SPECS) {
    const benchmark = (board?.benchmarks || []).find(item => item.id === spec.benchmarkId);
    if (!benchmark) return false;
    for (const expected of spec.expect) {
      const built = buildExerciseProgramWorkoutPrescription(board, benchmark, {
        track: 'volume',
        weekStart: expected.weekStart,
        todayKey: expected.weekStart,
        includeAlternatives: false,
      });
      const prescription = built?.prescription;
      if (Number(prescription?.startKg) !== expected.kg) return false;
      if (Number(prescription?.repsLow) !== expected.reps) return false;
    }
  }
  return true;
}

/**
 * 복구본을 현재 보드에 합친다. 같은 종목의 낡은 벤치마크만 걷어내고,
 * 그 외 종목(사용자가 새로 넣은 것 포함)은 손대지 않는다.
 */
export function mergeRecoveredBoard(currentBoard, recovered) {
  const next = _clone(currentBoard) || {};
  const rebuilt = recovered?.benchmarks || [];
  const kept = (next.benchmarks || []).filter(item => !TARGET_EXERCISE_IDS.has(item?.exerciseId));
  next.benchmarks = [...kept, ...rebuilt.map(_clone)];
  next.groups = next.groups?.length ? next.groups : _clone(recovered?.groups || []);
  next.defaults = next.defaults || _clone(recovered?.defaults || {});
  next.version = next.version || recovered?.version || 2;
  next.steps = Array.isArray(next.steps) ? next.steps : [];
  next.lineups = next.lineups || {};
  next.history = Array.isArray(next.history) ? next.history : [];
  const cycles = Array.isArray(next.cycles) ? [...next.cycles] : [];
  if (!cycles.some(cycle => cycle?.id === LOWER_CYCLE_ID)) {
    cycles.push({ id: LOWER_CYCLE_ID, groupId: 'lower', status: 'active', startDate: PROGRAM_START, weeks: 7, settle: null });
  }
  next.cycles = cycles;
  next.seasonId = SEASON_ID;
  return next;
}

/** 아직 복구가 필요한 상태인지. 이미 복구됐거나 다른 시즌이면 건드리지 않는다. */
export function needsSeasonBoardRecovery(seasonId, board) {
  if (seasonId !== SEASON_ID) return false;
  const benchmarks = board?.benchmarks || [];
  return !benchmarks.some(item => item?.id === 'bm_mrr8n0zq_2');
}

/**
 * 앱 진입점. 조건이 맞고 검증을 통과할 때만 저장한다.
 * getBoard/saveBoard를 주입받아 데이터 계층 없이도 돌릴 수 있게 한다.
 */
export async function recoverSeasonBoardOnce({ seasonId, getBoard, saveBoard, todayKey } = {}) {
  if (typeof getBoard !== 'function' || typeof saveBoard !== 'function') return { done: false, reason: 'no-io' };
  const current = getBoard(seasonId) || null;
  if (!needsSeasonBoardRecovery(seasonId, current)) return { done: false, reason: 'not-needed' };

  const recovered = buildRecoveredBenchmarks({ todayKey });
  const merged = mergeRecoveredBoard(current, recovered);
  // 검증에 실패하면 쓰지 않는다. 틀린 처방을 남기느니 손상된 채로 두는 편이 낫다.
  if (!verifyRecoveredBoard(merged)) return { done: false, reason: 'verify-failed' };

  await saveBoard(merged);
  return { done: true, restored: SPECS.map(spec => spec.exercise.name) };
}

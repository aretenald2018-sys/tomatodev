// ================================================================
// workout/season-goal-backfill.js — 이미 완료한 기록으로 주간 목표 칸 소급 색칠
// ================================================================
//
// 주간 목표 색칠은 "종목완료"를 누르는 순간에만 일어난다. 그런데 그 버튼은 한 번
// 누르면 카드가 접히면서 "수정하기"로 바뀌므로, 색칠 배선이 생기기 전에 완료해 둔
// 기록은 다시 누를 수단이 없어 영원히 색칠되지 않는다.
//
// 그래서 이미 완료 처리된 기록을 훑어 계획을 채운 주차를 채워 넣는다.
// 규칙:
//   - 완료 도장(exerciseCompletedAt)이 찍힌 종목만 본다. 입력 중인 기록은 건드리지 않는다.
//   - 성장보드가 만든 카드만 본다(recommendationMeta.source === 'test_board_v2').
//   - 판정은 보드와 같은 judgeWorkoutSetsAgainstPlan 하나를 쓴다.
//   - 이미 색칠된 칸은 건너뛴다. 색칠만 하고 지우지 않는다.
//   - 미래 날짜와 시즌 밖 날짜는 보지 않는다.
import {
  isWeekPainted,
  judgeWorkoutSetsAgainstPlan,
  paintWeek,
} from './test-v2/board-core.js';
import { workoutExerciseCompletionStampAt } from './exercise-completion.js';
import { getWorkoutSessions } from './sessions.js';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/u;

/** 종목 기록에서 색칠 대상(벤치마크·트랙·주차·계획)을 뽑는다. 보드 카드가 아니면 null. */
export function seasonGoalTargetForEntry(entry) {
  const meta = entry?.recommendationMeta || null;
  const prescription = entry?.maxPrescription || null;
  const benchmarkId = meta?.boardV2BenchmarkId || prescription?.benchmarkId || '';
  const weekStart = meta?.boardV2WeekStart || '';
  if (meta?.source !== 'test_board_v2' || !benchmarkId || !weekStart) return null;
  const kg = Number(prescription?.startKg);
  const reps = Number(prescription?.repsLow);
  if (!(kg > 0) || !(reps > 0)) return null;
  return {
    benchmarkId,
    // 보드는 'volume' | 'intensity', 기록에는 'M' | 'H' 코드로 남는다.
    track: String(meta.track || prescription?.track || '') === 'H' ? 'intensity' : 'volume',
    weekStart,
    plan: { kg, reps },
  };
}

/** 색칠 로그에 남길 내용. 보드의 "운동 완료"와 같은 모양이어야 한다. */
export function seasonGoalPaintLog(judged, now) {
  const best = judged?.best || {};
  return {
    at: now,
    actualReps: (judged?.working || []).map(set => set.reps).join(' · '),
    rir: best.rir === '' || best.rir == null ? null : Number(best.rir),
    amrapReps: Number(best.reps) || null,
    note: '',
  };
}

/**
 * 색칠해야 하는데 아직 안 된 칸을 모은다. 순수 함수 — 저장하지 않는다.
 * 같은 (벤치마크·트랙·주차)는 한 번만 담는다.
 */
export function collectSeasonGoalBackfillPaints({
  cache = {},
  board = null,
  todayKey = '',
  isInSeason = () => true,
} = {}) {
  if (!board || typeof board !== 'object') return [];
  const paints = [];
  const seen = new Set();
  for (const [dateKey, day] of Object.entries(cache || {})) {
    if (!DATE_KEY.test(dateKey)) continue;
    if (todayKey && dateKey > todayKey) continue;
    if (!isInSeason(dateKey)) continue;
    for (const session of getWorkoutSessions(day, { minCount: 1 })) {
      for (const entry of (Array.isArray(session?.exercises) ? session.exercises : [])) {
        if (workoutExerciseCompletionStampAt(entry) == null) continue;
        const target = seasonGoalTargetForEntry(entry);
        if (!target) continue;
        const key = `${target.benchmarkId}:${target.track}:${target.weekStart}`;
        if (seen.has(key)) continue;
        if (isWeekPainted(board, target)) continue;
        const judged = judgeWorkoutSetsAgainstPlan(entry.sets || [], target.plan);
        if (!judged.hit) continue;
        seen.add(key);
        paints.push({ ...target, dateKey, judged });
      }
    }
  }
  return paints;
}

/**
 * 시즌별로 보드를 읽어 소급 색칠하고, 바뀐 보드만 저장한다.
 * getBoard/saveBoard를 주입받아 데이터 계층 없이도 돌릴 수 있게 한다.
 */
export async function backfillSeasonGoalPaints({
  seasons = [],
  cache = {},
  todayKey = '',
  getBoard,
  saveBoard,
  seasonContains,
  now = Date.now(),
} = {}) {
  const result = { painted: 0, seasons: [] };
  if (typeof getBoard !== 'function' || typeof saveBoard !== 'function') return result;
  for (const season of (Array.isArray(seasons) ? seasons : [])) {
    if (!season?.id) continue;
    let board = null;
    try {
      board = getBoard(season.id);
    } catch {
      board = null;
    }
    if (!board) continue;
    const paints = collectSeasonGoalBackfillPaints({
      cache,
      board,
      todayKey,
      isInSeason: dateKey => (typeof seasonContains === 'function' ? seasonContains(season, dateKey) : true),
    });
    if (!paints.length) continue;
    let applied = 0;
    for (const paint of paints) {
      const ok = paintWeek(board, {
        benchmarkId: paint.benchmarkId,
        track: paint.track,
        weekStart: paint.weekStart,
        log: seasonGoalPaintLog(paint.judged, now),
      });
      if (ok) applied += 1;
    }
    if (!applied) continue;
    // 저장이 실패하면 그 시즌만 건너뛴다. 다음 실행에서 다시 시도된다.
    try {
      await saveBoard(board);
    } catch (error) {
      console.warn('[season-goal-backfill] 보드 저장 실패:', error?.message || error);
      continue;
    }
    result.painted += applied;
    result.seasons.push({ seasonId: season.id, painted: applied });
  }
  return result;
}

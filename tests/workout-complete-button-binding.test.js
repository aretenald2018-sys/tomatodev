import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractFunctionSource } from './helpers/source-function.js';

const exercisesJs = readFileSync(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const boardRenderJs = readFileSync(new URL('../workout/test-v2/board-render.js', import.meta.url), 'utf8');
const dataJs = readFileSync(new URL('../data/data-api.js', import.meta.url), 'utf8');
const detailTemplateJs = readFileSync(new URL('../calendar/detail-template.js', import.meta.url), 'utf8');
const calendarJs = readFileSync(new URL('../render-calendar.js', import.meta.url), 'utf8');

function sliceByFirstBrace(source, startToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `${startToken} should exist`);
  let open = -1;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] !== '{') continue;
    const before = source.slice(start, i);
    if (/\)\s*$/.test(before)) {
      open = i;
      break;
    }
  }
  assert.notEqual(open, -1, `${startToken} should have a body`);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${startToken} body should close`);
}

test('Max primary complete buttons set a set done instead of toggling it back off', () => {
  assert.match(exercisesJs, /function _setSetDoneState\(entryIdx, si, nextDone\)/);
  assert.match(exercisesJs, /_setSetDoneState\(idx,\s*target,\s*true\)/);
  assert.match(exercisesJs, /_setSetDoneState\(entryIdx,\s*target,\s*true\)/);
  assert.doesNotMatch(exercisesJs, /wtToggleSetDone\(idx,\s*target\)/);
  assert.doesNotMatch(exercisesJs, /wtToggleSetDone\(entryIdx,\s*target\)/);
});

test('growth board workout commit only shows a stamp after required board persistence succeeds', () => {
  const commit = sliceByFirstBrace(boardRenderJs, 'async function _commitWorkoutCard');
  assert.match(boardRenderJs, /cardCommitting/);
  assert.match(boardRenderJs, /function _isCompletionStamped/);
  assert.match(boardRenderJs, /async function _persistRequired/);
  assert.match(commit, /_persistRequired\('완료 도장 저장 실패/);
  assert.doesNotMatch(commit, /await _persist\(\)/);
});

test('test board saving preserves existing completion logs and propagates failures', () => {
  const save = sliceByFirstBrace(dataJs, 'export async function saveTestBoardV2');
  assert.match(dataJs, /import \{ mergeBoardCompletionLogs \} from '\.\.\/workout\/test-v2\/board-core\.js'/);
  assert.match(save, /runTransaction\(db, async \(transaction\) =>/);
  assert.match(save, /transaction\.get\(activeRef\)/);
  assert.match(save, /mergeBoardCompletionLogs\(latestBoard, board\)/);
  assert.match(save, /transaction\.set\(activeRef, \{ value: nextBoard \}\)/);
  assert.match(save, /rethrow:\s*true/);
});

// 대표 세트를 무게로만 고르면 5/3/1의 헤비 싱글(126kg×1)이 뽑혀서, 계획을 채운
// 세트(103kg×3)가 있어도 횟수 미달로 목표가 미달 처리된다. 실제로 이 이유로
// 주간 목표 칸이 색칠되지 않았다.
test('goal judgement accepts any set that meets the plan, not just the heaviest', async () => {
  const { judgeWorkoutSetsAgainstPlan } = await import('../workout/test-v2/board-core.js');

  // 성장 보드와 달력 시트가 같은 규칙을 쓴다. 규칙은 board-core 한 곳에만 있다.
  const commit = sliceByFirstBrace(boardRenderJs, 'async function _commitWorkoutCard');
  assert.match(commit, /judgeWorkoutSetsAgainstPlan\(doneSets, plan\)/);
  assert.doesNotMatch(commit, /const hit = !!best &&/);

  // 2026-07-28 스쿼트(와이드) 실제 구성: 메인 뒤에 헤비 싱글이 붙는다.
  const sets = [
    { kg: 46.3, reps: 5, setType: 'warmup' },
    { kg: 86.3, reps: 8 }, { kg: 97.5, reps: 6 }, { kg: 103.8, reps: 3 },
    { kg: 110, reps: 1 }, { kg: 121.3, reps: 1 }, { kg: 126.3, reps: 1 },
    { kg: 97.5, reps: 4 }, { kg: 97.5, reps: 4 },
  ];
  const met = judgeWorkoutSetsAgainstPlan(sets, { kg: 103.8, reps: 3 });
  assert.equal(met.hit, true);
  // 색칠 로그에는 계획을 채운 세트가 남아야 한다. 싱글이 아니라.
  assert.equal(met.best.kg, 103.8);
  assert.equal(met.best.reps, 3);
  // 웜업은 판정에서 빠진다.
  assert.equal(met.working.length, 8);

  // 계획을 채운 세트가 하나도 없으면 종전대로 미달이고, 대표는 최고 중량 세트다.
  const missed = judgeWorkoutSetsAgainstPlan(sets, { kg: 130, reps: 3 });
  assert.equal(missed.hit, false);
  assert.equal(missed.best.kg, 126.3);

  // 무게·횟수가 비면 수행한 세트로 세지 않는다.
  const empty = judgeWorkoutSetsAgainstPlan([{ kg: 0, reps: 0 }, { kg: 100 }], { kg: 60, reps: 5 });
  assert.equal(empty.hit, false);
  assert.equal(empty.best, null);
});

// 오늘 내 세트를 "성공 기준"이라고 부르면 무엇을 하든 기준을 채운 것처럼 보인다.
test('day sheet card shows the prescription as the goal, or says it is only today best set', () => {
  // detail-template.js는 data.js를 통해 원격 Firebase 모듈까지 끌고 온다.
  const _workoutCardGoal = new Function(`
    function formatWorkoutKg(value) {
      const n = Number(value);
      return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
    }
    ${extractFunctionSource([detailTemplateJs], '_workoutCardGoal').replace(/^export /, '')}
    return _workoutCardGoal;
  `)();

  // 성장보드 처방이 붙은 종목은 처방을 그대로 적는다.
  const planned = _workoutCardGoal(
    { maxPrescription: { startKg: 103.8, repsLow: 3, repsHigh: 3 } },
    { bestKg: '126.3', bestReps: '1', hasSetDetails: true },
  );
  assert.equal(planned.kind, 'prescription');
  assert.equal(planned.label, '오늘 성공 기준');
  assert.equal(planned.text, '103.8kg × 3회');

  // 반복 구간이 있으면 구간으로 적는다.
  const ranged = _workoutCardGoal(
    { maxPrescription: { startKg: 60, repsLow: 8, repsHigh: 12 } },
    { hasSetDetails: true },
  );
  assert.equal(ranged.text, '60kg × 8-12회');

  // 처방이 없으면 오늘 최고 세트를 적되, 성공 기준이라고 부르지 않는다.
  const bestOnly = _workoutCardGoal({}, { bestKg: '86.3', bestReps: '8', hasSetDetails: true });
  assert.equal(bestOnly.kind, 'best-set');
  assert.equal(bestOnly.label, '오늘 최고 세트');
  assert.equal(bestOnly.text, '86.3kg × 8회');

  const empty = _workoutCardGoal({}, { hasSetDetails: false });
  assert.equal(empty.text, '세트 입력 대기');
});

// 운동 탭은 달력 홈 모드로 고정돼 있고 그 모드에서는 운동 방식 목록이 통째로
// 숨겨진다. 성장 보드로 들어갈 길이 없으므로 주간 목표를 켤 방법도 없었다.
// 사람이 실제로 누르는 "종목완료"가 같은 판정을 돌려 색칠까지 해야 한다.
test('day sheet 종목완료 paints the season week with the same rule the board uses', async () => {
  const { judgeWorkoutSetsAgainstPlan, paintWeek } = await import('../workout/test-v2/board-core.js');
  const paint = sliceByFirstBrace(calendarJs, 'async function _paintSeasonWeekForCompletedExercise');

  // 보드와 같은 판정·같은 색칠 함수를 쓴다.
  assert.match(paint, /judgeWorkoutSetsAgainstPlan\(entry\?\.sets \|\| \[\], \{ kg: planKg, reps: planReps \}\)/);
  assert.match(paint, /paintWeek\(board, \{/);
  assert.match(paint, /await saveTestBoardV2\(board\)/);
  // 보드가 만든 카드에만 적용한다. 처방이 없으면 손대지 않는다.
  assert.match(paint, /meta\?\.source !== 'test_board_v2'/);
  assert.match(paint, /boardV2BenchmarkId/);
  assert.match(paint, /boardV2WeekStart/);
  // 성공했을 때만 색칠한다. 미달이면 아무것도 하지 않는다.
  assert.match(paint, /if \(!judged\.hit\) return \{ painted: false, reason: 'missed' \};/);
  assert.doesNotMatch(paint, /recordMiss|openMissSheet/);
  // 색칠 실패가 기록 저장을 되돌리면 안 된다.
  const complete = sliceByFirstBrace(calendarJs, 'async function _completeWorkoutExerciseFromSheet');
  assert.match(complete, /try \{\s*painted = await _paintSeasonWeekForCompletedExercise\(key, completedEntry\);/);

  // 판정 → 색칠이 실제로 주간 로그를 남기는지 확인한다.
  const board = {
    benchmarks: [{ id: 'squat-1', label: '스쿼트(와이드)', status: 'active', tracks: ['volume'] }],
    steps: [{ benchmarkId: 'squat-1', track: 'volume', weekStart: '2026-07-27', span: 4, kg: 103.8, reps: 3, weekLog: {} }],
  };
  const sets = [
    { kg: 46.3, reps: 5, setType: 'warmup' },
    { kg: 103.8, reps: 3 }, { kg: 126.3, reps: 1 },
  ];
  const judged = judgeWorkoutSetsAgainstPlan(sets, { kg: 103.8, reps: 3 });
  assert.equal(judged.hit, true);
  assert.equal(paintWeek(board, { benchmarkId: 'squat-1', track: 'volume', weekStart: '2026-07-28', log: { at: 1 } }), true);
  // 주중 아무 날로 색칠해도 그 주 월요일 칸에 남는다 — 달력 레일이 읽는 키다.
  assert.ok(board.steps[0].weekLog['2026-07-27']?.paintedAt);
});

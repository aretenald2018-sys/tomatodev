import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractFunctionSource } from './helpers/source-function.js';

const exercisesJs = readFileSync(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const boardRenderJs = readFileSync(new URL('../workout/test-v2/board-render.js', import.meta.url), 'utf8');
const dataJs = readFileSync(new URL('../data/data-api.js', import.meta.url), 'utf8');
const detailTemplateJs = readFileSync(new URL('../calendar/detail-template.js', import.meta.url), 'utf8');

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
test('growth board goal judgement accepts any set that meets the plan, not just the heaviest', () => {
  const commit = sliceByFirstBrace(boardRenderJs, 'async function _commitWorkoutCard');
  assert.match(commit, /const hitSet = pickHeaviest\(working\.filter\(s => Number\(s\.kg\) >= plan\.kg && Number\(s\.reps\) >= plan\.reps\)\)/);
  assert.match(commit, /const hit = !!hitSet;/);
  // 미달일 때 남기는 기록은 종전대로 가장 무거운 세트다.
  assert.match(commit, /const best = hitSet \|\| pickHeaviest\(working\);/);
  assert.doesNotMatch(commit, /const hit = !!best &&/);

  // 판정 부분을 원본 그대로 떼어 실제 세트 구성으로 돌려본다.
  const judgeSource = commit.match(/const heavier = [\s\S]*?const hit = !!hitSet;/);
  assert.ok(judgeSource, 'commit should contain the goal judgement block');
  const judge = new Function('working', 'plan', `
    ${judgeSource[0]}
    return { hit, bestKg: best?.kg ?? null, bestReps: best?.reps ?? null };
  `);

  // 2026-07-28 스쿼트(와이드) 실제 구성: 메인 뒤에 헤비 싱글이 붙는다.
  const sets = [
    { kg: 86.3, reps: 8 }, { kg: 97.5, reps: 6 }, { kg: 103.8, reps: 3 },
    { kg: 110, reps: 1 }, { kg: 121.3, reps: 1 }, { kg: 126.3, reps: 1 },
    { kg: 97.5, reps: 4 }, { kg: 97.5, reps: 4 },
  ];
  const met = judge(sets, { kg: 103.8, reps: 3 });
  assert.equal(met.hit, true);
  // 색칠 로그에는 계획을 채운 세트가 남아야 한다. 싱글이 아니라.
  assert.equal(met.bestKg, 103.8);
  assert.equal(met.bestReps, 3);

  // 계획을 채운 세트가 하나도 없으면 종전대로 미달이고, 기록은 최고 중량 세트다.
  const missed = judge(sets, { kg: 130, reps: 3 });
  assert.equal(missed.hit, false);
  assert.equal(missed.bestKg, 126.3);
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

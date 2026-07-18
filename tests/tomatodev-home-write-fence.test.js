import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync(new URL('../home/index.js', import.meta.url), 'utf8');
const tomatoSource = readFileSync(new URL('../home/tomato.js', import.meta.url), 'utf8');
const unitGoalSource = readFileSync(new URL('../home/unit-goal.js', import.meta.url), 'utf8');
const heroSource = readFileSync(new URL('../home/hero.js', import.meta.url), 'utf8');
const apiSource = readFileSync(new URL('../data/data-api.js', import.meta.url), 'utf8');

function extractExportedFunction(source, name) {
  const marker = `export function ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${marker}`);
  const signatureEnd = source.indexOf(')', start);
  assert.notEqual(signatureEnd, -1, `missing signature for ${name}`);
  const open = source.indexOf('{', signatureEnd);
  assert.notEqual(open, -1, `missing body for ${name}`);

  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function buildHarnessFunction(source, name, dependencies) {
  const functionSource = extractExportedFunction(source, name)
    .replace(`export function ${name}`, `function ${name}`);
  const dependencyNames = Object.keys(dependencies);
  return new Function(
    ...dependencyNames,
    `${functionSource}\nreturn ${name};`,
  )(...dependencyNames.map(key => dependencies[key]));
}

function rejectedRemoteWrite(state, label) {
  return () => {
    state.remoteWrites.push(label);
    return Promise.reject(new Error(`simulated _saveSetting rejection: ${label}`));
  };
}

test('TomatoDev Home settlement is a write-free in-memory preview', async () => {
  const state = {
    unitGoalStart: null,
    tomatoState: {
      quarterlyTomatoes: {},
      totalTomatoes: 0,
      giftedReceived: 0,
      giftedSent: 0,
    },
    cycles: [],
    remoteWrites: [],
    memoryWrites: [],
    unhandled: [],
  };
  const onUnhandled = reason => state.unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);

  const dateKey = (year, month, day) => [
    year,
    String(month + 1).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');

  try {
    const settle = buildHarnessFunction(tomatoSource, 'settleTomatoCycleIfNeeded', {
      TODAY: new Date(2026, 6, 18),
      getUnitGoalStart: () => state.unitGoalStart,
      rememberUnitGoalStartInMemory(value) {
        state.unitGoalStart ??= value;
        state.memoryWrites.push('unit_goal_start');
        return state.unitGoalStart;
      },
      getAllDateKeys: () => ['2026-07-01'],
      dateKey,
      calcTomatoCycle: start => ({ cycleStart: start }),
      getTomatoState: () => state.tomatoState,
      getDietPlan: () => ({}),
      getTomatoCycles: () => state.cycles,
      getDiet: () => ({}),
      getDay: () => ({}),
      calcDayTarget: () => 2000,
      evaluateCycleResult: () => ({
        dietSuccesses: [false, false, false],
        exerciseSuccesses: [false, false, false],
        dietAllSuccess: false,
        exerciseAllSuccess: false,
        tomatoesAwarded: 0,
      }),
      getQuarterKey: () => '2026-Q3',
      rememberTomatoCycleInMemory(cycle) {
        if (!state.cycles.some(existing => existing.id === cycle.id)) state.cycles.push(cycle);
        state.memoryWrites.push(`cycle:${cycle.id}`);
        return cycle;
      },
      rememberTomatoStateInMemory(value) {
        state.tomatoState = value;
        state.memoryWrites.push('tomato_state');
        return value;
      },
      trackEvent: () => {},
      saveUnitGoalStart: rejectedRemoteWrite(state, 'unit_goal_start'),
      saveTomatoCycle: rejectedRemoteWrite(state, 'tomato_cycles'),
      saveTomatoState: rejectedRemoteWrite(state, 'tomato_state'),
      console: { log() {} },
    });

    settle();
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(state.unitGoalStart, '2026-07-01');
    assert.equal(state.cycles.length, 5, 'completed cycles remain visible in this session');
    assert.equal(state.tomatoState.migrated_v2, true, 'preview migration marker remains in memory');
    assert.deepEqual(state.remoteWrites, []);
    assert.deepEqual(state.unhandled, []);
    assert.ok(state.memoryWrites.includes('tomato_state'));
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

test('render defaults and milestone markers never call _saveSetting wrappers', async () => {
  const state = {
    unitGoalStart: null,
    shown: {},
    remoteWrites: [],
    memoryWrites: [],
    openedMilestones: [],
    unhandled: [],
  };
  const onUnhandled = reason => state.unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);

  const container = { innerHTML: '' };
  const document = {
    getElementById(id) {
      return id === 'unit-goal-content' ? container : null;
    },
  };
  const metrics = {
    deficit: { kcal: 1800, proteinG: 120, carbG: 180, fatG: 60 },
    refeed: { kcal: 2100, proteinG: 120, carbG: 250, fatG: 60 },
  };

  try {
    const renderUnitGoal = buildHarnessFunction(unitGoalSource, 'renderUnitGoal', {
      TODAY: new Date(2026, 6, 18),
      document,
      getDietPlan: () => ({ refeedDays: [] }),
      getBodyCheckins: () => [],
      calcDietMetrics: () => metrics,
      getUnitGoalStart: () => state.unitGoalStart,
      rememberUnitGoalStartInMemory(value) {
        state.unitGoalStart ??= value;
        state.memoryWrites.push('unit_goal_start');
        return state.unitGoalStart;
      },
      saveUnitGoalStart: rejectedRemoteWrite(state, 'unit_goal_start'),
      dateKey: (year, month, day) => [
        year,
        String(month + 1).padStart(2, '0'),
        String(day).padStart(2, '0'),
      ].join('-'),
      isFuture: () => false,
      isToday: () => false,
      getDiet: () => ({}),
      getDayTargetKcal: () => 1800,
    });
    renderUnitGoal();

    const checkStreakMilestone = buildHarnessFunction(heroSource, 'checkStreakMilestone', {
      getMilestoneShown: () => state.shown,
      rememberMilestoneShownInMemory(value) {
        state.shown = value;
        state.memoryWrites.push('milestone_shown');
        return value;
      },
      saveMilestoneShown: rejectedRemoteWrite(state, 'milestone_shown'),
      setTimeout(callback) { callback(); },
      openStreakMilestone(type, days) { state.openedMilestones.push(`${type}:${days}`); },
    });
    checkStreakMilestone('workout', 7);
    checkStreakMilestone('workout', 7);
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(state.unitGoalStart, '2026-07-18');
    assert.match(container.innerHTML, /unit-goal-table/);
    assert.deepEqual(state.openedMilestones, ['workout:7']);
    assert.deepEqual(state.remoteWrites, []);
    assert.deepEqual(state.unhandled, []);
    assert.deepEqual(state.memoryWrites, ['unit_goal_start', 'milestone_shown']);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

test('Home wiring exposes only memory helpers to automatic gamification paths', () => {
  const settleSource = extractExportedFunction(tomatoSource, 'settleTomatoCycleIfNeeded');
  const tomatoCardSource = extractExportedFunction(tomatoSource, 'renderTomatoCard');
  const unitRenderSource = extractExportedFunction(unitGoalSource, 'renderUnitGoal');
  const milestoneSource = extractExportedFunction(heroSource, 'checkStreakMilestone');

  assert.match(extractExportedFunction(homeSource, 'renderHome'), /settleTomatoCycleIfNeeded\(\)/);
  assert.doesNotMatch(settleSource, /\bsave(?:UnitGoalStart|TomatoState|TomatoCycle)\s*\(/);
  assert.doesNotMatch(tomatoCardSource, /\bsaveUnitGoalStart\s*\(/);
  assert.doesNotMatch(unitRenderSource, /\bsaveUnitGoalStart\s*\(/);
  assert.doesNotMatch(milestoneSource, /\bsaveMilestoneShown\s*\(/);

  for (const helper of [
    'rememberUnitGoalStartInMemory',
    'rememberTomatoStateInMemory',
    'rememberTomatoCycleInMemory',
    'rememberMilestoneShownInMemory',
  ]) {
    const helperSource = extractExportedFunction(apiSource, helper);
    assert.doesNotMatch(helperSource, /\b(?:_saveSetting|_fbOp|setDoc)\b/, `${helper} must stay local`);
  }

  const pickerSource = extractExportedFunction(unitGoalSource, 'openUnitGoalDatePicker');
  assert.match(pickerSource, /await saveUnitGoalStart\(val\)/, 'explicit date selection still persists');
});

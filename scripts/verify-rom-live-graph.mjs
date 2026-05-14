import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:5500/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const result = await page.evaluate(async () => {
    const core = await import('/data/data-core.js');
    const state = await import('/workout/state.js');
    const ex = await import('/workout/exercises.js');

    core.setCurrentUserRef({ id: 'dev_운동테스트', lastName: 'DEV', firstName: '운동테스트' });
    core._resetSettings({ expert_preset: { enabled: true, mode: 'max', currentGymId: 'gym_moon' } });
    core._setExList([
      { id: 'dev_bench_moon', name: '문정 바벨 벤치프레스', movementId: 'barbell_bench', muscleId: 'chest', maxTrackPreference: 'M' },
    ]);
    core._setCache({
      '2026-05-05': {
        exercises: [{
          exerciseId: 'dev_bench_moon',
          movementId: 'barbell_bench',
          recommendationMeta: { track: 'M' },
          sets: [{ kg: 100, reps: 10, romPct: 100, done: true, setType: 'main' }],
        }],
      },
      '2026-05-12': {
        exercises: [{
          exerciseId: 'dev_bench_moon',
          movementId: 'barbell_bench',
          recommendationMeta: { track: 'M' },
          sets: [{ kg: 100, reps: 10, romPct: 100, done: true, setType: 'main' }],
        }],
      },
    });

    state.S.shared.date = { y: 2026, m: 4, d: 12 };
    state.S.workout.exercises = [{
      muscleId: 'chest',
      exerciseId: 'dev_bench_moon',
      movementId: 'barbell_bench',
      recommendationMeta: { track: 'M' },
      sets: [{ kg: 100, reps: 10, romPct: 100, done: true, setType: 'main' }],
    }];

    let list = document.getElementById('wt-exercise-list');
    if (!list) {
      list = document.createElement('div');
      list.id = 'wt-exercise-list';
      document.body.appendChild(list);
    }

    const graphValue = () => document
      .querySelector('.ex-max-track-graph-row[data-track="M"] .ex-max-track-graph-value')
      ?.dataset
      ?.value || null;
    const graphDelta = () => document
      .querySelector('.ex-max-track-graph-row[data-track="M"] .ex-max-track-graph-value small')
      ?.textContent
      ?.trim() || null;
    ex._renderExerciseList();
    const before = graphValue();
    ex.wtUpdateSet(0, 0, 'romPct', 50);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const after = graphValue();
    const delta = graphDelta();
    return {
      before,
      after,
      delta,
      romPct: state.S.workout.exercises[0].sets[0].romPct,
    };
  });

  if (result.before !== '1.0t' || result.after !== '500kg' || result.delta !== '-50%' || result.romPct !== 50) {
    throw new Error(`ROM live graph verification failed: ${JSON.stringify(result)}`);
  }
  console.log(`[rom-live-graph] ok ${JSON.stringify(result)}`);
} finally {
  await browser.close();
}

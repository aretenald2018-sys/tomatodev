import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateUrl = pathToFileURL(path.join(repoRoot, 'workout/state.js')).href;
const runningSessionUrl = pathToFileURL(path.join(repoRoot, 'workout/running-session.js')).href;
const realSaveUrl = pathToFileURL(path.join(repoRoot, 'workout/save.js')).href;

async function runRecoveryHarness({ dateKey, pollutedDate = null }) {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'tomato-running-recovery-'));
  const stubSavePath = path.join(tempDir, 'stub-save.js');
  const htmlPath = path.join(tempDir, 'harness.html');
  try {
    await writeFile(stubSavePath, `import { S } from ${JSON.stringify(stateUrl)};
export async function saveWorkoutDay() {
  const d = S.shared.date;
  const key = d ? d.y + '-' + String(d.m + 1).padStart(2, '0') + '-' + String(d.d).padStart(2, '0') : null;
  window.__qaSaves = (window.__qaSaves || []).concat([{ key, runData: S.workout.runData, running: S.workout.running }]);
  return !!key;
}
`, 'utf8');

    const imports = { [realSaveUrl]: pathToFileURL(stubSavePath).href };
    const scenario = {
      dateKey,
      pollutedDate,
      stateUrl,
      runningSessionUrl,
    };
    await writeFile(htmlPath, `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<script type="importmap">${JSON.stringify({ imports })}</script></head>
<body><div id="wt-running-session-root"></div>
<script type="module">
try {
  const scenario = ${JSON.stringify(scenario)};
  window._mealPhotos = {};
  window.showToast = () => {};
  window.wtOpenWorkoutDaySheet = () => {};
  Object.defineProperty(navigator, 'geolocation', {
    value: { watchPosition() { return 1; }, clearWatch() {} },
    configurable: true
  });

  const ownerId = 'qa-runner';
  const now = Date.now();
  const draft = {
    version: 1,
    phase: 'summary',
    ownerId,
    dateKey: scenario.dateKey,
    startedAt: now - 120000,
    endedAt: now - 1000,
    updatedAt: now,
    pausedAt: null,
    pausedMs: 0,
    route: [
      { lat: 37, lng: 127, ts: now - 120000 },
      { lat: 37.001, lng: 127.001, ts: now - 110000 }
    ],
    placeSummary: { status: 'resolved', label: 'QA 위치' },
    goal: { type: 'free', value: 0 },
    audioGuide: false,
    announcedSplits: 0,
    announcedGoalHalf: false,
    announcedGoalDone: false,
    lastSpeechAt: 0
  };
  localStorage.setItem('tomatodev:auth:current-user:v1', JSON.stringify({ id: ownerId }));
  localStorage.setItem('tomatodev_running_session_draft_' + encodeURIComponent(ownerId), JSON.stringify(draft));
  localStorage.setItem('tomatodev_running_session_draft_active', JSON.stringify(draft));
  localStorage.setItem('tomatofarm_running_session_draft_active', JSON.stringify({
    phase: 'active', ownerId: 'production-user', marker: 'must-remain-untouched'
  }));

  const state = await import(scenario.stateUrl);
  if (scenario.pollutedDate) state.S.shared.date = scenario.pollutedDate;
  const mod = await import(scenario.runningSessionUrl);
  const restored = mod.wtRestoreRunningSessionIfActive();
  await new Promise(resolve => setTimeout(resolve, 100));
  document.querySelector('[data-running-action="save"]')?.click();
  // 저장 체인이 끝날 때까지 기다린다. 고정 sleep 은 머신 부하에 따라 흔들려서
  // 관측값이 두 번 연속 같아질 때(정착)까지 폴링한다.
  const snapshot = () => JSON.stringify({
    saves: (window.__qaSaves || []).length,
    open: (() => { const r = document.getElementById('wt-running-session-root'); return !!r && !r.hidden; })(),
    draft: localStorage.getItem('tomatodev_running_session_draft_active')
  });
  let previous = null;
  for (let i = 0; i < 40; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const current = snapshot();
    if (i >= 3 && current === previous) break;
    previous = current;
  }

  const root = document.getElementById('wt-running-session-root');
  window.__qaDone = {
    restored,
    date: state.S.shared.date,
    saves: window.__qaSaves || [],
    rootOpen: !!root && !root.hidden && root.classList.contains('is-open'),
    activeDraft: localStorage.getItem('tomatodev_running_session_draft_active'),
    productionDraft: localStorage.getItem('tomatofarm_running_session_draft_active'),
    dotCount: root?.querySelectorAll('.wt-run-live-pages span')?.length || 0,
    screen: root?.querySelector('[data-running-screen]')?.getAttribute('data-running-screen') || null
  };
} catch (e) {
  window.__qaError = String(e && (e.stack || e.message) || e);
}
</script></body></html>`, 'utf8');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--allow-file-access-from-files'],
    });
    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(String(error?.stack || error?.message || error)));
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__qaDone || window.__qaError, { timeout: 15000 });
      const result = await page.evaluate(() => ({ done: window.__qaDone || null, error: window.__qaError || null }));
      assert.equal(result.error, null);
      assert.deepEqual(pageErrors, []);
      return result.done;
    } finally {
      await browser.close();
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

test('restored running summary saves under the draft date, not a polluted boot date', async () => {
  const result = await runRecoveryHarness({
    dateKey: '2026-07-03',
    pollutedDate: { y: 2026, m: 6, d: 4 },
  });

  assert.equal(result.restored, true);
  assert.deepEqual(result.date, { y: 2026, m: 6, d: 3 });
  assert.equal(result.saves.length, 1);
  assert.equal(result.saves[0].key, '2026-07-03');
  assert.equal(result.saves[0].running, true);
  assert.ok(result.saves[0].runData.distance > 0);
  assert.equal(result.rootOpen, false);
  assert.equal(result.activeDraft, null);
  assert.equal(JSON.parse(result.productionDraft).marker, 'must-remain-untouched');
  assert.equal(result.dotCount, 0);
});

test('running summary save keeps the restored draft open when workout date is unavailable', async () => {
  const result = await runRecoveryHarness({
    dateKey: '',
    pollutedDate: { y: 2026, m: 6, d: 4 },
  });

  assert.equal(result.restored, true);
  assert.deepEqual(result.date, { y: 2026, m: 6, d: 4 });
  assert.equal(result.saves.length, 0);
  assert.equal(result.rootOpen, true);
  assert.ok(result.activeDraft);
  assert.equal(JSON.parse(result.productionDraft).marker, 'must-remain-untouched');
  assert.equal(result.screen, 'summary');
  assert.equal(result.dotCount, 0);
});

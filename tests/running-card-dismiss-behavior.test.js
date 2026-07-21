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
const styleUrl = pathToFileURL(path.join(repoRoot, 'style.css')).href;

// 시나리오마다 브라우저를 새로 띄우면 병렬 테스트 부하가 커져 다른 스위트가 흔들린다.
// 하나만 띄워 세 시나리오가 공유한다.
let _browserPromise = null;
function sharedBrowser() {
  if (!_browserPromise) {
    _browserPromise = puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files'] });
  }
  return _browserPromise;
}
test.after(async () => {
  if (_browserPromise) await (await _browserPromise).close();
});

// 러닝 카드를 열고, 우측 상단 X를 눌러 카드가 사라지는지 확인한다.
// mode: 'fresh'  → 방금 잘못 누른 상태(측정값 없음). 확인 모달 없이 즉시 삭제되어야 한다.
// mode: 'recorded' → 이미 달린 상태. 확인 모달이 뜨고, 취소하면 남고 삭제하면 사라져야 한다.
async function runDismissHarness({ mode, confirmChoice = 'confirm' }) {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'tomato-running-dismiss-'));
  const htmlPath = path.join(tempDir, 'harness.html');
  try {
    const scenario = { mode, confirmChoice, stateUrl, runningSessionUrl, styleUrl };
    await writeFile(htmlPath, `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="${styleUrl}"></head>
<body><div class="wt-running-inline-host" data-wt-running-session-host>
<div id="wt-running-session-root" class="wt-running-inline-root" aria-live="polite" hidden></div>
</div>
<div class="wt-day-empty wt-running-empty" data-wt-running-empty hidden></div>
<script type="module">
try {
  const scenario = ${JSON.stringify(scenario)};
  window._mealPhotos = {};
  Object.defineProperty(navigator, 'geolocation', {
    value: { watchPosition() { return 1; }, clearWatch() {} },
    configurable: true
  });

  const ownerId = 'qa-dismiss';
  localStorage.setItem('tomatodev:auth:current-user:v1', JSON.stringify({ id: ownerId }));

  const state = await import(scenario.stateUrl);
  state.S.shared.date = { y: 2026, m: 6, d: 22 };
  const mod = await import(scenario.runningSessionUrl);

  if (scenario.mode === 'recorded') {
    // 실제로 달린 세션을 draft 로 복원시켜 "측정값 있음" 경로를 태운다.
    const now = Date.now();
    const draft = {
      version: 1, phase: 'paused', ownerId, dateKey: '2026-07-22',
      startedAt: now - 600000, endedAt: null, updatedAt: now,
      pausedAt: now, pausedMs: 0,
      route: [
        { lat: 37.5, lng: 127.0, ts: now - 600000, accuracy: 5 },
        { lat: 37.508, lng: 127.008, ts: now - 300000, accuracy: 5 },
        { lat: 37.516, lng: 127.016, ts: now - 1000, accuracy: 5 }
      ],
      placeSummary: { status: 'resolved', label: 'QA 위치' },
      goal: { type: 'free', value: 0 }, audioGuide: false,
      announcedSplits: 0, announcedGoalHalf: false, announcedGoalDone: false, lastSpeechAt: 0
    };
    localStorage.setItem('tomatodev_running_session_draft_' + encodeURIComponent(ownerId), JSON.stringify(draft));
    localStorage.setItem('tomatodev_running_session_draft_active', JSON.stringify(draft));
    mod.wtRestoreRunningSessionIfActive();
  } else {
    mod.wtOpenRunningSession();
  }
  await new Promise(resolve => setTimeout(resolve, 150));

  const root = document.getElementById('wt-running-session-root');
  const dismiss = root.querySelector('[data-running-action="discard"]');
  const cardBox = root.querySelector('.wt-running-live-card')?.getBoundingClientRect();
  const btnBox = dismiss?.getBoundingClientRect();

  const before = {
    hasDismiss: !!dismiss,
    label: dismiss?.getAttribute('aria-label') || null,
    // 버튼이 카드 우측 상단에 있는지 (가로: 카드 오른쪽 절반, 세로: 카드 위쪽 25%)
    inTopRight: !!(cardBox && btnBox
      && btnBox.left > cardBox.left + cardBox.width * 0.5
      && btnBox.right <= cardBox.right + 1
      && btnBox.top < cardBox.top + cardBox.height * 0.25),
    // 확장된 탭 영역이 44px 이상인지
    tapSize: dismiss ? (() => {
      const after = getComputedStyle(dismiss, '::after');
      const grow = Math.abs(parseFloat(after.top) || 0);
      return { w: btnBox.width + grow * 2, h: btnBox.height + grow * 2 };
    })() : null,
    rootOpen: !root.hidden && root.classList.contains('is-open')
  };

  dismiss.click();
  await new Promise(resolve => setTimeout(resolve, 250));

  const overlay = document.querySelector('.confirm-modal-overlay');
  const confirmShown = !!overlay;
  if (overlay) {
    overlay.querySelector('[data-confirm-role="' + scenario.confirmChoice + '"]').click();
  }
  await new Promise(resolve => setTimeout(resolve, 600));

  window.__qaDone = {
    ...before,
    confirmShown,
    rootOpenAfter: !root.hidden && root.classList.contains('is-open'),
    cardCountAfter: root.querySelectorAll('[data-running-screen]').length,
    emptyShown: !document.querySelector('[data-wt-running-empty]').hidden,
    activeDraftAfter: localStorage.getItem('tomatodev_running_session_draft_active'),
    toast: document.getElementById('tds-toast')?.textContent || ''
  };
} catch (e) {
  window.__qaError = String(e && (e.stack || e.message) || e);
}
</script></body></html>`, 'utf8');

    const browser = await sharedBrowser();
    const page = await browser.newPage();
    try {
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(String(error?.stack || error?.message || error)));
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__qaDone || window.__qaError, { timeout: 20000 });
      const result = await page.evaluate(() => ({ done: window.__qaDone || null, error: window.__qaError || null }));
      assert.equal(result.error, null);
      assert.deepEqual(pageErrors, []);
      return result.done;
    } finally {
      await page.close();
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

test('mistakenly started running card is removed by the top-right X without a confirm prompt', async () => {
  const result = await runDismissHarness({ mode: 'fresh' });

  assert.equal(result.hasDismiss, true, 'X 버튼이 카드에 있어야 한다');
  assert.equal(result.label, '러닝 기록 삭제');
  assert.equal(result.inTopRight, true, 'X 버튼은 카드 우측 상단에 있어야 한다');
  assert.ok(result.tapSize.w >= 44 && result.tapSize.h >= 44, `탭 영역 44px 이상 (got ${JSON.stringify(result.tapSize)})`);
  assert.equal(result.rootOpen, true);

  assert.equal(result.confirmShown, false, '측정값이 없으면 확인 모달 없이 바로 삭제한다');
  assert.equal(result.rootOpenAfter, false, '카드가 닫혀야 한다');
  assert.equal(result.cardCountAfter, 0, '카드 DOM 이 제거되어야 한다');
  assert.equal(result.emptyShown, true, '빈 상태가 다시 보여야 한다');
  assert.equal(result.activeDraftAfter, null, 'draft 가 지워져야 한다');
  assert.match(result.toast, /러닝 기록을 삭제했습니다/);
});

test('recorded running card asks before discarding and keeps the card on cancel', async () => {
  const result = await runDismissHarness({ mode: 'recorded', confirmChoice: 'cancel' });

  assert.equal(result.hasDismiss, true);
  assert.equal(result.rootOpen, true);
  assert.equal(result.confirmShown, true, '측정값이 있으면 확인 모달이 떠야 한다');
  assert.equal(result.rootOpenAfter, true, '취소하면 카드가 남아야 한다');
  assert.equal(result.cardCountAfter, 1);
  assert.ok(result.activeDraftAfter, '취소하면 draft 가 유지되어야 한다');
  assert.doesNotMatch(result.toast, /러닝 기록을 삭제했습니다/);
});

test('recorded running card is discarded when the confirm is accepted', async () => {
  const result = await runDismissHarness({ mode: 'recorded', confirmChoice: 'confirm' });

  assert.equal(result.confirmShown, true);
  assert.equal(result.rootOpenAfter, false);
  assert.equal(result.cardCountAfter, 0);
  assert.equal(result.activeDraftAfter, null);
  assert.match(result.toast, /러닝 기록을 삭제했습니다/);
});

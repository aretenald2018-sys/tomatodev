import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 모듈 분할 리팩토링에서 반복적으로 재발한 결함은 "옮겨진 함수가 참조하던
// 식별자를 새 모듈이 import 하지 않는" 형태였다. 정적 링크 검사와 소스 문자열
// 테스트는 이 결함을 잡지 못하고 호출 시점 ReferenceError로만 드러난다.
// 아래 계약은 실제로 깨졌던 지점을 고정한다.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(repoRoot, relativePath), 'utf8');

function assertResolvedIdentifier(relativePath, identifier) {
  const source = read(relativePath);
  assert.match(
    source,
    new RegExp(`\\b${identifier}\\b`),
    `${relativePath} should still use ${identifier}`,
  );
  const declared = new RegExp(
    `(import[\\s\\S]*?\\b${identifier}\\b[\\s\\S]*?from\\s*['"]|`
    + `(?:const|let|var|function|class)\\s+${identifier}\\b|`
    + `\\bas\\s+${identifier}\\b)`,
  );
  assert.match(
    source,
    declared,
    `${relativePath} uses ${identifier} but never imports or declares it (ReferenceError at call time)`,
  );
}

test('split auth modules import the login continuation they call', () => {
  assertResolvedIdentifier('auth/signup.js', '_continueToAppAfterLogin');
});

test('calendar export text resolves its date-key parser', () => {
  assertResolvedIdentifier('calendar/export-text.js', '_parseDateKey');
});

test('calendar controller imports the sheet selector helper it uses', () => {
  assertResolvedIdentifier('render-calendar.js', '_workoutSheetSelectorValue');
});

test('stats renderer resolves the health chart series metadata', () => {
  assertResolvedIdentifier('render-stats.js', 'HEALTH_CHART_SERIES');
  assert.match(
    read('stats/health-series.js'),
    /export const HEALTH_CHART_SERIES/,
    'health-series must export HEALTH_CHART_SERIES for the renderer',
  );
});

test('guild modal refreshes the account list through an imported entry point', () => {
  const source = read('social/guild-modal.js');
  assert.match(
    source,
    /await import\('\.\.\/auth\/login-screen\.js'\)/,
    'guild modal should reach initLoginScreen through an explicit import',
  );
});

test('nutrition live results dedupe against the rendered CSV list', () => {
  const source = read('feature-nutrition.js');
  assert.match(source, /_nutritionSearchCache\.csvRendered = dedupedCsv;/);

  // localKeys는 검색 분기 밖에서 만들어지므로 분기 안의 지역 변수를 참조하면
  // 호출 시점에 ReferenceError가 되고, 공공·브랜드 결과가 영영 렌더되지 않는다.
  const localKeys = /const localKeys = new Set\(\[([\s\S]*?)\]\.map\(resultKey\)\);/.exec(source);
  assert.ok(localKeys, 'localKeys set construction should still exist');
  const spreadSources = [...localKeys[1].matchAll(/\.\.\.\(?\s*([A-Za-z_$][\w$.]*)/g)].map(m => m[1]);
  assert.ok(spreadSources.length > 0, 'localKeys should aggregate the locally rendered lists');
  for (const name of spreadSources) {
    assert.match(
      name,
      /^_nutritionSearchCache\./,
      `localKeys must read ${name} from the module-scoped search cache, not a block-scoped local`,
    );
  }
});

test('goal and home surfaces use the shared render/tab contracts', () => {
  const goals = read('app-modal-goals.js');
  assert.doesNotMatch(goals, /\brenderAll\(\)/, 'renderAll is not in scope for feature modules');
  assert.match(goals, /requestAppRender\('goal:ai-analysis'\)/);

  const tomato = read('home/tomato.js');
  assert.doesNotMatch(tomato, /\bswitchTab\(/, 'home modules must not call switchTab directly');
  assert.match(tomato, /new CustomEvent\('app:switch-tab', \{ detail: \{ tab: 'diet' \} \}\)/);
});

test('running keeps the screen awake on the web capture path only', () => {
  const session = read('workout/running-session.js');
  assert.match(session, /from '\.\/running-wake-lock\.js'/);
  // 네이티브 플러그인 경로는 포그라운드 서비스가 담당하므로 조기 반환 뒤에 잡는다.
  assert.match(
    session,
    /_startNativeLocationWatch\(nativePlugin\);\s*\n\s*return;[\s\S]*acquireRunningWakeLock\(\)/,
  );
  assert.match(session, /async function _stopWatch\(mode = 'pause'\) \{\s*\n\s*void releaseRunningWakeLock\(\);/);
  assert.match(session, /void refreshRunningWakeLock\(\);/);

  const wakeLock = read('workout/running-wake-lock.js');
  assert.match(wakeLock, /navigator\.wakeLock/);
  assert.match(wakeLock, /export async function acquireRunningWakeLock/);
  assert.match(wakeLock, /export async function releaseRunningWakeLock/);
  assert.match(wakeLock, /export async function refreshRunningWakeLock/);
});

test('running wake lock module is precached like every runtime module', () => {
  assert.match(read('runtime-assets.js'), /'\.\/workout\/running-wake-lock\.js'/);
});

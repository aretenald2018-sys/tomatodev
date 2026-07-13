import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dataApi = read('data/data-api.js');
const dataLoad = read('data/data-load.js');
const calendar = read('render-calendar.js');
const settingsModal = read('modals/settings-modal.js');
const featureMisc = read('feature-misc.js');
const seasonsCss = read('styles/features/seasons.css');
const runtimeAssets = read('runtime-assets.js');
const sw = read('sw.js');

test('시즌 전환은 일별 기록을 지우지 않고 시즌 설정만 원자적으로 만든다', () => {
  const startSeasonSource = dataApi.slice(
    dataApi.indexOf('export async function startNewSeason'),
    dataApi.indexOf('// Diet Plan'),
  );
  assert.match(dataApi, /export async function startNewSeason/);
  assert.match(dataApi, /writeBatch\(db\)/);
  assert.match(dataApi, /batch\.set\(_doc\('settings', 'season_registry'\)/);
  assert.match(dataApi, /seasonSettingKey\(next\.id, slot\)/);
  assert.doesNotMatch(startSeasonSource, /deleteDoc|_doc\('workouts'/);
  assert.match(dataLoad, /createInitialSeasonRegistry/);
  assert.match(dataLoad, /initial season migration failed/);
});

test('시즌 관리 UI는 지연 모달 내부에서 data-action으로 직접 연결된다', () => {
  assert.match(settingsModal, /id="season-settings-list"/);
  assert.match(settingsModal, /data-action="settings:start-season"/);
  assert.doesNotMatch(settingsModal, /onclick=/);
  assert.match(featureMisc, /confirmAction\([\s\S]*이전 기록은 삭제되지 않습니다/);
  assert.match(featureMisc, /await startNewSeason\(\{ name, startDate \}\)/);
});

test('캘린더는 날짜별 시즌 색과 경계 표시를 렌더하고 자산 캐시를 갱신한다', () => {
  assert.match(calendar, /cal-season-tone-/);
  assert.match(calendar, /cal-season-boundary/);
  assert.match(calendar, /getDietPlan\(k\)/);
  assert.match(seasonsCss, /\.cal-workout-surface-home \.cal-workout-cell\.cal-season-tone-1/);
  assert.match(runtimeAssets, /\.\/styles\/features\/seasons\.css/);
  assert.match(runtimeAssets, /\.\/data\/season-model\.js/);
  assert.match(sw, /tomatofarm-v20260713z42-seasons-dashboard3/);
});

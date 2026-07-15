import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('운동 달력은 시즌 관리 버튼·이전 시즌 셀·시즌 상세 배지를 렌더한다', () => {
  const source = read('render-calendar.js');
  const styles = read('styles/features/seasons.css');
  assert.match(source, /data-wt-season-manager/);
  assert.match(source, /cal-workout-cell-season-archived/);
  assert.match(source, /cal-season-start-label/);
  assert.match(source, /cal-day-season-badge/);
  assert.match(styles, /cal-workout-cell-season-archived/);
  assert.doesNotMatch(styles, /cal-workout-cell-season-archived[^}]*opacity\s*:/s);
});

test('시즌 마법사는 여섯 단계와 트랜잭션 저장 진입을 제공한다', () => {
  const source = read('workout/season-manager.js');
  assert.match(source, /기간.*등록 종목.*8\/6\/3.*볼륨·강도.*러닝.*미리보기/s);
  assert.match(source, /createWorkoutSeason/);
  assert.match(source, /w863-original-v1/);
  assert.match(source, /registeredExerciseIds: \[\.\.\._state\.selectedExerciseIds\]/);
  assert.match(source, /action === 'save'.*_save\(\)/s);
});

test('기존 직전 기록·PR API는 현재 시즌 decision cache를 사용한다', () => {
  const api = read('data/data-api.js');
  const expert = read('workout/expert.js');
  assert.match(api, /getVolumeHistory = .*getSeasonDecisionCache\(\)/);
  assert.match(api, /detectPRs = .*getSeasonDecisionCache\(\)/);
  assert.match(api, /getLastSession = .*getSeasonDecisionCache\(excludeDateKey\)/);
  assert.match(expert, /getSeasonDecisionCache as getCache/);
  assert.match(expert, /_getLastSessionCalc\(getCache\(todayKey\)/);
});

test('현재 시즌 성장 보드는 시즌 문서와 활성 보드를 한 트랜잭션으로 함께 저장한다', () => {
  const api = read('data/data-api.js');
  assert.match(api, /const seasonKey = currentSeason \? `season_\$\{currentSeason\.id\}_test_board_v2` : null/);
  assert.match(api, /runTransaction\(db, async \(transaction\) =>/);
  assert.match(api, /if \(seasonRef\) transaction\.set\(seasonRef, \{ value: nextBoard \}\)/);
  assert.match(api, /transaction\.set\(activeRef, \{ value: nextBoard \}\)/);
  assert.match(api, /if \(seasonKey\) _settings\[seasonKey\] = merged/);
});

test('Android에는 신규 시즌 위젯만 남고 구형 REST 위젯과 API key 경로가 없다', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const main = read('android/app/src/main/java/com/lifestreak/app/MainActivity.java');
  assert.match(manifest, /SeasonDashboardWidget/);
  assert.match(manifest, /season_dashboard_widget_info/);
  assert.doesNotMatch(manifest, /StreakWidget|WeekWidget|MonthWidget/);
  assert.match(main, /SeasonWidgetPlugin/);
  for (const legacy of [
    'android/app/src/main/java/com/lifestreak/app/widget/StreakWidget.kt',
    'android/app/src/main/java/com/lifestreak/app/widget/WeekWidget.kt',
    'android/app/src/main/java/com/lifestreak/app/widget/MonthWidget.kt',
    'android/app/src/main/java/com/lifestreak/app/widget/WidgetUtils.kt',
  ]) assert.equal(existsSync(new URL(`../${legacy}`, import.meta.url)), false);
  const provider = read('android/app/src/main/java/com/lifestreak/app/widget/SeasonDashboardWidget.kt');
  const plugin = read('android/app/src/main/java/com/lifestreak/app/widget/SeasonWidgetPlugin.kt');
  assert.doesNotMatch(`${provider}\n${plugin}`, /firestore\.googleapis\.com|AIza/);
  assert.match(provider, /STALE_AFTER_MS/);
  assert.match(provider, /widget_running_progress/);
  assert.match(provider, /widget_strength_progress/);
});

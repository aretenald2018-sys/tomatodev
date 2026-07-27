import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
const activity = readFileSync('android/app/src/main/java/com/lifestreak/app/MainActivity.java', 'utf8');
const app = readFileSync('app.js', 'utf8');
const deepLinkEntry = readFileSync('app/deep-link-entry.js', 'utf8');
const gradle = readFileSync('android/app/build.gradle', 'utf8');

test('TomatoDev exposes the dashboard module deep-link contract', () => {
  assert.match(manifest, /android:scheme="tomatodev"/);
  assert.match(manifest, /android:host="diet"[\s\S]*android:pathPrefix="\/today"/);
  assert.match(manifest, /android:host="workout"[\s\S]*android:pathPrefix="\/season"/);
  assert.match(manifest, /android:host="workout"[\s\S]*android:pathPrefix="\/season-overview"/);
  assert.match(manifest, /android:host="workout"[\s\S]*android:pathPrefix="\/running"/);
  assert.match(activity, /"diet"\.equals\(host\)[\s\S]*return "diet"/);
  assert.match(activity, /"workout"\.equals\(host\)[\s\S]*"\/season"\.equals\(path\)[\s\S]*"\/season-overview"\.equals\(path\)[\s\S]*return "season-overview"/);
  assert.match(activity, /"workout"\.equals\(host\)[\s\S]*"\/running"\.equals\(path\)[\s\S]*return "running"/);
});

test('dashboard destinations open their exact TomatoDev screens', () => {
  assert.match(deepLinkEntry, /action === 'diet'[\s\S]*_switchTab\('diet'\)/);
  assert.match(deepLinkEntry, /action === 'season' \|\| action === 'season-overview'[\s\S]*_switchTab\('workout'\)[\s\S]*openWorkoutSeasonOverview/);
  assert.match(deepLinkEntry, /action === 'running'[\s\S]*_switchTab\('workout'\)[\s\S]*wtOpenRunningSession\(\)/);
  assert.match(deepLinkEntry, /\['diet', 'diet-input', 'season', 'season-overview', 'running', 'workout-goal'\]\.includes\(entry\)/);
});

test('widget value sections open the screen that inputs that value', () => {
  const metricWidgets = readFileSync('android/app/src/main/java/com/lifestreak/app/widget/TomatoMetricWidgets.kt', 'utf8');
  const calendar = readFileSync('render-calendar.js', 'utf8');
  const mealModel = readFileSync('diet/meal-model.js', 'utf8');

  // 식단 칸 → 지금 시간대 끼니 입력, 헬스 목표 칸 → 목표입력 시트.
  assert.match(metricWidgets, /FoodIntakeWidget::class\.java -> Quadruple\("food", "일일 음식 섭취", "diet-input", 0\)/);
  assert.match(metricWidgets, /HealthGoalWidget::class\.java -> Quadruple\("strength", "주간 헬스 목표", "workout-goal", 1\)/);
  assert.match(metricWidgets, /R\.id\.tomato_dashboard_food_root,\s*openIntent\(context, "diet-input"/);
  assert.match(metricWidgets, /R\.id\.tomato_dashboard_strength_root,\s*openIntent\(context, "workout-goal"/);
  // 러닝 칸은 이미 측정 화면으로 들어가므로 그대로 둔다.
  assert.match(metricWidgets, /R\.id\.tomato_dashboard_running_root,\s*openIntent\(context, "running"/);

  // 네이티브가 새 액션을 통과시키지 않으면 위젯 탭이 조용히 무시된다.
  assert.match(activity, /"diet-input"\.equals\(action\)/);
  assert.match(activity, /"workout-goal"\.equals\(action\)/);
  assert.match(activity, /"diet"\.equals\(host\) && "\/input"\.equals\(path\)\) return "diet-input"/);
  assert.match(activity, /"workout"\.equals\(host\) && "\/goal"\.equals\(path\)\) return "workout-goal"/);
  assert.match(manifest, /android:host="diet"[\s\S]*android:pathPrefix="\/input"/);
  assert.match(manifest, /android:host="workout"[\s\S]*android:pathPrefix="\/goal"/);

  // 웹 진입점도 같은 화면을 연다.
  assert.match(deepLinkEntry, /action === 'diet-input'[\s\S]*_switchTab\('diet'\)[\s\S]*openNutritionSearch\(mealForHour\(new Date\(\)\.getHours\(\)\)\)/);
  assert.match(deepLinkEntry, /action === 'workout-goal'[\s\S]*_switchTab\('workout'\)[\s\S]*openWorkoutGoalInput\(\)/);
  // 구버전 APK가 보내는 기존 액션도 계속 동작해야 한다.
  assert.match(deepLinkEntry, /action === 'diet'[\s\S]*_switchTab\('diet'\)/);
  assert.match(deepLinkEntry, /calendarModule\.openWorkoutSeasonOverview\?\.\(\)/);

  assert.match(calendar, /export function openWorkoutGoalInput\(weekStart = ''\)/);
  assert.match(calendar, /_openWorkoutGoalInputSheet\(weekStart\)/);
  assert.match(mealModel, /export function mealForHour\(hour\)/);
});

test('the distributable TomatoDev APK keeps the dev id and an ever-increasing version', () => {
  assert.match(gradle, /applicationId "com\.lifestreak\.dev"/);
  assert.match(gradle, /versionName "1\.4"/);
  // scripts/build-mobile-apk.mjs가 게시할 때마다 올린다. 값이 뒤로 가면 기기가
  // 다운로드한 APK를 업데이트로 받아들이지 않는다.
  const versionCode = Number(gradle.match(/versionCode (\d+)/)?.[1]);
  assert.ok(versionCode >= 6, `versionCode must not regress below 6, got ${versionCode}`);
});

test('meal slot for the widget entry follows the clock', async () => {
  const { mealForHour } = await import('../diet/meal-model.js');

  assert.equal(mealForHour(7), 'breakfast');
  assert.equal(mealForHour(10), 'breakfast');
  assert.equal(mealForHour(12), 'lunch');
  assert.equal(mealForHour(15), 'lunch');
  assert.equal(mealForHour(18), 'dinner');
  assert.equal(mealForHour(21), 'dinner');
  // 식사 시간대 밖은 간식으로 보낸다.
  assert.equal(mealForHour(23), 'snack');
  assert.equal(mealForHour(2), 'snack');
  assert.equal(mealForHour(3), 'snack');
  // 잘못된 값도 입력 화면은 열려야 한다.
  assert.equal(mealForHour(NaN), 'snack');
  assert.equal(mealForHour(-1), 'snack');
  assert.equal(mealForHour(24), 'snack');
  assert.equal(mealForHour(undefined), 'snack');
});

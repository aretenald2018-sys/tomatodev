import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
const activity = readFileSync('android/app/src/main/java/com/lifestreak/app/MainActivity.java', 'utf8');
const app = readFileSync('app.js', 'utf8');
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
  assert.match(app, /action === 'diet'[\s\S]*switchTab\('diet'\)/);
  assert.match(app, /action === 'season' \|\| action === 'season-overview'[\s\S]*switchTab\('workout'\)[\s\S]*openWorkoutSeasonOverview/);
  assert.match(app, /action === 'running'[\s\S]*switchTab\('workout'\)[\s\S]*wtOpenRunningSession\(\)/);
  assert.match(app, /\['diet', 'season', 'season-overview', 'running'\]\.includes\(entry\)/);
});

test('the distributable TomatoDev APK keeps the dev id and an ever-increasing version', () => {
  assert.match(gradle, /applicationId "com\.lifestreak\.dev"/);
  assert.match(gradle, /versionName "1\.4"/);
  // scripts/build-mobile-apk.mjs가 게시할 때마다 올린다. 값이 뒤로 가면 기기가
  // 다운로드한 APK를 업데이트로 받아들이지 않는다.
  const versionCode = Number(gradle.match(/versionCode (\d+)/)?.[1]);
  assert.ok(versionCode >= 6, `versionCode must not regress below 6, got ${versionCode}`);
});

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);

function read(relativePath) {
  return readFileSync(new URL(relativePath, root), 'utf8');
}

test('TomatoDev push is fail-closed on web and Capacitor/native', () => {
  const html = read('index.html');
  const register = read('pwa-register.js');
  const fcm = read('pwa-fcm.js');
  const socialData = read('data/data-social-interact.js');
  const messagingWorker = read('firebase-messaging-sw.js');
  const androidBuild = read('android/app/build.gradle');
  const packageJson = JSON.parse(read('package.json'));
  const manifest = JSON.parse(read('manifest.json'));

  assert.match(html, /<html[^>]*data-environment="tomatodev"[^>]*data-web-fcm="disabled"/);
  assert.match(register, /WEB_FCM_ENABLED\s*=\s*document\.documentElement\?\.dataset\?\.webFcm\s*===\s*'enabled'/);
  assert.match(register, /if \(!WEB_FCM_ENABLED \|\| _isLocalDev/);
  assert.match(register, /registration\.scope === FCM_SW_SCOPE_URL/);
  assert.match(register, /WEB_FCM_ENABLED && !_isLocalDev[\s\S]*registerFirebaseMessagingWorker\(\)/);
  assert.match(register, /!WEB_FCM_ENABLED && !_isLocalDev[\s\S]*unregisterTomatoDevMessagingWorker\(\)/);

  assert.match(fcm, /TOMATODEV_FCM_DISABLED_RESULT\s*=\s*Object\.freeze\(\{[\s\S]*reason:\s*'tomatodev-fcm-disabled'/);
  assert.match(fcm, /export async function initFCM\(\)\s*{\s*return TOMATODEV_FCM_DISABLED_RESULT;\s*}/);
  assert.doesNotMatch(fcm, /PushNotifications|requestPermissions|getMessaging|getToken|saveFcmToken|FCM_PERMISSION_STORAGE_KEY|Notification\.permission/);

  assert.match(socialData, /export async function saveFcmToken\(_token\)\s*{\s*return TOMATODEV_FCM_DISABLED_RESULT;\s*}/);
  assert.match(socialData, /export async function removeFcmToken\(_token\)\s*{\s*return TOMATODEV_FCM_DISABLED_RESULT;\s*}/);
  assert.doesNotMatch(socialData, /_isFcmTokenWriteEnabled|_fcm_tokens|_simpleHash\(token\)/);

  assert.match(messagingWorker, /self\.registration\.unregister\(\)/);
  assert.match(messagingWorker, /event\.waitUntil\(self\.skipWaiting\(\)\)/);
  assert.doesNotMatch(messagingWorker, /firebase-app|firebase-messaging|exercise-management|vapid/i);
  assert.equal(manifest.gcm_sender_id, undefined);
  assert.equal(packageJson.dependencies?.['@capacitor/push-notifications'], undefined);
  assert.doesNotMatch(androidBuild, /com\.google\.gms\.google-services|google-services\.json/);
});

test('TomatoDev never exposes or downloads the production mobile APK', () => {
  const html = read('index.html');
  const app = read('app.js');
  const buildInfo = read('utils/build-info.js');
  const workflow = read('.github/workflows/deploy.yml');

  assert.equal(existsSync(new URL('public/downloads/tomato-mobile-debug.apk', root)), false);
  assert.doesNotMatch(html, /tomato-mobile-debug\.apk/);
  assert.doesNotMatch(app, /tomato-mobile-debug\.apk/);
  assert.doesNotMatch(buildInfo, /tomato-mobile-debug\.apk/);
  assert.doesNotMatch(buildInfo, /github\.io\/tomatofarm/);
  assert.doesNotMatch(workflow, /tomato-mobile-debug\.apk/);
});

test('TomatoDev publishes only its own dev APK under the dev application id', () => {
  const html = read('index.html');
  const app = read('app.js');
  const buildInfo = read('utils/build-info.js');
  const gitignore = read('.gitignore');
  const androidBuild = read('android/app/build.gradle');
  const packageJson = JSON.parse(read('package.json'));

  assert.match(androidBuild, /applicationId "com\.lifestreak\.dev"/);
  assert.match(html, /data-app-action="install-apk"[\s\S]*APK 설치하기/);
  assert.match(app, /case 'install-apk':[\s\S]*requestTomatoApkInstall/);
  assert.match(buildInfo, /TOMATODEV_APK_DOWNLOAD_NAME = 'tomatodev\.apk'/);
  assert.match(buildInfo, /github\.io\/tomatodev\/public\/downloads\/tomatodev\.apk/);
  // 서명키가 매 CI 실행마다 새로 생성되면 업데이트 설치가 서명 불일치로 막힌다.
  // 그래서 배포용 APK는 로컬 debug 키로 빌드해 커밋한다.
  assert.equal(packageJson.scripts?.['build:mobile-apk'], 'node scripts/build-mobile-apk.mjs');
  assert.match(gitignore, /^\*\.apk$/m);
  assert.match(gitignore, /^!public\/downloads\/tomatodev\.apk$/m);
  assert.equal(existsSync(new URL('public/downloads/tomatodev.apk', root)), true);
});

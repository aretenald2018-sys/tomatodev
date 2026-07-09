import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);

function readProjectFile(relativePath) {
  return readFileSync(new URL(relativePath, root), 'utf8');
}

function gitCheckIgnore(relativePath) {
  return spawnSync('git', ['check-ignore', relativePath], {
    cwd: new URL('.', root),
    encoding: 'utf8',
  });
}

function assertOrder(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.notEqual(firstIndex, -1, `${first} should exist`);
  assert.notEqual(secondIndex, -1, `${second} should exist`);
  assert.ok(firstIndex < secondIndex, message);
}

test('phone native plugin can refresh installed watches or open watch install prompt', () => {
  const gitignore = readProjectFile('.gitignore');
  const appGradle = readProjectFile('android/app/build.gradle');
  const mainActivity = readProjectFile('android/app/src/main/java/com/lifestreak/app/MainActivity.java');
  const plugin = readProjectFile('android/app/src/main/java/com/lifestreak/app/wear/TomatoWearAppUpdatePlugin.kt');

  assert.match(gitignore, /!android\/app\/src\/main\/java\/com\/lifestreak\/app\/wear\/TomatoWearAppUpdatePlugin\.kt/);
  assert.match(gitignore, /android\/app\/google-services\.json/);
  assert.match(gitignore, /android\/app\/\*\.jks/);
  assert.match(gitignore, /android\/app\/\*\.keystore/);
  assert.match(gitignore, /!android\/wear\/src\/main\/java\/com\/lifestreak\/wear\/workout\/WearAppRefreshListenerService\.kt/);
  assert.match(gitignore, /!android\/wear\/src\/main\/res\/values\/wear\.xml/);
  assert.equal(gitCheckIgnore('android/app/google-services.json').status, 0);
  assert.equal(gitCheckIgnore('android/app/release.jks').status, 0);
  assert.equal(gitCheckIgnore('android/app/upload.keystore').status, 0);
  assert.equal(gitCheckIgnore('android/app/src/main/res/mipmap-hdpi/ic_launcher.png').status, 0);
  assert.equal(gitCheckIgnore('android/wear/src/main/res/layout/page_workout.xml').status, 1);
  assert.equal(gitCheckIgnore('android/app/build.gradle').status, 1);
  assert.equal(gitCheckIgnore('android/app/src/main/java/com/lifestreak/app/MainActivity.java').status, 1);
  assert.equal(gitCheckIgnore('android/app/src/main/java/com/lifestreak/app/wear/TomatoWearAppUpdatePlugin.kt').status, 1);
  assert.equal(gitCheckIgnore('android/app/src/main/java/com/lifestreak/app/wear/TomatoWearWorkoutBridge.kt').status, 1);
  assert.equal(gitCheckIgnore('android/app/src/main/java/com/lifestreak/app/wear/TomatoWearWorkoutListenerService.kt').status, 1);
  assert.equal(gitCheckIgnore('android/wear/src/main/AndroidManifest.xml').status, 1);
  assert.equal(gitCheckIgnore('android/wear/src/main/java/com/lifestreak/wear/workout/WearAppRefreshListenerService.kt').status, 1);
  assert.equal(gitCheckIgnore('android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt').status, 1);
  assert.equal(gitCheckIgnore('android/wear/src/main/res/values/wear.xml').status, 1);
  assert.match(appGradle, /androidx\.wear:wear-remote-interactions:1\.2\.0/);

  assert.match(mainActivity, /import com\.lifestreak\.app\.wear\.TomatoWearAppUpdatePlugin;/);
  assertOrder(
    mainActivity,
    'registerPlugin(TomatoWearAppUpdatePlugin.class);',
    'super.onCreate(savedInstanceState);',
    'Capacitor plugin must be registered before BridgeActivity onCreate',
  );
  assert.match(mainActivity, /TomatoWearWorkoutBridge\.registerActivity\(this\)/);

  assert.match(plugin, /@CapacitorPlugin\(name = "TomatoWearAppUpdate"\)/);
  assert.match(plugin, /@PluginMethod\s+fun requestRefreshOrInstall\(call: PluginCall\)/);
  assert.match(plugin, /CAPABILITY_WEAR_APP\s*=\s*"tomato_farm_wear_app"/);
  assert.match(plugin, /PATH_APP_REFRESH\s*=\s*"\/tomato\/app\/refresh"/);
  assert.match(plugin, /Wearable\.getNodeClient/);
  assert.match(plugin, /Wearable\.getCapabilityClient/);
  assert.match(plugin, /CapabilityClient\.FILTER_REACHABLE/);
  assert.match(plugin, /Wearable\.getMessageClient/);
  assert.match(plugin, /sendMessage\(/);
  assert.match(plugin, /RemoteActivityHelper/);
  assert.match(plugin, /startRemoteActivity\(intent, node\.id\)/);
  assert.match(plugin, /addListener\(/);
  assert.match(plugin, /future\.get\(\)/);
  assert.match(plugin, /market:\/\/details\?id=com\.lifestreak\.app/);
  assert.match(plugin, /connectedNodes/);
  assert.match(plugin, /installedNodes/);
  assert.match(plugin, /installPrompted/);
});

test('wear app advertises capability and receives app refresh pings', () => {
  const wearXml = readProjectFile('android/wear/src/main/res/values/wear.xml');
  const wearManifest = readProjectFile('android/wear/src/main/AndroidManifest.xml');
  const listener = readProjectFile('android/wear/src/main/java/com/lifestreak/wear/workout/WearAppRefreshListenerService.kt');

  assert.match(wearXml, /android_wear_capabilities/);
  assert.match(wearXml, /<item>tomato_farm_wear_app<\/item>/);

  assert.match(wearManifest, /WearAppRefreshListenerService/);
  assert.match(wearManifest, /com\.google\.android\.gms\.wearable\.MESSAGE_RECEIVED/);
  assert.match(wearManifest, /android\.wearable\.MESSAGE_RECEIVED/);
  assert.match(wearManifest, /android:pathPrefix="\/tomato\/app\/refresh"/);

  assert.match(listener, /WearableListenerService/);
  assert.match(listener, /PATH_APP_REFRESH\s*=\s*"\/tomato\/app\/refresh"/);
  assert.match(listener, /onMessageReceived/);
  assert.match(listener, /MAX_PAYLOAD_BYTES\s*=\s*2048/);
  assert.match(listener, /messageEvent\.data\.take\(MAX_PAYLOAD_BYTES\)/);
  assert.match(listener, /getSharedPreferences/);
  assert.doesNotMatch(listener, /WearExerciseService\.startRun|WearWorkoutDataLayer\.sendRunComplete/);
});

test('manual app refresh invokes native Wear update bridge before page reload', () => {
  const buildInfoJs = readProjectFile('utils/build-info.js');
  const swJs = readProjectFile('sw.js');

  assert.match(buildInfoJs, /TomatoWearAppUpdate/);
  assert.match(buildInfoJs, /requestRefreshOrInstall/);
  assert.match(buildInfoJs, /WEAR_APP_REFRESH_TIMEOUT_MS/);
  assert.match(buildInfoJs, /_requestWearAppRefreshOrInstall/);
  assert.match(buildInfoJs, /requestTomatoApkInstall/);
  assert.match(buildInfoJs, /__requestTomatoApkInstall/);
  assert.match(buildInfoJs, /갤럭시워치 설치 화면/);
  assert.match(buildInfoJs, /native-bridge-unavailable/);
  assert.match(buildInfoJs, /npm\.cmd run install:wear-watch/);
  assert.match(buildInfoJs, /wearRefresh\?\.failures/);
  assertOrder(
    buildInfoJs,
    'await _requestWearAppRefreshOrInstall',
    'const registration = await _resolveLatestAppSWRegistration();',
    'Wear refresh/install request must run before the page reload path',
  );
  assertOrder(
    buildInfoJs,
    'export async function requestTomatoApkInstall',
    'export async function requestTomatoAppRefresh',
    'APK install helper should stay separate from the page reload path',
  );
  assert.match(swJs, /tomatofarm-v20260709z6-life-zone-photo-like-flow/);
});

test('local paired install helper can sideload phone and wear debug APKs', () => {
  const packageJson = readProjectFile('package.json');
  const verifier = readProjectFile('scripts/verify-wear-refresh-adb.mjs');

  assert.match(packageJson, /"install:wear-pair":\s*"node scripts\/verify-wear-refresh-adb\.mjs --mode install"/);
  assert.match(packageJson, /"install:wear-watch":\s*"node scripts\/verify-wear-refresh-adb\.mjs --mode install-watch"/);
  assert.match(verifier, /installPair/);
  assert.match(verifier, /installWatch/);
  assert.match(verifier, /resolveTargetSerials/);
  assert.match(verifier, /resolveWatchSerial/);
  assert.match(verifier, /preferredWatchCandidate/);
  assert.match(verifier, /ro\.build\.characteristics/);
  assert.match(verifier, /classifyDevice/);
  assert.match(verifier, /Galaxy Wearable pairing alone is not enough for adb install/);
  assert.match(verifier, /app-debug\.apk/);
  assert.match(verifier, /wear-debug\.apk/);
  assert.match(verifier, /'install', '-r'/);
  assert.match(verifier, /wear-pair-install-adb-verification\.txt/);
  assert.match(verifier, /phonePackageInstalledAfter/);
  assert.match(verifier, /watchPackageInstalledAfter/);
});

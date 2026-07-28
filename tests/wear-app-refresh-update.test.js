import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
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
  assert.match(plugin, /market:\/\/details\?id=com\.lifestreak\.dev/);
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

test('manual app refresh keeps the native Wear bridge while TomatoDev ships only its own APK', () => {
  const buildInfoJs = readProjectFile('utils/build-info.js');
  const wearRefreshJs = readProjectFile('utils/wear-refresh.js');
  const apkInstallJs = readProjectFile('utils/apk-install.js');
  const appJs = readProjectFile('app.js');
  const gitignore = readProjectFile('.gitignore');
  const swJs = readProjectFile('sw.js') + readProjectFile('runtime-assets.js');

  assert.match(wearRefreshJs, /TomatoWearAppUpdate/);
  assert.match(wearRefreshJs, /requestRefreshOrInstall/);
  assert.match(wearRefreshJs, /WEAR_APP_REFRESH_TIMEOUT_MS/);
  assert.match(wearRefreshJs, /requestWearAppRefreshOrInstall/);
  assert.match(buildInfoJs, /requestTomatoApkInstall/);
  assert.match(buildInfoJs, /__requestTomatoApkInstall/);
  assert.match(apkInstallJs, /_startTomatodevApkDownload/);
  assert.doesNotMatch(buildInfoJs + wearRefreshJs + apkInstallJs, /tomato-mobile-debug\.apk/);
  assert.doesNotMatch(appJs, /public\/downloads\/tomato-mobile-debug\.apk/);
  assert.doesNotMatch(appJs, /public\/downloads\/tomato-wear-debug\.apk/);
  assert.match(gitignore, /^\*\.apk$/m);
  assert.match(gitignore, /^!public\/downloads\/tomatodev\.apk$/m);
  // 개발용 워치 앱은 스토어에 없다. 설치 화면을 열었다고 말하면 거짓이 된다.
  assert.match(wearRefreshJs, /install:wear-watch/);
  assert.doesNotMatch(wearRefreshJs, /갤럭시워치 설치 화면을 열었어요/);
  assert.equal(existsSync(new URL('../public/downloads/tomato-mobile-debug.apk', import.meta.url)), false);
  assert.equal(existsSync(new URL('../public/downloads/tomato-wear-debug.apk', import.meta.url)), false);
  assert.equal(existsSync(new URL('../public/downloads/tomatodev.apk', import.meta.url)), true);
  assertOrder(
    buildInfoJs,
    'await requestWearAppRefreshOrInstall',
    'const registration = await _resolveLatestAppSWRegistration();',
    'Wear refresh/install request must run before the page reload path',
  );
  assert.match(apkInstallJs, /export async function requestTomatoApkInstall/);
  assert.match(buildInfoJs, /export async function requestTomatoAppRefresh/);
  assert.match(swJs, /const CACHE_VERSION = 'tomatodev-v\d{8}z\d+-[^']+';/);
});

test('TomatoDev does not publish the production mobile APK', () => {
  assert.equal(existsSync(new URL('../public/downloads/tomato-mobile-debug.apk', import.meta.url)), false);
});

test('TomatoDev APK helper downloads the dev APK without touching the Wear bridge', async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const toasts = [];
  let nativeWearBridgeCalls = 0;
  const control = {
    disabled: false,
    attrs: {},
    classToggles: [],
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    classList: {
      toggle(name, value) {
        control.classToggles.push({ name, value });
      },
    },
  };

  globalThis.window = {
    showToast(message, duration, type) {
      toasts.push({ message, duration, type });
    },
    Capacitor: {
      Plugins: {
        TomatoWearAppUpdate: {
          requestRefreshOrInstall() {
            nativeWearBridgeCalls += 1;
            throw new Error('APK install should not invoke Wear bridge');
          },
        },
      },
    },
  };
  const anchor = { rel: '', href: '', download: '', style: {}, clicks: 0, click() { this.clicks += 1; }, remove() {} };
  globalThis.document = {
    getElementById() {
      return null;
    },
    createElement() {
      return anchor;
    },
    body: { appendChild() {} },
  };

  try {
    const moduleUrl = new URL(`../utils/build-info.js?mobile-apk-download=${Date.now()}`, import.meta.url);
    const { requestTomatoApkInstall } = await import(moduleUrl.href);
    const result = await requestTomatoApkInstall({ control, source: 'test' });

    assert.equal(result.started, true);
    assert.equal(anchor.clicks, 1);
    assert.equal(anchor.download, 'tomatodev.apk');
    assert.match(result.downloadUrl, /public\/downloads\/tomatodev\.apk$/);
    assert.doesNotMatch(result.downloadUrl, /tomato-mobile-debug\.apk/);
    // APK 다운로드는 갤럭시워치 업데이트 경로를 건드리면 안 된다.
    assert.equal(nativeWearBridgeCalls, 0);
    assert.equal(control.disabled, false);
    assert.equal(control.attrs['aria-busy'], 'false');
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});

// 게시된 APK는 로컬에서 수동으로 빌드해 커밋할 때만 갱신된다. 웹 배포 정보로
// APK를 설명하면 몇 주 전 바이너리가 최신 배포본인 척하게 되므로, APK 자신의
// 빌드 정보를 따로 게시하고 그 값으로만 파일명/캐시 키/최신 여부를 정한다.
test('the published APK manifest describes the APK itself, not the latest web deploy', () => {
  const builder = readProjectFile('scripts/build-mobile-apk.mjs');
  const apkInfo = JSON.parse(readProjectFile('public/downloads/tomatodev-apk-info.json'));

  assert.match(builder, /publishApkInfo/);
  assert.match(builder, /tomatodev-apk-info\.json/);
  assert.match(builder, /tomatodev-wear-apk-info\.json/);
  // versionCode는 범프한 값을 그대로 기록해야 기기에 설치된 버전과 대조할 수 있다.
  assert.match(builder, /versionCodes\.get\(target\.name\)/);
  assert.match(builder, /builtAt: new Date\(\)\.toISOString\(\)/);

  assert.equal(apkInfo.app, 'tomatodev');
  assert.equal(apkInfo.file, 'tomatodev.apk');
  assert.match(apkInfo.cacheVersion, /^tomatodev-v\d{8}z\d+-/);
  assert.match(apkInfo.builtAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(Number.isInteger(apkInfo.versionCode), true);
});

test('APK download names, versions, and warns from the published APK build, not the web deploy', async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const previousRaf = globalThis.requestAnimationFrame;
  const toasts = [];
  const anchor = { rel: '', href: '', download: '', style: {}, clicks: 0, click() { this.clicks += 1; }, remove() {} };

  // APK는 07/22 빌드, 웹은 07/27 배포 — 흔한 실제 상태다.
  const apkInfo = {
    app: 'tomatodev',
    file: 'tomatodev.apk',
    commit: 'aaaaaaaaaaaabbbbbbbbbbbbccccccccccccdddd',
    shortCommit: 'aaaaaaaaaaaa',
    builtAt: '2026-07-22T01:08:51.000Z',
    cacheVersion: 'tomatodev-v20260722z7-widget-card-redesign',
    versionCode: 12,
  };
  const buildInfo = {
    app: 'tomatodev',
    commit: 'ffffffffffff1111111111112222222222223333',
    deployedAt: '2026-07-27T00:26:41.300Z',
    cacheVersion: 'tomatodev-v20260727z7-running-manual-start-slots',
  };

  globalThis.window = {};
  globalThis.requestAnimationFrame = (fn) => { fn(); };
  // 실제 ui/toast.js가 그리는 토스트를 body에서 주워 담는다.
  globalThis.document = {
    getElementById() {
      return null;
    },
    createElement(tag) {
      if (tag === 'a') return anchor;
      return {
        dataset: {},
        style: {},
        textContent: '',
        classList: { add() {}, remove() {} },
        appendChild() {},
        remove() {},
      };
    },
    body: {
      appendChild(element) {
        if (element?.id === 'tds-toast') toasts.push({ type: element.dataset.type, message: element.textContent });
      },
    },
  };
  globalThis.fetch = async (input) => {
    const href = String(input);
    const body = href.includes('tomatodev-apk-info.json') ? apkInfo : buildInfo;
    return { ok: true, async json() { return body; } };
  };

  try {
    const moduleUrl = new URL(`../utils/apk-install.js?apk-manifest=${Date.now()}`, import.meta.url);
    const { requestTomatoApkInstall, tomatodevApkFileName, isTomatodevApkBehindDeploy } = await import(moduleUrl.href);

    // 파일명은 APK 빌드 시각(로컬 시간대)에서 나온다.
    const at = new Date(Date.parse(apkInfo.builtAt));
    const pad = value => String(value).padStart(2, '0');
    const expectedName = `tomatodev-${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`
      + `-${pad(at.getHours())}${pad(at.getMinutes())}.apk`;
    assert.equal(tomatodevApkFileName(apkInfo), expectedName);
    assert.equal(isTomatodevApkBehindDeploy(apkInfo, buildInfo), true);
    assert.equal(isTomatodevApkBehindDeploy(apkInfo, { ...buildInfo, cacheVersion: apkInfo.cacheVersion }), false);

    const result = await requestTomatoApkInstall({ source: 'test' });

    assert.equal(result.started, true);
    assert.equal(result.downloadName, expectedName);
    assert.equal(anchor.download, expectedName);
    // 고정 경로는 브라우저/CDN 캐시가 이전 바이너리를 돌려줄 수 있다.
    assert.match(result.downloadUrl, /public\/downloads\/tomatodev\.apk\?v=aaaaaaaaaaaa$/);
    // 최신 배포판을 담지 않은 APK를 조용히 내려주면 안 된다.
    assert.equal(result.behindDeploy, true);
    assert.equal(toasts.some(toast => toast.type === 'warning' && /최신 배포판보다 이전/.test(toast.message)), true);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
    globalThis.requestAnimationFrame = previousRaf;
  }
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

test('the watch running channel ships a dev wear APK under the dev application id', () => {
  const packageJson = JSON.parse(readProjectFile('package.json'));
  const wearGradle = readProjectFile('android/wear/build.gradle');
  const appGradle = readProjectFile('android/app/build.gradle');
  const builder = readProjectFile('scripts/build-mobile-apk.mjs');
  const verifier = readProjectFile('scripts/verify-wear-refresh-adb.mjs');
  const gitignore = readProjectFile('.gitignore');

  // Wear Data Layer는 applicationId + 서명키가 같은 앱끼리만 전달한다. 워치가
  // 토마토데브 폰 앱에 러닝 기록을 보내려면 워치 앱도 개발용 id여야 한다.
  assert.match(wearGradle, /applicationId "com\.lifestreak\.dev"/);
  assert.match(appGradle, /applicationId "com\.lifestreak\.dev"/);

  assert.equal(packageJson.scripts?.['build:mobile-apk'], 'node scripts/build-mobile-apk.mjs');
  assert.equal(packageJson.scripts?.['build:wear-apk'], 'node scripts/build-mobile-apk.mjs --target wear');

  // 폰만 게시하면 워치 채널이 열리지 않는다. 두 산출물이 같은 명령에서 나온다.
  assert.match(builder, /:app:assembleDebug/);
  assert.match(builder, /:wear:assembleDebug/);
  assert.match(builder, /wear-debug\.apk/);
  assert.match(builder, /public', 'downloads', 'tomatodev-wear\.apk/);
  assert.match(builder, /gradleFile: path\.join\(androidRoot, 'wear', 'build\.gradle'\)/);
  // 워치 APK도 매 게시마다 versionCode가 올라가야 이전 설치본을 교체한다.
  // 게시하는 두 타깃 모두 versionCode를 올려야 기존 설치본을 교체할 수 있다.
  assert.match(builder, /targets\.map\(target => \[target\.name, bumpVersionCode\(target\.gradleFile\)\]\)/);
  // 워치 앱은 Capacitor 웹 자산을 쓰지 않으므로 워치 단독 빌드는 cap:sync를 건너뛴다.
  assert.match(builder, /if \(targets\.some\(target => target\.needsCapSync\)\) run\(npm, \['run', 'cap:sync'\]\)/);

  assert.match(gitignore, /^!public\/downloads\/tomatodev-wear\.apk$/m);

  // 설치 검증이 운영 패키지를 보면 개발용 설치본을 못 찾고 항상 실패한다.
  assert.match(verifier, /const appPackage = 'com\.lifestreak\.dev'/);
  assert.doesNotMatch(verifier, /const appPackage = 'com\.lifestreak\.app'/);
  assert.match(verifier, /publishedWearApk/);
  assert.match(verifier, /existsSync\(builtWearApk\) \? builtWearApk : publishedWearApk/);
});

test('a run saved by either app is read back from one shared owner path', () => {
  const dataSave = readProjectFile('data/data-save.js');
  const dataLoad = readProjectFile('data/data-load.js');
  const routeRepository = readProjectFile('data/data-running-route.js');
  const boundaries = readProjectFile('docs/reference/ENVIRONMENT_BOUNDARIES.md');

  // 워치 인제스트는 앱별이지만 저장된 기록은 한 벌이다. 두 앱이 같은 경로를
  // 읽으므로 어느 앱이 받아 저장했든 양쪽에서 표출된다.
  assert.match(dataSave, /doc\(db, 'users', ownerId, 'workouts', key\)/);
  assert.match(dataLoad, /collection\(db, 'users', ownerId, 'workouts'\)/);
  assert.match(dataLoad, /onSnapshot\(ownerWorkouts/);
  assert.match(dataLoad, /data:workouts-updated/);
  assert.match(routeRepository, /'users', ownerId, 'running_routes'/);
  assert.match(boundaries, /## Watch running records/);
  assert.match(boundaries, /com\.lifestreak\.dev/);
});

test('a watch without the dev app is told to sideload instead of claiming a store screen', async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousRaf = globalThis.requestAnimationFrame;
  const toasts = [];

  function fakeElement() {
    return {
      dataset: {},
      style: {},
      children: [],
      textContent: '',
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {},
      addEventListener() {},
      appendChild(child) { this.children.push(child); },
      remove() {},
    };
  }

  globalThis.requestAnimationFrame = () => 0;
  globalThis.document = {
    body: fakeElement(),
    getElementById: () => null,
    createElement: () => fakeElement(),
  };
  globalThis.document.body.appendChild = (child) => {
    toasts.push(String(child.textContent || ''));
  };
  globalThis.window = {
    __BUILD_INFO: { cacheVersion: 'tomatodev-test', commit: 'abc1234' },
    Capacitor: {
      Plugins: {
        TomatoWearAppUpdate: {
          async requestRefreshOrInstall() {
            // 개발용 워치 앱이 없는 시계: 네이티브는 원격 설치 화면만 시도한다.
            return { connectedNodes: [{ id: 'watch' }], installedNodes: [], refreshSent: 0, installPrompted: 1, failures: [] };
          },
        },
      },
    },
  };

  try {
    const { requestWearAppRefreshOrInstall } = await import(
      `../utils/wear-refresh.js?wear-install-prompt=${process.pid}`
    );
    const result = await requestWearAppRefreshOrInstall({ source: 'manual' });

    assert.equal(Number(result?.installPrompted), 1);
    assert.equal(toasts.length, 1);
    assert.match(toasts[0], /install:wear-watch/);
    assert.doesNotMatch(toasts[0], /설치 화면을 열었어요/);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.requestAnimationFrame = previousRaf;
  }
});

import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// TomatoDev의 개발용 APK(com.lifestreak.dev)를 로컬 debug 키로 빌드해 배포 경로에
// 게시한다. CI 러너는 실행마다 새 debug keystore를 만들어 서명이 달라지므로,
// 다운로드한 APK가 기존 설치본을 업데이트하지 못한다. 서명이 고정되는 로컬
// 빌드만 게시 대상이다.
//
// 폰과 워치 APK를 함께 게시한다. Wear Data Layer는 패키지 단위로 격리되므로,
// 워치가 토마토데브 폰 앱에 러닝 기록을 보내려면 워치에도 같은 applicationId
// (com.lifestreak.dev)와 같은 debug 키로 서명된 워치 앱이 설치돼 있어야 한다.
// 운영 워치 앱(com.lifestreak.app)이 올린 DataItem은 운영 폰 앱만 읽는다.
//
//   node scripts/build-mobile-apk.mjs               # 폰 + 워치
//   node scripts/build-mobile-apk.mjs --target app  # 폰만
//   node scripts/build-mobile-apk.mjs --target wear # 워치만
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const androidRoot = path.join(root, 'android');
const wrapperName = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
const localGradle = path.join(androidRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
// androidRoot 기준 상대 이름으로 부른다. 체크아웃 경로에 공백이 있으면
// `cmd /c "C:\...\gradlew.bat" :app:assembleDebug` 는 cmd가 바깥 따옴표를 벗겨내며
// 깨진다("...는 내부 또는 외부 명령이 아닙니다"). 상대 이름에는 공백이 없다.
const gradle = process.env.TOMATO_GRADLE || (existsSync(localGradle) ? wrapperName : '');
const builtApk = path.join(androidRoot, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const publishedApk = path.join(root, 'public', 'downloads', 'tomatodev.apk');
const builtWearApk = path.join(androidRoot, 'wear', 'build', 'outputs', 'apk', 'debug', 'wear-debug.apk');
const publishedWearApk = path.join(root, 'public', 'downloads', 'tomatodev-wear.apk');

const TARGETS = Object.freeze({
  app: {
    name: 'app',
    surface: 'phone',
    gradleTask: ':app:assembleDebug',
    gradleFile: path.join(androidRoot, 'app', 'build.gradle'),
    builtApk,
    publishedApk,
    // 웹 자산을 www/로 복사한 뒤에만 폰 APK가 최신 화면을 담는다.
    needsCapSync: true,
  },
  wear: {
    name: 'wear',
    surface: 'watch',
    gradleTask: ':wear:assembleDebug',
    gradleFile: path.join(androidRoot, 'wear', 'build.gradle'),
    builtApk: builtWearApk,
    publishedApk: publishedWearApk,
    // 워치 앱은 네이티브 전용이라 Capacitor 웹 자산을 쓰지 않는다.
    needsCapSync: false,
  },
});

function parseTargets(argv) {
  const requested = [];
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    const inline = item.startsWith('--target=') ? item.slice('--target='.length) : '';
    const value = inline || (item === '--target' ? argv[index + 1] : '');
    if (!value) continue;
    if (!inline) index += 1;
    for (const name of value.split(',').map(part => part.trim()).filter(Boolean)) {
      if (name === 'all') {
        requested.push('app', 'wear');
        continue;
      }
      if (!TARGETS[name]) {
        throw new Error(`unknown --target ${name} (use app, wear, or all)`);
      }
      requested.push(name);
    }
  }
  const selected = requested.length ? [...new Set(requested)] : ['app', 'wear'];
  return selected.map(name => TARGETS[name]);
}

// Gradle은 JAVA_HOME이 없으면 즉시 죽는다(exit 9009). 이 워크스테이션에는 별도 JDK가
// 설치돼 있지 않고 Android Studio 번들 JBR만 있으므로, 환경변수가 비어 있을 때만
// 그 JBR을 찾아 쓴다. 이미 JAVA_HOME이 설정돼 있으면 건드리지 않는다.
const JBR_CANDIDATES = [
  process.env.JAVA_HOME,
  'C:\\Program Files\\Android\\Android Studio\\jbr',
  'C:\\Program Files\\Android\\Android Studio Preview\\jbr',
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Android Studio', 'jbr'),
];

function resolveJavaHome() {
  if (process.platform !== 'win32') return process.env.JAVA_HOME || '';
  for (const candidate of JBR_CANDIDATES) {
    if (candidate && existsSync(path.join(candidate, 'bin', 'java.exe'))) return candidate;
  }
  return '';
}

const javaHome = resolveJavaHome();

function run(command, args, cwd = root) {
  const env = javaHome ? { ...process.env, JAVA_HOME: javaHome } : process.env;
  if (process.platform === 'win32') {
    const quote = value => {
      const text = String(value);
      return /[\s&|<>^()]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    };
    execFileSync(process.env.ComSpec || 'cmd.exe', [
      '/d',
      '/c',
      [command, ...args].map(quote).join(' '),
    ], { cwd, stdio: 'inherit', env });
    return;
  }
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    env,
  });
}

// 게시하는 APK는 항상 이전 것보다 versionCode가 커야 안드로이드가 설치본을
// 교체(업데이트)한다. 같은 값으로 다시 올리면 기기에 따라 설치가 거부된다.
function bumpVersionCode(gradleFile) {
  const source = readFileSync(gradleFile, 'utf8');
  const match = source.match(/versionCode\s+(\d+)/);
  if (!match) throw new Error(`versionCode not found in ${gradleFile}`);
  const next = Number(match[1]) + 1;
  writeFileSync(gradleFile, source.replace(/versionCode\s+\d+/, `versionCode ${next}`));
  console.log(`[build-mobile-apk] ${path.relative(root, gradleFile)} versionCode ${match[1]} → ${next}`);
  return next;
}

const targets = parseTargets(process.argv.slice(2));
console.log(`[build-mobile-apk] targets ${targets.map(target => target.name).join(', ')}`);
targets.forEach(target => bumpVersionCode(target.gradleFile));
if (targets.some(target => target.needsCapSync)) run(npm, ['run', 'cap:sync']);
if (!gradle) throw new Error('Android Gradle wrapper is missing. Set TOMATO_GRADLE to a Gradle executable.');
run(gradle, targets.map(target => target.gradleTask), androidRoot);

for (const target of targets) {
  if (!existsSync(target.builtApk)) {
    throw new Error(`Android debug APK missing: ${target.builtApk}`);
  }
  cpSync(target.builtApk, target.publishedApk);
  console.log(`[build-mobile-apk] published ${target.surface} ${path.relative(root, target.publishedApk)}`);
}

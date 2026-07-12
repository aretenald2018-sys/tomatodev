// www 폴더로 웹 앱 파일 복사 (Capacitor용 빌드 스크립트)
import { cpSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import '../runtime-assets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const www  = join(root, 'www');

// www 폴더 초기화
mkdirSync(www, { recursive: true });

// 복사할 파일/폴더 목록
const targets = [
  'index.html', 'build-info.json', 'style.css', 'app.js', 'ai.js', 'config.js', 'data.js',
  'calc.js',
  'expert-mode.css', 'test-mode-v2.css',
  'navigation.js', 'workout-ui.js', 'pwa-fcm.js',
  'fatsecret-api.js', 'sheet.js',
  'feature-login.js', 'pwa-register.js',  // R1: index.html 인라인 스크립트 분리 산출물
  'manifest.json', 'sw.js', 'runtime-assets.js', 'firebase-messaging-sw.js',
  'modal-manager.js',
  'assets',
  ...readdirSync(root).filter(f => f.startsWith('render-') && f.endsWith('.js')),
  ...readdirSync(root).filter(f => f.startsWith('feature-') && f.endsWith('.js')),
  'home',
  'app',
  'workout',
  'admin',
  'calc',
  'data',
  'diet',
  'calendar',
  'stats',
  'utils',
  'modals',
  'ai',      // R3a: ai.js → ai/ 7 모듈 분할. barrel 이 ./ai/*.js 로 re-export 하므로 필수.
  'styles',  // R2: style.css → styles/tokens.css + components.css 분리. index.html 에서 <link> 로드.
  ...readdirSync(root).filter(f => f.startsWith('icon-') && f.endsWith('.png')),
  ...readdirSync(root).filter(f => f.startsWith('screenshot-') && f.endsWith('.png')),
];

// CSV 등 data 파일도 복사
const extraFiles = readdirSync(root).filter(f =>
  f.endsWith('.csv') || f === 'food_db.json'
);
targets.push(...extraFiles);

let copied = 0;
for (const name of targets) {
  const src = join(root, name);
  if (!existsSync(src)) continue;
  try {
    cpSync(src, join(www, name), { recursive: true });
    copied++;
  } catch (e) {
    console.warn(`⚠️  Skip: ${name} — ${e.message}`);
  }
}

console.log(`✅ ${copied}개 파일/폴더를 www/로 복사 완료`);

const missingRuntimeAssets = (globalThis.TOMATO_STATIC_ASSETS || [])
  .map(asset => String(asset).replace(/^\.\//, '').split(/[?#]/, 1)[0])
  .filter(Boolean)
  .filter(asset => !existsSync(join(www, asset)));
if (missingRuntimeAssets.length) {
  throw new Error(`runtime asset copy 누락: ${missingRuntimeAssets.join(', ')}`);
}
console.log(`✅ runtime asset ${globalThis.TOMATO_STATIC_ASSETS.length}개 검증 완료`);

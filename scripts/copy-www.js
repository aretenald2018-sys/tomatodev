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

// SW와 Capacitor가 동일 manifest를 사용한다. `assets` 전체와 설치 스크린샷은
// precache 대상이 아닌 런타임 선택 자산까지 포함해야 하므로 별도 보충 복사한다.
const runtimeAssets = globalThis.TOMATO_STATIC_ASSETS || [];
const manifestTargets = runtimeAssets
  .map(asset => String(asset).replace(/^\.\//, '').split(/[?#]/, 1)[0])
  .filter(Boolean);
const targets = [...new Set([
  ...manifestTargets,
  'sw.js',
  'assets',
  ...readdirSync(root).filter(f => f.startsWith('icon-') && f.endsWith('.png')),
  ...readdirSync(root).filter(f => f.startsWith('screenshot-') && f.endsWith('.png')),
])];

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

const missingRuntimeAssets = runtimeAssets
  .map(asset => String(asset).replace(/^\.\//, '').split(/[?#]/, 1)[0])
  .filter(Boolean)
  .filter(asset => !existsSync(join(www, asset)));
if (missingRuntimeAssets.length) {
  throw new Error(`runtime asset copy 누락: ${missingRuntimeAssets.join(', ')}`);
}
console.log(`✅ runtime asset ${runtimeAssets.length}개 검증 완료`);

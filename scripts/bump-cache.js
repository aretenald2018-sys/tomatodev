// ================================================================
// scripts/bump-cache.js
//   배포 전 Service Worker cache namespace 범프.
//   정적 자산 URL은 runtime-assets.js의 canonical 경로만 사용한다.
//
//   실행: node scripts/bump-cache.js [--desc=<설명>]
//         npm run bump
//         npm run build  (→ bump 이 먼저 돌고 그다음 copy-www)
//
//   개별 query-string 버전 대신 cache namespace 하나만 갱신해 URL 중복과
//   HTML/import/SW 간 버전 드리프트를 방지한다.
// ================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SW_JS      = resolve(ROOT, 'sw.js');

const today = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
})();

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (arg.startsWith('--')) args[arg.slice(2)] = true;
  }
  return args;
}

// ── sw.js: CACHE_VERSION 범프 ────────────────────────────────────
function bumpServiceWorker({ desc } = {}) {
  const src = readFileSync(SW_JS, 'utf8');
  // 예시 매칭 대상: `const CACHE_VERSION = 'tomatodev-v20260421z23-hero-character-mood-r3';`
  const re = /(const\s+CACHE_VERSION\s*=\s*['"])tomatodev-v(\d{8})z(\d+)(?:-([a-z0-9\-]+))?(['"])/i;
  const m = src.match(re);
  if (!m) {
    console.warn('[bump-cache] sw.js 의 CACHE_VERSION 패턴 매칭 실패 — 스킵');
    return { changed: false };
  }
  const [, prefix, oldDate, oldN, oldDesc, quote] = m;
  const newN   = (oldDate === today) ? (parseInt(oldN, 10) + 1) : 1;
  const newDesc = desc || oldDesc || 'cache-bump';
  const newVal = `${prefix}tomatodev-v${today}z${newN}-${newDesc}${quote}`;
  const out = src.replace(re, newVal);
  const changed = out !== src;
  if (changed) writeFileSync(SW_JS, out);
  return { changed, newVersion: `tomatodev-v${today}z${newN}-${newDesc}` };
}

// ── 실행 ─────────────────────────────────────────────────────────
const args = parseArgs();
const swResult   = bumpServiceWorker({ desc: args.desc });

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('[bump-cache] today =', today);
if (swResult.changed) {
  console.log(`[bump-cache] sw.js      → ${swResult.newVersion}`);
} else {
  console.log('[bump-cache] sw.js 변경 없음');
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

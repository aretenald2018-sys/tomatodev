import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const excludedDirectories = new Set([
  '.git', 'node_modules', 'www', 'docs', 'tests', 'assets', 'public', 'android', 'functions', 'scripts', 'tools', 'mockups',
]);

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const absolute = resolve(directory, entry);
    const projectPath = relative(root, absolute).replaceAll('\\', '/');
    const top = projectPath.split('/')[0];
    if (statSync(absolute).isDirectory()) {
      if (!excludedDirectories.has(top)) files.push(...walk(absolute));
      continue;
    }
    files.push({
      path: projectPath,
      source: readFileSync(absolute, 'utf8'),
      extension: extname(entry),
    });
  }
  return files;
}

const runtimeFiles = walk(root);
const jsFiles = runtimeFiles.filter((file) => file.extension === '.js');
const cssFiles = runtimeFiles.filter((file) => file.extension === '.css');

function countMatches(files, expression) {
  return files.reduce((sum, file) => sum + (file.source.match(expression) || []).length, 0);
}

test('runtime Firebase access debt is explicit and cannot spread to another UI module', () => {
  const allowedDebt = new Set([]);
  const boundaryPattern = /firebase-firestore\.js|(?:from\s+|import\()['"][^'"]*data\/data-core\.js['"]/;
  const offenders = jsFiles
    .filter((file) => boundaryPattern.test(file.source))
    .map((file) => file.path)
    .filter((path) => path !== 'data.js' && !path.startsWith('data/'));

  assert.deepEqual(offenders.sort(), [...allowedDebt].sort(),
    'Phase 1에서 허용 목록을 0으로 줄여야 하며 신규 UI Firestore 접근은 금지');
});

test('inline event handler debt cannot grow above the Phase 0 baseline', () => {
  const uiFiles = runtimeFiles.filter((file) => (
    file.path === 'index.html' || /^(admin|home|modals|workout)\//.test(file.path)
  ));
  const count = countMatches(uiFiles, /on(?:click|change|input|submit|touchstart|touchend)=/g);
  assert.ok(count <= 275, `inline handler debt ${count} exceeds Phase 2 baseline 275`);
});

test('window global assignment debt cannot grow above the Phase 0 baseline', () => {
  const count = countMatches(jsFiles, /window\.[A-Za-z_$][A-Za-z0-9_$]*\s*=/g);
  assert.ok(count <= 501, `window global debt ${count} exceeds baseline 501`);
});

test('CSS important debt cannot grow above the Phase 0 baseline', () => {
  const counts = cssFiles.map((file) => ({
    path: file.path,
    count: file.source.split('!important').length - 1,
  }));
  const count = counts.reduce((sum, file) => sum + file.count, 0);
  assert.ok(count <= 40,
    `CSS !important debt ${count} exceeds baseline 40: ${JSON.stringify(counts)}`);
});

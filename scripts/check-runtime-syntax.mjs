import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifest = readFileSync(path.join(root, 'runtime-assets.js'), 'utf8');
const assets = [...manifest.matchAll(/'([^']+)'/g)].map(match => match[1]);
const modules = [...new Set(assets
  .filter(asset => asset.endsWith('.js'))
  .map(asset => path.resolve(root, asset.replace(/^\.\//, ''))))];
const manifestModules = new Set(modules.map(modulePath => path.normalize(modulePath)));

function collectRelativeSpecifiers(source) {
  const patterns = [
    /^\s*import\s+(?:[\w*$\s{},]+?\s+from\s+)?['"]([^'"]+)['"]/gm,
    /^\s*export\s+(?:[\w*$\s{},]+?\s+from\s+)['"]([^'"]+)['"]/gm,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  return new Set(patterns.flatMap(pattern => [...source.matchAll(pattern)].map(match => match[1]))
    .filter(specifier => specifier.startsWith('.')));
}

function resolveSpecifier(modulePath, specifier) {
  return path.resolve(path.dirname(modulePath), specifier.split(/[?#]/, 1)[0]);
}

const importErrors = [];

for (const modulePath of modules) {
  execFileSync(process.execPath, ['--check', modulePath], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const source = readFileSync(modulePath, 'utf8');
  for (const specifier of collectRelativeSpecifiers(source)) {
    const target = resolveSpecifier(modulePath, specifier);
    if (!target.startsWith(`${root}${path.sep}`)) {
      importErrors.push(`${path.relative(root, modulePath)} escapes root: ${specifier}`);
    } else if (!existsSync(target)) {
      importErrors.push(`${path.relative(root, modulePath)} missing: ${specifier}`);
    } else if (!manifestModules.has(path.normalize(target))) {
      importErrors.push(`${path.relative(root, modulePath)} not precached: ${specifier}`);
    }
  }
}

if (importErrors.length) throw new Error(`Runtime import graph errors:\n${importErrors.join('\n')}`);

console.log(`[syntax] ok modules=${modules.length} imports=resolved`);

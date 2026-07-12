import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifest = readFileSync(path.join(root, 'runtime-assets.js'), 'utf8');
const assets = [...manifest.matchAll(/'([^']+)'/g)].map(match => match[1]);
const modules = [...new Set(assets
  .filter(asset => asset.endsWith('.js'))
  .map(asset => path.resolve(root, asset.replace(/^\.\//, ''))))];

for (const modulePath of modules) {
  execFileSync(process.execPath, ['--check', modulePath], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });
}

console.log(`[syntax] ok modules=${modules.length}`);

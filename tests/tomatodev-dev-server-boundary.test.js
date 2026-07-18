import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../scripts/dev-start.mjs', import.meta.url), 'utf8');

test('TomatoDev dev launcher never reuses a different Tomato worktree server', () => {
  assert.match(source, /JSON\.parse\(fs\.readFileSync\(path\.join\(root, 'build-info\.json'\)/);
  assert.match(source, /fetchText\(port, '\/build-info\.json'\)/);
  assert.match(source, /servedApp === expectedApp/);
  assert.match(source, /if \(await isHealthyTomatoServer\(port\)\)/);
  assert.match(source, /if \(!\(await isPortAvailable\(port\)\)\)/);
});

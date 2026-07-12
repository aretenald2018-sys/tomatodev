import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const testsRoot = resolve(projectRoot, 'tests');
const allTests = readdirSync(testsRoot)
  .filter((name) => name.endsWith('.test.js'))
  .sort();

const MATCHERS = Object.freeze({
  contracts: /^(architecture-boundaries|refactor-contract-baseline|save-schema|state-namespace|workout-save-mode-guard|running-refactor-boundaries)\.test\.js$/,
  smoke: /^(app-shell-action-bridge|login-action-bridge|home-life-zone-state|diet-add-button-binding|workout-save|workout-calendar-bottom-sheet|running-entry|stats-overall-compact-summary|pwa-update-auto-reload|wear-workout-bridge)\.test\.js$/,
  workout: /^(workout-|running-|wear-|save-schema|state-namespace|test-v2|exercise-|ex-picker|max-)\.?.*\.test\.js$/,
  data: /^(data\.|body-checkins|calc\.|nutrition-|diet-|ai-)\.?.*\.test\.js$/,
});

function selectSuite(name) {
  if (name === 'all') return allTests;
  if (name === 'ui') {
    const domainOwned = new Set([
      ...selectSuite('workout'),
      ...selectSuite('data'),
      ...selectSuite('contracts'),
    ]);
    return allTests.filter((file) => !domainOwned.has(file));
  }
  const matcher = MATCHERS[name];
  if (!matcher) throw new Error(`Unknown test suite: ${name}`);
  return allTests.filter((file) => matcher.test(file));
}

const input = process.argv[2] || 'all';
const listOnly = input === '--list';
const suites = listOnly ? ['contracts', 'smoke', 'workout', 'data', 'ui'] : [input];

if (listOnly) {
  for (const suite of suites) {
    const files = selectSuite(suite);
    process.stdout.write(`${suite} (${files.length})\n`);
    for (const file of files) process.stdout.write(`  ${file}\n`);
  }
  process.exit(0);
}

const files = selectSuite(input);
if (!files.length) throw new Error(`Test suite has no files: ${input}`);

process.stdout.write(`[tests] ${input}: ${files.length} files\n`);
const result = spawnSync(
  process.execPath,
  ['--test', ...files.map((file) => resolve(testsRoot, file))],
  { cwd: projectRoot, stdio: 'inherit' },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);

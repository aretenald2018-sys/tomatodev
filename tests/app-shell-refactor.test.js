import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TAB_IDS, getTabDefinition, isRegisteredTab } from '../app/tab-registry.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [indexHtml, appJs, actionRouter, staticActions, compatibilityBridge, modalManager, swJs] = await Promise.all([
  read('index.html'),
  read('app.js'),
  read('utils/action-router.js'),
  read('app/static-actions.js'),
  read('app/compatibility-bridge.js'),
  read('modal-manager.js'),
  Promise.all([read('sw.js'), read('runtime-assets.js')]).then(parts => parts.join('\n')),
]);

test('tab registry is the single shell definition for every live tab', () => {
  assert.deepEqual(TAB_IDS, ['home', 'diet', 'workout', 'calendar', 'stats', 'cooking', 'admin']);
  assert.equal(getTabDefinition('calendar').module, './render-calendar.js');
  assert.equal(getTabDefinition('admin').adminOnly, true);
  assert.equal(isRegisteredTab('home'), true);
  assert.equal(isRegisteredTab('unknown'), false);
  assert.match(appJs, /getTabDefinition, isRegisteredTab/);
  assert.doesNotMatch(appJs, /document\.getElementById\('tab-' \+ tab\)/);
});

test('static index markup is inline-handler free and routes feature actions by namespace', () => {
  assert.doesNotMatch(indexHtml, /\son(?:click|change|input|submit|keydown|keyup|touchstart|touchend)=/);
  for (const action of [
    'home:open-unit-goal-date',
    'social:open-friend-manager',
    'workout:switch-type',
    'workout:save',
    'diet:upload-photo-ai',
    'diet:run-bulk-upload',
    'cooking:open',
  ]) {
    assert.match(indexHtml, new RegExp(`(?:data-action|data-change-action)="${action}"`));
    assert.match(staticActions, new RegExp(`'${action}'`));
  }
});

test('action router handles click, change, keydown, and double-click with async errors', () => {
  assert.match(actionRouter, /document\.addEventListener\('click', _onClick\)/);
  assert.match(actionRouter, /document\.addEventListener\('change', _onChange\)/);
  assert.match(actionRouter, /document\.addEventListener\('keydown', _onKeydown\)/);
  assert.match(actionRouter, /document\.addEventListener\('dblclick', _onDoubleClick\)/);
  assert.match(actionRouter, /typeof result\.catch === 'function'/);
});

test('legacy app globals are isolated behind an explicit compatibility allowlist', () => {
  assert.match(appJs, /installAppCompatibilityBridge\(\{/);
  assert.doesNotMatch(appJs, /window\.(?:renderAll|switchTab|openGoalModal|openQuestModal)\s*=/);
  assert.match(compatibilityBridge, /APP_COMPATIBILITY_KEYS/);
  assert.match(compatibilityBridge, /Unknown app compatibility keys/);
});

test('modal manager can inject one requested modal without replacing the container', () => {
  assert.match(modalManager, /export async function ensureModal\(id\)/);
  assert.match(modalManager, /container\.insertAdjacentHTML\('beforeend', html\)/);
  assert.doesNotMatch(modalManager, /container\.innerHTML = htmlParts\.join/);
});

test('app shell modules are copied and precached', () => {
  for (const asset of [
    './app/tab-registry.js',
    './app/lazy-loader.js',
    './app/overlay-stack.js',
    './app/static-actions.js',
    './app/compatibility-bridge.js',
  ]) {
    assert.ok(swJs.includes(`'${asset}'`), `${asset} must be precached`);
  }
});

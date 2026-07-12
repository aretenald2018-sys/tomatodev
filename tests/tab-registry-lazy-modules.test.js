import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TAB_REGISTRY } from '../app/tab-registry.js';
import { resolveLazyModuleUrl } from '../app/lazy-loader.js';

test('every registered lazy tab resolves from the lazy-loader to a shipped module', () => {
  for (const definition of Object.values(TAB_REGISTRY)) {
    if (!definition.module) continue;
    const targetUrl = resolveLazyModuleUrl(definition.module);
    const targetPath = fileURLToPath(targetUrl);

    assert.ok(existsSync(targetPath), `${definition.id} resolves to missing module: ${targetUrl}`);
    assert.doesNotMatch(targetUrl, /\/app\/render-/,
      `${definition.id} must resolve from app/lazy-loader.js to the root render module`);
  }
});

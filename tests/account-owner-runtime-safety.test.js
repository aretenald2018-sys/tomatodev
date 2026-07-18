import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const coreSource = readFileSync(new URL('../data/data-core.js', import.meta.url), 'utf8');

function sliceBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, `missing end token: ${endToken}`);
  return source.slice(start, end);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function createCoreWriteHarness({ settings = {}, setDoc, docFactory } = {}) {
  const fbOpSource = sliceBetween(
    coreSource,
    'export async function _fbOp',
    '// ── 설정 저장 헬퍼',
  ).replace('export async function _fbOp', 'async function _fbOp');
  const saveSettingSource = sliceBetween(
    coreSource,
    'export async function _saveSetting',
    '// ── localStorage 마이그레이션',
  ).replace('export async function _saveSetting', 'async function _saveSetting');

  return new Function(
    '_settings',
    'setDoc',
    '_doc',
    '_setSyncStatus',
    '_runSerialized',
    'requireTomatoDevFirebaseAuth',
    'console',
    `${fbOpSource}\n${saveSettingSource}\nreturn { _fbOp, _saveSetting };`,
  )(
    settings,
    setDoc || (() => Promise.resolve()),
    docFactory || ((name, id) => ({ name, id })),
    () => {},
    async (_key, operation) => operation(),
    async () => ({ uid: 'tomatodev-owner-test' }),
    { error() {} },
  );
}

test('_fbOp always propagates an unresolved shared-owner fence', async () => {
  const harness = createCoreWriteHarness();
  const unresolved = new Error('owner unresolved');
  unresolved.code = 'ACCOUNT_DATA_OWNER_UNRESOLVED';

  await assert.rejects(
    harness._fbOp('blocked', async () => { throw unresolved; }),
    (error) => error === unresolved,
  );

  const ordinary = new Error('background network failure');
  assert.equal(
    await harness._fbOp('legacy-background', async () => { throw ordinary; }),
    undefined,
  );
});

test('_saveSetting publishes memory only after the remote write succeeds', async () => {
  const settings = { sample: 'previous' };
  const write = deferred();
  const harness = createCoreWriteHarness({
    settings,
    setDoc: () => write.promise,
  });

  const saving = harness._saveSetting('sample', 'next');
  await Promise.resolve();
  assert.equal(settings.sample, 'previous');
  write.resolve();
  await saving;
  assert.equal(settings.sample, 'next');
});

test('_saveSetting preserves memory on remote or unresolved-owner failure', async () => {
  const remoteSettings = { sample: 'previous' };
  const remoteFailure = new Error('write failed');
  const remoteHarness = createCoreWriteHarness({
    settings: remoteSettings,
    setDoc: async () => { throw remoteFailure; },
  });
  await assert.rejects(
    remoteHarness._saveSetting('sample', 'next'),
    (error) => error === remoteFailure,
  );
  assert.equal(remoteSettings.sample, 'previous');

  const ownerSettings = { sample: 'previous' };
  const unresolved = new Error('owner unresolved');
  unresolved.code = 'ACCOUNT_DATA_OWNER_UNRESOLVED';
  const ownerHarness = createCoreWriteHarness({
    settings: ownerSettings,
    docFactory: () => { throw unresolved; },
  });
  await assert.rejects(
    ownerHarness._saveSetting('sample', 'next'),
    (error) => error === unresolved,
  );
  assert.equal(ownerSettings.sample, 'previous');
});

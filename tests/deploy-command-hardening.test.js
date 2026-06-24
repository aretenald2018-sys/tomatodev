import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const verifyDeploy = await readFile(new URL('../scripts/verify-deploy.mjs', import.meta.url), 'utf8');
const verifyMarkers = await readFile(new URL('../scripts/verify-deployed-markers.mjs', import.meta.url), 'utf8');
const deployDashboard3 = await readFile(new URL('../scripts/deploy-dashboard3.mjs', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('verify-deploy resolves git refs such as HEAD before comparing deployed commit', () => {
  assert.match(verifyDeploy, /function resolveExpectedCommit\(input\)/);
  assert.match(verifyDeploy, /git\(\['rev-parse', raw\]\) \|\| raw/);
  assert.match(verifyDeploy, /const expectedCommit = resolveExpectedCommit\(expectedCommitInput\)/);
  assert.match(verifyDeploy, /function commitMatches\(deployedCommit, expectedCommit\)/);
});

test('verify-deploy retries stale Pages commit mismatches inside the deploy wait loop', () => {
  const waitStart = verifyDeploy.indexOf('async function waitForDeploySnapshot()');
  assert.ok(waitStart >= 0, 'waitForDeploySnapshot should exist');
  const waitBody = verifyDeploy.slice(waitStart, verifyDeploy.indexOf('const { buildInfo, swText }', waitStart));

  assert.match(waitBody, /for \(let attempt = 0; attempt <= deployRetries; attempt \+= 1\)/);
  assert.match(waitBody, /deployed commit mismatch/);
  assert.match(waitBody, /if \(attempt < deployRetries\) await sleep\(deployDelayMs\)/);
  assert.doesNotMatch(waitBody, /fetchText\('build-info\.json', \{ retries: 24/);
});

test('deployed marker verification is a script, not PowerShell node -e quoting', () => {
  assert.match(verifyMarkers, /Usage: node scripts\/verify-deployed-markers\.mjs/);
  assert.match(verifyMarkers, /const sep = raw\.indexOf\('::'\)/);
  assert.match(verifyMarkers, /text\.includes\(marker\)/);
  assert.equal(packageJson.scripts['verify:deployed-markers'], 'node scripts/verify-deployed-markers.mjs');
});

test('Dashboard3 deploy wrapper pushes, verifies by resolved SHA, checks markers, and restores build-info', () => {
  assert.match(deployDashboard3, /git\(\['push', remote, `HEAD:\$\{remoteRef\}`\]/);
  assert.match(deployDashboard3, /git\(\['rev-parse', 'HEAD'\]\)/);
  assert.match(deployDashboard3, /verify-deploy\.mjs/);
  assert.match(deployDashboard3, /verify-deployed-markers\.mjs/);
  assert.match(deployDashboard3, /restoreTrackedBuildInfo\(\)/);
  assert.equal(packageJson.scripts['deploy:dashboard3'], 'node scripts/deploy-dashboard3.mjs');
});

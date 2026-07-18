import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const verifyDeploy = await readFile(new URL('../scripts/verify-deploy.mjs', import.meta.url), 'utf8');
const verifyMarkers = await readFile(new URL('../scripts/verify-deployed-markers.mjs', import.meta.url), 'utf8');
const deployDevelopment = await readFile(new URL('../scripts/deploy-development.mjs', import.meta.url), 'utf8');
const repositoryBoundary = await readFile(new URL('../scripts/repository-boundary.mjs', import.meta.url), 'utf8');
const repositoryCheck = await readFile(new URL('../scripts/check-repository-boundary.mjs', import.meta.url), 'utf8');
const pagesWorkflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const prePush = await readFile(new URL('../.githooks/pre-push', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const { assertTomatodevPushTarget, repositoryFromRemoteUrl } = await import('../scripts/repository-boundary.mjs');

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
  assert.match(waitBody, /buildInfo\.app === EXPECTED_APP/);
  assert.match(waitBody, /deployed app mismatch/);
  assert.match(waitBody, /if \(attempt < deployRetries\) await sleep\(deployDelayMs\)/);
  assert.doesNotMatch(waitBody, /fetchText\('build-info\.json', \{ retries: 24/);
});

test('verify-deploy rejects a Pages artifact without the TomatoDev HTML marker', () => {
  assert.match(verifyDeploy, /const EXPECTED_APP = 'tomatodev'/);
  assert.match(verifyDeploy, /data-environment=\["'\]tomatodev\["'\]/);
  assert.match(verifyDeploy, /index\.html TomatoDev environment marker missing/);
});

test('deployed marker verification is a script, not PowerShell node -e quoting', () => {
  assert.match(verifyMarkers, /Usage: node scripts\/verify-deployed-markers\.mjs/);
  assert.match(verifyMarkers, /const sep = raw\.indexOf\('::'\)/);
  assert.match(verifyMarkers, /text\.includes\(marker\)/);
  assert.equal(packageJson.scripts['verify:deployed-markers'], 'node scripts/verify-deployed-markers.mjs');
});

test('development deploy is locked to the TomatoDev repository, branch, and Pages URL', () => {
  assert.match(repositoryBoundary, /TOMATODEV_REPOSITORY = 'aretenald2018-sys\/tomatodev'/);
  assert.match(repositoryBoundary, /TOMATODEV_REMOTE = 'origin'/);
  assert.match(repositoryBoundary, /TOMATODEV_BRANCH = 'main'/);
  assert.match(repositoryBoundary, /TOMATODEV_PAGES_URL = 'https:\/\/aretenald2018-sys\.github\.io\/tomatodev\/'/);
  assert.match(deployDevelopment, /git\(\['remote', 'get-url', remote\]\)/);
  assert.match(deployDevelopment, /git\(\['remote', 'get-url', '--push', remote\]\)/);
  assert.match(deployDevelopment, /assertTomatodevPushTarget\(remote, fetchUrl\)/);
  assert.match(deployDevelopment, /assertTomatodevPushTarget\(remote, pushUrl\)/);
  assert.match(deployDevelopment, /git\(\['status', '--porcelain=v1', '--untracked-files=normal'\]\)/);
  assert.match(deployDevelopment, /currentBranch !== remoteRef/);
  assert.match(deployDevelopment, /git\(\['push', remote, remoteRef\]/);
  assert.match(deployDevelopment, /verify-deploy\.mjs/);
  assert.match(deployDevelopment, /verify-deployed-markers\.mjs/);
  assert.equal(packageJson.scripts['deploy:dev'], 'node scripts/deploy-development.mjs');
  assert.equal(packageJson.scripts['deploy:production'], undefined);
  assert.equal(packageJson.scripts['deploy:dashboard3'], undefined);
});

test('Pages workflow is locked to TomatoDev main and excludes backend deployment', () => {
  assert.match(pagesWorkflow, /github\.repository == 'aretenald2018-sys\/tomatodev'/);
  assert.match(pagesWorkflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(pagesWorkflow, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(pagesWorkflow, /firebase\s+deploy|deploy[^\n]*functions|functions[^\n]*deploy/iu);
});

test('pre-push hook blocks cross-environment remotes', () => {
  assert.match(prePush, /check-push-target\.mjs/);
  assert.match(repositoryBoundary, /blocked cross-environment push/);
  assert.match(repositoryCheck, /get-url', '--push'/);
  assert.match(repositoryCheck, /assertTomatodevPushTarget\(TOMATODEV_REMOTE, pushUrl\)/);
  assert.equal(
    packageJson.scripts['check:repository'],
    'node scripts/check-repository-boundary.mjs && node scripts/check-project-governance.mjs',
  );
  assert.equal(repositoryFromRemoteUrl('git@github.com:aretenald2018-sys/tomatodev.git'), 'aretenald2018-sys/tomatodev');
  assert.doesNotThrow(() => assertTomatodevPushTarget('origin', 'https://github.com/aretenald2018-sys/tomatodev.git'));
  assert.throws(
    () => assertTomatodevPushTarget('origin', 'https://github.com/aretenald2018-sys/tomatofarm.git'),
    /blocked cross-environment push/,
  );
  assert.throws(
    () => assertTomatodevPushTarget('dashboard3', 'https://github.com/aretenald2018-sys/dashboard3.git'),
    /blocked cross-environment push/,
  );
});

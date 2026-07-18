import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TOMATODEV_BRANCH,
  TOMATODEV_PAGES_URL,
  TOMATODEV_REMOTE,
  assertTomatodevPushTarget,
} from './repository-boundary.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = TOMATODEV_PAGES_URL;
const remote = TOMATODEV_REMOTE;
const remoteRef = TOMATODEV_BRANCH;

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
  });
  return typeof output === 'string' ? output.trim() : '';
}

function git(args, options = {}) {
  return run('git', args, options);
}

function scriptPath(name) {
  return path.join(root, 'scripts', name);
}

function assertCleanTree() {
  const dirty = git(['status', '--porcelain=v1', '--untracked-files=normal']);
  if (dirty) {
    throw new Error(`working tree has uncommitted or untracked files:\n${dirty}`);
  }
}

function readCacheVersion() {
  const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');
  return sw.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1] || '';
}

const fetchUrl = git(['remote', 'get-url', remote]);
const pushUrl = git(['remote', 'get-url', '--push', remote]);
assertTomatodevPushTarget(remote, fetchUrl);
assertTomatodevPushTarget(remote, pushUrl);
assertCleanTree();

const currentBranch = git(['branch', '--show-current']);
if (currentBranch !== remoteRef) {
  throw new Error(
    `development deployment requires checked-out ${remoteRef}; current branch is ${currentBranch || '(detached HEAD)'}`,
  );
}

const head = git(['rev-parse', 'HEAD']);
const shortHead = git(['rev-parse', '--short=12', 'HEAD']);
console.log(`[deploy-development] push ${shortHead} -> ${remote}/${remoteRef}`);
git(['push', remote, remoteRef], { stdio: 'inherit' });

console.log(`[deploy-development] verify deploy ${shortHead}`);
run(process.execPath, [scriptPath('verify-deploy.mjs'), baseUrl, head], { stdio: 'inherit' });

const cacheVersion = readCacheVersion();
const markerArgs = [
  `${baseUrl}`,
  'index.html::app.js',
  'app.js::initBuildInfoSurface',
  `sw.js::${cacheVersion}`,
];

console.log('[deploy-development] verify deployed markers');
run(process.execPath, [scriptPath('verify-deployed-markers.mjs'), ...markerArgs], { stdio: 'inherit' });

console.log(`[deploy-development] ok ${shortHead} ${cacheVersion}`);

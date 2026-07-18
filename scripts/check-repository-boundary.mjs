import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TOMATODEV_REMOTE,
  assertTomatodevPushTarget,
} from './repository-boundary.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

const remotes = git(['remote']).split(/\r?\n/u).filter(Boolean);
if (remotes.length !== 1 || remotes[0] !== TOMATODEV_REMOTE) {
  throw new Error(
    `repository boundary violation: expected only remote "${TOMATODEV_REMOTE}", found ${remotes.join(', ') || '(none)'}`,
  );
}

const fetchUrl = git(['remote', 'get-url', TOMATODEV_REMOTE]);
const pushUrl = git(['remote', 'get-url', '--push', TOMATODEV_REMOTE]);
assertTomatodevPushTarget(TOMATODEV_REMOTE, fetchUrl);
assertTomatodevPushTarget(TOMATODEV_REMOTE, pushUrl);
console.log(`[repository-boundary] ok ${TOMATODEV_REMOTE} fetch=${fetchUrl} push=${pushUrl}`);

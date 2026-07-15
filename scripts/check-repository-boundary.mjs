import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TOMATOFARM_REMOTE,
  assertTomatofarmPushTarget,
} from './repository-boundary.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

const remotes = git(['remote']).split(/\r?\n/u).filter(Boolean);
if (remotes.length !== 1 || remotes[0] !== TOMATOFARM_REMOTE) {
  throw new Error(
    `repository boundary violation: expected only remote "${TOMATOFARM_REMOTE}", found ${remotes.join(', ') || '(none)'}`,
  );
}

const remoteUrl = git(['remote', 'get-url', TOMATOFARM_REMOTE]);
assertTomatofarmPushTarget(TOMATOFARM_REMOTE, remoteUrl);
console.log(`[repository-boundary] ok ${TOMATOFARM_REMOTE} ${remoteUrl}`);

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

git(['config', '--local', 'core.hooksPath', '.githooks']);
git(['config', '--local', 'remote.pushDefault', 'origin']);
console.log('[repository-guard] installed .githooks and fixed the default push remote to origin');

export const TOMATOFARM_REPOSITORY = 'aretenald2018-sys/tomatofarm';
export const TOMATOFARM_REMOTE = 'origin';
export const TOMATOFARM_BRANCH = 'main';
export const TOMATOFARM_PAGES_URL = 'https://aretenald2018-sys.github.io/tomatofarm/';

export function repositoryFromRemoteUrl(remoteUrl) {
  const normalized = String(remoteUrl || '')
    .trim()
    .replace(/\\/gu, '/')
    .replace(/\.git$/u, '')
    .replace(/\/$/u, '');

  const match = normalized.match(/github\.com[/:]([^/]+\/[^/]+)$/iu);
  return match?.[1]?.toLowerCase() || '';
}

export function assertTomatofarmPushTarget(remoteName, remoteUrl) {
  const repository = repositoryFromRemoteUrl(remoteUrl);
  if (remoteName !== TOMATOFARM_REMOTE || repository !== TOMATOFARM_REPOSITORY) {
    throw new Error(
      `blocked cross-environment push: ${remoteName || '(unknown)'} ${remoteUrl || '(unknown URL)'}. ` +
      `This checkout may push only to ${TOMATOFARM_REMOTE} (${TOMATOFARM_REPOSITORY}).`,
    );
  }
}

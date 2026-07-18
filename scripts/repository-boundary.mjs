export const TOMATODEV_REPOSITORY = 'aretenald2018-sys/tomatodev';
export const TOMATODEV_REMOTE = 'origin';
export const TOMATODEV_BRANCH = 'main';
export const TOMATODEV_PAGES_URL = 'https://aretenald2018-sys.github.io/tomatodev/';

export function repositoryFromRemoteUrl(remoteUrl) {
  const normalized = String(remoteUrl || '')
    .trim()
    .replace(/\\/gu, '/')
    .replace(/\.git$/u, '')
    .replace(/\/$/u, '');

  const match = normalized.match(/github\.com[/:]([^/]+\/[^/]+)$/iu);
  return match?.[1]?.toLowerCase() || '';
}

export function assertTomatodevPushTarget(remoteName, remoteUrl) {
  const repository = repositoryFromRemoteUrl(remoteUrl);
  if (remoteName !== TOMATODEV_REMOTE || repository !== TOMATODEV_REPOSITORY) {
    throw new Error(
      `blocked cross-environment push: ${remoteName || '(unknown)'} ${remoteUrl || '(unknown URL)'}. ` +
      `This checkout may push only to ${TOMATODEV_REMOTE} (${TOMATODEV_REPOSITORY}).`,
    );
  }
}

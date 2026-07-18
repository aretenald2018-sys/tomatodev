import { assertTomatodevPushTarget } from './repository-boundary.mjs';

const [remoteName, remoteUrl] = process.argv.slice(2);

try {
  assertTomatodevPushTarget(remoteName, remoteUrl);
  console.log(`[push-boundary] ok ${remoteName} ${remoteUrl}`);
} catch (error) {
  console.error(`[push-boundary] ${error.message}`);
  process.exit(1);
}

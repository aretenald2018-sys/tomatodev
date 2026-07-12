export async function runOptimisticSocialAction(options = {}) {
  const {
    apply = () => undefined,
    commit,
    rollback = () => undefined,
    refresh = () => undefined,
    onError = () => undefined,
    reason = 'social-action',
  } = options;

  if (typeof commit !== 'function') throw new TypeError('commit 함수가 필요합니다.');

  const snapshot = await apply();
  try {
    const result = await commit();
    await refresh(reason, result);
    return result;
  } catch (error) {
    await rollback(snapshot, error);
    await refresh(`${reason}:rollback`, error);
    await onError(error);
    throw error;
  }
}

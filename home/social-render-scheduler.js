// Coalesces expensive social surface renders into one frame.

export function createSocialRenderScheduler(run, label = 'social render') {
  let scheduled = false;
  let lastReason = '';

  const requestFrame = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (callback) => setTimeout(callback, 0);

  return function scheduleSocialRender(reason = '') {
    lastReason = reason || lastReason;
    if (scheduled) return;
    scheduled = true;

    requestFrame(() => {
      scheduled = false;
      const reasonToRun = lastReason;
      lastReason = '';
      try {
        run?.(reasonToRun);
      } catch (error) {
        console.warn(`[${label}]`, error);
      }
    });
  };
}

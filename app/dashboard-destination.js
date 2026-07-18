import { findSeasonForDate } from '../data/season-model.js';

export async function openSeasonDashboardDestination({
  registry,
  todayKey,
  switchToWorkout,
  openSeasonOverview,
  openFallback,
} = {}) {
  if (typeof switchToWorkout !== 'function') {
    throw new TypeError('switchToWorkout must be a function');
  }

  await switchToWorkout();
  const activeSeason = findSeasonForDate(registry, todayKey);
  if (activeSeason) {
    const opened = typeof openSeasonOverview === 'function'
      ? await openSeasonOverview(activeSeason.id)
      : false;
    return {
      destination: 'season-overview',
      seasonId: activeSeason.id,
      opened: opened !== false,
    };
  }

  if (typeof openFallback === 'function') await openFallback();
  return {
    destination: 'fallback',
    seasonId: null,
    opened: true,
  };
}

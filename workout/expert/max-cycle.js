// ================================================================
// workout/expert/max-cycle.js — 테스트모드 성장판 public facade
// ================================================================

export {
  normalizeMaxCycleTracks,
  predictBenchmarkProgression,
  buildMaxCycleSnapshot,
  detectPlateau,
  createDefaultMaxCycle,
  buildRenderedMaxCycleSnapshot,
  buildMaxPlanMovementOptionSeeds,
  dedupeMaxBenchmarkOptions,
  getMaxBenchmarkOptionGroupKey,
  overlayCurrentWorkoutDay,
  isMaxTrackEnabled,
  isMaxVolumeOnlyMajor,
  isMaxVolumeOnlyBenchmark,
  maxBenchmarkTrackList,
  selectPersistedMaxCycle,
  buildBenchmarkActuals,
  maxBenchmarkProgram,
  buildMaxCycleSettleResult,
  buildMaxCycleHistoryEntry,
  buildNextMaxCycleFromSettle,
  buildMaxGrowthStairs,
} from './max-cycle-core.js?v=20260612w1';

export {
  renderMaxCycleDashboard,
  renderMaxCycleBoard,
  renderMaxPlanEditor,
  renderMaxCycleSettle,
} from './max-cycle-render.js?v=20260516v6';

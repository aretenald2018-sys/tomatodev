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
  isMaxTrackEnabled,
  isMaxVolumeOnlyMajor,
  isMaxVolumeOnlyBenchmark,
  maxBenchmarkTrackList,
  selectPersistedMaxCycle,
} from './max-cycle-core.js?v=20260515v12';

export {
  renderMaxCycleDashboard,
  renderMaxCycleBoard,
  renderMaxPlanEditor,
  renderMaxCycleSettle,
} from './max-cycle-render.js?v=20260515v13';

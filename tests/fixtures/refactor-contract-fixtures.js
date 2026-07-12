export const WORKOUT_DAY_CONTRACT_FIXTURE = Object.freeze({
  breakfast: '현미밥과 달걀',
  bKcal: 510,
  bFoods: [{ id: 'food-1', name: '현미밥', kcal: 330 }],
  bPhoto: 'data:image/jpeg;base64,breakfast-contract',
  workoutPhoto: 'data:image/jpeg;base64,workout-contract',
  workoutSessions: [
    {
      id: 'session-1',
      label: '1회차',
      exercises: [{
        exerciseId: 'bench-press',
        muscleId: 'chest',
        sets: [{ kg: 60, reps: 8, setType: 'work', done: true, completedAt: 1_783_400_600_000 }],
      }],
      workoutDuration: 900,
      workoutTimeline: {
        mode: 'set-completion',
        firstSetCompletedAt: 1_783_400_600_000,
        lastSetCompletedAt: 1_783_400_600_000,
        checkedSetCount: 1,
        durationSec: 0,
      },
      workoutPhoto: 'data:image/jpeg;base64,workout-contract',
    },
    {
      id: 'session-2',
      label: '2회차',
      exercises: [],
      running: true,
      runSource: 'wear',
      runDistance: 1.25,
      runDurationMin: 7,
      runDurationSec: 30,
      runStartedAt: 1_783_401_000_000,
      runEndedAt: 1_783_401_450_000,
      runRoute: [
        { timestampMs: 1_783_401_000_000, lat: 37.5665, lng: 126.9780 },
        { timestampMs: 1_783_401_450_000, lat: 37.5670, lng: 126.9790 },
      ],
      runRouteSummary: { source: 'wear-gps', pointCount: 2, distanceKm: 1.25, durationSec: 450 },
    },
  ],
});

export const WEAR_RUN_CONTRACT_FIXTURE = Object.freeze({
  type: 'running',
  source: 'wear',
  dateKey: '2026-07-07',
  startedAt: 1_783_400_000_000,
  endedAt: 1_783_400_120_000,
  durationSec: 120,
  distanceKm: 0.5,
  avgPaceSecPerKm: 240,
  avgHeartRateBpm: 142,
  maxHeartRateBpm: 158,
  calories: 42,
  samples10s: [
    { timestampMs: 1_783_400_010_000, bpm: 138 },
    { timestampMs: 1_783_400_020_000, bpm: 146 },
  ],
  route: [
    { timestampMs: 1_783_400_000_000, lat: 37.5665, lng: 126.9780, segmentId: 0 },
    { timestampMs: 1_783_400_120_000, lat: 37.5670, lng: 126.9790, segmentId: 0 },
  ],
});

export const LEGACY_NUTRITION_CONTRACT_FIXTURE = Object.freeze({
  id: 'legacy-rice-300',
  name: '현미밥',
  brand: null,
  unit: '300g',
  servingSize: 300,
  servingUnit: 'g',
  nutrition: {
    kcal: 495,
    protein: 9,
    carbs: 108,
    fat: 3,
    fiber: 6,
    sugar: 0,
    sodium: 15,
  },
  aliases: ['현미 밥'],
  source: 'legacy-local',
});

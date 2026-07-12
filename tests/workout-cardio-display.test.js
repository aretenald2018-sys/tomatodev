import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatManualCardioMetric,
  manualCardioDisplayData,
  manualCardioSummaryText,
} from '../workout/cardio-model.js';

test('manual cardio display data keeps legacy records and rejects empty draft rows', () => {
  assert.equal(manualCardioDisplayData({ exerciseId: 'bench-press' }), null);
  assert.equal(manualCardioDisplayData({ exerciseId: 'cardio:step-machine' }), null);

  assert.deepEqual(manualCardioDisplayData({
    exerciseId: 'cardio:step-machine',
    name: '계단 운동',
    cardio: {
      kcal: '180',
      distanceKm: '1.25',
      speedKmh: '5.5',
      laps: '12',
      level: '8',
      source: 'manual-cardio',
    },
  }), {
    id: 'step-machine',
    label: '계단 운동',
    detail: '수기 입력',
    kcal: 180,
    distanceKm: 1.25,
    speedKmh: 5.5,
    laps: 12,
    angleDeg: 0,
    level: 8,
    source: 'manual-cardio',
  });

  assert.deepEqual(manualCardioDisplayData({
    exerciseId: 'cardio:treadmill-running',
    cardio: { source: 'manual-cardio' },
  }), {
    id: 'treadmill-running',
    label: '유산소',
    detail: '수기 입력',
    kcal: 0,
    distanceKm: 0,
    speedKmh: 0,
    laps: 0,
    angleDeg: 0,
    level: 0,
    source: 'manual-cardio',
  });
});

test('manual cardio display text is stable across card and export summaries', () => {
  assert.equal(formatManualCardioMetric(1.256, ' km', 2), '1.26 km');
  assert.equal(formatManualCardioMetric(0, ' kcal', 0), '--');
  assert.equal(manualCardioSummaryText(null), '수기 유산소 기록');
  assert.equal(manualCardioSummaryText({
    id: 'my-mountain', kcal: 230, distanceKm: 2.5, speedKmh: 4.2, angleDeg: 7.5, laps: 0,
  }), '230 kcal · 2.5 km · 4.2 km/h · 각도 7.5°');
  assert.equal(manualCardioSummaryText({
    id: 'step-machine', kcal: 0, distanceKm: 0, speedKmh: 0, level: 8, laps: 12,
  }), '8단계 · 12회');
});

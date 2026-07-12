import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRunningClock,
  formatRunningDistance,
  formatRunningPaceCard,
  runningGpsInfoLabel,
  runningMetricItems,
  runningPlaceLabel,
  runningSourceLabel,
} from '../workout/running-presentation.js';

test('running presentation formats distance, pace, and time without invalid values', () => {
  assert.equal(formatRunningDistance(6.246), '6.25km');
  assert.equal(formatRunningDistance(12.34), '12.3km');
  assert.equal(formatRunningDistance(0), '');
  assert.equal(formatRunningPaceCard(359.6), "6'00''/km");
  assert.equal(formatRunningPaceCard(0), '');

  const timestamp = new Date(2026, 6, 13, 9, 5).getTime();
  assert.equal(formatRunningClock(timestamp), '09:05');
  assert.equal(formatRunningClock('invalid'), '');
});

test('running presentation retains labels and card metrics', () => {
  assert.equal(runningSourceLabel('wear-gps'), '워치 기록');
  assert.equal(runningSourceLabel('manual-cardio'), '수기 입력');
  assert.equal(runningSourceLabel('unknown'), '러닝 기록');

  assert.deepEqual(runningMetricItems({
    distanceKm: 6.2,
    durationSec: 2232,
    speedKmh: 10,
    avgPaceSecPerKm: 360,
    calories: 420,
    elevationGainM: 42,
    avgHeartRateBpm: 148,
    cadenceSpm: 172,
  }), [
    { label: '거리', value: '6.2km' },
    { label: '시간', value: '37분' },
    { label: '속도', value: '10 km/h' },
    { label: '평균 페이스', value: "6'00''/km" },
    { label: '칼로리', value: '420 kcal' },
    { label: '고도 상승', value: '42 m' },
    { label: '평균 심박수', value: '148' },
    { label: '케이던스', value: '172' },
  ]);
});

test('running presentation reports privacy-safe place and GPS interruption state', () => {
  assert.equal(runningPlaceLabel({ placeSummary: { label: '대한민국 위치 기록' }, routeSummary: { centroid: [37.5, 127] } }), '위치 확인 중');
  assert.equal(runningPlaceLabel({ placeSummary: { label: '서울 러닝 경로' } }), '서울 러닝 경로');
  assert.equal(runningPlaceLabel({}), '위치 정보 없음');
  assert.equal(runningGpsInfoLabel({}), '');
  assert.equal(runningGpsInfoLabel({ gapCount: 1, segmentCount: 2 }), 'GPS 중단 구간 1개 · 기록 구간 2개. 끊긴 구간은 거리와 지도 선에서 제외했어요.');
  assert.equal(runningGpsInfoLabel({ interrupted: true }), 'GPS 중단 구간 1개. 끊긴 구간은 거리와 지도 선에서 제외했어요.');
});

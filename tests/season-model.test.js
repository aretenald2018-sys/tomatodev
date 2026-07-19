import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addSeasonDays,
  assertSeasonRegistry,
  filterCacheToSeason,
  findSeasonsForDate,
  selectSeasonDecisionCache,
  findSeasonForDate,
  seasonStatus,
  startOfSeasonWeek,
  validateSeasonRegistry,
} from '../data/season-model.js';

const REGISTRY = {
  seasons: [
    { id: 'spring', name: '봄 시즌', startDate: '2026-04-01', endDate: '2026-06-30' },
    { id: 'summer', name: '여름 시즌', startDate: '2026-07-01', endDate: '2026-08-31' },
  ],
};

test('시즌 날짜 모델은 UTC 기준 날짜 이동과 월요일 주차를 안정적으로 계산한다', () => {
  assert.equal(addSeasonDays('2026-07-01', -1), '2026-06-30');
  assert.equal(addSeasonDays('2028-02-28', 1), '2028-02-29');
  assert.equal(startOfSeasonWeek('2026-07-19'), '2026-07-13');
  assert.equal(startOfSeasonWeek('2026-07-20'), '2026-07-20');
});

test('의사결정 cache는 현재 시즌만 사용하고 시즌 종료 뒤 자동 진행을 멈춘다', () => {
  const cache = {
    '2026-06-30': { value: 'legacy' },
    '2026-07-01': { value: 'season' },
    '2026-09-01': { value: 'after' },
  };
  const registry = {
    seasons: [{ id: 'summer', name: '여름', startDate: '2026-07-01', endDate: '2026-08-31' }],
  };
  assert.deepEqual(Object.keys(selectSeasonDecisionCache(cache, registry, '2026-07-15')), ['2026-07-01']);
  assert.deepEqual(selectSeasonDecisionCache(cache, registry, '2026-09-01'), {});
  assert.deepEqual(Object.keys(selectSeasonDecisionCache(cache, registry, '2026-06-30')), ['2026-06-30']);
});
test('시즌 레지스트리는 경계일을 포함하고 상태를 날짜에서 파생한다', () => {
  const registry = assertSeasonRegistry(REGISTRY);
  const spring = findSeasonForDate(registry, '2026-06-30');
  const summer = findSeasonForDate(registry, '2026-07-01');
  assert.equal(spring.id, 'spring');
  assert.equal(summer.id, 'summer');
  assert.equal(seasonStatus(spring, '2026-07-15'), 'archived');
  assert.equal(seasonStatus(summer, '2026-07-15'), 'current');
  assert.equal(seasonStatus(summer, '2026-06-15'), 'scheduled');
});

test('시즌 레지스트리는 겹침, 중복 id, 잘못된 날짜를 거부한다', () => {
  const overlap = validateSeasonRegistry({
    seasons: [
      { id: 'one', name: '하나', startDate: '2026-07-01', endDate: '2026-07-31' },
      { id: 'two', name: '둘', startDate: '2026-07-31', endDate: '2026-08-31' },
      { id: 'two', name: '셋', startDate: '2026-09-01', endDate: '2026-09-31' },
    ],
  });
  assert.equal(overlap.valid, false);
  assert.match(overlap.errors.join(' '), /overlap/);
  assert.match(overlap.errors.join(' '), /invalid/);
  assert.throws(() => assertSeasonRegistry({ seasons: overlap.registry.seasons }), /overlap/);
});

test('같은 기간이라도 서로 다른 종목 시즌은 병행하고 같은 종목 겹침은 거부한다', () => {
  const parallel = validateSeasonRegistry({
    seasons: [
      { id: 'bench-season', name: '벤치', startDate: '2026-07-01', endDate: '2026-08-31', exerciseIds: ['bench'] },
      { id: 'squat-season', name: '스쿼트', startDate: '2026-07-01', endDate: '2026-08-31', exerciseIds: ['squat'] },
    ],
  });
  assert.equal(parallel.valid, true);
  assert.equal(findSeasonsForDate(parallel.registry, '2026-07-15', { exerciseId: 'bench' }).map(season => season.id).join(','), 'bench-season');
  assert.equal(findSeasonsForDate(parallel.registry, '2026-07-15', { exerciseId: 'squat' }).map(season => season.id).join(','), 'squat-season');

  const conflict = validateSeasonRegistry({
    seasons: [
      { id: 'bench-a', name: '벤치 A', startDate: '2026-07-01', endDate: '2026-08-31', exerciseIds: ['bench'] },
      { id: 'bench-b', name: '벤치 B', startDate: '2026-07-15', endDate: '2026-09-01', exerciseIds: ['bench'] },
    ],
  });
  assert.equal(conflict.valid, false);
  assert.match(conflict.errors.join(' '), /overlap/);
});

test('시즌 cache는 원본 객체를 수정하지 않고 날짜 범위만 선택한다', () => {
  const summer = findSeasonForDate(REGISTRY, '2026-07-15');
  const cache = {
    '2026-06-30': { marker: 'old' },
    '2026-07-01': { marker: 'start' },
    '2026-08-31': { marker: 'end' },
    '2026-09-01': { marker: 'future' },
    metadata: { keep: true },
  };
  const scoped = filterCacheToSeason(cache, summer);
  assert.deepEqual(Object.keys(scoped), ['2026-07-01', '2026-08-31']);
  assert.equal(scoped['2026-07-01'], cache['2026-07-01']);
  assert.equal(Object.keys(cache).length, 5);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activeSeasonOf,
  createInitialSeasonRegistry,
  createNextSeasonRegistry,
  filterCacheForSeason,
  isSeasonDateKey,
  normalizeSeasonRegistry,
  seasonForDate,
  seasonSettingKey,
} from '../data/season-model.js';

test('새 시즌을 시작하면 이전 시즌은 전날 종료되고 새 시즌이 활성화된다', () => {
  const initial = createInitialSeasonRegistry({
    startDate: '2026-01-01',
    name: '기존 시즌',
    now: 100,
  });
  const next = createNextSeasonRegistry(initial, {
    startDate: '2026-07-13',
    name: '여름 시즌',
    now: 200,
  });

  assert.equal(next.seasons.length, 2);
  assert.deepEqual(next.seasons[0], {
    ...next.seasons[0],
    endDate: '2026-07-12',
    status: 'closed',
    closedAt: 200,
  });
  assert.equal(activeSeasonOf(next)?.name, '여름 시즌');
  assert.equal(activeSeasonOf(next)?.startDate, '2026-07-13');
  assert.equal(activeSeasonOf(next)?.tone, 1);
});

test('날짜별 시즌 조회는 경계일 전후를 정확히 구분한다', () => {
  const initial = createInitialSeasonRegistry({ startDate: '2026-01-01', now: 100 });
  const registry = createNextSeasonRegistry(initial, {
    startDate: '2026-07-13',
    name: '시즌 2',
    now: 200,
  });

  assert.equal(seasonForDate(registry, '2026-07-12')?.name, '기존 시즌');
  assert.equal(seasonForDate(registry, '2026-07-13')?.name, '시즌 2');
  assert.equal(seasonForDate(registry, '2025-12-31'), null);
});

test('시즌 범위 캐시는 이전 기록을 삭제하지 않고 현재 계산에서만 제외한다', () => {
  const cache = {
    '2026-07-11': { exercises: [{ id: 'old' }] },
    '2026-07-13': { exercises: [{ id: 'new' }] },
    '2026-07-14': { bKcal: 500 },
    memo: { text: '날짜 문서 아님' },
  };
  const season = { startDate: '2026-07-13', endDate: null };
  const scoped = filterCacheForSeason(cache, season);

  assert.deepEqual(Object.keys(scoped), ['2026-07-13', '2026-07-14']);
  assert.ok(cache['2026-07-11']);
  assert.ok(cache.memo);
});

test('레지스트리 정규화와 시즌 설정 키는 손상된 입력을 안전하게 다룬다', () => {
  assert.equal(isSeasonDateKey('2026-02-29'), false);
  assert.equal(isSeasonDateKey('2028-02-29'), true);

  const registry = normalizeSeasonRegistry({
    activeSeasonId: 'missing',
    seasons: [
      { id: 'second', name: '둘째', startDate: '2026-03-01' },
      { id: 'invalid', startDate: '2026-02-30' },
      { id: 'first', name: '첫째', startDate: '2026-01-01' },
    ],
  });

  assert.deepEqual(registry.seasons.map(season => season.id), ['first', 'second']);
  assert.equal(registry.activeSeasonId, 'second');
  assert.equal(registry.seasons[0].endDate, '2026-02-28');
  assert.equal(seasonSettingKey('season/a', 'diet plan'), 'season_season_a_diet_plan');
});

test('현재 시즌 시작일과 같거나 이른 날짜로 새 시즌을 만들 수 없다', () => {
  const initial = createInitialSeasonRegistry({ startDate: '2026-07-13', now: 100 });

  assert.throws(
    () => createNextSeasonRegistry(initial, { startDate: '2026-07-13', now: 200 }),
    /현재 시즌 시작일보다 뒤/,
  );
  assert.throws(
    () => createNextSeasonRegistry(initial, { startDate: 'not-a-date', now: 200 }),
    /시즌 시작일/,
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { getEffectiveDailyBodyCheckins } from '../data/body-checkins.js';

test('getEffectiveDailyBodyCheckins · 같은 날짜는 최신 ci timestamp 1건만 사용', () => {
  const rows = [
    { id: 'ci_100', date: '2026-06-09', weight: 80.4 },
    { id: 'ci_103', date: '2026-06-09', weight: 80.1 },
    { id: 'ci_102', date: '2026-06-09', weight: 80.2 },
    { id: 'ci_090', date: '2026-06-08', weight: 80.5 },
  ];

  const out = getEffectiveDailyBodyCheckins(rows);

  assert.deepEqual(out.map((row) => row.date), ['2026-06-08', '2026-06-09']);
  assert.equal(out[1].id, 'ci_103');
  assert.equal(out[1].weight, 80.1);
});

test('getEffectiveDailyBodyCheckins · 줍스 중복 체크인 형태는 날짜별 포인트로 접힘', () => {
  const rows = [
    { id: 'ci_1779150757902', date: '2026-05-19', weight: 81.2 },
    { id: 'ci_1779235803514', date: '2026-05-19', weight: 81.1 },
    ...Array.from({ length: 13 }, (_, i) => ({
      id: `ci_${1780964731449 + i}`,
      date: '2026-06-09',
      weight: 80.1,
    })),
  ];

  const out = getEffectiveDailyBodyCheckins(rows);

  assert.equal(rows.length, 15);
  assert.equal(out.length, 2);
  assert.equal(out[0].date, '2026-05-19');
  assert.equal(out[0].weight, 81.1);
  assert.equal(out[1].date, '2026-06-09');
  assert.equal(out[1].weight, 80.1);
});

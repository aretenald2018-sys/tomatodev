import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RUNNING_ROUTE_POINTS,
  RunningRoutePointError,
  buildRunningRoutePreview,
  chunkRunningRoute,
  hydrateRunningRouteChunks,
  normalizeRunningRoutePoints,
} from '../workout/running-route-store.js';

function denseCurve(count = 620) {
  const start = 1_783_632_000_000;
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / (count - 1);
    return {
      lat: 37.5219 + Math.sin(angle) * 0.0042,
      lng: 127.1231 + Math.cos(angle) * 0.0053,
      ts: start + index * 1_000,
      accuracy: 4 + (index % 3),
      altitude: 18 + Math.sin(angle * 3),
      speed: 3.1,
      segmentId: index < 400 ? 0 : 1,
      gapBefore: index === 400,
      gapReason: index === 400 ? 'time-gap' : '',
    };
  });
}

test('lossless route normalizer preserves every ordered dense sample', () => {
  // Given: a dense route with a gap and valid zero-valued sensor fields.
  const input = denseCurve();
  input[0] = {
    ...input[0],
    lat: 0,
    lng: 0,
    ts: 0,
    accuracy: 0,
    altitude: 0,
    speed: 0,
  };

  // When: the storage boundary normalizes the route.
  const normalized = normalizeRunningRoutePoints(input);

  // Then: every sample, canonical sensor value, timestamp, and source index remains intact.
  assert.equal(normalized.length, 620);
  assert.notStrictEqual(normalized, input);
  assert.notStrictEqual(normalized[0], input[0]);
  normalized.forEach((point, index) => {
    assert.equal(point.lat, input[index].lat);
    assert.equal(point.lng, input[index].lng);
    assert.equal(point.ts, input[index].ts);
    assert.equal(point.accuracy, input[index].accuracy);
    assert.equal(point.altitude, input[index].altitude);
    assert.equal(point.speed, input[index].speed);
    assert.equal(point.segmentId, input[index].segmentId);
  });
  assert.equal('gapBefore' in normalized[0], false);
  assert.equal('gapReason' in normalized[0], false);
  assert.equal(normalized[400].gapBefore, true);
  assert.equal(normalized[400].gapReason, 'time-gap');
});

test('lossless route normalizer rejects an invalid entry with its index and reason', () => {
  // Given: one invalid point inside an otherwise valid ordered route.
  const input = denseCurve(3);
  input[1] = { ...input[1], lat: Number.NaN };

  // When/Then: normalization fails loudly without filtering that entry.
  assert.throws(
    () => normalizeRunningRoutePoints(input),
    error => {
      assert.equal(error instanceof RunningRoutePointError, true);
      assert.equal(error.index, 1);
      assert.match(error.reason, /latitude/i);
      return true;
    },
  );
});

test('timestamp aliases normalize to canonical ts and allow equal timestamps', () => {
  // Given: mobile, Wear, matching dual-alias, and same-millisecond samples.
  const input = [
    { lat: 0, lng: 0, ts: 0 },
    { lat: 1, lng: 1, timestampMs: 1 },
    { lat: 2, lng: 2, ts: 2, timestampMs: 2 },
    { lat: 3, lng: 3, ts: 2 },
  ];

  // When: both producer shapes cross the storage boundary.
  const normalized = normalizeRunningRoutePoints(input);

  // Then: one exact canonical timestamp remains and equal samples are retained.
  assert.deepEqual(normalized, [
    { lat: 0, lng: 0, ts: 0 },
    { lat: 1, lng: 1, ts: 1 },
    { lat: 2, lng: 2, ts: 2 },
    { lat: 3, lng: 3, ts: 2 },
  ]);
});

test('canonical storage points strip unknown payloads and preserve valid numeric zeros', () => {
  // Given: a point with zero sensors, oversized gap text, null optionals, and arbitrary payloads.
  const input = [
    {
      lat: 0,
      lng: 0,
      ts: 0,
      accuracy: 0,
      altitude: 0,
      speed: 0,
      heartRateBpm: 0,
      cadenceSpm: 0,
      bearing: 0,
      segmentId: 0,
      gapBefore: true,
      gapReason: `  ${'x'.repeat(60)}  `,
      coordinateDump: Array.from({ length: 1_000 }, (_, index) => index),
      nested: { arbitrary: 'payload' },
    },
    { lat: 1, lng: 1, timestampMs: 1, accuracy: null, altitude: null },
  ];

  // When: the points cross the storage boundary.
  const normalized = normalizeRunningRoutePoints(input);

  // Then: only bounded canonical fields remain, including every valid numeric zero.
  assert.deepEqual(normalized, [
    {
      lat: 0,
      lng: 0,
      ts: 0,
      accuracy: 0,
      altitude: 0,
      speed: 0,
      heartRateBpm: 0,
      cadenceSpm: 0,
      bearing: 0,
      segmentId: 0,
      gapBefore: true,
      gapReason: 'x'.repeat(48),
    },
    { lat: 1, lng: 1, ts: 1 },
  ]);
});

test('timestamp aliases reject conflicting numeric values', () => {
  // Given: one point whose mobile and Wear timestamps disagree.
  const input = [{ lat: 0, lng: 0, ts: 10, timestampMs: 11 }];

  // When/Then: the ambiguous point fails with its index and alias reason.
  assert.throws(
    () => normalizeRunningRoutePoints(input),
    error => {
      assert.equal(error instanceof RunningRoutePointError, true);
      assert.equal(error.index, 0);
      assert.match(error.reason, /timestamp.*alias|aliases.*timestamp/i);
      return true;
    },
  );
});

test('route normalization rejects decreasing timestamps without collapsing equals', () => {
  // Given: a route whose second point moves backward in time.
  const input = [
    { lat: 0, lng: 0, ts: 10 },
    { lat: 1, lng: 1, timestampMs: 9 },
  ];

  // When/Then: exact input order is validated instead of silently sorted.
  assert.throws(
    () => normalizeRunningRoutePoints(input),
    error => {
      assert.equal(error instanceof RunningRoutePointError, true);
      assert.equal(error.index, 1);
      assert.match(error.reason, /timestamp.*non-decreasing|chronological/i);
      return true;
    },
  );
});

test('preview never mutates or replaces the lossless stored route', () => {
  // Given: a normalized route whose segment boundary starts at index 400.
  const input = denseCurve();
  const normalized = normalizeRunningRoutePoints(input);
  const sourceSnapshot = structuredClone(normalized);

  // When: a smaller display-only preview is built.
  const preview = buildRunningRoutePreview(normalized, 240);

  // Then: endpoints and both sides of the gap survive without sharing objects.
  assert.equal(normalized.length, 620);
  assert.equal(preview.length, 240);
  assert.deepEqual(preview[0], normalized[0]);
  assert.deepEqual(preview.at(-1), normalized.at(-1));
  const gapIndex = preview.findIndex(point => point.ts === normalized[400].ts);
  assert.ok(gapIndex > 0);
  assert.equal(preview[gapIndex - 1].ts, normalized[399].ts);
  assert.equal(preview[gapIndex].gapBefore, true);
  assert.notStrictEqual(preview[0], normalized[0]);
  preview[0].lat = -1;
  assert.deepEqual(normalized, sourceSnapshot);
});

test('route chunks round-trip every point and reject stale or missing chunks', () => {
  // Given: a 620-point route split under one immutable revision.
  const route = normalizeRunningRoutePoints(denseCurve());
  const revision = 'route-revision-001';
  const chunks = chunkRunningRoute(route, revision);
  const metadata = {
    revision,
    pointCount: route.length,
    chunkCount: chunks.length,
    complete: true,
  };

  // When/Then: chunk shape and hydration preserve exact count and order.
  assert.deepEqual(chunks.map(chunk => chunk.points.length), [250, 250, 120]);
  assert.deepEqual(chunks.map(chunk => chunk.pointCount), [250, 250, 120]);
  assert.deepEqual(chunks.map(chunk => chunk.index), [0, 1, 2]);
  assert.equal(chunks.every(chunk => chunk.revision === revision), true);
  assert.deepEqual(hydrateRunningRouteChunks(metadata, chunks), route);

  // Then: stale, absent, reordered, duplicated, or miscounted chunks are rejected.
  assert.throws(
    () => hydrateRunningRouteChunks(metadata, chunks.map((chunk, index) => index === 1 ? { ...chunk, revision: 'stale' } : chunk)),
    /revision/i,
  );
  assert.throws(() => hydrateRunningRouteChunks(metadata, chunks.slice(0, 2)), /chunk/i);
  assert.throws(() => hydrateRunningRouteChunks(metadata, [chunks[1], chunks[0], chunks[2]]), /index|order/i);
  assert.throws(() => hydrateRunningRouteChunks(metadata, [chunks[0], chunks[0], chunks[2]]), /index|duplicate|order/i);
  assert.throws(
    () => hydrateRunningRouteChunks(metadata, chunks.map((chunk, index) => index === 1 ? { ...chunk, pointCount: 249 } : chunk)),
    /point.?count/i,
  );
  assert.throws(
    () => hydrateRunningRouteChunks(metadata, chunks.map((chunk, index) => index === 0
      ? { ...chunk, points: [chunk.points[1], chunk.points[0], ...chunk.points.slice(2)] }
      : chunk)),
    /timestamp.*non-decreasing|chronological/i,
  );
  assert.throws(() => hydrateRunningRouteChunks({ ...metadata, chunkCount: 2 }, chunks), /chunk.?count/i);
  assert.throws(() => hydrateRunningRouteChunks({ ...metadata, pointCount: 619 }, chunks), /point.?count|chunk.?count/i);
});

test('route hydration rejects incomplete or incomplete-shaped metadata', () => {
  // Given: valid chunks and metadata that has not been marked complete.
  const route = normalizeRunningRoutePoints(denseCurve(3));
  const revision = 'route-revision-002';
  const chunks = chunkRunningRoute(route, revision);
  const metadata = { revision, pointCount: 3, chunkCount: 1 };

  // When/Then: false and missing completion markers both fail closed.
  assert.throws(
    () => hydrateRunningRouteChunks({ ...metadata, complete: false }, chunks),
    /complete/i,
  );
  assert.throws(() => hydrateRunningRouteChunks(metadata, chunks), /complete/i);
});

test('route point ceiling rejects overflow instead of silently truncating', () => {
  // Given: one more point than the explicit storage ceiling.
  const overflow = Array.from({ length: MAX_RUNNING_ROUTE_POINTS + 1 }, (_, index) => ({
    lat: 37.5,
    lng: 127 + index / 10_000_000,
    ts: 1_783_632_000_000 + index * 500,
  }));

  // When/Then: the boundary fails instead of returning a shortened route.
  assert.throws(() => normalizeRunningRoutePoints(overflow), /25,000|25000/);
});

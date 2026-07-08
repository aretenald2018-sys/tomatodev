import test from 'node:test';
import assert from 'node:assert/strict';

import {
  downsampleRunningRoute,
  formatRunningDuration,
  formatRunningPace,
  normalizeRunningSessionDraft,
  runningRouteDistanceMeters,
  summarizeRunningRoute,
} from '../workout/running-session.js';
import {
  buildGoogleMapsScriptUrl,
  buildTmapScriptUrl,
  buildVworldTileUrl,
  normalizeRunningMapPoints,
  readRunningMapConfig,
  resolveRunningMapConfig,
  runningMapCenter,
  splitRunningMapSegments,
} from '../workout/running-map.js';

const route = [
  { lat: 37.5209, lng: 126.9770, accuracy: 8, ts: 1000 },
  { lat: 37.5215, lng: 126.9790, accuracy: 10, ts: 61000 },
  { lat: 37.5221, lng: 126.9810, accuracy: 12, ts: 121000 },
];

test('running route distance uses haversine meters', () => {
  const meters = runningRouteDistanceMeters(route);
  assert.ok(meters > 360 && meters < 420, `unexpected meters=${meters}`);
});

test('running route distance and summary do not connect interrupted GPS gaps', () => {
  // Given: two short real route segments separated by a background/app interruption.
  const interrupted = [
    { lat: 37.5209, lng: 126.9770, ts: 1_000, segmentId: 0 },
    { lat: 37.5210, lng: 126.9772, ts: 61_000, segmentId: 0 },
    { lat: 37.5600, lng: 127.0300, ts: 661_000, segmentId: 1, gapBefore: true, gapReason: 'resume' },
    { lat: 37.5602, lng: 127.0302, ts: 721_000, segmentId: 1 },
  ];

  // When: route distance and summary are calculated.
  const meters = runningRouteDistanceMeters(interrupted);
  const summary = summarizeRunningRoute(interrupted, { startedAt: 1_000, endedAt: 721_000 });

  // Then: the unobserved jump between segment 0 and segment 1 is not counted as a run.
  assert.ok(meters > 35 && meters < 75, `gap edge should be excluded, meters=${meters}`);
  assert.equal(summary.pointCount, 4);
  assert.equal(summary.segmentCount, 2);
  assert.equal(summary.gapCount, 1);
  assert.equal(summary.interrupted, true);
});

test('running session route summary stores distance, duration, bbox, centroid, and pace', () => {
  const summary = summarizeRunningRoute(route, { startedAt: 1000, endedAt: 181000, pausedMs: 60000 });

  assert.equal(summary.source, 'gps');
  assert.equal(summary.pointCount, 3);
  assert.equal(summary.durationSec, 120);
  assert.ok(summary.distanceKm > 0.36 && summary.distanceKm < 0.42);
  assert.ok(summary.avgPaceSecPerKm > 280 && summary.avgPaceSecPerKm < 340);
  assert.deepEqual(summary.bbox, {
    minLat: 37.5209,
    minLng: 126.977,
    maxLat: 37.5221,
    maxLng: 126.981,
  });
  assert.equal(summary.gpsAccuracySummary.avgAccuracyM, 10);
  assert.equal(summary.elevationGainM, null);
  assert.equal(summary.avgHeartRateBpm, null);
  assert.equal(summary.cadenceSpm, null);
});

test('running route summary aggregates optional device elevation, heart rate, and cadence', () => {
  const sensorRoute = [
    { lat: 37.52, lng: 126.97, altitude: 12, heartRateBpm: 140, cadenceSpm: 160, ts: 1000 },
    { lat: 37.5205, lng: 126.9705, altitude: 19, heartRateBpm: 148, cadenceSpm: 164, ts: 61000 },
    { lat: 37.521, lng: 126.971, altitude: 16, heartRateBpm: 152, cadenceSpm: 166, ts: 121000 },
    { lat: 37.5215, lng: 126.9715, altitude: 23, heartRateBpm: 0, cadenceSpm: null, ts: 181000 },
  ];
  const summary = summarizeRunningRoute(sensorRoute, { startedAt: 1000, endedAt: 181000 });

  assert.equal(summary.elevationGainM, 14);
  assert.equal(summary.avgHeartRateBpm, 147);
  assert.equal(summary.cadenceSpm, 163);
});

test('running session route downsamples without rendering a fake map', () => {
  const many = Array.from({ length: 300 }, (_, i) => ({
    lat: 37.52 + i * 0.00001,
    lng: 126.97 + i * 0.00002,
    accuracy: 9,
    ts: i * 1000,
  }));

  assert.equal(downsampleRunningRoute(many).length, 240);
  assert.equal(normalizeRunningMapPoints(route).length, 3);
  assert.deepEqual(runningMapCenter([{ lat: 37, lng: 126 }, { lat: 38, lng: 128 }]), {
    lat: 37.5,
    lng: 127,
  });
});

test('running map point normalizer preserves mixed phone route samples in order', () => {
  const mixedRoute = [
    { lat: 37.5209, lng: 126.9770, ts: 1000, accuracy: 8, altitude: 20, speed: 2.1 },
    { latitude: 37.5215, longitude: 126.9790, timestamp: 61000, accuracy: 9, altitude: 22, speed: 2.4 },
    { latitude: 37.5221, lon: 126.9810, time: 121000, accuracy: 10, altitude: 24, speed: 2.8 },
    { latitude: 37.6, longitude: null, timestamp: 150000, accuracy: 7, altitude: 21, speed: 2.2 },
    { latitude: null, longitude: 126.98, timestamp: 151000, accuracy: 7, altitude: 21, speed: 2.2 },
    { lat: Infinity, lng: 126.9820, ts: 152000, accuracy: 7, altitude: 21, speed: 2.2 },
    { lat: 37.5230, lng: 126.9830, time: 181000, accuracy: 11, altitude: 19, speed: 2.6 },
  ];

  assert.deepEqual(normalizeRunningMapPoints(mixedRoute), [
    { lat: 37.5209, lng: 126.9770, ts: 1000, accuracy: 8, altitude: 20, speed: 2.1 },
    { lat: 37.5215, lng: 126.9790, ts: 61000, accuracy: 9, altitude: 22, speed: 2.4 },
    { lat: 37.5221, lng: 126.9810, ts: 121000, accuracy: 10, altitude: 24, speed: 2.8 },
    { lat: 37.5230, lng: 126.9830, ts: 181000, accuracy: 11, altitude: 19, speed: 2.6 },
  ]);
});

test('running route downsample and map normalization preserve gap metadata', () => {
  const many = Array.from({ length: 300 }, (_, i) => ({
    lat: 37.52 + i * 0.00001,
    lng: 126.97 + i * 0.00002,
    segmentId: i < 180 ? 0 : 1,
    gapBefore: i === 180,
    gapReason: i === 180 ? 'visibility-hidden' : '',
    ts: i * 1000,
  }));

  const downsampled = downsampleRunningRoute(many, 24);
  const normalized = normalizeRunningMapPoints(downsampled);
  const segments = splitRunningMapSegments(normalized);

  assert.equal(downsampled.length, 24);
  assert.equal(downsampled.some(point => point.gapBefore === true && point.gapReason === 'visibility-hidden'), true);
  assert.equal(normalized.some(point => point.gapBefore === true && point.segmentId === 1), true);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].every(point => point.segmentId === 0), true);
  assert.equal(segments[1][0].gapBefore, true);
});

test('running real map provider config resolves VWorld, Google, and TMAP keys', () => {
  assert.deepEqual(resolveRunningMapConfig({ provider: 'auto' }), {
    provider: 'none',
    label: '실제 지도',
    key: '',
    configured: false,
    reason: 'missing-key',
  });
  assert.equal(resolveRunningMapConfig({
    provider: 'auto',
    vworldApiKey: 'vworld-key',
    tmapAppKey: 'tmap-key',
    googleMapsKey: 'google-key',
  }).provider, 'vworld');
  assert.equal(resolveRunningMapConfig({ provider: 'none', vworldApiKey: 'vworld-key' }).provider, 'vworld');
  assert.equal(resolveRunningMapConfig({ provider: 'google', vworldApiKey: 'vworld-key' }).provider, 'vworld');
  assert.equal(resolveRunningMapConfig({ provider: 'tmap', vworldApiKey: 'vworld-key' }).provider, 'vworld');
  assert.equal(resolveRunningMapConfig({ provider: 'vworld', vworldApiKey: 'vworld-key', vworldLayer: 'hybrid' }).configured, true);
  assert.equal(resolveRunningMapConfig({ provider: 'vworld', vworldApiKey: 'vworld-key', vworldLayer: 'hybrid' }).layer, 'hybrid');
  assert.equal(resolveRunningMapConfig({ provider: 'google', googleMapsKey: 'google-key' }).configured, true);
  assert.equal(resolveRunningMapConfig({ provider: 'tmap', tmapAppKey: 'tmap-key' }).configured, true);
  assert.equal(readRunningMapConfig().provider, 'vworld');
  assert.equal(readRunningMapConfig().configured, true);
  assert.match(buildVworldTileUrl('abc', 15, 27949, 12696, 'base'), /api\.vworld\.kr\/req\/wmts\/1\.0\.0\/abc\/Base\/15\/12696\/27949\.png/);
  assert.match(buildVworldTileUrl('abc', 15, 27949, 12696, 'satellite'), /Satellite\/15\/12696\/27949\.jpeg/);
  assert.match(buildGoogleMapsScriptUrl('abc'), /maps\.googleapis\.com\/maps\/api\/js/);
  assert.match(buildGoogleMapsScriptUrl('abc'), /key=abc/);
  assert.match(buildTmapScriptUrl('abc'), /apis\.openapi\.sk\.com\/tmap\/jsv2/);
  assert.match(buildTmapScriptUrl('abc'), /appKey=abc/);
});

test('running session formats elapsed time and pace like running apps', () => {
  assert.equal(formatRunningDuration(2), '00:02');
  assert.equal(formatRunningDuration(1048), '17:28');
  assert.equal(formatRunningPace(403), "6'43''");
  assert.equal(formatRunningPace(0), "--'--''");
});

test('running session draft normalizer preserves reload-safe live state', () => {
  const draft = normalizeRunningSessionDraft({
    phase: 'paused',
    startedAt: 1_000,
    pausedAt: 181_000,
    pausedMs: 60_000,
    updatedAt: 181_000,
    route,
    ownerId: 'runner-1',
    placeSummary: { status: 'resolved', label: '잠실동, 송파구, 서울특별시' },
    goal: { type: 'distance', value: 5 },
    audioGuide: false,
    announcedSplits: 1,
    announcedGoalHalf: true,
  }, { now: 200_000 });

  assert.equal(draft.phase, 'paused');
  assert.equal(draft.startedAt, 1_000);
  assert.equal(draft.pausedAt, 181_000);
  assert.equal(draft.pausedMs, 60_000);
  assert.equal(draft.ownerId, 'runner-1');
  assert.equal(draft.route.length, 3);
  assert.equal(draft.placeSummary.label, '잠실동, 송파구, 서울특별시');
  assert.deepEqual(draft.goal, { type: 'distance', value: 5 });
  assert.equal(draft.audioGuide, false);
  assert.equal(draft.announcedSplits, 1);
  assert.equal(draft.announcedGoalHalf, true);

  assert.equal(normalizeRunningSessionDraft({ phase: 'start', startedAt: 1_000, updatedAt: 1_000 }, { now: 2_000 }), null);
  assert.equal(normalizeRunningSessionDraft({ phase: 'active', startedAt: 1_000, updatedAt: 1_000 }, { now: 90_000_000 }), null);
});

test('running session draft normalizer preserves interrupted route metadata', () => {
  const draft = normalizeRunningSessionDraft({
    phase: 'active',
    startedAt: 1_000,
    updatedAt: 721_000,
    route: [
      { lat: 37.5209, lng: 126.9770, ts: 1_000, segmentId: 0 },
      { lat: 37.5210, lng: 126.9772, ts: 61_000, segmentId: 0 },
      { lat: 37.5600, lng: 127.0300, ts: 661_000, segmentId: 1, gapBefore: true, gapReason: 'pagehide' },
    ],
  }, { now: 800_000 });

  assert.equal(draft.route.length, 3);
  assert.equal(draft.route[2].segmentId, 1);
  assert.equal(draft.route[2].gapBefore, true);
  assert.equal(draft.route[2].gapReason, 'pagehide');
});

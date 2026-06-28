import test from 'node:test';
import assert from 'node:assert/strict';

import {
  downsampleRunningRoute,
  formatRunningDuration,
  formatRunningPace,
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

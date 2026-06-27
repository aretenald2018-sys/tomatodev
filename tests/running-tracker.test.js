import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRunningSessionRouteSvg,
  downsampleRunningRoute,
  formatRunningDuration,
  formatRunningPace,
  runningRouteDistanceMeters,
  summarizeRunningRoute,
} from '../workout/running-session.js';

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

test('running session route preview downsamples and renders an svg route', () => {
  const many = Array.from({ length: 300 }, (_, i) => ({
    lat: 37.52 + i * 0.00001,
    lng: 126.97 + i * 0.00002,
    accuracy: 9,
    ts: i * 1000,
  }));

  assert.equal(downsampleRunningRoute(many).length, 240);
  const svg = buildRunningSessionRouteSvg(route);
  assert.match(svg, /wt-running-session-route-svg/);
  assert.match(svg, /polyline/);
  assert.match(svg, /class="end"/);
});

test('running session formats elapsed time and pace like running apps', () => {
  assert.equal(formatRunningDuration(2), '00:02');
  assert.equal(formatRunningDuration(1048), '17:28');
  assert.equal(formatRunningPace(403), "6'43''");
  assert.equal(formatRunningPace(0), "--'--''");
});

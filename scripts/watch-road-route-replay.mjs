#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { OLYMPIC_PARK_ROAD_ROUTE } from '../tests/fixtures/olympic-park-road-route.js';

function readOption(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

const serial = readOption('--serial', process.env.ANDROID_SERIAL || '');
const intervalMs = Math.max(25, Number(readOption('--interval-ms', '50')) || 50);
const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  || join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
const adb = process.platform === 'win32' ? join(sdkRoot, 'platform-tools', 'adb.exe') : 'adb';

if (!serial) throw new Error('Pass the watch with --serial <serial> or ANDROID_SERIAL.');
if (process.platform === 'win32' && !existsSync(adb)) throw new Error(`adb not found: ${adb}`);

function runAdb(args) {
  const result = spawnSync(adb, ['-s', serial, ...args], { encoding: 'utf8' });
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`;
    throw new Error(`adb ${args.join(' ')} failed: ${detail}`);
  }
  return result;
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
runAdb(['get-state']);

const startedAt = Date.now();
const fixtureStartedAt = OLYMPIC_PARK_ROAD_ROUTE[0].ts;
for (let index = 0; index < OLYMPIC_PARK_ROAD_ROUTE.length; index += 1) {
  const point = OLYMPIC_PARK_ROAD_ROUTE[index];
  const activeDurationMs = point.ts - fixtureStartedAt;
  const timestampMs = startedAt + activeDurationMs;
  const args = [
    'shell', 'am', 'broadcast', '--receiver-foreground',
    '-n', 'com.lifestreak.dev/com.lifestreak.wear.debug.WearRouteReplayReceiver',
    '-a', 'com.lifestreak.wear.DEBUG_ROUTE_POINT',
    '--es', 'lat', String(point.lat),
    '--es', 'lng', String(point.lng),
    '--es', 'timestampMs', String(timestampMs),
    '--es', 'activeDurationMs', String(activeDurationMs),
    '--es', 'accuracy', String(point.accuracy || 5),
  ];
  if (Number.isFinite(point.altitude)) args.push('--es', 'altitude', String(point.altitude));
  if (Number.isFinite(point.bearing)) args.push('--es', 'bearing', String(point.bearing));
  runAdb(args);
  process.stdout.write(`\rReplayed ${index + 1}/${OLYMPIC_PARK_ROAD_ROUTE.length}`);
  if (index < OLYMPIC_PARK_ROAD_ROUTE.length - 1) await wait(intervalMs);
}
process.stdout.write('\n');
console.log(JSON.stringify({
  serial,
  points: OLYMPIC_PARK_ROAD_ROUTE.length,
  durationSec: Math.round((OLYMPIC_PARK_ROAD_ROUTE.at(-1).ts - fixtureStartedAt) / 1000),
  first: OLYMPIC_PARK_ROAD_ROUTE[0],
  last: OLYMPIC_PARK_ROAD_ROUTE.at(-1),
}));

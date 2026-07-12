import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  LEGACY_WEAR_WORKOUT_PAYLOAD_VERSION,
  WEAR_WORKOUT_PAYLOAD_VERSION,
  assertWearWorkoutPayloadEnvelope,
} from '../workout/wear-payload-contract.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('runtime asset manifest is the shared SW and build source of truth', async () => {
  const [manifest, sw, copier, deployVerifier] = await Promise.all([
    readFile(resolve(root, 'runtime-assets.js'), 'utf8'),
    readFile(resolve(root, 'sw.js'), 'utf8'),
    readFile(resolve(root, 'scripts/copy-www.js'), 'utf8'),
    readFile(resolve(root, 'scripts/verify-deploy.mjs'), 'utf8'),
  ]);
  assert.match(manifest, /TOMATO_STATIC_ASSETS\s*=\s*Object\.freeze/);
  assert.doesNotMatch(manifest, /\?v=/);
  assert.match(manifest, /\.\/runtime-assets\.js/);
  assert.match(sw, /importScripts\('\.\/runtime-assets\.js'\)/);
  assert.doesNotMatch(sw, /const\s+STATIC_ASSETS\s*=\s*\[/);
  assert.match(copier, /import '\.\.\/runtime-assets\.js'/);
  assert.match(copier, /const manifestTargets = runtimeAssets/);
  assert.match(copier, /\.\.\.manifestTargets/);
  assert.match(copier, /missingRuntimeAssets/);
  assert.match(deployVerifier, /fetchTextOnce\('runtime-assets\.js'\)/);
});

test('Wear payload envelope accepts legacy payloads and rejects future versions', () => {
  assert.equal(WEAR_WORKOUT_PAYLOAD_VERSION, 1);
  assert.deepEqual(assertWearWorkoutPayloadEnvelope({ type: 'running' }), {
    payloadVersion: LEGACY_WEAR_WORKOUT_PAYLOAD_VERSION,
    type: 'running',
  });
  assert.deepEqual(assertWearWorkoutPayloadEnvelope({ payloadVersion: 1, type: 'running' }), {
    payloadVersion: 1,
    type: 'running',
  });
  assert.throws(() => assertWearWorkoutPayloadEnvelope({ payloadVersion: 2, type: 'running' }), /unsupported wear payloadVersion/);
});

test('phone and Wear declare the same payload version and Functions delegate validation and notification services', async () => {
  const [wearPayload, wearBridge, functionsIndex, validation, notificationProvider, notificationService] = await Promise.all([
    readFile(resolve(root, 'android/wear/src/main/java/com/lifestreak/wear/workout/WearRunPayload.kt'), 'utf8'),
    readFile(resolve(root, 'workout/wear-bridge.js'), 'utf8'),
    readFile(resolve(root, 'functions/index.js'), 'utf8'),
    readFile(resolve(root, 'functions/lib/validation.js'), 'utf8'),
    readFile(resolve(root, 'functions/lib/notification-provider.js'), 'utf8'),
    readFile(resolve(root, 'functions/services/notification-service.js'), 'utf8'),
  ]);
  assert.match(wearPayload, /const val PAYLOAD_VERSION = 1/);
  assert.match(wearPayload, /\.put\("payloadVersion", PAYLOAD_VERSION\)/);
  assert.match(wearBridge, /assertWearWorkoutPayloadEnvelope\(payload\)/);
  assert.match(functionsIndex, /require\("\.\/lib\/validation"\)/);
  assert.match(functionsIndex, /validateGeminiRequest\(request\.data\)/);
  assert.match(functionsIndex, /validateOcrRequest\(request\.data\)/);
  assert.match(validation, /MAX_GEMINI_REQUEST_BYTES/);
  assert.match(validation, /MAX_OCR_BASE64_LENGTH/);
  assert.match(functionsIndex, /require\("\.\/services\/notification-service"\)/);
  assert.match(functionsIndex, /deliverNotification\(\{ db: getFirestore\(\), messaging: getMessaging\(\), data \}\)/);
  assert.match(notificationProvider, /function buildMulticastMessage/);
  assert.match(notificationService, /async function deliverNotification/);
});

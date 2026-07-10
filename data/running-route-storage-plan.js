import {
  RUNNING_ROUTE_CHUNK_SIZE,
  RunningRouteIntegrityError,
  chunkRunningRoute,
  normalizeRunningRoutePoints,
} from '../workout/running-route-store.js';

export const RUNNING_ROUTE_STORAGE_VERSION = 1;
export const RUNNING_ROUTE_CHUNK_MAX_BYTES = 900_000;
export const RUNNING_ROUTE_REF_FIELDS = Object.freeze([
  'version',
  'routeId',
  'revision',
  'pointCount',
  'chunkCount',
  'firstTimestampMs',
  'lastTimestampMs',
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

function _integrity(reason) {
  throw new RunningRouteIntegrityError(reason);
}

function _safeCount(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    _integrity(`${field} must be a non-negative safe integer`);
  }
  return value;
}

function _timestamp(value, field) {
  const timestamp = _safeCount(value, field);
  if (timestamp > Number.MAX_SAFE_INTEGER) _integrity(`${field} exceeds Number.MAX_SAFE_INTEGER`);
  return timestamp;
}

async function _sha256Hex(value) {
  if (!globalThis.crypto?.subtle || typeof TextEncoder !== 'function') {
    _integrity('SHA-256 is unavailable in this runtime');
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function _assertChunkByteLimits(chunks) {
  for (const chunk of chunks) {
    const byteLength = new TextEncoder().encode(JSON.stringify(chunk)).byteLength;
    if (byteLength > RUNNING_ROUTE_CHUNK_MAX_BYTES) {
      _integrity(`chunk ${chunk.index} encoded size ${byteLength} exceeds ${RUNNING_ROUTE_CHUNK_MAX_BYTES} bytes`);
    }
  }
}

export function buildRunningRouteId(version, firstTimestampMs, revision) {
  return `v${version}-${firstTimestampMs}-${revision}`;
}

export function assertRunningRouteReference(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    _integrity('runRouteRef must be an object');
  }
  if (value.version !== RUNNING_ROUTE_STORAGE_VERSION) {
    _integrity(`runRouteRef version must be ${RUNNING_ROUTE_STORAGE_VERSION}`);
  }
  if (typeof value.revision !== 'string' || !SHA256_PATTERN.test(value.revision)) {
    _integrity('runRouteRef revision must be a SHA-256 hex digest');
  }

  const pointCount = _safeCount(value.pointCount, 'runRouteRef pointCount');
  if (pointCount < 1) _integrity('runRouteRef pointCount must be at least 1');
  const chunkCount = _safeCount(value.chunkCount, 'runRouteRef chunkCount');
  const expectedChunkCount = Math.ceil(pointCount / RUNNING_ROUTE_CHUNK_SIZE);
  if (chunkCount !== expectedChunkCount) {
    _integrity(`runRouteRef chunkCount must be ${expectedChunkCount}`);
  }

  const firstTimestampMs = _timestamp(value.firstTimestampMs, 'runRouteRef firstTimestampMs');
  const lastTimestampMs = _timestamp(value.lastTimestampMs, 'runRouteRef lastTimestampMs');
  if (lastTimestampMs < firstTimestampMs) {
    _integrity('runRouteRef timestamps must be non-decreasing');
  }
  const expectedRouteId = buildRunningRouteId(value.version, firstTimestampMs, value.revision);
  if (value.routeId !== expectedRouteId) {
    _integrity('runRouteRef routeId does not match its version, start timestamp, and revision');
  }

  return Object.freeze(Object.fromEntries(
    RUNNING_ROUTE_REF_FIELDS.map(field => [field, value[field]]),
  ));
}

export async function verifyRunningRouteContent(runRouteRef, points) {
  const ref = assertRunningRouteReference(runRouteRef);
  const canonicalPoints = normalizeRunningRoutePoints(points);
  const firstTimestampMs = canonicalPoints[0]?.ts;
  const lastTimestampMs = canonicalPoints.at(-1)?.ts;
  if (canonicalPoints.length !== ref.pointCount) {
    _integrity('hydrated route pointCount does not match runRouteRef');
  }
  if (firstTimestampMs !== ref.firstTimestampMs || lastTimestampMs !== ref.lastTimestampMs) {
    _integrity('hydrated route timestamps do not match runRouteRef');
  }
  const revision = await _sha256Hex(JSON.stringify(canonicalPoints));
  if (revision !== ref.revision) {
    _integrity('hydrated route content does not match runRouteRef revision');
  }
  return canonicalPoints;
}

export async function buildRunningRouteStoragePlan(points) {
  const canonicalPoints = normalizeRunningRoutePoints(points);
  if (canonicalPoints.length === 0) _integrity('running route must contain at least one point');

  const revision = await _sha256Hex(JSON.stringify(canonicalPoints));
  const firstTimestampMs = canonicalPoints[0].ts;
  const lastTimestampMs = canonicalPoints.at(-1).ts;
  const chunks = chunkRunningRoute(canonicalPoints, revision);
  _assertChunkByteLimits(chunks);
  const ref = assertRunningRouteReference({
    version: RUNNING_ROUTE_STORAGE_VERSION,
    routeId: buildRunningRouteId(RUNNING_ROUTE_STORAGE_VERSION, firstTimestampMs, revision),
    revision,
    pointCount: canonicalPoints.length,
    chunkCount: chunks.length,
    firstTimestampMs,
    lastTimestampMs,
  });

  return {
    ref,
    metadata: Object.freeze({ ...ref, complete: true }),
    chunks,
  };
}

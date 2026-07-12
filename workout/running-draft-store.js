export const RUNNING_DRAFT_STORAGE_VERSION = 2;
export const RUNNING_DRAFT_ROUTE_CHUNK_SIZE = 500;

function _parse(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}
function _chunkKey(draftKey, index) {
  return `${draftKey}:route:${String(index).padStart(4, '0')}`;
}

function _chunkCount(meta) {
  const count = Number(meta?.routeChunkCount);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

export function readRunningDraftRecord(storage, draftKey) {
  if (!storage || !draftKey) return null;
  const meta = _parse(storage.getItem(draftKey));
  if (!meta) return null;
  if (meta.storage !== 'chunked-route-v2') return meta;

  const route = [];
  const count = _chunkCount(meta);
  for (let index = 0; index < count; index += 1) {
    const chunk = _parse(storage.getItem(_chunkKey(draftKey, index)));
    if (!Array.isArray(chunk?.points)) return null;
    route.push(...chunk.points);
  }
  const pointCount = Math.max(0, Math.floor(Number(meta.routePointCount) || 0));
  if (route.length < pointCount) return null;
  return { ...meta, route: route.slice(0, pointCount) };
}

export function writeRunningDraftRecord(storage, draftKey, activeKey, draft, activeMarker) {
  if (!storage || !draftKey || !draft || !activeMarker) return null;
  const route = Array.isArray(draft.route) ? draft.route : [];
  const previous = _parse(storage.getItem(draftKey));
  const previousPointCount = previous?.storage === 'chunked-route-v2'
    ? Math.max(0, Math.floor(Number(previous.routePointCount) || 0))
    : 0;
  const previousChunkCount = previous?.storage === 'chunked-route-v2' ? _chunkCount(previous) : 0;
  const chunkCount = Math.ceil(route.length / RUNNING_DRAFT_ROUTE_CHUNK_SIZE);
  const firstMutableChunk = Math.floor(previousPointCount / RUNNING_DRAFT_ROUTE_CHUNK_SIZE);

  for (let index = firstMutableChunk; index < chunkCount; index += 1) {
    const offset = index * RUNNING_DRAFT_ROUTE_CHUNK_SIZE;
    const points = route.slice(offset, offset + RUNNING_DRAFT_ROUTE_CHUNK_SIZE);
    storage.setItem(_chunkKey(draftKey, index), JSON.stringify({ index, points }));
  }
  for (let index = chunkCount; index < previousChunkCount; index += 1) {
    storage.removeItem(_chunkKey(draftKey, index));
  }

  const { route: _route, ...metadata } = draft;
  const record = {
    ...metadata,
    version: RUNNING_DRAFT_STORAGE_VERSION,
    storage: 'chunked-route-v2',
    routePointCount: route.length,
    routeChunkCount: chunkCount,
    routeChunkSize: RUNNING_DRAFT_ROUTE_CHUNK_SIZE,
  };
  storage.setItem(draftKey, JSON.stringify(record));
  storage.setItem(activeKey, JSON.stringify(activeMarker));
  return record;
}

export function clearRunningDraftRecord(storage, draftKey) {
  if (!storage || !draftKey) return;
  const record = _parse(storage.getItem(draftKey));
  const count = record?.storage === 'chunked-route-v2' ? _chunkCount(record) : 0;
  for (let index = 0; index < count; index += 1) {
    storage.removeItem(_chunkKey(draftKey, index));
  }
  storage.removeItem(draftKey);
}

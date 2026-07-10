export const MAX_RUNNING_ROUTE_POINTS = 25_000;
export const RUNNING_ROUTE_CHUNK_SIZE = 250;
export class RunningRouteError extends Error {
  constructor(message, code) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}
export class RunningRoutePointError extends RunningRouteError {
  constructor(index, reason) {
    super(`Invalid running route point at index ${index}: ${reason}`, 'INVALID_ROUTE_POINT');
    this.index = index;
    this.reason = reason;
  }
}
export class RunningRouteOverflowError extends RunningRoutePointError {
  constructor(pointCount) {
    const reason = `point count ${pointCount} exceeds the 25,000-point limit`;
    super(MAX_RUNNING_ROUTE_POINTS, reason);
    this.code = 'ROUTE_POINT_OVERFLOW';
    this.pointCount = pointCount;
    this.maxPointCount = MAX_RUNNING_ROUTE_POINTS;
  }
}
export class RunningRouteIntegrityError extends RunningRouteError {
  constructor(reason) {
    super(`Running route integrity check failed: ${reason}`, 'ROUTE_INTEGRITY');
    this.reason = reason;
  }
}
const OPTIONAL_FINITE_FIELDS = ['accuracy', 'altitude', 'speed', 'heartRateBpm', 'cadenceSpm', 'bearing'];
function _has(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
function _pointError(index, reason) {
  throw new RunningRoutePointError(index, reason);
}
function _assertRouteSize(pointCount) {
  if (pointCount > MAX_RUNNING_ROUTE_POINTS) {
    throw new RunningRouteOverflowError(pointCount);
  }
}
function _assertFinite(value, index, reason) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    _pointError(index, `${reason} must be a finite number`);
  }
}
function _normalizePoint(point, index) {
  if (!point || typeof point !== 'object' || Array.isArray(point)) {
    _pointError(index, 'point must be an object');
  }

  _assertFinite(point.lat, index, 'latitude');
  _assertFinite(point.lng, index, 'longitude');
  if (point.lat < -90 || point.lat > 90) {
    _pointError(index, 'latitude must be between -90 and 90');
  }
  if (point.lng < -180 || point.lng > 180) {
    _pointError(index, 'longitude must be between -180 and 180');
  }

  const hasTs = _has(point, 'ts');
  const hasTimestampMs = _has(point, 'timestampMs');
  if (!hasTs && !hasTimestampMs) {
    _pointError(index, 'timestamp is required');
  }
  for (const field of ['ts', 'timestampMs']) {
    if (_has(point, field)) {
      _assertFinite(point[field], index, 'timestamp');
      if (point[field] < 0 || point[field] > Number.MAX_SAFE_INTEGER) {
        _pointError(index, 'timestamp must be between 0 and Number.MAX_SAFE_INTEGER');
      }
    }
  }
  if (hasTs && hasTimestampMs && point.ts !== point.timestampMs) {
    _pointError(index, 'timestamp aliases ts and timestampMs must match');
  }

  for (const field of OPTIONAL_FINITE_FIELDS) {
    if (_has(point, field) && point[field] !== null) {
      _assertFinite(point[field], index, field);
    }
  }

  if (_has(point, 'segmentId') && point.segmentId !== null
    && (!Number.isSafeInteger(point.segmentId) || point.segmentId < 0)) {
    _pointError(index, 'segmentId must be a non-negative integer');
  }
  if (_has(point, 'gapBefore') && point.gapBefore !== null && typeof point.gapBefore !== 'boolean') {
    _pointError(index, 'gapBefore must be a boolean');
  }
  if (_has(point, 'gapReason') && point.gapReason !== null && typeof point.gapReason !== 'string') {
    _pointError(index, 'gapReason must be a string');
  }

  const normalized = { lat: point.lat, lng: point.lng, ts: hasTs ? point.ts : point.timestampMs };
  for (const field of OPTIONAL_FINITE_FIELDS) {
    if (_has(point, field) && point[field] !== null) normalized[field] = point[field];
  }
  if (_has(point, 'segmentId') && point.segmentId !== null) normalized.segmentId = point.segmentId;
  if (point.gapBefore === true) normalized.gapBefore = true;
  if (typeof point.gapReason === 'string') {
    const gapReason = point.gapReason.trim().slice(0, 48);
    if (gapReason) normalized.gapReason = gapReason;
  }
  return normalized;
}
function _revision(value, owner = 'metadata') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RunningRouteIntegrityError(`${owner} revision is required`);
  }
  return value;
}
function _count(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RunningRouteIntegrityError(`${field} must be a non-negative integer`);
  }
  return value;
}
function _pickEvenly(indices, count) {
  if (count <= 0) return [];
  if (count >= indices.length) return [...indices];
  if (count === 1) return [indices[Math.floor((indices.length - 1) / 2)]];
  return Array.from({ length: count }, (_, slot) => (
    indices[Math.round(slot * (indices.length - 1) / (count - 1))]
  ));
}

function _isGapEdge(route, index) {
  if (index <= 0) return false;
  if (route[index].gapBefore === true) return true;
  const previousSegment = route[index - 1].segmentId;
  const nextSegment = route[index].segmentId;
  return Number.isSafeInteger(previousSegment)
    && Number.isSafeInteger(nextSegment)
    && previousSegment !== nextSegment;
}

export function normalizeRunningRoutePoints(points) {
  if (!Array.isArray(points)) {
    _pointError(-1, 'route must be an array');
  }
  _assertRouteSize(points.length);
  const route = points.map(_normalizePoint);
  for (let index = 1; index < route.length; index += 1) {
    if (route[index].ts < route[index - 1].ts) {
      _pointError(index, 'timestamp order must be non-decreasing');
    }
  }
  return route;
}

export function buildRunningRoutePreview(points, capacity = 240) {
  const route = normalizeRunningRoutePoints(points);
  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    throw new RunningRouteIntegrityError('preview capacity must be a positive integer');
  }
  if (route.length <= capacity) return route;
  if (capacity < 2) {
    throw new RunningRouteIntegrityError('preview capacity must preserve both endpoints');
  }

  const mandatory = new Set([0, route.length - 1]);
  for (let index = 1; index < route.length; index += 1) {
    if (_isGapEdge(route, index)) {
      mandatory.add(index - 1);
      mandatory.add(index);
    }
  }

  const required = [...mandatory].sort((a, b) => a - b);
  let selected;
  if (required.length > capacity) {
    selected = _pickEvenly(required, capacity);
  } else {
    const available = route.map((_, index) => index).filter(index => !mandatory.has(index));
    selected = required.concat(_pickEvenly(available, capacity - required.length));
  }

  return selected.sort((a, b) => a - b).map(index => ({ ...route[index] }));
}

export function chunkRunningRoute(points, revision) {
  const routeRevision = _revision(revision, 'chunk');
  const route = normalizeRunningRoutePoints(points);
  const chunks = [];
  for (let offset = 0; offset < route.length; offset += RUNNING_ROUTE_CHUNK_SIZE) {
    const chunkPoints = route.slice(offset, offset + RUNNING_ROUTE_CHUNK_SIZE);
    chunks.push({
      index: chunks.length,
      revision: routeRevision,
      pointCount: chunkPoints.length,
      points: chunkPoints,
    });
  }
  return chunks;
}

export function hydrateRunningRouteChunks(metadata, chunks) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new RunningRouteIntegrityError('metadata is required');
  }
  if (metadata.complete !== true) {
    throw new RunningRouteIntegrityError('metadata complete must be true');
  }

  const revision = _revision(metadata.revision);
  const pointCount = _count(metadata.pointCount, 'metadata pointCount');
  const chunkCount = _count(metadata.chunkCount, 'metadata chunkCount');
  _assertRouteSize(pointCount);

  const expectedChunkCount = Math.ceil(pointCount / RUNNING_ROUTE_CHUNK_SIZE);
  if (chunkCount !== expectedChunkCount) {
    throw new RunningRouteIntegrityError(`metadata chunkCount ${chunkCount} does not match pointCount ${pointCount}`);
  }
  if (!Array.isArray(chunks) || chunks.length !== chunkCount) {
    throw new RunningRouteIntegrityError(`chunk count must be exactly ${chunkCount}`);
  }

  const points = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    if (!chunk || typeof chunk !== 'object' || Array.isArray(chunk)) {
      throw new RunningRouteIntegrityError(`chunk ${index} must be an object`);
    }
    if (chunk.index !== index) {
      throw new RunningRouteIntegrityError(`chunk index/order mismatch at ${index}`);
    }
    if (chunk.revision !== revision) {
      throw new RunningRouteIntegrityError(`chunk ${index} revision does not match metadata revision`);
    }
    if (!Array.isArray(chunk.points)) {
      throw new RunningRouteIntegrityError(`chunk ${index} points must be an array`);
    }

    const declaredCount = _count(chunk.pointCount, `chunk ${index} pointCount`);
    const expectedCount = Math.min(RUNNING_ROUTE_CHUNK_SIZE, pointCount - points.length);
    if (declaredCount !== chunk.points.length || declaredCount !== expectedCount) {
      throw new RunningRouteIntegrityError(`chunk ${index} pointCount does not match its expected count`);
    }
    points.push(...chunk.points);
  }

  if (points.length !== pointCount) {
    throw new RunningRouteIntegrityError(`hydrated pointCount ${points.length} does not match metadata pointCount ${pointCount}`);
  }
  return normalizeRunningRoutePoints(points);
}

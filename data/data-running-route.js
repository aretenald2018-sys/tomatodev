import {
  collection,
  db,
  doc,
  getDataOwnerId,
  getDoc,
  getDocs,
  orderBy,
  query,
  writeBatch,
} from './data-core.js';
import {
  RUNNING_ROUTE_REF_FIELDS,
  assertRunningRouteReference,
  buildRunningRouteStoragePlan,
  verifyRunningRouteContent,
} from './running-route-storage-plan.js';
import {
  RunningRouteError,
  RunningRouteIntegrityError,
  hydrateRunningRouteChunks,
} from '../workout/running-route-store.js';

export class RunningRouteRepositoryError extends Error {
  constructor(message, code, options) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export class RunningRouteAuthenticationError extends RunningRouteRepositoryError {
  constructor() {
    super('Running route access requires an authenticated data owner', 'RUNNING_ROUTE_AUTH_REQUIRED');
  }
}

export class RunningRouteWriteError extends RunningRouteRepositoryError {
  constructor(cause) {
    super('Failed to commit the complete running route', 'RUNNING_ROUTE_WRITE_FAILED', { cause });
  }
}

export class RunningRouteReadError extends RunningRouteRepositoryError {
  constructor(cause) {
    super('Failed to read the complete running route', 'RUNNING_ROUTE_READ_FAILED', { cause });
  }
}

export class RunningRouteNotFoundError extends RunningRouteRepositoryError {
  constructor(routeId) {
    super(`Running route not found: ${routeId}`, 'RUNNING_ROUTE_NOT_FOUND');
    this.routeId = routeId;
  }
}

const DEFAULT_FIRESTORE = {
  collection,
  db,
  doc,
  getDataOwnerId,
  getDoc,
  getDocs,
  orderBy,
  query,
  writeBatch,
};

function _ownerId(api) {
  const ownerId = api.getDataOwnerId();
  if (typeof ownerId !== 'string' || ownerId.trim() === '') {
    throw new RunningRouteAuthenticationError();
  }
  return ownerId;
}

function _parentRef(api, ownerId, routeId) {
  return api.doc(api.db, 'users', ownerId, 'running_routes', routeId);
}

function _chunkRef(api, ownerId, routeId, index) {
  return api.doc(
    api.db,
    'users', ownerId,
    'running_routes', routeId,
    'chunks', String(index).padStart(3, '0'),
  );
}

function _chunksQuery(api, ownerId, routeId) {
  const chunks = api.collection(api.db, 'users', ownerId, 'running_routes', routeId, 'chunks');
  return api.query(chunks, api.orderBy('index', 'asc'));
}

function _assertParentMatchesRef(ref, metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new RunningRouteIntegrityError('running route parent metadata is required');
  }
  if (metadata.complete !== true) {
    throw new RunningRouteIntegrityError('running route parent complete must be true');
  }
  for (const field of RUNNING_ROUTE_REF_FIELDS) {
    if (metadata[field] !== ref[field]) {
      throw new RunningRouteIntegrityError(`running route parent ${field} does not match runRouteRef`);
    }
  }
}

function _isRouteError(error) {
  return error instanceof RunningRouteError || error instanceof RunningRouteRepositoryError;
}

export function createRunningRouteRepository(overrides = {}) {
  const api = { ...DEFAULT_FIRESTORE, ...overrides };

  async function saveRunningRoute(points) {
    const ownerId = _ownerId(api);
    const plan = await buildRunningRouteStoragePlan(points);
    const batch = api.writeBatch(api.db);
    batch.set(_parentRef(api, ownerId, plan.ref.routeId), plan.metadata);
    plan.chunks.forEach(chunk => {
      batch.set(_chunkRef(api, ownerId, plan.ref.routeId, chunk.index), chunk);
    });
    try {
      await batch.commit();
    } catch (error) {
      throw new RunningRouteWriteError(error);
    }
    return plan.ref;
  }

  async function loadRunningRoute(runRouteRef) {
    const ownerId = _ownerId(api);
    const ref = assertRunningRouteReference(runRouteRef);
    try {
      const parentSnapshot = await api.getDoc(_parentRef(api, ownerId, ref.routeId));
      if (!parentSnapshot.exists()) throw new RunningRouteNotFoundError(ref.routeId);
      const metadata = parentSnapshot.data();
      _assertParentMatchesRef(ref, metadata);
      const chunkSnapshot = await api.getDocs(_chunksQuery(api, ownerId, ref.routeId));
      const chunks = chunkSnapshot.docs.map(snapshot => snapshot.data());
      const points = hydrateRunningRouteChunks(metadata, chunks);
      return await verifyRunningRouteContent(ref, points);
    } catch (error) {
      if (_isRouteError(error)) throw error;
      throw new RunningRouteReadError(error);
    }
  }

  return Object.freeze({ saveRunningRoute, loadRunningRoute });
}

const runningRouteRepository = createRunningRouteRepository();

export const saveRunningRoute = runningRouteRepository.saveRunningRoute;
export const loadRunningRoute = runningRouteRepository.loadRunningRoute;

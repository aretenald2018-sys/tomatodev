function _assertHydratedPoints(points, routeRef) {
  if (!Array.isArray(points)) {
    throw new TypeError('hydrated running route must be an array');
  }
  const expectedCount = Number(routeRef?.pointCount);
  if (Number.isFinite(expectedCount) && points.length !== expectedCount) {
    throw new TypeError('hydrated running route point count does not match its reference');
  }
  return points;
}

export function createRunningRouteHydrationController(loadRoute) {
  if (typeof loadRoute !== 'function') {
    throw new TypeError('running route loader must be a function');
  }

  let generation = 0;
  const payloads = new Set();

  function register({ points = [], routeRef = null } = {}) {
    const payload = {
      points: Array.isArray(points) ? points : [],
      routeRef: routeRef || null,
      status: routeRef ? 'idle' : 'ready',
      error: null,
      promise: null,
      generation,
    };
    payloads.add(payload);
    return payload;
  }

  function hydrate(payload) {
    if (!payload || payload.generation !== generation || !payloads.has(payload)) {
      return Promise.resolve({ status: 'stale', points: [] });
    }
    if (!payload.routeRef) {
      payload.status = 'ready';
      return Promise.resolve({ status: 'ready', points: payload.points });
    }
    if (payload.status === 'ready') {
      return Promise.resolve({ status: 'ready', points: payload.points });
    }
    if (payload.promise) return payload.promise;

    payload.status = 'loading';
    payload.error = null;
    const requestGeneration = generation;
    let loaded;
    try {
      loaded = loadRoute(payload.routeRef);
    } catch (error) {
      loaded = Promise.reject(error);
    }

    const promise = Promise.resolve(loaded)
      .then((points) => {
        if (requestGeneration !== generation || payload.generation !== generation || !payloads.has(payload)) {
          return { status: 'stale', points: payload.points };
        }
        payload.points = _assertHydratedPoints(points, payload.routeRef);
        payload.status = 'ready';
        payload.promise = null;
        return { status: 'ready', points: payload.points };
      })
      .catch((error) => {
        if (requestGeneration === generation && payload.generation === generation && payloads.has(payload)) {
          payload.status = 'error';
          payload.error = error;
          payload.promise = null;
        }
        throw error;
      });
    payload.promise = promise;
    return promise;
  }

  function invalidateAll() {
    generation += 1;
    payloads.forEach((payload) => {
      payload.status = 'stale';
      payload.promise = null;
    });
    payloads.clear();
  }

  return Object.freeze({
    register,
    hydrate,
    invalidateAll,
  });
}

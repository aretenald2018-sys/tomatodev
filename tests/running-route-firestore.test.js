import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  RUNNING_ROUTE_CHUNK_MAX_BYTES,
  buildRunningRouteStoragePlan,
} from '../data/running-route-storage-plan.js';
import { normalizeRunningRoutePoints } from '../workout/running-route-store.js';

const OWNER_ID = 'route-owner';
function denseCurve(count = 620) {
  const start = 1_783_632_000_000;
  return Array.from({ length: count }, (_, index) => ({
    lat: 37.5219 + Math.sin(index / 20) * 0.0042,
    lng: 127.1231 + Math.cos(index / 20) * 0.0053,
    ts: start + index * 1_000,
    accuracy: 4 + (index % 3),
    altitude: 18 + Math.sin(index / 10),
    speed: 3.1,
    segmentId: index < 400 ? 0 : 1,
    ...(index === 400 ? { gapBefore: true, gapReason: 'time-gap' } : {}),
  }));
}
class FakeFirestoreSurface {
  constructor(ownerId = OWNER_ID) {
    this.ownerId = ownerId;
    this.documents = new Map();
    this.commitCount = 0;
    this.lastCommitOperations = [];
    this.lastQuery = null;
    this.failNextCommit = false;
    this.transformChunkReads = rows => rows;

    this.api = {
      db: { fake: true },
      getDataOwnerId: () => this.ownerId,
      doc: (_db, ...segments) => ({ path: segments.join('/') }),
      collection: (_db, ...segments) => ({ path: segments.join('/') }),
      orderBy: (field, direction) => ({ field, direction }),
      query: (collectionRef, ordering) => ({ collectionRef, ordering }),
      getDoc: async ref => this.#snapshot(ref.path),
      getDocs: async queryRef => this.#querySnapshot(queryRef),
      writeBatch: () => this.#batch(),
    };
  }
  #snapshot(documentPath) {
    const value = this.documents.get(documentPath);
    return {
      exists: () => value !== undefined,
      data: () => value === undefined ? undefined : structuredClone(value),
    };
  }
  #querySnapshot(queryRef) {
    this.lastQuery = queryRef;
    const prefix = `${queryRef.collectionRef.path}/`;
    let rows = [...this.documents.entries()]
      .filter(([documentPath]) => documentPath.startsWith(prefix))
      .map(([documentPath, value]) => ({ documentPath, value: structuredClone(value) }))
      .sort((left, right) => left.value.index - right.value.index);
    rows = this.transformChunkReads(rows);
    return { docs: rows.map(row => ({ id: path.posix.basename(row.documentPath), data: () => row.value })) };
  }
  #batch() {
    const operations = [];
    return {
      set: (ref, value) => operations.push({ type: 'set', path: ref.path, value: structuredClone(value) }),
      commit: async () => {
        this.commitCount += 1;
        this.lastCommitOperations = structuredClone(operations);
        if (this.failNextCommit) {
          this.failNextCommit = false;
          throw new Error('fake commit failed');
        }
        const next = new Map(this.documents);
        operations.forEach(operation => next.set(operation.path, operation.value));
        this.documents = next;
      },
    };
  }
}
async function importAdapterWithStubbedCore() {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'running-route-firestore-'));
  try {
    const sourcePath = new URL('../data/data-running-route.js', import.meta.url);
    const storagePlanUrl = new URL('../data/running-route-storage-plan.js', import.meta.url).href;
    const routeStoreUrl = new URL('../workout/running-route-store.js', import.meta.url).href;
    const stubPath = path.join(tempDir, 'data-core-stub.mjs');
    const adapterPath = path.join(tempDir, 'data-running-route.mjs');
    const source = await readFile(sourcePath, 'utf8');
    await writeFile(stubPath, `
export const db = {};
const stub = () => { throw new Error('unused core stub'); };
export { stub as doc, stub as collection, stub as query, stub as orderBy, stub as getDoc, stub as getDocs, stub as writeBatch };
export const getDataOwnerId = () => null;
`, 'utf8');
    const rewritten = source
      .replace("'./data-core.js'", JSON.stringify(pathToFileURL(stubPath).href))
      .replace("'./running-route-storage-plan.js'", JSON.stringify(storagePlanUrl))
      .replace("'../workout/running-route-store.js'", JSON.stringify(routeStoreUrl));
    await writeFile(adapterPath, rewritten, 'utf8');
    const adapter = await import(`${pathToFileURL(adapterPath).href}?test=${Date.now()}`);
    return { adapter, cleanup: () => rm(tempDir, { recursive: true, force: true }) };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}
async function withRepository(run, ownerId = OWNER_ID) {
  const { adapter, cleanup } = await importAdapterWithStubbedCore();
  const surface = new FakeFirestoreSurface(ownerId);
  const repository = adapter.createRunningRouteRepository(surface.api);
  try {
    await run({ adapter, repository, surface });
  } finally {
    await cleanup();
  }
}
function parentPath(ref) {
  return `users/${OWNER_ID}/running_routes/${ref.routeId}`;
}
function chunkPath(ref, index) {
  return `${parentPath(ref)}/chunks/${String(index).padStart(3, '0')}`;
}
test('620 points write metadata and [250, 250, 120] chunks in one atomic batch', async () => {
  await withRepository(async ({ repository, surface }) => {
    const ref = await repository.saveRunningRoute(denseCurve());
    assert.equal(surface.commitCount, 1);
    assert.equal(surface.lastCommitOperations.length, 4);
    assert.deepEqual(surface.lastCommitOperations.map(operation => operation.path), [
      parentPath(ref), chunkPath(ref, 0), chunkPath(ref, 1), chunkPath(ref, 2),
    ]);
    assert.deepEqual([0, 1, 2].map(index => surface.documents.get(chunkPath(ref, index)).points.length), [250, 250, 120]);
    assert.equal([0, 1, 2].every(index => (
      new TextEncoder().encode(JSON.stringify(surface.documents.get(chunkPath(ref, index)))).byteLength
        < RUNNING_ROUTE_CHUNK_MAX_BYTES
    )), true);
    assert.deepEqual(surface.documents.get(parentPath(ref)), { ...ref, complete: true });
    assert.deepEqual(Object.keys(ref).sort(), [
      'chunkCount', 'firstTimestampMs', 'lastTimestampMs', 'pointCount', 'revision', 'routeId', 'version',
    ]);
  });
});
test('changed routes use disjoint immutable parent and chunk paths', async () => {
  await withRepository(async ({ repository, surface }) => {
    const route = denseCurve();
    const firstRef = await repository.saveRunningRoute(route);
    const firstPaths = new Set(surface.lastCommitOperations.map(operation => operation.path));
    route[311].lat += 0.000001;
    const secondRef = await repository.saveRunningRoute(route);
    const secondPaths = surface.lastCommitOperations.map(operation => operation.path);
    assert.notEqual(secondRef.routeId, firstRef.routeId);
    assert.equal(secondPaths.every(documentPath => !firstPaths.has(documentPath)), true);
    assert.equal(surface.documents.size, 8);
    assert.notEqual((await repository.loadRunningRoute(firstRef))[311].lat, route[311].lat);
    assert.equal((await repository.loadRunningRoute(secondRef))[311].lat, route[311].lat);
  });
});
test('a max-field 250-point chunk remains below the encoded byte ceiling', async () => {
  const points = Array.from({ length: 250 }, () => ({
    lat: 90, lng: 180, ts: Number.MAX_SAFE_INTEGER,
    accuracy: Number.MAX_VALUE, altitude: -Number.MAX_VALUE, speed: Number.MAX_VALUE,
    heartRateBpm: Number.MAX_VALUE, cadenceSpm: Number.MAX_VALUE, bearing: Number.MAX_VALUE,
    segmentId: Number.MAX_SAFE_INTEGER, gapBefore: true, gapReason: 'x'.repeat(48),
  }));
  const plan = await buildRunningRouteStoragePlan(points);
  const byteLength = new TextEncoder().encode(JSON.stringify(plan.chunks[0])).byteLength;
  assert.equal(plan.chunks.length, 1);
  assert.ok(byteLength < RUNNING_ROUTE_CHUNK_MAX_BYTES);
});
test('content-addressed route references are deterministic and immutable', async () => {
  const route = denseCurve();
  const same = structuredClone(route);
  const coordinateChanged = structuredClone(route);
  const timestampChanged = structuredClone(route);
  coordinateChanged[311].lat += 0.000001;
  timestampChanged[311].ts += 1;

  const first = await buildRunningRouteStoragePlan(route);
  const second = await buildRunningRouteStoragePlan(same);
  const coordinateRef = (await buildRunningRouteStoragePlan(coordinateChanged)).ref;
  const timestampRef = (await buildRunningRouteStoragePlan(timestampChanged)).ref;
  assert.deepEqual(second.ref, first.ref);
  assert.equal(Object.isFrozen(first.ref), true);
  assert.notEqual(coordinateRef.revision, first.ref.revision);
  assert.notEqual(coordinateRef.routeId, first.ref.routeId);
  assert.notEqual(timestampRef.revision, first.ref.revision);
  assert.notEqual(timestampRef.routeId, first.ref.routeId);
});

test('a failed batch commit publishes no ref and no partial documents', async () => {
  await withRepository(async ({ adapter, repository, surface }) => {
    surface.failNextCommit = true;
    let publishedRef = null;
    await assert.rejects(
      async () => { publishedRef = await repository.saveRunningRoute(denseCurve()); },
      error => error instanceof adapter.RunningRouteWriteError && error.code === 'RUNNING_ROUTE_WRITE_FAILED',
    );
    assert.equal(publishedRef, null);
    assert.equal(surface.documents.size, 0);
    assert.equal(surface.lastCommitOperations.length, 4);
  });
});

test('unauthenticated route writes and reads reject instead of using _orphan', async () => {
  await withRepository(async ({ adapter, repository, surface }) => {
    await assert.rejects(() => repository.saveRunningRoute(denseCurve()), adapter.RunningRouteAuthenticationError);
    await assert.rejects(
      () => repository.loadRunningRoute({ version: 1, routeId: 'missing', revision: 'x', pointCount: 1, chunkCount: 1, firstTimestampMs: 1, lastTimestampMs: 1 }),
      adapter.RunningRouteAuthenticationError,
    );
    assert.equal(surface.commitCount, 0);
    assert.equal(surface.documents.size, 0);
  }, null);
});

test('load rejects missing parent, incomplete metadata, and stale parent revision', async () => {
  await withRepository(async ({ adapter, repository, surface }) => {
    const ref = await repository.saveRunningRoute(denseCurve());
    surface.documents.delete(parentPath(ref));
    await assert.rejects(() => repository.loadRunningRoute(ref), adapter.RunningRouteNotFoundError);

    surface.documents.set(parentPath(ref), { ...ref, complete: false });
    await assert.rejects(() => repository.loadRunningRoute(ref), /complete/i);

    surface.documents.set(parentPath(ref), { ...ref, complete: true, revision: 'stale-parent-revision' });
    await assert.rejects(() => repository.loadRunningRoute(ref), /revision/i);
  });
});

test('load rejects stale, missing, reordered, and point-count-mismatched chunks', async () => {
  await withRepository(async ({ repository, surface }) => {
    const ref = await repository.saveRunningRoute(denseCurve());
    const parent = structuredClone(surface.documents.get(parentPath(ref)));
    const chunks = [0, 1, 2].map(index => structuredClone(surface.documents.get(chunkPath(ref, index))));

    surface.documents.set(chunkPath(ref, 1), { ...chunks[1], revision: 'stale-chunk-revision' });
    await assert.rejects(() => repository.loadRunningRoute(ref), /revision/i);

    const corruptedPoints = structuredClone(chunks[1].points);
    corruptedPoints[0].lat += 0.000001;
    surface.documents.set(chunkPath(ref, 1), { ...chunks[1], points: corruptedPoints });
    await assert.rejects(() => repository.loadRunningRoute(ref), /revision/i);

    surface.documents.set(chunkPath(ref, 1), chunks[1]);
    surface.documents.delete(chunkPath(ref, 2));
    await assert.rejects(() => repository.loadRunningRoute(ref), /chunk/i);

    surface.documents.set(chunkPath(ref, 2), chunks[2]);
    surface.transformChunkReads = rows => [rows[1], rows[0], ...rows.slice(2)];
    await assert.rejects(() => repository.loadRunningRoute(ref), /index|order/i);

    surface.transformChunkReads = rows => rows;
    surface.documents.set(parentPath(ref), { ...parent, pointCount: 619 });
    await assert.rejects(() => repository.loadRunningRoute({ ...ref, pointCount: 619 }), /point.?count/i);
  });
});

test('valid load returns all 620 canonical points ordered by chunk index', async () => {
  await withRepository(async ({ repository, surface }) => {
    const input = denseCurve();
    const ref = await repository.saveRunningRoute(input);
    const loaded = await repository.loadRunningRoute(ref);
    assert.deepEqual(loaded, normalizeRunningRoutePoints(input));
    assert.equal(loaded.length, 620);
    assert.deepEqual(surface.lastQuery.ordering, { field: 'index', direction: 'asc' });
    console.log(`MANUAL_QA commitOperations=${surface.lastCommitOperations.length} roundtripPoints=${loaded.length}`);
  });
});

test('data.js exposes the repository and data-core exposes writeBatch', async () => {
  const [barrel, core] = await Promise.all([
    readFile(new URL('../data.js', import.meta.url), 'utf8'),
    readFile(new URL('../data/data-core.js', import.meta.url), 'utf8'),
  ]);
  assert.match(barrel, /export\s*\{[^}]*saveRunningRoute[^}]*loadRunningRoute[^}]*\}\s*from\s*['"]\.\/data\/data-running-route\.js['"]/s);
  assert.match(core, /export\s*\{[^}]*writeBatch[^}]*\}/s);
});

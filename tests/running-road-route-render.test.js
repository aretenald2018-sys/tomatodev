import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

import { buildRunningRouteModel, runningRouteDistanceMeters } from '../workout/running-route-policy.js';
import { buildRunningMapRenderModel, splitRunningMapSegments } from '../workout/running-map.js';
import { OLYMPIC_PARK_ROAD_ROUTE, OLYMPIC_PARK_ROAD_ROUTE_META } from './fixtures/olympic-park-road-route.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('routed Olympic Park footway fixture reaches the render model without coordinate loss', () => {
  assert.equal(OLYMPIC_PARK_ROAD_ROUTE_META.router, 'BRouter 1.7.9 trekking');
  assert.equal(OLYMPIC_PARK_ROAD_ROUTE_META.expectedTrackLengthM, 4177);
  assert.equal(OLYMPIC_PARK_ROAD_ROUTE.length, 51);

  const model = buildRunningRouteModel(OLYMPIC_PARK_ROAD_ROUTE);
  const mapModel = buildRunningMapRenderModel(model.renderRoute);
  const expectedCoordinates = OLYMPIC_PARK_ROAD_ROUTE.map(({ lat, lng }) => ({ lat, lng }));
  const renderedCoordinates = mapModel.route.map(({ lat, lng }) => ({ lat, lng }));

  assert.deepEqual(renderedCoordinates, expectedCoordinates);
  assert.equal(model.diagnostics.sourcePointCount, OLYMPIC_PARK_ROAD_ROUTE.length);
  assert.equal(model.diagnostics.renderPointCount, OLYMPIC_PARK_ROAD_ROUTE.length);
  assert.equal(model.diagnostics.renderDroppedPointCount, 0);
  assert.equal(mapModel.diagnostics.droppedInvalidPointCount, 0);
  assert.equal(mapModel.segments.length, 1);

  const measuredDistanceM = runningRouteDistanceMeters(OLYMPIC_PARK_ROAD_ROUTE);
  assert.ok(measuredDistanceM > 3_900 && measuredDistanceM < 4_300, `unexpected routed distance ${measuredDistanceM}`);
});

test('GPS accuracy and delivery delay affect distance policy but never mutate road geometry', () => {
  const route = OLYMPIC_PARK_ROAD_ROUTE.map(point => ({ ...point }));
  route[12].accuracy = 80;
  route[25].ts += 60_000;
  for (let index = 26; index < route.length; index += 1) route[index].ts += 60_000;

  const model = buildRunningRouteModel(route);
  assert.equal(model.renderRoute.length, route.length);
  assert.deepEqual(
    model.renderRoute.map(({ lat, lng }) => ({ lat, lng })),
    route.map(({ lat, lng }) => ({ lat, lng })),
  );
  assert.ok(model.movementRoute.length < model.renderRoute.length);
  assert.equal(splitRunningMapSegments(model.renderRoute).length, 1, 'delivery silence must not invent a route break');
});

test('real VWorld renderer emits every routed road vertex in one visible polyline', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'tomato-road-route-render-'));
  const htmlPath = path.join(tempDir, 'road-route.html');
  const mapUrl = pathToFileURL(path.join(repoRoot, 'workout/running-map.js')).href;
  const fixtureUrl = pathToFileURL(path.join(repoRoot, 'tests/fixtures/olympic-park-road-route.js')).href;
  try {
    await writeFile(htmlPath, `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<style>body{margin:0}.map{position:relative;width:390px;height:420px}.canvas{width:100%;height:100%}</style></head>
<body><div class="map" data-running-real-map><div class="canvas" data-running-map-canvas></div><div data-running-map-status></div></div>
<script type="module">
try {
  const [{ renderRunningMap }, { OLYMPIC_PARK_ROAD_ROUTE }] = await Promise.all([
    import(${JSON.stringify(mapUrl)}), import(${JSON.stringify(fixtureUrl)})
  ]);
  const shell = document.querySelector('[data-running-real-map]');
  await renderRunningMap(shell, {
    points: OLYMPIC_PARK_ROAD_ROUTE,
    phase: 'detail',
    config: { provider: 'vworld', label: 'VWorld', key: 'road-fixture', layer: 'base', configured: true }
  });
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const lines = [...shell.querySelectorAll('.wt-vworld-route-line')];
  window.__result = {
    sourcePointCount: Number(shell.dataset.mapSourcePointCount),
    renderPointCount: Number(shell.dataset.mapPointCount),
    droppedPointCount: Number(shell.dataset.mapDroppedPointCount),
    segmentCount: Number(shell.dataset.mapSegmentCount),
    svgLineCount: lines.length,
    svgVertexCount: lines.reduce((sum, line) => sum + line.getAttribute('points').trim().split(/\\s+/).length, 0),
    startMarkers: shell.querySelectorAll('.wt-vworld-route-start').length,
    endMarkers: shell.querySelectorAll('.wt-vworld-route-end').length,
    state: shell.dataset.mapState,
  };
} catch (error) { window.__error = String(error?.stack || error); }
</script></body></html>`, 'utf8');

    const browser = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files'] });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__result || window.__error, { timeout: 60_000 });
      const output = await page.evaluate(() => ({ result: window.__result || null, error: window.__error || null }));
      assert.equal(output.error, null);
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(output.result, {
        sourcePointCount: OLYMPIC_PARK_ROAD_ROUTE.length,
        renderPointCount: OLYMPIC_PARK_ROAD_ROUTE.length,
        droppedPointCount: 0,
        segmentCount: 1,
        svgLineCount: 1,
        svgVertexCount: OLYMPIC_PARK_ROAD_ROUTE.length,
        startMarkers: 1,
        endMarkers: 1,
        state: 'ready',
      });
    } finally {
      await browser.close();
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

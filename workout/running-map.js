// ================================================================
// workout/running-map.js — real map provider renderer for running
// ================================================================

import { CONFIG } from '../config.js';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const GOOGLE_CALLBACK = '__tomatoRunningGoogleMapsReady';
const TILE_SIZE = 256;
const VWORLD_TILE_BASE = 'https://api.vworld.kr/req/wmts/1.0.0';
const VWORLD_LAYER_SPECS = {
  base: { layer: 'Base', ext: 'png' },
  satellite: { layer: 'Satellite', ext: 'jpeg' },
  hybrid: { layer: 'Hybrid', ext: 'png' },
};

let _googleLoader = null;
let _tmapLoader = null;
const _instances = new WeakMap();

function _num(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function _point(point) {
  const lat = _num(point?.lat);
  const lng = _num(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function _clearNode(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

function _setState(shell, state, text = '') {
  if (!shell) return;
  shell.dataset.mapState = state;
  const status = shell.querySelector('[data-running-map-status]');
  if (status) {
    status.textContent = text;
    status.hidden = state === 'ready';
  }
}

function _providerLabel(provider) {
  if (provider === 'vworld') return 'VWorld';
  if (provider === 'google') return 'Google Maps';
  if (provider === 'tmap') return 'TMAP';
  return '실제 지도';
}

function _removeInstance(shell) {
  const instance = _instances.get(shell);
  if (!instance) return;
  try {
    for (const marker of instance.markers || []) marker?.setMap?.(null);
    for (const line of instance.lines || []) line?.setMap?.(null);
    instance.map?.destroy?.();
  } catch {}
  _instances.delete(shell);
}

export function normalizeRunningMapPoints(points = []) {
  return (Array.isArray(points) ? points : []).map(_point).filter(Boolean);
}

export function runningMapCenter(points = []) {
  const route = normalizeRunningMapPoints(points);
  if (!route.length) return { ...DEFAULT_CENTER };
  const sum = route.reduce((acc, p) => {
    acc.lat += p.lat;
    acc.lng += p.lng;
    return acc;
  }, { lat: 0, lng: 0 });
  return {
    lat: sum.lat / route.length,
    lng: sum.lng / route.length,
  };
}

function _normalizeVworldLayer(layer) {
  const normalized = String(layer || '').trim().toLowerCase();
  return normalized === 'satellite' || normalized === 'hybrid' ? normalized : 'base';
}

export function resolveRunningMapConfig(raw = {}) {
  const vworldApiKey = String(raw.vworldApiKey || '').trim();
  const vworldLayer = _normalizeVworldLayer(raw.vworldLayer);
  const googleMapsKey = String(raw.googleMapsKey || '').trim();
  const tmapAppKey = String(raw.tmapAppKey || '').trim();
  let provider = String(raw.provider || 'auto').trim().toLowerCase();
  if (!provider || provider === 'default') provider = 'auto';
  if (provider === 'auto' || provider === 'none') provider = vworldApiKey ? 'vworld' : tmapAppKey ? 'tmap' : googleMapsKey ? 'google' : 'none';
  if (provider === 'google' && !googleMapsKey && vworldApiKey) provider = 'vworld';
  if (provider === 'tmap' && !tmapAppKey && vworldApiKey) provider = 'vworld';

  if (provider === 'vworld') {
    return {
      provider,
      label: _providerLabel(provider),
      key: vworldApiKey,
      layer: vworldLayer,
      configured: !!vworldApiKey,
      reason: vworldApiKey ? '' : 'missing-key',
    };
  }
  if (provider === 'google') {
    return {
      provider,
      label: _providerLabel(provider),
      key: googleMapsKey,
      configured: !!googleMapsKey,
      reason: googleMapsKey ? '' : 'missing-key',
    };
  }
  if (provider === 'tmap') {
    return {
      provider,
      label: _providerLabel(provider),
      key: tmapAppKey,
      configured: !!tmapAppKey,
      reason: tmapAppKey ? '' : 'missing-key',
    };
  }
  return {
    provider: 'none',
    label: _providerLabel('none'),
    key: '',
    configured: false,
    reason: 'missing-key',
  };
}

export function readRunningMapConfig() {
  const mapConfig = CONFIG.MAPS || {};
  return resolveRunningMapConfig({
    provider: mapConfig.RUNNING_PROVIDER,
    vworldApiKey: mapConfig.VWORLD_API_KEY,
    vworldLayer: mapConfig.VWORLD_MAP_LAYER,
    googleMapsKey: mapConfig.GOOGLE_MAPS_KEY,
    tmapAppKey: mapConfig.TMAP_APP_KEY,
  });
}

export function buildGoogleMapsScriptUrl(key, callbackName = GOOGLE_CALLBACK) {
  const params = new URLSearchParams({
    key: String(key || '').trim(),
    callback: callbackName,
    loading: 'async',
    language: 'ko',
    region: 'KR',
    v: 'weekly',
  });
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

export function buildTmapScriptUrl(key) {
  const params = new URLSearchParams({
    version: '1',
    appKey: String(key || '').trim(),
  });
  return `https://apis.openapi.sk.com/tmap/jsv2?${params.toString()}`;
}

export function buildVworldTileUrl(key, z, x, y, layer = 'base') {
  const spec = VWORLD_LAYER_SPECS[_normalizeVworldLayer(layer)];
  const apiKey = encodeURIComponent(String(key || '').trim());
  return `${VWORLD_TILE_BASE}/${apiKey}/${spec.layer}/${z}/${y}/${x}.${spec.ext}`;
}

async function _loadGoogleMaps(key) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('browser required');
  }
  if (window.google?.maps?.Map) return window.google.maps;
  if (_googleLoader) return _googleLoader;

  _googleLoader = new Promise((resolve, reject) => {
    window[GOOGLE_CALLBACK] = () => resolve(window.google.maps);
    const script = document.createElement('script');
    script.src = buildGoogleMapsScriptUrl(key);
    script.async = true;
    script.defer = true;
    script.dataset.runningMapScript = 'google';
    script.onerror = () => reject(new Error('Google Maps load failed'));
    document.head.appendChild(script);
  }).catch(error => {
    _googleLoader = null;
    throw error;
  });
  return _googleLoader;
}

async function _loadTmap(key) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('browser required');
  }
  if (window.Tmapv2?.Map) return window.Tmapv2;
  if (_tmapLoader) return _tmapLoader;

  _tmapLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = buildTmapScriptUrl(key);
    script.async = true;
    script.defer = true;
    script.dataset.runningMapScript = 'tmap';
    script.onload = () => window.Tmapv2?.Map ? resolve(window.Tmapv2) : reject(new Error('TMAP SDK unavailable'));
    script.onerror = () => reject(new Error('TMAP load failed'));
    document.head.appendChild(script);
  }).catch(error => {
    _tmapLoader = null;
    throw error;
  });
  return _tmapLoader;
}

function _googleIcon(maps, color, scale = 8) {
  return {
    path: maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 3,
    scale,
  };
}

function _fitGoogle(maps, map, route) {
  if (route.length < 2) return;
  const bounds = new maps.LatLngBounds();
  route.forEach(p => bounds.extend(p));
  map.fitBounds(bounds, 42);
}

function _renderGoogleMap(canvas, maps, route) {
  const center = runningMapCenter(route);
  const map = new maps.Map(canvas, {
    center,
    zoom: route.length > 1 ? 15 : 17,
    disableDefaultUI: true,
    clickableIcons: false,
    gestureHandling: 'greedy',
    keyboardShortcuts: false,
  });
  const markers = [];
  const lines = [];

  if (route.length > 1) {
    const line = new maps.Polyline({
      path: route,
      geodesic: true,
      strokeColor: '#55d632',
      strokeOpacity: 0.92,
      strokeWeight: 7,
      map,
    });
    lines.push(line);
    markers.push(new maps.Marker({ position: route[0], map, icon: _googleIcon(maps, '#20b84d') }));
    markers.push(new maps.Marker({ position: route[route.length - 1], map, icon: _googleIcon(maps, '#f40000', 9) }));
    _fitGoogle(maps, map, route);
  } else if (route.length === 1) {
    markers.push(new maps.Marker({ position: route[0], map, icon: _googleIcon(maps, '#f40000', 9) }));
  }

  return { map, markers, lines };
}

function _tmapPoint(Tmapv2, point) {
  return new Tmapv2.LatLng(point.lat, point.lng);
}

function _tmapMarkerHtml(color) {
  return `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};border:4px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.22)"></span>`;
}

function _fitTmap(Tmapv2, map, latLngs) {
  try {
    if (latLngs.length < 2 || !Tmapv2.LatLngBounds) return;
    const bounds = new Tmapv2.LatLngBounds();
    latLngs.forEach(p => bounds.extend(p));
    map.fitBounds(bounds);
  } catch {}
}

function _renderTmap(canvas, Tmapv2, route) {
  const center = runningMapCenter(route);
  const map = new Tmapv2.Map(canvas, {
    center: _tmapPoint(Tmapv2, center),
    width: '100%',
    height: '100%',
    zoom: route.length > 1 ? 15 : 17,
    zoomControl: false,
    scrollwheel: true,
  });
  const markers = [];
  const lines = [];
  const latLngs = route.map(p => _tmapPoint(Tmapv2, p));

  if (latLngs.length > 1) {
    lines.push(new Tmapv2.Polyline({
      path: latLngs,
      strokeColor: '#55d632',
      strokeWeight: 7,
      map,
    }));
    markers.push(new Tmapv2.Marker({ position: latLngs[0], iconHTML: _tmapMarkerHtml('#20b84d'), map }));
    markers.push(new Tmapv2.Marker({ position: latLngs[latLngs.length - 1], iconHTML: _tmapMarkerHtml('#f40000'), map }));
    _fitTmap(Tmapv2, map, latLngs);
  } else if (latLngs.length === 1) {
    markers.push(new Tmapv2.Marker({ position: latLngs[0], iconHTML: _tmapMarkerHtml('#f40000'), map }));
  }

  return { map, markers, lines };
}

function _projectMercator(point, zoom) {
  const sin = Math.sin(_num(point.lat) * Math.PI / 180);
  const world = TILE_SIZE * (2 ** zoom);
  return {
    x: (_num(point.lng) + 180) / 360 * world,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world,
  };
}

function _routeBoundsCenter(route) {
  if (route.length < 2) return runningMapCenter(route);
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  route.forEach(point => {
    minLat = Math.min(minLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLat = Math.max(maxLat, point.lat);
    maxLng = Math.max(maxLng, point.lng);
  });
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

function _vworldZoomForRoute(route, width, height) {
  if (route.length < 2) return 17;
  const pad = 72;
  for (let zoom = 18; zoom >= 10; zoom--) {
    const projected = route.map(point => _projectMercator(point, zoom));
    const xs = projected.map(point => point.x);
    const ys = projected.map(point => point.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (spanX <= Math.max(120, width - pad) && spanY <= Math.max(120, height - pad)) return zoom;
  }
  return 10;
}

function _vworldRenderLayers(layer) {
  return layer === 'hybrid' ? ['satellite', 'hybrid'] : [layer];
}

function _tileModulo(value, max) {
  return ((value % max) + max) % max;
}

function _screenPoint(point, zoom, topLeft) {
  const px = _projectMercator(point, zoom);
  return { x: px.x - topLeft.x, y: px.y - topLeft.y };
}

function _vworldRouteSvg(route, zoom, topLeft, width, height) {
  const points = route.map(point => _screenPoint(point, zoom, topLeft));
  const line = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const start = points[0];
  const end = points[points.length - 1];
  const markers = points.length > 1
    ? `<circle class="wt-vworld-route-start" cx="${start.x.toFixed(1)}" cy="${start.y.toFixed(1)}" r="8"></circle>
       <circle class="wt-vworld-route-end" cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="9"></circle>`
    : `<circle class="wt-vworld-route-end" cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="9"></circle>`;
  return `
    <svg class="wt-vworld-route-layer" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      ${points.length > 1 ? `<polyline class="wt-vworld-route-line" points="${line}"></polyline>` : ''}
      ${markers}
    </svg>`;
}

function _renderVworldMap(canvas, route, config) {
  const rect = canvas.getBoundingClientRect?.() || {};
  const width = Math.max(280, Math.round(rect.width || canvas.clientWidth || 360));
  const height = Math.max(220, Math.round(rect.height || canvas.clientHeight || 320));
  const layer = _normalizeVworldLayer(config.layer);
  const center = _routeBoundsCenter(route.length ? route : [DEFAULT_CENTER]);
  const zoom = _vworldZoomForRoute(route, width, height);
  const centerPx = _projectMercator(center, zoom);
  const topLeft = { x: centerPx.x - width / 2, y: centerPx.y - height / 2 };
  const maxTile = 2 ** zoom;
  const minTileX = Math.floor(topLeft.x / TILE_SIZE);
  const maxTileX = Math.floor((topLeft.x + width) / TILE_SIZE);
  const minTileY = Math.floor(topLeft.y / TILE_SIZE);
  const maxTileY = Math.floor((topLeft.y + height) / TILE_SIZE);
  const root = document.createElement('div');
  root.className = `wt-vworld-map wt-vworld-map--${layer}`;
  root.style.width = `${width}px`;
  root.style.height = `${height}px`;

  for (const renderLayer of _vworldRenderLayers(layer)) {
    const layerEl = document.createElement('div');
    layerEl.className = `wt-vworld-tile-layer wt-vworld-tile-layer--${renderLayer}`;
    for (let y = minTileY; y <= maxTileY; y++) {
      if (y < 0 || y >= maxTile) continue;
      for (let x = minTileX; x <= maxTileX; x++) {
        const tile = document.createElement('img');
        const wrappedX = _tileModulo(x, maxTile);
        tile.className = 'wt-vworld-tile';
        tile.alt = '';
        tile.decoding = 'async';
        tile.loading = 'eager';
        tile.draggable = false;
        tile.src = buildVworldTileUrl(config.key, zoom, wrappedX, y, renderLayer);
        tile.style.left = `${Math.round(x * TILE_SIZE - topLeft.x)}px`;
        tile.style.top = `${Math.round(y * TILE_SIZE - topLeft.y)}px`;
        layerEl.appendChild(tile);
      }
    }
    root.appendChild(layerEl);
  }

  if (route.length) {
    root.insertAdjacentHTML('beforeend', _vworldRouteSvg(route, zoom, topLeft, width, height));
  }
  root.insertAdjacentHTML('beforeend', '<div class="wt-vworld-attribution">VWorld</div>');
  canvas.appendChild(root);
  return { map: { destroy: () => _clearNode(canvas) }, markers: [], lines: [] };
}

export async function renderRunningMap(shell, options = {}) {
  if (!shell) return null;
  const canvas = shell.querySelector('[data-running-map-canvas]');
  if (!canvas) return null;

  _removeInstance(shell);
  _clearNode(canvas);

  const config = options.config || readRunningMapConfig();
  const route = normalizeRunningMapPoints(options.points || []);
  shell.dataset.mapProvider = config.provider;
  shell.dataset.mapPointCount = String(route.length);

  if (!config.configured) {
    _setState(shell, 'missing-key', '지도를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    return null;
  }

  _setState(shell, 'loading', `${config.label} 불러오는 중`);
  try {
    const instance = config.provider === 'vworld'
      ? _renderVworldMap(canvas, route, config)
      : config.provider === 'tmap'
        ? _renderTmap(canvas, await _loadTmap(config.key), route)
        : _renderGoogleMap(canvas, await _loadGoogleMaps(config.key), route);
    _instances.set(shell, instance);
    _setState(shell, 'ready');
    return instance;
  } catch (error) {
    console.warn('[running-map] provider render failed:', error);
    _setState(shell, 'error', `${config.label} 로드 실패`);
    return null;
  }
}

export function destroyRunningMaps(scope) {
  if (!scope) return;
  const shells = [];
  if (scope.matches?.('[data-running-real-map]')) shells.push(scope);
  scope.querySelectorAll?.('[data-running-real-map]').forEach(el => shells.push(el));
  shells.forEach(_removeInstance);
}

// ================================================================
// workout/running-map.js — real map provider renderer for running
// ================================================================

import { CONFIG } from '../config.js';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const GOOGLE_CALLBACK = '__tomatoRunningGoogleMapsReady';

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

export function resolveRunningMapConfig(raw = {}) {
  const googleMapsKey = String(raw.googleMapsKey || '').trim();
  const tmapAppKey = String(raw.tmapAppKey || '').trim();
  let provider = String(raw.provider || 'auto').trim().toLowerCase();
  if (!provider || provider === 'default') provider = 'auto';
  if (provider === 'auto') provider = tmapAppKey ? 'tmap' : googleMapsKey ? 'google' : 'none';

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
    _setState(shell, 'missing-key', `${config.label} 키를 설정하면 실제 지도에 GPS가 표시됩니다.`);
    return null;
  }

  _setState(shell, 'loading', `${config.label} 불러오는 중`);
  try {
    const instance = config.provider === 'tmap'
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

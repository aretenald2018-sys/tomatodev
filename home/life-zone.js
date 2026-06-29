import {
  TODAY,
  dateKey,
  getAccountList,
  getCurrentUser,
  getDay,
  getFriendWorkout,
  getMyFriends
} from '../data.js';
import { CONFIG } from '../config.js';
import { escapeHtml, resolveNickname } from './utils.js';
import {
  buildVworldTileUrl,
  normalizeRunningMapPoints,
  readRunningMapConfig,
  resolveRunningMapConfig
} from '../workout/running-map.js';
import {
  LIFE_ZONE_ACTORS,
  assignLifeZoneSlots,
  resolveLifeZoneActivity,
  resolveLifeZoneActors,
  resolveLifeZoneRoster
} from './life-zone-state.js';

const LIFE_ZONE_ASSET_ROOT = './assets/home/life-zone';
const LIFE_ZONE_SPRITE_ROOT = `${LIFE_ZONE_ASSET_ROOT}/sprites`;
const LIFE_ZONE_UI_ROOT = `${LIFE_ZONE_ASSET_ROOT}/ui`;
const LIFE_ZONE_NPC_NAME = '트레이너';
const LIFE_ZONE_MIRANDA_NAME = '미란다';
const LIFE_ZONE_CACHE_MS = 0;
const RUNNING_MAP_WIDTH = 172;
const RUNNING_MAP_HEIGHT = 121;
const RUNNING_MAP_TILE_SIZE = 256;
const RUNNING_MAP_MIN_ZOOM = 10;
const RUNNING_MAP_MAX_ZOOM = 18;
const RUNNING_MAP_HOME_MAX_ZOOM = 14;

let _actorStateCache = null;

const STATE_LABELS = {
  running: '러닝',
  workout: '운동',
  diet: '식사',
  office: '업무'
};

function _fmtKcal(value) {
  return Number(value || 0).toLocaleString();
}

function _safeResolveNickname(account, accounts = []) {
  try {
    return resolveNickname(account, accounts);
  } catch {
    return account?.nickname || account?.id || '';
  }
}

function _enrichAccounts(accounts = []) {
  return accounts.map((account) => ({
    ...account,
    resolvedNickname: _safeResolveNickname(account, accounts)
  }));
}

function _mergeCurrentUser(accounts = [], currentUser = null) {
  if (!currentUser?.id || accounts.some((account) => account.id === currentUser.id)) return accounts;
  return [...accounts, { ...currentUser, resolvedNickname: _safeResolveNickname(currentUser, accounts) }];
}

function _readRunningLiveState() {
  if (typeof window === 'undefined') return null;
  const live = window.__tomatoRunningLive;
  return live?.active ? live : null;
}

function _withRunningLiveDay(dayData = {}, live = null) {
  if (!live?.active) return dayData || {};
  const route = Array.isArray(live.route) ? live.route : [];
  return {
    ...(dayData || {}),
    running: true,
    runLiveActive: true,
    lifeZoneRunningLive: true,
    lifeZoneRunningRoute: route,
    lifeZoneRunningRouteSummary: live.routeSummary || null,
    lifeZoneRunningPlaceSummary: live.placeSummary || dayData?.runPlaceSummary || dayData?.runData?.placeSummary || null,
    lifeZoneRunningPreviewPoint: live.previewPoint || null,
    lifeZoneRunningUpdatedAt: live.updatedAt || Date.now(),
    runRoute: route.length ? route : (dayData?.runRoute || []),
    runRouteSummary: live.routeSummary || dayData?.runRouteSummary || null,
    runPlaceSummary: live.placeSummary || dayData?.runPlaceSummary || null,
    runStartedAt: live.startedAt || dayData?.runStartedAt || Date.now()
  };
}

async function _readFriendLifeZoneDay(actor, todayKey) {
  const candidates = [
    actor.readAccountId,
    ...(actor.ownerIdCandidates || []),
    actor.accountId
  ].filter(Boolean);
  let emptyMatch = null;
  for (const ownerId of [...new Set(candidates)]) {
    const dayData = await getFriendWorkout(ownerId, todayKey);
    if (!dayData) continue;
    if (Object.keys(dayData).length > 0) return dayData;
    emptyMatch = dayData;
  }
  return emptyMatch || {};
}

function _defaultActorStates() {
  return assignLifeZoneSlots(
    LIFE_ZONE_ACTORS.map((actor) => ({
      ...actor,
      state: 'office',
      speech: '다른 일 하는중',
      source: 'pending',
      canRead: false
    }))
  );
}

function _applyActorSlotPosition(element, slot) {
  element.style.setProperty('--lz-x', slot.x);
  element.style.setProperty('--lz-y', slot.y);
  element.style.setProperty('--lz-w', slot.width);
  element.style.setProperty('--lz-z', slot.z);
  if (slot.runDelay) element.style.setProperty('--lz-run-delay', slot.runDelay);
  if (slot.runDuration) element.style.setProperty('--lz-run-duration', slot.runDuration);
}

function _applyActorNameplatePosition(element, slot) {
  const x = Number(slot.x) + Number(slot.width) * 0.5;
  const y = Number(slot.labelY) || Math.max(24, Number(slot.y) - 6);
  const z = (Number(slot.z) || 1) + 3;
  element.style.setProperty('--lz-name-x', x);
  element.style.setProperty('--lz-name-y', y);
  element.style.setProperty('--lz-name-z', z);
}

function _mapNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function _mapPoint(point = null) {
  const lat = _mapNumber(point?.lat ?? point?.latitude);
  const lng = _mapNumber(point?.lng ?? point?.lon ?? point?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat: Math.max(-85.0511, Math.min(85.0511, lat)),
    lng: ((lng + 540) % 360) - 180
  };
}

function _routeBoundsCenter(route = []) {
  if (!route.length) return null;
  let minLat = route[0].lat;
  let maxLat = route[0].lat;
  let minLng = route[0].lng;
  let maxLng = route[0].lng;
  route.forEach((point) => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

function _zoomForRunningMap(route = []) {
  if (route.length < 2) return 17;
  let minLat = route[0].lat;
  let maxLat = route[0].lat;
  let minLng = route[0].lng;
  let maxLng = route[0].lng;
  route.forEach((point) => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  if (span > 0.045) return 12;
  if (span > 0.022) return 13;
  if (span > 0.011) return 14;
  if (span > 0.0055) return 15;
  if (span > 0.0028) return 16;
  return 17;
}

function _projectRunningMapPoint(point, zoom) {
  const p = _mapPoint(point);
  const sin = Math.sin(p.lat * Math.PI / 180);
  const world = RUNNING_MAP_TILE_SIZE * (2 ** zoom);
  return {
    x: (p.lng + 180) / 360 * world,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world
  };
}

function _tileModulo(value, max) {
  return ((value % max) + max) % max;
}

function _screenPoint(point, zoom, topLeft) {
  const projected = _projectRunningMapPoint(point, zoom);
  return {
    x: projected.x - topLeft.x,
    y: projected.y - topLeft.y
  };
}

function _readLifeZoneVworldMapConfig() {
  const config = readRunningMapConfig();
  if (config.provider === 'vworld' && config.configured) return config;
  const fallback = resolveRunningMapConfig({
    provider: 'vworld',
    vworldApiKey: CONFIG.MAPS?.VWORLD_API_KEY,
    vworldLayer: CONFIG.MAPS?.VWORLD_MAP_LAYER
  });
  return fallback.configured ? fallback : config;
}

function _buildRunningMapBubbleData(mapData = null) {
  const route = normalizeRunningMapPoints(mapData?.route || []);
  const previewPoint = _mapPoint(mapData?.previewPoint);
  const summaryCenter = _mapPoint(mapData?.routeSummary?.centroid);
  const center = _routeBoundsCenter(route) || previewPoint || summaryCenter;
  if (!center) {
    return { state: 'waiting', route, tiles: [], path: '', dot: null };
  }

  const config = _readLifeZoneVworldMapConfig();
  if (!config.configured || config.provider !== 'vworld') {
    const dot = { x: RUNNING_MAP_WIDTH / 2, y: RUNNING_MAP_HEIGHT / 2 };
    return { state: 'missing-map', route, tiles: [], path: '', dot };
  }

  const zoom = Math.max(
    RUNNING_MAP_MIN_ZOOM,
    Math.min(RUNNING_MAP_HOME_MAX_ZOOM, RUNNING_MAP_MAX_ZOOM, _zoomForRunningMap(route))
  );
  const centerPx = _projectRunningMapPoint(center, zoom);
  const topLeft = {
    x: centerPx.x - RUNNING_MAP_WIDTH / 2,
    y: centerPx.y - RUNNING_MAP_HEIGHT / 2
  };
  const maxTile = 2 ** zoom;
  const minTileX = Math.floor(topLeft.x / RUNNING_MAP_TILE_SIZE);
  const maxTileX = Math.floor((topLeft.x + RUNNING_MAP_WIDTH) / RUNNING_MAP_TILE_SIZE);
  const minTileY = Math.floor(topLeft.y / RUNNING_MAP_TILE_SIZE);
  const maxTileY = Math.floor((topLeft.y + RUNNING_MAP_HEIGHT) / RUNNING_MAP_TILE_SIZE);
  const tiles = [];

  for (let y = minTileY; y <= maxTileY; y += 1) {
    if (y < 0 || y >= maxTile) continue;
    for (let x = minTileX; x <= maxTileX; x += 1) {
      const wrappedX = _tileModulo(x, maxTile);
      tiles.push({
        src: buildVworldTileUrl(config.key, zoom, wrappedX, y, config.layer),
        left: x * RUNNING_MAP_TILE_SIZE - topLeft.x,
        top: y * RUNNING_MAP_TILE_SIZE - topLeft.y
      });
    }
  }

  const projectedRoute = route.map(point => _screenPoint(point, zoom, topLeft));
  const path = projectedRoute.length > 1
    ? projectedRoute.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
    : '';
  const rawDot = _screenPoint(route[route.length - 1] || previewPoint || summaryCenter || center, zoom, topLeft);
  const dot = {
    x: Math.max(4, Math.min(RUNNING_MAP_WIDTH - 4, rawDot.x)),
    y: Math.max(4, Math.min(RUNNING_MAP_HEIGHT - 4, rawDot.y))
  };

  return { state: 'ready', route, tiles, path, dot };
}

function _renderRunningMapBubble(layer, actor, slot) {
  const bubble = document.createElement('div');
  const x = Number(slot.bubbleX) || Number(slot.x) + Number(slot.width) * 0.5;
  const y = Number(slot.bubbleY) || Math.max(36, Number(slot.y) - 88);
  const tipX = Number(slot.mapTipX) || 50;
  const map = _buildRunningMapBubbleData(actor.runningMap);
  const place = String(actor.runningMap?.placeLabel || '').trim();
  const tileHtml = map.tiles.map((tile) => `
    <img
      class="lz-running-map-tile"
      src="${escapeHtml(tile.src)}"
      alt=""
      decoding="async"
      loading="eager"
      draggable="false"
      style="left:${tile.left.toFixed(1)}px;top:${tile.top.toFixed(1)}px"
    >
  `).join('');
  const pathHtml = map.path
    ? `<polyline class="lz-running-map-path" points="${escapeHtml(map.path)}"></polyline>`
    : '';
  const dotHtml = map.dot
    ? `<span class="lz-running-map-current" style="--lz-run-dot-x:${map.dot.x.toFixed(1)}px;--lz-run-dot-y:${map.dot.y.toFixed(1)}px"></span>`
    : '';
  const emptyText = map.state === 'ready' ? '' : (map.state === 'waiting' ? 'GPS' : 'MAP');
  bubble.className = `lz-running-map-bubble lz-running-map-bubble--${map.state}`;
  bubble.setAttribute('aria-label', `${actor.displayName} 러닝 지도`);
  bubble.dataset.lzRunningMapBubble = '1';
  bubble.dataset.lzRunningMapState = map.state;
  bubble.style.setProperty('--lz-map-x', x);
  bubble.style.setProperty('--lz-map-y', y);
  bubble.style.setProperty('--lz-map-tip-x', `${tipX}%`);
  bubble.style.setProperty('--lz-actor-color', actor.color || '#94a3b8');
  bubble.style.zIndex = String((Number(slot.z) || 1) + 30);
  bubble.innerHTML = `
    <span class="lz-running-map-surface">
      <span class="lz-running-map-tile-layer">${tileHtml}</span>
      <svg class="lz-running-map-overlay" viewBox="0 0 ${RUNNING_MAP_WIDTH} ${RUNNING_MAP_HEIGHT}" aria-hidden="true">
        ${pathHtml}
      </svg>
      ${dotHtml}
      ${emptyText ? `<span class="lz-running-map-empty">${emptyText}</span>` : ''}
      ${place ? `<span class="lz-running-map-place">${escapeHtml(place)}</span>` : ''}
      ${map.state === 'ready' ? '<span class="lz-running-map-attribution">VWorld</span>' : ''}
    </span>
  `;
  layer.append(bubble);
}

function _renderActors(card, actors) {
  const layer = card.querySelector('[data-lz-actors]');
  if (!layer) return;
  layer.textContent = '';
  const selfRunning = actors.some((actor) => actor.state === 'running' && actor.source === 'self');
  let runningBubbleRendered = false;

  actors.forEach((actor) => {
    const slot = actor.slot;
    if (!slot) return;
    const actorElement = document.createElement('span');
    const image = document.createElement('img');
    const poseClass = slot.pose ? ` lz-actor--pose-${slot.pose}` : '';
    const spriteSrc = `${LIFE_ZONE_SPRITE_ROOT}/${actor.sprite}`;
    actorElement.className = `lz-actor lz-actor--${actor.state}${poseClass}`;
    actorElement.style.setProperty('--lz-sprite-url', `url("${spriteSrc}")`);
    _applyActorSlotPosition(actorElement, slot);
    actorElement.title = `${actor.displayName} · ${actor.speech || STATE_LABELS[actor.state] || '업무'}`;
    image.className = 'lz-actor-img';
    image.src = spriteSrc;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    actorElement.append(image);
    layer.append(actorElement);

    const nameplate = document.createElement('span');
    nameplate.className = `lz-nameplate lz-nameplate--actor lz-nameplate--${actor.state}`;
    nameplate.textContent = actor.displayName;
    _applyActorNameplatePosition(nameplate, slot);
    layer.append(nameplate);

    if (actor.state === 'running') {
      const shouldShowMap = selfRunning ? actor.source === 'self' : !runningBubbleRendered;
      if (shouldShowMap) {
        _renderRunningMapBubble(layer, actor, slot);
        runningBubbleRendered = true;
      }
      return;
    }

    if (actor.speech) {
      const bubble = document.createElement('div');
      bubble.className = `lz-speech lz-speech--${actor.state}`;
      bubble.textContent = actor.speech;
      bubble.style.setProperty('--lz-bx', slot.x + slot.width * 0.54);
      bubble.style.setProperty('--lz-by', Math.max(28, slot.y - 12));
      bubble.style.setProperty('--lz-actor-color', actor.color || '#94a3b8');
      bubble.style.zIndex = String((Number(slot.z) || 1) + 20);
      layer.append(bubble);
    }
  });
}

function _renderStatus(card, actors, isLoaded = false) {
  const status = card.querySelector('[data-lz-status]');
  if (!status) return;
  status.innerHTML = actors.map((actor) => {
    const state = actor.state || 'office';
    const stateLabel = STATE_LABELS[state] || '업무';
    const sourceClass = actor.source === 'unmatched' || actor.source === 'unreadable' ? ' is-muted' : '';
    return `
      <span class="lz-status-chip lz-status-chip--${state}${sourceClass}" style="--lz-actor-color:${actor.color || '#94a3b8'}">
        <span class="lz-status-dot"></span>
        <b>${escapeHtml(actor.displayName)}</b>
        <span>${stateLabel}</span>
      </span>
    `;
  }).join('');

  const sync = card.querySelector('[data-lz-sync]');
  if (sync) sync.textContent = isLoaded ? '오늘 기록 반영' : '불러오는 중';
}

async function _loadLifeZoneActorStates() {
  const todayKey = dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const currentUser = getCurrentUser();
  const liveRunning = _readRunningLiveState();
  const liveKey = liveRunning ? `running:${liveRunning.startedAt || 'active'}` : 'idle';
  const cacheKey = `${todayKey}:${currentUser?.id || 'none'}:${liveKey}`;

  if (LIFE_ZONE_CACHE_MS > 0 && _actorStateCache && _actorStateCache.key === cacheKey && Date.now() - _actorStateCache.at < LIFE_ZONE_CACHE_MS) {
    return _actorStateCache.actors;
  }

  const [accountsResult, friendsResult] = await Promise.allSettled([
    getAccountList(),
    getMyFriends()
  ]);
  const rawAccounts = accountsResult.status === 'fulfilled' ? accountsResult.value : [];
  const friends = friendsResult.status === 'fulfilled' ? friendsResult.value : [];
  const accounts = _mergeCurrentUser(_enrichAccounts(rawAccounts), currentUser);
  const roster = resolveLifeZoneRoster({ accounts, friends, currentUser });

  const dayByAccountId = {};
  const selfActorIds = new Set(roster.filter((actor) => actor.source === 'self' && actor.accountId).map((actor) => actor.accountId));
  selfActorIds.forEach((accountId) => {
    dayByAccountId[accountId] = _withRunningLiveDay(getDay(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()) || {}, liveRunning);
  });

  const friendActors = roster.filter((actor) => actor.source === 'friend' && actor.accountId);
  const friendResults = await Promise.allSettled(friendActors.map((actor) => _readFriendLifeZoneDay(actor, todayKey)));
  friendActors.forEach((actor, index) => {
    dayByAccountId[actor.accountId] = friendResults[index].status === 'fulfilled'
      ? (friendResults[index].value || {})
      : {};
  });

  const actors = resolveLifeZoneActors({ accounts, friends, currentUser, dayByAccountId });
  _actorStateCache = { key: cacheKey, at: Date.now(), actors };
  return actors;
}

export async function hydrateLifeZoneCard(card) {
  if (!card) return;
  try {
    const actors = await _loadLifeZoneActorStates();
    _renderActors(card, actors);
    _renderStatus(card, actors, true);
  } catch (error) {
    console.warn('[life-zone] hydrate failed:', error);
    const fallback = _defaultActorStates();
    _renderActors(card, fallback);
    _renderStatus(card, fallback, false);
  }
}

export function renderLifeZoneCard({
  totalIntake = 0,
  todayTarget = 0,
  kcalState = '',
  remaining = 0,
  kcalPct = 0,
  weightSummary = null,
  onDietClick = null,
  onWeightClick = null
} = {}) {
  const card = document.createElement('section');
  card.id = 'tf-life-zone-card';
  card.className = 'home-card lz-card';
  card.setAttribute('aria-label', '오늘의 라이프존');

  const fallbackActors = _defaultActorStates();
  const overAmount = Math.max(totalIntake - todayTarget, 0);
  const kcalHint = totalIntake > 0 && todayTarget > 0
    ? kcalState === 'over'
      ? `${_fmtKcal(overAmount)}kcal 초과`
      : `${_fmtKcal(remaining)}kcal 남음`
    : '아직 기록이 없어요';

  const weightHtml = weightSummary
    ? `
      <button type="button" class="lz-summary-btn lz-summary-btn--weight${weightSummary.isStale ? ' is-stale' : ''}" data-lz-action="weight">
        <span class="lz-summary-label">체중</span>
        <span class="lz-summary-main">${weightSummary.current.toFixed(1)}<small>kg</small>${weightSummary.lost > 0 ? `<em>-${weightSummary.lost.toFixed(1)}</em>` : ''}</span>
        <span class="lz-summary-sub">${escapeHtml(weightSummary.hint)}</span>
      </button>
    `
    : `
      <button type="button" class="lz-summary-btn lz-summary-btn--weight" data-lz-action="weight">
        <span class="lz-summary-label">체중</span>
        <span class="lz-summary-main">입력</span>
        <span class="lz-summary-sub">몸무게 입력</span>
      </button>
    `;

  card.innerHTML = `
    <div class="lz-head">
      <div>
        <span class="lz-eyebrow">오늘의 라이프존</span>
        <h3 class="lz-title">줍스 · 문정토마토 · 이재헌</h3>
      </div>
      <span class="lz-sync" data-lz-sync>불러오는 중</span>
    </div>
    <div class="lz-scene">
      <div class="lz-world">
        <img
          class="lz-base"
          src="${LIFE_ZONE_ASSET_ROOT}/base-room-expanded-alpha.png"
          width="1672"
          height="1672"
          alt=""
          loading="lazy"
          decoding="async"
        >
        <span class="lz-miranda-corner" aria-hidden="true">
          <img
            src="${LIFE_ZONE_UI_ROOT}/miranda-fashion-corner.png"
            width="430"
            height="250"
            alt=""
            loading="lazy"
            decoding="async"
          >
        </span>
        <div class="lz-actor-layer" data-lz-actors aria-hidden="true"></div>
        <button
          type="button"
          class="lz-npc-quest lz-npc-quest--trainer"
          data-lz-action="npc-quest"
          aria-label="트레이너 퀘스트 보기"
          title="트레이너 퀘스트"
        >
          <span class="lz-npc-bulb" aria-hidden="true">
            <img
              src="${LIFE_ZONE_UI_ROOT}/npc-quest-bubble.png"
              width="192"
              height="258"
              alt=""
              loading="lazy"
              decoding="async"
            >
          </span>
          <span class="lz-nameplate lz-nameplate--npc" aria-hidden="true">${escapeHtml(LIFE_ZONE_NPC_NAME)}</span>
        </button>
        <button
          type="button"
          class="lz-miranda-npc"
          data-lz-action="miranda-quest"
          aria-label="미란다 대화 보기"
          title="미란다"
        >
          <img
            class="lz-miranda-npc-img"
            src="${LIFE_ZONE_UI_ROOT}/miranda-npc-home.png"
            width="142"
            height="256"
            alt=""
            loading="lazy"
            decoding="async"
          >
          <span class="lz-npc-bulb lz-npc-bulb--miranda" aria-hidden="true">
            <img
              src="${LIFE_ZONE_UI_ROOT}/npc-quest-bubble.png"
              width="192"
              height="258"
              alt=""
              loading="lazy"
              decoding="async"
            >
          </span>
          <span class="lz-nameplate lz-nameplate--npc" aria-hidden="true">${escapeHtml(LIFE_ZONE_MIRANDA_NAME)}</span>
        </button>
      </div>
    </div>
    <div class="lz-status-row" data-lz-status></div>
    <div class="lz-summary-strip">
      <button type="button" class="lz-summary-btn lz-summary-btn--diet" data-lz-action="diet">
        <span class="lz-summary-label">오늘 칼로리</span>
        <span class="lz-summary-main ${kcalState === 'over' ? 'is-over' : ''}">
          ${totalIntake > 0 ? _fmtKcal(totalIntake) : '-'}<small>/${_fmtKcal(todayTarget)}kcal</small>
        </span>
        <span class="lz-summary-sub ${kcalState}">${escapeHtml(kcalHint)}</span>
      </button>
      ${weightHtml}
    </div>
  `;

  _renderActors(card, fallbackActors);
  _renderStatus(card, fallbackActors, false);

  card.querySelector('[data-lz-action="diet"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    onDietClick?.();
  });
  card.querySelector('[data-lz-action="weight"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    onWeightClick?.();
  });
  card.querySelector('[data-lz-action="npc-quest"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.currentTarget.dispatchEvent(new CustomEvent('life-zone:npc-quest', {
      bubbles: true,
      detail: { npc: 'trainer' }
    }));
  });
  card.querySelector('[data-lz-action="miranda-quest"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.currentTarget.dispatchEvent(new CustomEvent('life-zone:npc-quest', {
      bubbles: true,
      detail: { npc: 'miranda' }
    }));
  });

  return card;
}

export function getLocalLifeZonePreviewState(dayData = null) {
  return resolveLifeZoneActivity(dayData);
}

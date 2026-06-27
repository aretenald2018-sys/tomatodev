import {
  TODAY,
  dateKey,
  getAccountList,
  getCurrentUser,
  getDay,
  getFriendWorkout,
  getMyFriends
} from '../data.js';
import { escapeHtml, resolveNickname } from './utils.js';
import {
  LIFE_ZONE_ACTORS,
  assignLifeZoneSlots,
  resolveLifeZoneActivity,
  resolveLifeZoneActors,
  resolveLifeZoneRoster
} from './life-zone-state.js';

const LIFE_ZONE_ASSET_ROOT = './assets/home/life-zone';
const LIFE_ZONE_SPRITE_ROOT = `${LIFE_ZONE_ASSET_ROOT}/sprites`;
const LIFE_ZONE_NPC_NAME = '트레이너';
const LIFE_ZONE_CACHE_MS = 0;

const LIFE_ZONE_SPRITE_HEIGHT_RATIO = Object.freeze({
  'workout-lat': 400 / 298,
  'workout-bench': 326 / 330,
  'workout-squat': 315 / 302,
  'diet-left': 394 / 234,
  'diet-center': 363 / 217,
  'diet-right': 370 / 205,
  'office-upper': 345 / 269,
  'office-center': 351 / 261,
  'office-lower': 353 / 254
});

let _actorStateCache = null;

const STATE_LABELS = {
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
}

function _getActorSpriteHeight(slot) {
  return Number(slot.width) * (LIFE_ZONE_SPRITE_HEIGHT_RATIO[slot.pose] || 1);
}

function _applyActorNameplatePosition(element, slot) {
  const x = Number(slot.x) + Number(slot.width) * 0.5;
  const y = Number(slot.labelY) || (Number(slot.y) + _getActorSpriteHeight(slot) + 12);
  const z = (Number(slot.z) || 1) + 3;
  element.style.setProperty('--lz-name-x', x);
  element.style.setProperty('--lz-name-y', y);
  element.style.setProperty('--lz-name-z', z);
}

function _renderActors(card, actors) {
  const layer = card.querySelector('[data-lz-actors]');
  if (!layer) return;
  layer.textContent = '';

  actors.forEach((actor) => {
    const slot = actor.slot;
    if (!slot) return;
    const image = document.createElement('img');
    image.className = `lz-actor lz-actor--${actor.state}`;
    image.src = `${LIFE_ZONE_SPRITE_ROOT}/${actor.sprite}`;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    _applyActorSlotPosition(image, slot);
    image.title = `${actor.displayName} · ${actor.speech || STATE_LABELS[actor.state] || '업무'}`;
    layer.append(image);

    const nameplate = document.createElement('span');
    nameplate.className = `lz-nameplate lz-nameplate--actor lz-nameplate--${actor.state}`;
    nameplate.textContent = actor.displayName;
    _applyActorNameplatePosition(nameplate, slot);
    layer.append(nameplate);

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
  const cacheKey = `${todayKey}:${currentUser?.id || 'none'}`;

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
    dayByAccountId[accountId] = getDay(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()) || {};
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
      <img
        class="lz-base"
        src="${LIFE_ZONE_ASSET_ROOT}/base-room-expanded-alpha.png"
        width="1672"
        height="1672"
        alt=""
        loading="lazy"
        decoding="async"
      >
      <div class="lz-actor-layer" data-lz-actors aria-hidden="true"></div>
      <button
        type="button"
        class="lz-npc-quest"
        data-lz-action="npc-quest"
        aria-label="트레이너 퀘스트 보기"
        title="트레이너 퀘스트"
      >
        <span class="lz-nameplate lz-nameplate--npc" aria-hidden="true">${escapeHtml(LIFE_ZONE_NPC_NAME)}</span>
      </button>
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

  return card;
}

export function getLocalLifeZonePreviewState(dayData = null) {
  return resolveLifeZoneActivity(dayData);
}

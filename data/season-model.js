// ================================================================
// season-model.js — 시즌 날짜 경계/레지스트리 순수 모델
// ================================================================

export const SEASON_SCHEMA_VERSION = 1;
export const SEASON_TONE_COUNT = 6;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isSeasonDateKey(value) {
  if (!DATE_KEY_RE.test(String(value || ''))) return false;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function seasonDateKey(dateLike = new Date()) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addSeasonDays(key, amount) {
  if (!isSeasonDateKey(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + Number(amount || 0));
  return seasonDateKey(date);
}

function normalizeSeason(season = {}, index = 0) {
  if (!isSeasonDateKey(season.startDate)) return null;
  const tone = Number.isFinite(Number(season.tone))
    ? Math.abs(Math.floor(Number(season.tone))) % SEASON_TONE_COUNT
    : index % SEASON_TONE_COUNT;
  return {
    id: String(season.id || `season_${season.startDate.replaceAll('-', '')}`),
    name: String(season.name || `시즌 ${index + 1}`).trim() || `시즌 ${index + 1}`,
    startDate: season.startDate,
    endDate: isSeasonDateKey(season.endDate) ? season.endDate : null,
    status: season.status === 'closed' ? 'closed' : 'active',
    tone,
    createdAt: Number(season.createdAt) || null,
    closedAt: Number(season.closedAt) || null,
  };
}

export function normalizeSeasonRegistry(registry = null) {
  const source = Array.isArray(registry?.seasons) ? registry.seasons : [];
  const seasons = source
    .map(normalizeSeason)
    .filter(Boolean)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  for (let index = 0; index < seasons.length; index += 1) {
    const next = seasons[index + 1];
    if (next) {
      seasons[index].endDate = addSeasonDays(next.startDate, -1);
      seasons[index].status = 'closed';
    }
  }

  let activeSeasonId = String(registry?.activeSeasonId || '');
  if (!seasons.some(season => season.id === activeSeasonId)) {
    activeSeasonId = seasons[seasons.length - 1]?.id || '';
  }
  seasons.forEach(season => {
    if (season.id === activeSeasonId) {
      season.status = 'active';
      season.endDate = null;
      season.closedAt = null;
    }
  });

  return {
    schemaVersion: SEASON_SCHEMA_VERSION,
    activeSeasonId: activeSeasonId || null,
    seasons,
  };
}

export function createInitialSeasonRegistry({ startDate, name = '기존 시즌', now = Date.now() } = {}) {
  const safeStart = isSeasonDateKey(startDate) ? startDate : seasonDateKey();
  const id = `season_${safeStart.replaceAll('-', '')}_legacy`;
  return normalizeSeasonRegistry({
    schemaVersion: SEASON_SCHEMA_VERSION,
    activeSeasonId: id,
    seasons: [{ id, name, startDate: safeStart, endDate: null, status: 'active', tone: 0, createdAt: now }],
  });
}

export function activeSeasonOf(registry) {
  const normalized = normalizeSeasonRegistry(registry);
  return normalized.seasons.find(season => season.id === normalized.activeSeasonId)
    || normalized.seasons[normalized.seasons.length - 1]
    || null;
}

export function seasonForDate(registry, dateKey) {
  if (!isSeasonDateKey(dateKey)) return activeSeasonOf(registry);
  const normalized = normalizeSeasonRegistry(registry);
  return normalized.seasons.find(season => (
    dateKey >= season.startDate && (!season.endDate || dateKey <= season.endDate)
  )) || null;
}

export function createNextSeasonRegistry(registry, { name, startDate, now = Date.now() } = {}) {
  const normalized = normalizeSeasonRegistry(registry);
  const active = activeSeasonOf(normalized);
  if (!active) throw new Error('현재 시즌을 찾지 못했습니다.');
  if (!isSeasonDateKey(startDate)) throw new Error('시즌 시작일을 확인해주세요.');
  if (startDate <= active.startDate) throw new Error('새 시즌은 현재 시즌 시작일보다 뒤여야 합니다.');

  const seasons = normalized.seasons.map(season => ({ ...season }));
  const current = seasons.find(season => season.id === active.id);
  current.endDate = addSeasonDays(startDate, -1);
  current.status = 'closed';
  current.closedAt = now;

  const id = `season_${startDate.replaceAll('-', '')}_${Math.max(0, Number(now) || 0).toString(36)}`;
  seasons.push({
    id,
    name: String(name || `시즌 ${seasons.length + 1}`).trim() || `시즌 ${seasons.length + 1}`,
    startDate,
    endDate: null,
    status: 'active',
    tone: seasons.length % SEASON_TONE_COUNT,
    createdAt: now,
    closedAt: null,
  });

  return normalizeSeasonRegistry({
    schemaVersion: SEASON_SCHEMA_VERSION,
    activeSeasonId: id,
    seasons,
  });
}

export function seasonSettingKey(seasonId, slot) {
  const safeId = String(seasonId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeSlot = String(slot || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `season_${safeId}_${safeSlot}`;
}

export function filterCacheForSeason(cache = {}, season = null) {
  if (!season?.startDate) return { ...(cache || {}) };
  return Object.fromEntries(Object.entries(cache || {}).filter(([key]) => (
    isSeasonDateKey(key)
    && key >= season.startDate
    && (!season.endDate || key <= season.endDate)
  )));
}

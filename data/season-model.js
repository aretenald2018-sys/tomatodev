// Pure workout season date-range model. No DOM or Firebase access.

export const SEASON_REGISTRY_SCHEMA_VERSION = 2;

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function _dateParts(value) {
  const match = String(value || '').match(DATE_KEY_RE);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return { year, month, day, date };
}
function _formatUtcDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function isSeasonDateKey(value) {
  return !!_dateParts(value);
}

export function compareSeasonDateKeys(left, right) {
  if (!isSeasonDateKey(left) || !isSeasonDateKey(right)) {
    throw new TypeError('season date keys must use YYYY-MM-DD');
  }
  return String(left).localeCompare(String(right));
}

export function addSeasonDays(dateKey, amount) {
  const parts = _dateParts(dateKey);
  if (!parts) throw new TypeError('season date key must use YYYY-MM-DD');
  const days = Number(amount);
  if (!Number.isFinite(days)) throw new TypeError('season day offset must be finite');
  parts.date.setUTCDate(parts.date.getUTCDate() + Math.trunc(days));
  return _formatUtcDate(parts.date);
}

export function startOfSeasonWeek(dateKey) {
  const parts = _dateParts(dateKey);
  if (!parts) throw new TypeError('season date key must use YYYY-MM-DD');
  const day = parts.date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  parts.date.setUTCDate(parts.date.getUTCDate() + offset);
  return _formatUtcDate(parts.date);
}

export function seasonCalendarWeekCount(startDate, endDate) {
  const start = _dateParts(startDate);
  const end = _dateParts(endDate);
  if (!start || !end || String(startDate) > String(endDate)) return 0;
  const firstWeek = _dateParts(startOfSeasonWeek(startDate));
  const lastWeek = _dateParts(startOfSeasonWeek(endDate));
  return Math.round((lastWeek.date - firstWeek.date) / (7 * 86400000)) + 1;
}

export function seasonPresetEndDate(startDate, weekCount) {
  if (!isSeasonDateKey(startDate)) throw new TypeError('season date key must use YYYY-MM-DD');
  const weeks = Number(weekCount);
  if (!Number.isInteger(weeks) || weeks < 1) {
    throw new TypeError('season preset week count must be a positive integer');
  }
  return addSeasonDays(startOfSeasonWeek(startDate), (weeks * 7) - 1);
}

export function normalizeSeason(value = {}) {
  const id = String(value?.id || '').trim();
  const name = String(value?.name || '').trim();
  const startDate = String(value?.startDate || '');
  const endDate = String(value?.endDate || '');
  if (!id || !name || !isSeasonDateKey(startDate) || !isSeasonDateKey(endDate)) return null;
  if (startDate > endDate) return null;
  return {
    ...value,
    id,
    name,
    startDate,
    endDate,
  };
}

export function normalizeSeasonRegistry(value = {}) {
  const seasons = (Array.isArray(value?.seasons) ? value.seasons : [])
    .map(normalizeSeason)
    .filter(Boolean)
    .sort((left, right) => (
      left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id)
    ));
  return {
    ...value,
    schemaVersion: SEASON_REGISTRY_SCHEMA_VERSION,
    seasons,
  };
}

export function validateSeasonRegistry(value = {}) {
  const rawSeasons = Array.isArray(value?.seasons) ? value.seasons : [];
  const errors = [];
  const normalized = [];
  const ids = new Set();

  rawSeasons.forEach((raw, index) => {
    const season = normalizeSeason(raw);
    if (!season) {
      errors.push(`seasons[${index}] is invalid`);
      return;
    }
    if (ids.has(season.id)) errors.push(`duplicate season id: ${season.id}`);
    ids.add(season.id);
    normalized.push(season);
  });

  normalized.sort((left, right) => left.startDate.localeCompare(right.startDate));
  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    if (current.startDate <= previous.endDate) {
      errors.push(`season ranges overlap: ${previous.id} / ${current.id}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    registry: normalizeSeasonRegistry({ ...value, seasons: normalized }),
  };
}

export function assertSeasonRegistry(value = {}) {
  const result = validateSeasonRegistry(value);
  if (!result.valid) throw new RangeError(result.errors.join('; '));
  return result.registry;
}

export function seasonContainsDate(season, dateKey) {
  const normalized = normalizeSeason(season);
  if (!normalized || !isSeasonDateKey(dateKey)) return false;
  return normalized.startDate <= dateKey && dateKey <= normalized.endDate;
}

export function normalizeSeasonWindow(value = {}, season = {}) {
  const normalizedSeason = normalizeSeason(season);
  if (!normalizedSeason) return null;
  const startDate = isSeasonDateKey(value?.startDate) ? String(value.startDate) : normalizedSeason.startDate;
  const endDate = isSeasonDateKey(value?.endDate) ? String(value.endDate) : normalizedSeason.endDate;
  if (startDate > endDate) return null;
  if (startDate < normalizedSeason.startDate || endDate > normalizedSeason.endDate) return null;
  return { startDate, endDate };
}

export function normalizeExerciseSeasonWindows(value = {}, season = {}, exerciseIds = []) {
  const source = value && typeof value === 'object' ? value : {};
  const ids = new Set([
    ...Object.keys(source),
    ...(Array.isArray(exerciseIds) ? exerciseIds : []),
  ].map(String).filter(Boolean));
  const windows = {};
  for (const exerciseId of ids) {
    const window = normalizeSeasonWindow(source[exerciseId] || {}, season);
    if (window) windows[exerciseId] = window;
  }
  return windows;
}

export function seasonWindowContainsDate(window, dateKey) {
  return !!window
    && isSeasonDateKey(window.startDate)
    && isSeasonDateKey(window.endDate)
    && isSeasonDateKey(dateKey)
    && window.startDate <= dateKey
    && dateKey <= window.endDate;
}

export function findSeasonById(registry, seasonId) {
  const id = String(seasonId || '').trim();
  if (!id) return null;
  return normalizeSeasonRegistry(registry).seasons.find(season => season.id === id) || null;
}

export function findSeasonForDate(registry, dateKey) {
  if (!isSeasonDateKey(dateKey)) return null;
  return normalizeSeasonRegistry(registry).seasons.find(season => seasonContainsDate(season, dateKey)) || null;
}

export function seasonStatus(season, todayKey) {
  const normalized = normalizeSeason(season);
  if (!normalized || !isSeasonDateKey(todayKey)) return 'none';
  if (todayKey < normalized.startDate) return 'scheduled';
  if (todayKey > normalized.endDate) return 'archived';
  return 'current';
}

export function filterCacheToSeason(cache = {}, season) {
  const normalized = normalizeSeason(season);
  if (!normalized || !cache || typeof cache !== 'object') return {};
  return Object.fromEntries(
    Object.entries(cache).filter(([dateKey]) => seasonContainsDate(normalized, dateKey))
  );
}

export function selectSeasonDecisionCache(cache = {}, registry = {}, referenceDateKey) {
  const normalized = normalizeSeasonRegistry(registry);
  if (!normalized.seasons.length) return cache;
  if (!isSeasonDateKey(referenceDateKey)) return {};
  const season = findSeasonForDate(normalized, referenceDateKey);
  if (season) return filterCacheToSeason(cache, season);
  const firstSeason = normalized.seasons[0];
  if (referenceDateKey < firstSeason.startDate) {
    return Object.fromEntries(Object.entries(cache || {}).filter(([dateKey]) => (
      isSeasonDateKey(dateKey) && dateKey < firstSeason.startDate
    )));
  }
  return {};
}

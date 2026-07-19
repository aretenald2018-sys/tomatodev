// Pure workout season date-range model. No DOM or Firebase access.

export const SEASON_REGISTRY_SCHEMA_VERSION = 3;

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

export function normalizeSeason(value = {}) {
  const id = String(value?.id || '').trim();
  const name = String(value?.name || '').trim();
  const startDate = String(value?.startDate || '');
  const endDate = String(value?.endDate || '');
  if (!id || !name || !isSeasonDateKey(startDate) || !isSeasonDateKey(endDate)) return null;
  if (startDate > endDate) return null;
  const rawExerciseIds = Array.isArray(value?.exerciseIds)
    ? value.exerciseIds
    : Array.isArray(value?.selectedExerciseIds) ? value.selectedExerciseIds : [];
  const exerciseIds = [...new Set(rawExerciseIds
    .map(exerciseId => String(exerciseId || '').trim())
    .filter(Boolean))].sort();
  return {
    ...value,
    id,
    name,
    startDate,
    endDate,
    exerciseIds,
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

  normalized.sort((left, right) => left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id));
  for (let leftIndex = 0; leftIndex < normalized.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < normalized.length; rightIndex += 1) {
      const left = normalized[leftIndex];
      const right = normalized[rightIndex];
      if (right.startDate > left.endDate) break;
      if (seasonScopesOverlap(left, right)) {
        errors.push(`season ranges overlap: ${left.id} / ${right.id}`);
      }
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

export function seasonExerciseIds(season) {
  return normalizeSeason(season)?.exerciseIds || [];
}

export function seasonContainsExercise(season, exerciseId) {
  const id = String(exerciseId || '').trim();
  if (!id) return true;
  const exerciseIds = seasonExerciseIds(season);
  return exerciseIds.length === 0 || exerciseIds.includes(id);
}

export function seasonScopesOverlap(left, right) {
  const leftIds = seasonExerciseIds(left);
  const rightIds = seasonExerciseIds(right);
  if (!leftIds.length || !rightIds.length) return true;
  return leftIds.some(exerciseId => rightIds.includes(exerciseId));
}

export function findSeasonById(registry, seasonId) {
  const id = String(seasonId || '').trim();
  if (!id) return null;
  return normalizeSeasonRegistry(registry).seasons.find(season => season.id === id) || null;
}

export function findSeasonsForDate(registry, dateKey, options = {}) {
  if (!isSeasonDateKey(dateKey)) return [];
  const exerciseId = String(options?.exerciseId || '').trim();
  return normalizeSeasonRegistry(registry).seasons.filter(season => (
    seasonContainsDate(season, dateKey) && (!exerciseId || seasonContainsExercise(season, exerciseId))
  ));
}

export function findSeasonForDate(registry, dateKey, options = {}) {
  return findSeasonsForDate(registry, dateKey, options)[0] || null;
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

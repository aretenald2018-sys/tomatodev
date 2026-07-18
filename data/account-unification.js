// Account ownership helpers deliberately contain no Firebase dependency so the
// same precedence rules can be exercised in tests and reused by every view.

export const ADMIN_ACCOUNT_ID = '김_태우';
export const ADMIN_GUEST_ACCOUNT_ID = '김_태우(guest)';
export const ACCOUNT_UNIFICATION_MARKER_ID = 'account_data_owner_v2';
export const ACCOUNT_UNIFICATION_VERSION = 2;
export const ACCOUNT_OWNER_FIELD = 'dataOwnerId';
export const ACCOUNT_OWNER_VERSION_FIELD = 'dataOwnerVersion';

const LEGACY_ACCOUNT_UNIFICATION_MARKER_IDS = Object.freeze([
  'account_data_unification_v1',
  ACCOUNT_UNIFICATION_MARKER_ID,
]);

// Every private collection considered when selecting the one physical owner.
// This is probe-only metadata: TomatoDev never copies documents between aliases
// or from legacy roots during bootstrap or through a browser migration.
export const ACCOUNT_DATA_COLLECTIONS = Object.freeze([
  'workouts', 'exercises', 'goals', 'quests', 'wines',
  'movies', 'cal_events', 'cooking', 'body_checkins', 'nutrition_db',
  'tomato_cycles', 'custom_muscles', 'gyms', 'routine_templates',
  'equipment_pool', 'running_routes', 'finance_benchmarks', 'finance_actuals', 'finance_loans',
  'finance_positions', 'finance_plans', 'finance_budgets', 'settings',
]);

export const ACCOUNT_OWNER_PROBE_COLLECTIONS = ACCOUNT_DATA_COLLECTIONS;

export function isSharedAdminAccount(ownerId) {
  const normalized = String(ownerId || '').trim();
  return normalized === ADMIN_ACCOUNT_ID || normalized === ADMIN_GUEST_ACCOUNT_ID;
}

export function normalizeSharedAccountOwnerId(ownerId) {
  const normalized = String(ownerId || '').trim();
  if (normalized === ADMIN_ACCOUNT_ID) return ADMIN_ACCOUNT_ID;
  if (normalized === ADMIN_GUEST_ACCOUNT_ID) return ADMIN_GUEST_ACCOUNT_ID;
  return null;
}

// A shared identity has no data path until the async probe explicitly selects
// one. Empty-admin detection selects guest; a probe error remains unresolved.
export function canonicalAccountOwnerId(
  ownerId,
  selectedSharedOwnerId = null,
) {
  const normalized = String(ownerId || '').trim();
  if (!isSharedAdminAccount(normalized)) return normalized;
  return normalizeSharedAccountOwnerId(selectedSharedOwnerId);
}

export function getAccountOwnerAliases(
  ownerId,
  selectedSharedOwnerId = null,
) {
  const normalized = String(ownerId || '').trim();
  if (!normalized) return [];
  if (!isSharedAdminAccount(normalized)) return [normalized];
  const selected = normalizeSharedAccountOwnerId(selectedSharedOwnerId);
  if (!selected) return [];
  const fallback = selected === ADMIN_ACCOUNT_ID
    ? ADMIN_GUEST_ACCOUNT_ID
    : ADMIN_ACCOUNT_ID;
  return [selected, fallback];
}

export function isAccountSystemDocument(collectionName, documentId) {
  return collectionName === 'settings'
    && LEGACY_ACCOUNT_UNIFICATION_MARKER_IDS.includes(String(documentId || '').trim());
}

export function hasMeaningfulAccountInventory(inventory = {}) {
  return Object.entries(inventory || {}).some(([collectionName, documents]) => (
    (documents || []).some((document) => {
      const documentId = typeof document === 'string' ? document : document?.id;
      return documentId && !isAccountSystemDocument(collectionName, documentId);
    })
  ));
}

export function selectSharedAccountOwner({ adminInventory = {} } = {}) {
  return hasMeaningfulAccountInventory(adminInventory)
    ? ADMIN_ACCOUNT_ID
    : ADMIN_GUEST_ACCOUNT_ID;
}

export function readPersistedAccountOwner(account = {}) {
  if (Number(account?.[ACCOUNT_OWNER_VERSION_FIELD] || 0) < ACCOUNT_UNIFICATION_VERSION) {
    return null;
  }
  const ownerId = String(account?.[ACCOUNT_OWNER_FIELD] || '').trim();
  return normalizeSharedAccountOwnerId(ownerId);
}

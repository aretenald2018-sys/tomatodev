"use strict";

// Tomato's historical guest record is an alias of the same person, not a
// separate Daybird/Dashboard identity. Keep this mapping intentionally narrow
// so no unrelated user's "(guest)" account can be merged accidentally.
const TOMATO_ADMIN_OWNER_ID = "김_태우";
const TOMATO_ADMIN_GUEST_OWNER_ID = "김_태우(guest)";

function canonicalTomatoOwnerId(ownerId) {
  const normalized = String(ownerId || "").trim();
  return normalized === TOMATO_ADMIN_GUEST_OWNER_ID ? TOMATO_ADMIN_OWNER_ID : normalized;
}

function isSharedTomatoOwner(ownerId) {
  return canonicalTomatoOwnerId(ownerId) === TOMATO_ADMIN_OWNER_ID;
}

function tomatoOwnerAliases(ownerId) {
  const canonical = canonicalTomatoOwnerId(ownerId);
  if (!canonical) return [];
  return canonical === TOMATO_ADMIN_OWNER_ID
    ? [TOMATO_ADMIN_OWNER_ID, TOMATO_ADMIN_GUEST_OWNER_ID]
    : [canonical];
}

function mergeTomatoDocuments(snapshotGroups = [], mapDocument) {
  const documents = new Map();
  for (const group of snapshotGroups) {
    for (const document of group?.docs || []) {
      // Groups are ordered canonical -> guest -> legacy root.  Do not allow an
      // old same-date document to overwrite the current canonical document.
      if (!documents.has(document.id)) documents.set(document.id, mapDocument(document));
    }
  }
  return [...documents.values()];
}

module.exports = {
  TOMATO_ADMIN_OWNER_ID,
  TOMATO_ADMIN_GUEST_OWNER_ID,
  canonicalTomatoOwnerId,
  isSharedTomatoOwner,
  mergeTomatoDocuments,
  tomatoOwnerAliases,
};

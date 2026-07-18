import test from 'node:test';
import assert from 'node:assert/strict';
import * as accountOwnership from '../data/account-unification.js';
import {
  ACCOUNT_DATA_COLLECTIONS,
  ACCOUNT_OWNER_PROBE_COLLECTIONS,
  ACCOUNT_UNIFICATION_VERSION,
  ADMIN_ACCOUNT_ID,
  ADMIN_GUEST_ACCOUNT_ID,
  canonicalAccountOwnerId,
  getAccountOwnerAliases,
  readPersistedAccountOwner,
  selectSharedAccountOwner,
} from '../data/account-unification.js';
import { getLifeZoneActorReadCandidates } from '../home/life-zone-state.js';

test('an unresolved shared identity has no writable data owner or aliases', () => {
  assert.equal(canonicalAccountOwnerId(ADMIN_ACCOUNT_ID), null);
  assert.equal(canonicalAccountOwnerId(ADMIN_GUEST_ACCOUNT_ID), null);
  assert.deepEqual(getAccountOwnerAliases(ADMIN_ACCOUNT_ID), []);
});

test('a resolved admin owner remains authoritative when meaningful admin data exists', () => {
  const selected = selectSharedAccountOwner({
    adminInventory: { workouts: [{ id: '2026-07-18' }] },
  });
  assert.equal(selected, ADMIN_ACCOUNT_ID);
  assert.equal(canonicalAccountOwnerId(ADMIN_GUEST_ACCOUNT_ID, selected), ADMIN_ACCOUNT_ID);
  assert.deepEqual(getAccountOwnerAliases(ADMIN_GUEST_ACCOUNT_ID, selected), [
    ADMIN_ACCOUNT_ID,
    ADMIN_GUEST_ACCOUNT_ID,
  ]);
});

test('an empty or system-marker-only admin inventory selects guest SSOT', () => {
  assert.equal(selectSharedAccountOwner({ adminInventory: {} }), ADMIN_GUEST_ACCOUNT_ID);
  assert.equal(selectSharedAccountOwner({
    adminInventory: {
      settings: [
        { id: 'account_data_unification_v1' },
        { id: 'account_data_owner_v2' },
      ],
    },
  }), ADMIN_GUEST_ACCOUNT_ID);
});

test('a persisted v2 owner is accepted only for the two shared aliases', () => {
  assert.equal(readPersistedAccountOwner({
    dataOwnerVersion: ACCOUNT_UNIFICATION_VERSION,
    dataOwnerId: ADMIN_GUEST_ACCOUNT_ID,
  }), ADMIN_GUEST_ACCOUNT_ID);
  assert.equal(readPersistedAccountOwner({ dataOwnerVersion: 1, dataOwnerId: ADMIN_ACCOUNT_ID }), null);
  assert.equal(readPersistedAccountOwner({ dataOwnerVersion: 2, dataOwnerId: 'someone-else' }), null);
});

test('selected-owner documents are authoritative without alias recovery helpers', () => {
  assert.equal(accountOwnership.mergeAccountWorkoutFields, undefined);
  assert.equal(accountOwnership.buildAccountUnificationPlan, undefined);
  assert.equal(accountOwnership.ACCOUNT_WORKOUT_FIELDS, undefined);
});

test('nested running routes affect owner choice without enabling browser migration', () => {
  assert.ok(ACCOUNT_OWNER_PROBE_COLLECTIONS.includes('running_routes'));
  assert.equal(ACCOUNT_DATA_COLLECTIONS.includes('running_routes'), true);
  assert.equal(selectSharedAccountOwner({
    adminInventory: { running_routes: [{ id: 'route-1' }] },
  }), ADMIN_ACCOUNT_ID);
});

test('life-zone keeps the account identity ahead of display and legacy aliases', () => {
  assert.deepEqual(getLifeZoneActorReadCandidates({
    accountId: 'moonjung',
    readAccountId: 'moonjung(guest)',
    ownerIdCandidates: ['moonjung(guest)', 'moonjung'],
  }), ['moonjung', 'moonjung(guest)']);
});

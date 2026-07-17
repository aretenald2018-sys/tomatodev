import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCOUNT_DATA_COLLECTIONS,
  ADMIN_ACCOUNT_ID,
  ADMIN_GUEST_ACCOUNT_ID,
  buildAccountUnificationPlan,
  canonicalAccountOwnerId,
  getAccountOwnerAliases,
} from '../data/account-unification.js';
import { getLifeZoneActorReadCandidates } from '../home/life-zone-state.js';

test('shared guest identity resolves to the canonical data owner', () => {
  assert.equal(canonicalAccountOwnerId(ADMIN_GUEST_ACCOUNT_ID), ADMIN_ACCOUNT_ID);
  assert.deepEqual(getAccountOwnerAliases(ADMIN_GUEST_ACCOUNT_ID), [
    ADMIN_ACCOUNT_ID,
    ADMIN_GUEST_ACCOUNT_ID,
  ]);
});

test('unification copies missing guest and root documents without overwriting a canonical day', () => {
  const plan = buildAccountUnificationPlan({
    canonicalDocuments: [{ id: '2026-07-17', data: { lFoods: [{ name: 'meal' }] } }],
    guestDocuments: [
      { id: '2026-07-17', data: { running: true, runDistance: 5 } },
      { id: '2026-07-16', data: { bFoods: [{ name: 'breakfast' }] } },
    ],
    legacyDocuments: [
      { id: '2026-07-16', data: { running: true } },
      { id: '2026-07-15', data: { exercises: [{ id: 'bench' }] } },
    ],
  });

  assert.deepEqual(plan.map((document) => document.id), ['2026-07-16', '2026-07-15']);
  assert.equal(plan.find((document) => document.id === '2026-07-16').data.bFoods[0].name, 'breakfast');
});

test('unification covers meals, seasons, and workout configuration collections', () => {
  for (const collectionName of [
    'workouts', 'settings', 'tomato_cycles', 'nutrition_db',
    'gyms', 'routine_templates', 'equipment_pool',
  ]) {
    assert.ok(ACCOUNT_DATA_COLLECTIONS.includes(collectionName), `${collectionName} must be unified`);
  }
});

test('life-zone reads the canonical account before a guest alias', () => {
  assert.deepEqual(getLifeZoneActorReadCandidates({
    accountId: 'moonjung',
    readAccountId: 'moonjung(guest)',
    ownerIdCandidates: ['moonjung(guest)', 'moonjung'],
  }), ['moonjung', 'moonjung(guest)']);
});

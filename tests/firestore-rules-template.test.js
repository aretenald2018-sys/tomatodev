import test from 'node:test';
import assert from 'node:assert/strict';

import { renderTomatoDevFirestoreRules } from '../scripts/render-firestore-rules.mjs';

const rules = renderTomatoDevFirestoreRules({
  ownerUid: 'ownerUid_123',
  readerUid: 'readerUid_456',
});

test('TomatoDev rules bind owner and Daybird reader to distinct exact UIDs', () => {
  assert.match(rules, /request\.auth\.uid == 'ownerUid_123'/);
  assert.match(rules, /request\.auth\.uid == 'readerUid_456'/);
  assert.throws(
    () => renderTomatoDevFirestoreRules({ ownerUid: 'sameUid_123', readerUid: 'sameUid_123' }),
    /must differ/,
  );
  assert.throws(
    () => renderTomatoDevFirestoreRules({ ownerUid: 'bad uid', readerUid: 'readerUid_456' }),
    /owner UID is invalid/,
  );
});

test('Daybird reader can only get account mapping, approved settings, and workouts', () => {
  assert.match(rules, /match \/_accounts\/\{accountId\} \{\s*allow get: if isDaybirdReader\(\) && accountId == '김_태우';/);
  assert.match(rules, /match \/users\/\{accountId\}\/settings\/\{settingId\}/);
  assert.match(rules, /isDaybirdSetting\(settingId\)/);
  assert.match(rules, /settingId == 'diet_plan'/);
  assert.match(rules, /settingId == 'tomatodev_season_registry_v3'/);
  assert.match(rules, /tomatodev_season_\[A-Za-z0-9_-\]\+_/);
  assert.match(rules, /match \/users\/\{accountId\}\/workouts\/\{workoutId\} \{\s*allow get, list: if isDaybirdReader\(\) && accountId == '김_태우';/);
  assert.doesNotMatch(rules, /match \/users\/\{accountId\}\/\{document=\*\*\}/);
  assert.doesNotMatch(rules, /allow (?:create|update|delete|write): if isDaybirdReader/);
});

test('only the exact owner UID receives the dedicated-project fallback', () => {
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if isOwner\(\);/);
  assert.doesNotMatch(rules, /allow read, write: if isDaybirdReader/);
});

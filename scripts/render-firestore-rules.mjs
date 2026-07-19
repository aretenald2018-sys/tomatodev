import { pathToFileURL } from 'node:url';

function validUid(value, label) {
  const uid = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(uid)) throw new TypeError(`${label} UID is invalid`);
  return uid;
}

export function renderTomatoDevFirestoreRules({ ownerUid, readerUid } = {}) {
  const owner = validUid(ownerUid, 'owner');
  const reader = validUid(readerUid, 'reader');
  if (owner === reader) throw new TypeError('owner and reader UIDs must differ');

  return `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner() {
      return request.auth != null && request.auth.uid == '${owner}';
    }

    function isDaybirdReader() {
      return request.auth != null && request.auth.uid == '${reader}';
    }

    function isDaybirdSetting(settingId) {
      return settingId == 'diet_plan'
        || settingId == 'tomatodev_season_registry_v3'
        || settingId == 'tomatodev_test_board_v3'
        || settingId.matches('tomatodev_season_[A-Za-z0-9_-]+_(workout_plan_v4|test_board_v3|running_plan_v3)');
    }

    match /_accounts/{accountId} {
      allow get: if isDaybirdReader() && accountId == '김_태우';
    }

    match /users/{accountId}/settings/{settingId} {
      allow get: if isDaybirdReader() && accountId == '김_태우' && isDaybirdSetting(settingId);
    }

    match /users/{accountId}/workouts/{workoutId} {
      allow get, list: if isDaybirdReader() && accountId == '김_태우';
    }

    // This is a dedicated single-owner project. Only the exact owner UID gets
    // the catch-all needed by TomatoDev's private, admin, and social surfaces.
    match /{document=**} {
      allow read, write: if isOwner();
    }
  }
}
`;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  process.stdout.write(renderTomatoDevFirestoreRules({
    ownerUid: argumentValue('--owner-uid'),
    readerUid: argumentValue('--reader-uid'),
  }));
}

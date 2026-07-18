# TomatoDev environment boundaries

## Isolated now

- Git repository and history: `aretenald2018-sys/tomatodev`
- canonical local checkout and task worktrees
- GitHub Pages workflow and artifact
- Pages URL: `https://aretenald2018-sys.github.io/tomatodev/`
- repository and pre-push guards, which validate both fetch and push URLs and reject every non-TomatoDev remote
- TomatoDev-owned service-worker caches; the TomatoDev worker deletes only its own cache namespace
- the Firebase app instance and Firestore persistence cache, which use the `tomatodev` app name
- active-account/auth IndexedDB, pending-day journals, running/workout drafts, timer state, Wear queues, and private local API settings, all of which use TomatoDev-only names
- FCM permission requests, push registration, and token persistence on every platform (including Capacitor/native), plus APK publishing, production callable functions, automatic account maintenance, bootstrap migrations, and analytics/login telemetry writes, which are disabled
- automatic Home gamification settlement, default cycle dates, and milestone markers, which update session memory only and never publish to Firestore
- the legacy Firestore `settings/active_timer` pointer and automatic idle workout completion: TomatoDev never hydrates or mutates that pointer, and boot/load/resume checks can bound stale duration only in session memory without saving a day document

The Pages workflow and `npm.cmd run deploy:dev` run only for a clean TomatoDev `main`. They contain no Firebase, Functions, Android, or Wear deployment step. The tracked `.firebaserc` mapping is intentionally removed so a plain Firebase deployment has no repository-provided default project.

## Still shared with the operating app

- Firebase project `exercise-management`, including Auth, Firestore, Functions, and Storage
- browser origin `https://aretenald2018-sys.github.io`; critical persisted state is namespaced, but unrelated legacy UI preferences still occupy the same origin-wide storage container
- Capacitor application IDs in the retained native source tree

TomatoDev's account-owner v2 logic resolves the data owner with read-only probes. It does not automatically migrate data, write an owner selection to `_accounts`, persist a migration marker, or save render-derived gamification defaults. Because Firebase is still shared, an explicit user action in TomatoDev can still read or change operating data after owner resolution. Do not use TomatoDev for destructive data tests.

Workout timer and active-workout recovery uses only user-scoped `tomatodev_*` local keys. App boot, date hydration, visibility return, and native resume never auto-finish a loaded workout into shared Firestore. The explicit Finish, Reset, and Pause controls still persist their user-requested changes.

FCM is fail-closed on every TomatoDev platform. The public initialization and token APIs remain callable but return `tomatodev-fcm-disabled`; they never request notification permission, invoke Capacitor push registration, load Firebase Messaging, or write/delete `_fcm_tokens`. The retained Android source does not apply the Google Services plugin. Production Firebase callable functions are blocked before a proxy is created. The downloadable Android APK is not published from this repository. Do not deploy Firebase or Functions, publish an APK, or install a separate native development app until dedicated development project and application IDs exist.

The web manifest contains no production GCM sender ID. Deployment verification rejects a Pages artifact unless `build-info.json` identifies `tomatodev` and `index.html` contains the TomatoDev environment marker.

TomatoDev never imports the operating app's unqualified auth keys, IndexedDB session, recovery journals, or workout drafts. This prevents merely opening TomatoDev from restoring an operating session or flushing an operating draft. This is still not an origin boundary: cookies and any browser persistence not explicitly namespaced remain visible to both paths, so a separate host is required for complete browser isolation.

The TomatoDev service worker cannot delete Tomato Farm caches. Isolation is temporarily one-way: an older Tomato Farm production worker still uses broad origin-wide cache cleanup and may evict TomatoDev caches until that production worker is corrected.

Full runtime isolation requires a dedicated Firebase project, a separate browser origin or complete namespacing for every browser persistence API, server-enforced account-owner routing, and distinct Android/Wear application IDs.

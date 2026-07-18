# TomatoDev environment boundaries

## Isolated now

- Git repository and history: `aretenald2018-sys/tomatodev`
- canonical local checkout and task worktrees
- GitHub Pages workflow and artifact
- Pages URL: `https://aretenald2018-sys.github.io/tomatodev/`
- repository and pre-push guards, which validate both fetch and push URLs and reject every non-TomatoDev remote
- Firebase project `tomatodev-arete` and its Seoul Firestore database
- Firebase Web app `1:152955180727:web:3b5abba096d288dba15f32`
- pre-provisioned Firebase email/password owner `kim-taewoo@tomatodev.local`; the browser can sign in but cannot create the identity, and only a domain-separated PBKDF2-HMAC-SHA-256 derivative is sent to Firebase Auth
- planned read-only Daybird/Budget principal `daybird-reader@tomatodev.local`; creating either real identity and storing its credential requires explicit approval
- Android/Wear application ID `com.lifestreak.dev` and Firebase Android app `1:152955180727:android:73963660fcbbf9cda15f32`
- TomatoDev-owned service-worker caches; the TomatoDev worker deletes only its own cache namespace
- the Firebase app instance and Firestore persistence cache, which use the `tomatodev` app name and never initialize `exercise-management`
- active-account/auth IndexedDB, pending-day journals, running/workout drafts, timer state, Wear queues, and private local API settings, all of which use TomatoDev-only names
- FCM permission requests, push registration, and token persistence on every platform (including Capacitor/native), plus APK publishing, production callable functions, automatic account maintenance, bootstrap migrations, and analytics/login telemetry writes, which are disabled
- automatic Home gamification settlement, default cycle dates, and milestone markers, which update session memory only and never publish to Firestore
- the legacy Firestore `settings/active_timer` pointer and automatic idle workout completion: TomatoDev never hydrates or mutates that pointer, and boot/load/resume checks can bound stale duration only in session memory without saving a day document

The Pages workflow and `npm.cmd run deploy:dev` run only for a clean TomatoDev `main`. The tracked `.firebaserc` maps exclusively to `tomatodev-arete`; repository guards must reject `exercise-management` before any Firebase deployment. Functions and messaging remain disabled until they are configured and verified in the development project.

Firestore is intentionally deny-all until the real owner and Daybird reader identities are explicitly approved, provisioned, and their immutable UIDs are installed in the rules. Email claims are not authorization, `_accounts/김_태우` is not public, and the client contains no Firebase account-creation fallback. Login must authenticate the pre-provisioned owner first and only then fetch the protected profile; any authentication or profile-fetch failure signs out Firebase and clears the local session.

## Still shared with the operating app

- browser origin `https://aretenald2018-sys.github.io`; critical persisted state is namespaced, but unrelated legacy UI preferences still occupy the same origin-wide storage container
- source-level Java/Kotlin namespaces retained for compatibility; install identity is isolated by `applicationId`

TomatoDev's account-owner v2 logic resolves the data owner inside the development database. The initial seed is a one-way read from TomatoFarm followed by writes only to `tomatodev-arete`; subsequent browser and Daybird traffic uses the development project exclusively. Production is never a fallback.

Workout timer and active-workout recovery uses only user-scoped `tomatodev_*` local keys. App boot, date hydration, visibility return, and native resume never auto-finish a loaded workout into shared Firestore. The explicit Finish, Reset, and Pause controls still persist their user-requested changes.

FCM is fail-closed on every TomatoDev platform. The public initialization and token APIs remain callable but return `tomatodev-fcm-disabled`; they never request notification permission, invoke Capacitor push registration, load Firebase Messaging, or write/delete `_fcm_tokens`. Callable functions are blocked before a proxy is created. Native builds use the dedicated development application ID and configuration.

The web manifest contains no production GCM sender ID. Deployment verification rejects a Pages artifact unless `build-info.json` identifies `tomatodev` and `index.html` contains the TomatoDev environment marker.

TomatoDev never imports the operating app's unqualified auth keys, IndexedDB session, recovery journals, or workout drafts. This prevents merely opening TomatoDev from restoring an operating session or flushing an operating draft. This is still not an origin boundary: cookies and any browser persistence not explicitly namespaced remain visible to both paths, so a separate host is required for complete browser isolation.

The TomatoDev service worker cannot delete Tomato Farm caches. Isolation is temporarily one-way: an older Tomato Farm production worker still uses broad origin-wide cache cleanup and may evict TomatoDev caches until that production worker is corrected.

The remaining browser-origin caveat is GitHub Pages path sharing. All known critical persistence keys and service-worker caches are TomatoDev-prefixed; a separate host would provide the final origin-level boundary.

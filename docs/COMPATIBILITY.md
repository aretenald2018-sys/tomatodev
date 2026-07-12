# Compatibility inventory

The app has no runtime business-action compatibility bridge. New UI actions must use a feature-scoped handler or a `data-*` action contract; architecture tests reject new inline handlers and unapproved `window.*` assignments.

## Supported public facades

- `data.js` is the permanent public data facade. Runtime features import it while implementation remains under `data/`.
- `render-home.js` and `render-workout.js` are temporary entry re-export shims for internal import compatibility. No new code may import either shim; migrate their remaining consumers to `home/index.js` and `workout/index.js` before 2026-10-31, then remove the files.
- Root `expert-mode.css` is an empty historical entry. Presentation is owned by `styles/workout/expert-mode.css`; retain the empty path only through the installed-WebView update window, then remove it by 2026-10-31.

## Data readers and operational bridges

- Legacy workout, nutrition, running-route, and Wear payload readers are data-preservation code, not UI compatibility shims. They remain until a production read-back audit proves no older persisted records need them.
- `__migrateGymV1`, `__migrationCleanupGyms`, and expert debug helpers are operator-only migration/recovery tools. Removal target: after gym-v1 migration is confirmed complete for every production account, no later than 2026-12-31. They must never be called from user-facing UI.
- PWA, Capacitor/Wear, haptic, and build-information bridges are platform integration surfaces. They are intentionally allowlisted by the architecture test and are not business action APIs.

## Removed in this refactor

- `app/compatibility-bridge.js` and its action allowlist.
- Global `registerAction`/`registerActions`; modules import the action router directly.
- AI food-profile console globals; exported module functions remain available to code.
- Weekly-streak and welcome-back inline handlers and their transient window state.
- Query-string duplicates from the service-worker precache manifest.

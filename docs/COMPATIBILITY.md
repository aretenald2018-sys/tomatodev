# Compatibility inventory

The refactor does not permit new global actions. Remaining compatibility surfaces are explicit and time-bounded.

## App shell allowlist

`app/compatibility-bridge.js` exposes only actions still consumed by legacy lazy modules or dynamically generated markup. New code must import modules or bind scoped `data-*` actions. Removal target: replace consumers per feature slice before 2026-09-30, then delete each unused allowlist key.

## Lazy feature globals

Workout expert, social profile/feed, admin editor, and a few modal modules still publish action functions after their module loads. They remain because their templates are generated inside those same lazy modules. Removal target: move each template to a scoped event delegate before 2026-10-31. Architecture tests prevent the global-assignment count from growing.

## Operational migration helpers

`__migrateGymV1`, `__migrationCleanupGyms`, and the expert debug helpers remain solely for operator-driven migration/recovery. Remove them after gym-v1 migration is confirmed complete for every production account, no later than 2026-12-31. They must never be called from user-facing UI.

## Removed in this refactor

- Global `registerAction`/`registerActions`; modules import the action router directly.
- AI food-profile console globals; exported module functions remain available to code.
- Weekly-streak and welcome-back inline handlers and their transient window state.
- Query-string duplicates from the service-worker precache manifest.

# AI Context

## Project

Tomato Farm Lite is a vanilla JavaScript fitness, nutrition, and habit app with Firebase-backed
data, workout planning, growth preview, test mode, and mobile/PWA constraints.

## Domain Terms

- growth preview: workout progress preview UI that explains the meaning of today's training.
- body part: a training target such as chest, back, legs, shoulders, arms, or core.
- benchmark: representative exercise performance used to compare recent sessions.
- volume bias: recommendation that emphasizes more total work.
- intensity bias: recommendation that emphasizes heavier or harder work.
- plan sheet: modal/sheet UI for editing or reviewing workout plans.
- static asset: any file listed in `sw.js` `STATIC_ASSETS`; changing one requires `CACHE_VERSION`.

## Defaults For AI Work

- Keep the project vanilla JavaScript.
- Edit source files at the root, not `www/` build artifacts.
- Preserve Firebase access through `data.js`.
- Treat modal event propagation rules as critical.
- For UI changes, exercise the real app flow before claiming verification.

## Vocabulary To Prefer

- Use "planning session", "execution session", and "review session" for AI work phases.
- Use "slice" for one execution-session unit.
- Use "approved plan" for a plan document the user has accepted.

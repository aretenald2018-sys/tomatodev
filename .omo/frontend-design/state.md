# Frontend Design State: Tomato input UX

Updated: 2026-07-03
Status: final plan approved for execution

## Current Objective

Improve non-intuitive entry UX across gym exercise logging, meal logging, and running/cardio logging without changing Tomato Farm's existing visual identity or vanilla JavaScript architecture.

## Source Inputs

- User request: 헬스종목입력/식단입력/런닝 및 유산소입력 관점에서 비직관적인 UX 개선 및 덜 개발된 부분 완성.
- Project rules: planning session before execution, Korean planning docs, one approved execution slice at a time, no direct `www/` edits, bump `sw.js` cache version for `STATIC_ASSETS` edits.
- Local UI constraints: mobile-first Tomato/TDS style, existing Seed icon package, dense operational UI rather than marketing layout.
- Commercial references: MyFitnessPal Meal Scan, Cronometer, Hevy, Strong, Nike Run Club, Strava.
- Design system contract: root `DESIGN.md`.
- Final plan: `.omo/plans/2026-07-03-input-ux-commercial-completion.md`.

## Design Brief

The product should feel like a fast personal health logger, not a settings-heavy tracker. Each input area needs a clear first action, visible alternatives, and a predictable save confirmation.

- Gym: choose or resume an activity, add an exercise, enter sets, complete/rest, continue.
- Meal: choose meal, add by search/recent/direct/photo AI/photo attach, confirm serving, save.
- Running/cardio: choose outdoor GPS or manual/indoor cardio, set goal or start, finish, save summary.

## Personas

- Tired lifter after a set: needs large touch targets, previous values, minimal typing, fast "done/rest/next" rhythm.
- Busy meal logger: needs one-tap meal add, recent foods, photo AI with correction, clear difference between AI scan and photo attachment.
- Indoor/outdoor cardio user: needs both GPS run and treadmill/manual cardio visible without going through exercise search.
- Korean mobile user: needs CJK-safe labels, no clipped text, keyboard-friendly numeric inputs, no hover-only affordances.

## Locked Design Decisions

- Preserve the Tomato Farm/TDS visual language. Do not introduce a new theme or landing-style hero.
- Use root `DESIGN.md` as the token/component contract before adding UI.
- Use icons only where they clarify repeated actions; label primary actions where ambiguity would slow logging.
- Keep cards shallow and functional. Do not nest cards inside cards for input sheets.
- Keep dense but legible mobile layout. Stable dimensions are required for tabs, chips, row actions, and sheet buttons.
- No viewport-width font scaling. Keep letter spacing neutral.
- Prefer direct binding inside modal/sheet bodies when propagation is stopped.

## Interaction Principles

- One primary action per context: exercise add, meal add, start run/cardio.
- Progressive disclosure: show common paths first, advanced options one tap away.
- Save-state clarity: draft, saved, skipped, and AI-estimated states must be visibly distinct.
- Reversible actions: delete/replace food or exercise entries should retain current undo/toast behavior where already present.
- No hidden completed features: implemented activity forms should have visible entry points if they are product-supported.

## Accessibility And QA Matrix

| Area | QA checks |
| --- | --- |
| Mobile layout | 360px and 390px widths, no clipped Korean text, no overlapping action buttons |
| Touch | Primary targets at least comfortable thumb size; adjacent destructive actions separated |
| Keyboard | Numeric inputs usable with mobile keyboard; focus returns to useful place after modal close |
| Motion | Running progress and sheets remain usable with reduced-motion expectations |
| State | Current gym draft, meal fields, photo fields, and cardio draft survive tab/type switches |
| Events | Buttons inside stopped-propagation sheets use direct or capture-phase handlers |

## Design Debt To Resolve During Execution

- Workout type entry exposes fewer choices than the state/save layer supports.
- Manual cardio is hidden in the exercise picker and uses a fragile save isolation pattern.
- Meal entry actions are split across small buttons, inline handlers, hidden inputs, and bulk AI panel state.
- Running has strong core functionality but less clear fallback for treadmill/manual cardio.
- Several existing input controls use inline `onclick`; new work should move fragile interactions to explicit bound handlers where touched.

## Evidence Index

- `DESIGN.md`
- `.omo/plans/2026-07-03-input-ux-commercial-completion.md`
- `docs/ai/features/2026-07-03-input-ux-commercial-completion.md`
- `.omo/drafts/2026-07-03-input-ux-commercial-completion.md`
- `index.html`
- `style.css`
- `workout-ui.js`
- `workout/activity-forms.js`
- `workout/exercises.js`
- `workout/running-session.js`
- `feature-nutrition.js`
- `modals/nutrition-search-modal.js`
- `modals/nutrition-weight-modal.js`
- `tests/running-entry.test.js`
- `tests/diet-add-button-binding.test.js`
- `tests/workout-exercise-entry-actions.test.js`

# AI Meal Artifact Label Cleanup

## Request

User reported that a May 14 lunch entry is displayed like `점심5/14_제미나이 670kcal`, and this kind of label must not appear as a meal/food name.

## Shared Understanding

- Goal: Prevent AI/provider/date/meal metadata labels such as `점심5/14_제미나이` from being saved or displayed as food item names.
- Non-goals: Do not change calorie estimation logic, macro calculation, meal photo upload, Firebase schema, or diet UI layout.
- User flow: User uploads or records a lunch photo/AI estimate, and the resulting food chips should show real food names only. Provider/date labels should be filtered before rendering/saving.
- Data assumptions: The bad label is likely coming through `detectedItems[].name` in the AI meal estimate pipeline.
- Open questions: None for the first fix; the user gave a concrete bad label and the code already has partial artifact-name filtering.

## Decision Log

- Decision: Extend the existing artifact-name filter rather than redesigning the AI prompt or UI.
- Reason: `ai/meal-estimate.js` and `workout/ai-estimate.js` already filter exact provider labels, but the current regex misses combined labels with meal/date/provider text.
- Reversible: Yes. The regex/test change is small and isolated.

## Execution Slices

### Slice 1: Filter Combined AI Meal Labels

- Status: Implemented in the execution session on 2026-05-14.
- Goal: Filter AI artifact names like `점심5/14_제미나이`, `lunch_5/14 Gemini`, or provider/date-only labels before they reach diet food chips.
- Scope: Tighten the artifact-name predicate in the AI estimate pipeline and add a focused regression test.
- Likely files:
  - `ai/meal-estimate.js`
  - `workout/ai-estimate.js`
  - `tests/ai-meal-artifact-label.test.js` or the nearest existing pure test file
  - `sw.js` if any file listed in `STATIC_ASSETS` is modified
- Do not change:
  - Firebase access/data schema
  - diet save payload fields
  - calorie/macro math
  - `www/` build artifact files
- Implementation notes:
  - Preserve existing food items when the name is a real dish.
  - Treat meal words plus date separators plus provider terms as metadata, not food.
  - Keep the existing prompt guard, but rely on deterministic post-processing because model output can still drift.
  - If `ai/meal-estimate.js` or `workout/ai-estimate.js` changes, bump `CACHE_VERSION` in `sw.js`.
- Verification:
  - Run a focused Node test proving `점심5/14_제미나이` is removed while normal Korean food names remain.
  - Run the relevant test command from the project root using `.cmd` shims where applicable.
  - UI verification still requires the user to start the local dev server and exercise the food-photo estimate flow.
- Done proof:
  - Bad label no longer appears as a food chip.
  - Test covers the exact reported label.
  - `sw.js` cache version is bumped if static assets changed.
- Follow-up note:
  - The same stale label can appear in the neighbor feed/profile because those views render already-saved `bFoods/lFoods/dFoods/sFoods` directly. The execution also applies the same display-only sanitizer to neighbor feed/profile rendering without mutating saved data.
  - Neighbor feed cards also need to render saved meal photos (`bPhoto/lPhoto/dPhoto/sPhoto`); otherwise a photo-only or artifact-only AI record loses the user's actual visual food record in the list.
- Next-session prompt:
  - `Execute Slice 1 from docs/ai/features/2026-05-14-ai-meal-artifact-label-cleanup.md. Fix the AI meal artifact label filter for the reported 점심5/14_제미나이 case, add a focused regression test, and bump sw.js CACHE_VERSION if required.`

## Review Prompt

Read this plan and the changed files from the execution session. Review for overly broad filtering that could remove real food names, missing service worker cache bump, missing regression coverage for `점심5/14_제미나이`, and any diet UI/save regressions. Do not implement new feature work during review.

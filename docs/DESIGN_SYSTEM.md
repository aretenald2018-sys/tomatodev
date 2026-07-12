# Tomato Farm Design System

## CSS load order and ownership

1. `styles/tokens.css`: color, spacing, radius, typography, elevation, motion, interaction tokens only.
2. `styles/components.css`: established TDS component contracts and utilities.
3. `styles/primitives.css`: composable field, chip, sheet, and feedback-state primitives.
4. `styles/features/*.css`: feature-owned rules in the exact order declared by `index.html`. A file owns one screen or interaction surface; later files are explicit compatibility overrides.
5. `style.css`: app-shell font/responsive rules and temporary light-mode compatibility only. Feature rules do not belong here.
6. `styles/workout/expert-mode.css`: the isolated expert-mode scene stylesheet. `expert-mode.css` is a temporary empty compatibility entry.
7. `styles/accessibility.css`: last-loaded focus, minimum touch target, assistive text, and reduced-motion guarantees.

Feature selectors should stay under their feature root. New selectors must not rely on a later `!important` override. Shared components use the `tds-` prefix; feature-owned classes keep their existing feature prefix.

The split deliberately preserves the former `style.css` cascade byte-for-byte within each ordered slice. Moving a rule between feature files requires checking the adjacent links in `index.html`; alphabetic filename order is not the cascade contract. `runtime-assets.js` must list every loaded stylesheet so offline startup sees the same cascade.

### Large stylesheet exceptions

- `styles/features/home-life-zone.css` exceeds 1,200 lines because the life-zone scene, its responsive sprite layout, and reduced-motion variants share the same selector state machine. Its sole responsibility is the home life-zone surface.
- `styles/features/workout-day-sheet.css` exceeds 1,200 lines because collapsed/full sheet geometry, touch behavior, keyboard pad, and running read cards form one ordered responsive surface. Its sole responsibility is the workout day sheet.
- `styles/workout/expert-mode.css` remains a larger isolated scene stylesheet. It owns only Expert/Max/Test scene presentation; splitting it before the remaining legacy scene selectors are removed would obscure their cross-scene override order.

All other feature stylesheets stay below 1,200 lines. These three exceptions are guarded by the architecture test and must not gain a second responsibility.

## Interaction contract

- Primary interactive controls use a native `button`, `a`, `input`, `select`, or `textarea` whenever possible.
- Custom controls require keyboard behavior, an accessible name, and state attributes such as `aria-expanded`, `aria-selected`, or `aria-pressed`.
- Primary touch controls are at least `44px` by `44px` through `--touch-target-min`.
- Modal opening moves focus into the dialog, traps Tab within the top dialog, and restores focus to the opener on close.
- Loading containers use `aria-busy="true"`; empty, offline, error, and success feedback use `.tds-feedback` with `data-state`.
- Motion respects `prefers-reduced-motion` in the final accessibility layer.

## Primitive examples

```html
<label class="tds-field">
  <span class="tds-field-label">운동 이름</span>
  <input class="tds-input" name="exercise" aria-describedby="exercise-help">
  <span class="tds-field-help" id="exercise-help">검색어를 입력하세요.</span>
</label>

<section class="tds-feedback" data-state="offline" role="status">
  <p>오프라인 상태입니다.</p>
  <div class="tds-feedback-actions"><button class="tds-btn">다시 시도</button></div>
</section>
```

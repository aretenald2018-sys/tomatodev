# Tomato Farm Design System

## CSS load order and ownership

1. `styles/tokens.css`: color, spacing, radius, typography, elevation, motion, interaction tokens only.
2. `styles/components.css`: established TDS component contracts and utilities.
3. `styles/primitives.css`: composable field, chip, sheet, and feedback-state primitives.
4. `style.css`: legacy shell and feature compatibility styles. New shared primitives do not belong here.
5. `expert-mode.css`: expert-mode feature overrides only.
6. `styles/accessibility.css`: last-loaded focus, minimum touch target, assistive text, and reduced-motion guarantees.

Feature selectors should stay under their feature root. New selectors must not rely on a later `!important` override. Shared components use the `tds-` prefix; feature-owned classes keep their existing feature prefix.

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

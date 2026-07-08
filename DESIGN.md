# Tomato Farm Design System

## 1. Atmosphere & Identity

Tomato Farm is a mobile-first personal health logger: calm, fast, and tactile. The signature is tomato-red focus inside quiet TDS Mobile surfaces, with Seed-compatible spacing and rounded controls that make repeated daily logging feel light rather than administrative.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| Surface/base | `--bg` | project token | project token | Page background |
| Surface/primary | `--surface` | project token | project token | Rows, panels |
| Surface/secondary | `--surface2` | project token | project token | Inputs, soft blocks |
| Surface/fill | `--seed-bg-fill` | Seed token | Seed token | Chips, compact controls |
| Text/primary | `--text` | project token | project token | Main text |
| Text/secondary | `--text-secondary` | project token | project token | Secondary labels |
| Text/muted | `--seed-fg-muted` | Seed token | Seed token | Hints and subdued controls |
| Border/default | `--border` | project token | project token | Legacy dividers |
| Border/neutral | `--seed-stroke-neutral` | Seed token | Seed token | TDS/Seed controls |
| Accent/primary | `--primary` | `#fa342c` | `#fa342c` | Primary actions, focus |
| Accent/bg | `--primary-bg` | `#fdf0f0` | project token | Focus ring and weak primary fill |
| Accent/light | tomato light | `#fed4d2` | project token | Weak brand emphasis |
| Accent/sub | tomato sub | `#fc6a66` | project token | Secondary brand emphasis |
| Accent/dark | tomato dark | `#ca1d13` | project token | Strong brand emphasis |
| Accent/deep | tomato deepest | `#921708` | project token | Critical/pressed tomato states |
| Success | `--seed-fg-positive` | Seed token | Seed token | Confirmed/saved states |
| Critical | `--seed-fg-critical` | Seed token | Seed token | Delete, skipped, destructive |

### Rules

- Use Tomato red only for primary interaction, focus, and meaningful saved/active states.
- For new input controls prefer existing CSS variables and Seed tokens. Do not introduce raw hex values outside this file unless updating this table first.
- Keep diet/workout/cardio surfaces visually consistent; differences come from icon, label, and state, not from unrelated color palettes.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| TDS t1 | 30px | 700 | 40px | 0 | Major mobile title |
| TDS t4 | 20px | 700 | 29px | 0 | Modal title |
| TDS t7 | 13px | 600 | 19.5px | 0 | Compact labels |
| TDS st10 | 16px | 600 | 24px | 0 | Main row/button text |
| TDS st11 | 14px | 500-600 | 21px | 0 | Inputs, list body |
| TDS st13 | 11px | 500-700 | 16.5px | 0 | Meta, badges |
| Seed t4 | `var(--seed-t4)` | 500-700 | project token | 0 | Mobile form fields |
| Seed t3 | `var(--seed-t3)` | 600 | project token | 0 | Compact action labels |
| Seed t2 | `var(--seed-t2)` | 500-600 | project token | 0 | Secondary chips |
| Seed t1 | `var(--seed-t1)` | 500-700 | project token | 0 | Tiny meta |

### Font Stack

- Primary: `'Toss Product Sans', 'Tossface', 'SF Pro KR', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
- Mono: existing project mono token for numbers.

### Rules

- Do not scale font size with viewport width.
- Letter spacing stays `0` unless an existing token already defines otherwise.
- CJK labels must not clip or create one-syllable orphan lines inside buttons, chips, or sheets.

## 4. Spacing & Layout

### Base Unit

All new spacing derives from 4px and existing Seed/TDS variables.

| Token | Value | Usage |
| --- | --- | --- |
| `--seed-x1` | 4px-equivalent | Tight inline gaps |
| `--seed-x2` | 8px-equivalent | Compact row gaps |
| `--seed-x3` | 12px-equivalent | Button/chip padding |
| `--seed-x4` | 16px-equivalent | Panel inner padding |
| `--seed-x5` | 20px-equivalent | Comfortable sheet spacing |
| `--seed-r2` | project Seed radius | Inputs and chips |
| `--seed-r3` | project Seed radius | Small panels |
| `--seed-r-full` | full radius | Pills and circular controls |

### Grid

- Primary breakpoint target: mobile 360px and 390px.
- Desktop and tablet should remain readable but not transform the app into a landing-page layout.
- Fixed-format controls such as type tabs, quick-add buttons, and numeric fields require stable min-height and no layout shift on active/hover states.

### Rules

- No nested cards for input sheets.
- Use horizontal scrolling chips for many workout activity types rather than shrinking text.
- Keep touch targets comfortable, especially for logging while tired or moving.

## 5. Components

### Activity Type Tab

- Structure: button inside `.wt-type-tabs`, `id="wt-chip-<type>"`, calls `wtSwitchType('<type>')` or uses equivalent direct binding.
- Variants: default, active, has-record.
- Spacing: `--seed-x1` gap, `--seed-x2 --seed-x3` padding.
- States: active uses weak tomato fill and tomato border; has-record adds a small tomato dot.
- Accessibility: button text must include the activity name, not only an icon.
- Motion: active/pressed uses existing 0.1s TDS transition.

### Activity Detail Section

- Structure: `.wt-detail-section` with heading, optional copy hint, form fields, and memo.
- Variants: gym, CF, stretching, swimming.
- States: closed, open, saved-by-record-dot.
- Accessibility: each field has a visible label and numeric input mode when applicable.
- Motion: use existing max-height/opacity open transition.

### Meal Quick Add Sheet

- Structure: modal-like sheet with a clear meal title and action buttons for search, recent/search modal, direct input, photo AI, photo attachment, and skip where supported.
- Variants: regular meal and snack; snack omits skip unless product rules add snack skip later.
- States: default, loading if modal injection is needed, disabled only while an action is running.
- Accessibility: action buttons are full-width or stable grid cells with visible text and no icon-only ambiguity.
- Motion: sheet open/close only; no decorative motion.

### Meal Frequent Food Group

- Structure: one wide, soft chip/card under a regular meal row with the label `이때 자주 먹었던 것` and inline text options.
- Variants: breakfast, lunch, dinner; snack is excluded until product rules add snack recommendations.
- States: hidden when no candidate exists, default with 1-3 inline add options, pressed option.
- Visual hierarchy: actual consumed `.meal-food-chip` entries are thicker and bold; recommendation options are lighter text inside the group and must not look like already-consumed food chips.
- Accessibility: each inline option remains a real button with a visible food name and amount; the `+` sign is a secondary add affordance, not the only label.
- Motion: option press only; no decorative motion.

### Manual Cardio Sheet

- Structure: backdrop plus sheet with mode segmented control, speed, duration, preview, cancel/save.
- Variants: picker-hosted and standalone workout-tab entry.
- States: valid preview, invalid input warning, saving.
- Accessibility: numeric fields use `inputmode`, labels include units, close button has `aria-label`.
- Motion: sheet entry uses transform/opacity if animated; no layout animation.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 0.1s | ease-in-out | Button press, chip active |
| Standard | 0.3s | ease | Tab/sheet state already used in project |
| Progress | 0.5s | ease-in-out | Progress bar transform |
| Toast | 3000ms | 0.1s ease-in-out | Auto-close feedback |

### Rules

- Animate only `transform`, `opacity`, and existing progress transform.
- Every new user action that saves or changes data needs toast feedback unless the UI itself provides immediate clear confirmation.
- Respect stopped-propagation modal/sheet rules: bind buttons inside the sheet or use capture-phase handlers.

## 7. Depth & Surface

### Strategy

Mixed, but restrained: Seed/TDS tonal fills first, borders for compact controls, shadows only for modal/sheet elevation.

| Level | Value | Usage |
| --- | --- | --- |
| Tonal panel | `var(--seed-bg-layer)` | Activity and meal panels |
| Control fill | `var(--seed-bg-fill)` | Chips, inputs |
| Border | `1px solid var(--seed-stroke-neutral)` | Compact controls |
| Focus | `0 0 0 2px var(--primary-bg)` | Inputs and focusable chips |
| Sheet shadow | existing modal/sheet shadow | Floating sheets only |

### Rules

- Do not add decorative orbs, bokeh, or unrelated gradients.
- Do not use a one-note palette; Tomato red is an accent, not a full-screen theme.
- Keep the surface practical and scannable for repeated logging.

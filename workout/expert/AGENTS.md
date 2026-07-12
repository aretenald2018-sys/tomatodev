# Max V4 Rules

- `#max-v4-sheet .wt-v4-sheet` stops propagation. Bind plan-sheet actions on `.wt-v4-sheet` or in capture phase; never only on `#max-v4-sheet`.
- Do not render inline `onclick` in Max V4 plan-editor HTML. Use `data-action` with the capture binding in `max.js`, and update the focused regression test when behavior changes.
- Before re-rendering the plan editor, read current DOM values into the draft cycle so unsaved benchmark values are preserved.
- Deduplicate benchmark selector options by `movementId` for free weights/bodyweight and by gym scope plus `movementId` for machine/cable/smith options.

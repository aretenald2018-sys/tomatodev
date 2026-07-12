import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const APP_STYLE_FILES = Object.freeze([
  'styles/features/home-foundations.css',
  'styles/features/calendar-overlays.css',
  'styles/features/workout-core.css',
  'styles/features/diet-core.css',
  'styles/features/workout-picker.css',
  'styles/features/stats-core.css',
  'styles/features/stats-insights.css',
  'styles/features/home-calendar-extras.css',
  'styles/features/workout-shell.css',
  'styles/features/cooking-home-diet.css',
  'style.css',
  'styles/features/account-home-social.css',
  'styles/features/workout-card-overrides.css',
  'styles/features/diet-card-overrides.css',
  'styles/features/workout-picker-overrides.css',
  'styles/features/workout-flow.css',
  'styles/features/diet-tab.css',
  'styles/features/home-life-zone.css',
  'styles/features/shared-feedback.css',
  'styles/features/social-home.css',
  'styles/features/social-guild.css',
  'styles/features/home-forms.css',
  'styles/features/home-coachmark.css',
  'styles/features/home-weight.css',
  'styles/features/social-cheers.css',
  'styles/features/workout-expert-card.css',
  'styles/features/workout-gym-carousel.css',
  'styles/features/workout-timer.css',
  'styles/features/workout-rest-sheet.css',
  'styles/features/workout-expert-controls.css',
  'styles/features/workout-gym-sheet.css',
  'styles/features/workout-expert-conditions.css',
  'styles/features/calendar-home.css',
  'styles/features/workout-day-sheet.css',
  'styles/features/calendar-score-modal.css',
  'styles/features/workout-day-detail.css',
  'styles/features/app-status.css',
]);

export function readAppCssSync() {
  return APP_STYLE_FILES.map(path => readFileSync(resolve(root, path), 'utf8')).join('\n');
}

export function readWorkoutExpertCssSync() {
  return readFileSync(resolve(root, 'styles/workout/expert-mode.css'), 'utf8');
}

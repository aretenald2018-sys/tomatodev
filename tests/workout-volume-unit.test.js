import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const exerciseSource = readFileSync(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const sheetSource = readFileSync(new URL('../sheet.js', import.meta.url), 'utf8');

test('legacy and active workout set rows expose mass units for volume', () => {
  assert.match(exerciseSource, /function _formatExerciseSetVolume\(value\)/);
  assert.match(exerciseSource, /_formatExerciseSetVolume\(volume\)/);
  assert.match(sheetSource, /function _formatSheetSetVolume\(value\)/);
  assert.match(sheetSource, /_formatSheetSetVolume\(set\.kg \* set\.reps\)/);
  assert.doesNotMatch(exerciseSource, /Math\.round\(volume\)\.toLocaleString\(\)\}vol/);
  assert.doesNotMatch(sheetSource, /\(set\.kg\*set\.reps\)\.toLocaleString\(\)\}vol/);
});

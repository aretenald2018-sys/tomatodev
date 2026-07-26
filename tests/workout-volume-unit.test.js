import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const exerciseSource = readFileSync(new URL('../workout/exercises.js', import.meta.url), 'utf8');

test('active workout set rows expose mass units for volume', () => {
  assert.match(exerciseSource, /function _formatExerciseSetVolume\(value\)/);
  assert.match(exerciseSource, /_formatExerciseSetVolume\(volume\)/);
  assert.doesNotMatch(exerciseSource, /Math\.round\(volume\)\.toLocaleString\(\)\}vol/);
});

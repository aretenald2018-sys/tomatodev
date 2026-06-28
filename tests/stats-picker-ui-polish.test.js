import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const styleCss = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const pickerModal = readFileSync(new URL('../modals/ex-picker-modal.js', import.meta.url), 'utf8');
const exercisesJs = readFileSync(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const swJs = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('underactive blue muscle tint uses direct color blending, not aura screen glow', () => {
  assert.match(styleCss, /\.stats-fatigue-hotspot\s*\{[\s\S]*mix-blend-mode:\s*color;/);
  assert.doesNotMatch(styleCss, /\.stats-fatigue-hotspot\.is-under,\s*\.stats-fatigue-hotspot\.is-low\s*\{[\s\S]*mix-blend-mode:\s*screen;/);
  assert.doesNotMatch(styleCss, /\.stats-fatigue-hotspot\s*\{[\s\S]*filter:\s*blur\(7px\)/);
});

test('exercise picker category top tabs no longer render custom tab', () => {
  assert.doesNotMatch(exercisesJs, /button\(\{\s*key:\s*'custom',\s*label:\s*'커스텀'/);
  assert.match(exercisesJs, /button\(\{\s*key:\s*'category',\s*label:\s*'분류'/);
  assert.match(exercisesJs, /button\(\{\s*key:\s*'all',\s*label:\s*'전체'/);
});

test('exercise picker footer superset bar is removed from modal markup', () => {
  assert.doesNotMatch(pickerModal, /ex-picker-footer/);
  assert.doesNotMatch(pickerModal, /슈퍼세트/);
  assert.doesNotMatch(pickerModal, /id="ex-picker-done"/);
});

test('exercise picker left rail chips are compact single-line controls', () => {
  assert.match(styleCss, /\.ex-picker-rail-chip,\s*\.ex-picker-rail-action\s*\{[\s\S]*min-height:\s*34px;/);
  assert.match(styleCss, /\.ex-picker-rail-chip,\s*\.ex-picker-rail-action\s*\{[\s\S]*font-size:\s*10\.5px;/);
  assert.match(styleCss, /\.ex-picker-rail-chip span\s*\{[\s\S]*white-space:\s*nowrap;/);
  assert.match(styleCss, /\.ex-picker-rail-chip span\s*\{[\s\S]*text-overflow:\s*ellipsis;/);
});

test('service worker cache version was bumped for stats picker UI polish', () => {
  assert.match(swJs, /tomatofarm-v20260628z10-trainer-speech-bubble/);
});

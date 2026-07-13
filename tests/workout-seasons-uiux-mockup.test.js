import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(
  new URL('../docs/workout-seasons-uiux-mockup.html', import.meta.url),
  'utf8',
);

test('운동 시즌 목업은 네 개의 합의 화면과 시즌 경계를 제공한다', () => {
  assert.match(html, /data-view="home"/);
  assert.match(html, /data-view="day"/);
  assert.match(html, /data-view="picker"/);
  assert.match(html, /data-view="season"/);
  assert.match(html, /id="day-sheet"/);
  assert.match(html, /id="picker-sheet"/);
  assert.match(html, /id="season-sheet"/);
  assert.match(html, /새 시즌/);
  assert.match(html, /원본 기록은 그대로 유지됩니다/);
});

test('운동 시즌 목업의 인라인 상호작용 스크립트 문법이 유효하다', () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Function(scripts[0]));
});

test('운동 시즌 목업은 모바일 접근성 기본 계약을 포함한다', () => {
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /aria-label="시즌 관리"/);
  assert.match(html, /aria-label="운동 종목 선택"/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /min-height: 44px/);
  assert.doesNotMatch(html, /transition:[^;]*visibility/);
});

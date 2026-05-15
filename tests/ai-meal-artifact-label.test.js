import test from 'node:test';
import assert from 'node:assert/strict';

import { isNonFoodArtifactName, mealDisplayText } from '../ai/meal-artifact-filter.js';

test('AI meal artifact filter removes combined meal/date/provider labels', () => {
  assert.equal(isNonFoodArtifactName('점심5/14_제미나이'), true);
  assert.equal(isNonFoodArtifactName('lunch_5/14 Gemini'), true);
  assert.equal(isNonFoodArtifactName('5/14 Gemini'), true);
});

test('AI meal artifact filter keeps real food names', () => {
  assert.equal(isNonFoodArtifactName('제육볶음'), false);
  assert.equal(isNonFoodArtifactName('잡곡밥'), false);
  assert.equal(isNonFoodArtifactName('닭가슴살 샐러드'), false);
});

test('neighbor meal display hides stale artifact item names', () => {
  const foods = [{ name: '점심5/14_제미나이', kcal: 670 }];
  assert.equal(mealDisplayText(foods, ''), '메뉴 미기록');
  assert.equal(mealDisplayText(foods, '점심5/14_제미나이'), '메뉴 미기록');
  assert.equal(mealDisplayText(foods, '', '사진 기록'), '사진 기록');
});

test('neighbor meal display keeps real items before artifact labels', () => {
  const foods = [
    { name: '제육볶음', kcal: 420 },
    { name: '점심5/14_제미나이', kcal: 670 },
  ];
  assert.equal(mealDisplayText(foods, ''), '제육볶음');
});

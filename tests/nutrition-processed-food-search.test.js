import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const foodSearchApi = readFileSync('fatsecret-api.js', 'utf8');
const nutritionFeature = readFileSync('feature-nutrition.js', 'utf8');
const nutritionData = readFileSync('data/data-api.js', 'utf8');
const normalize = readFileSync('data/nutrition-normalize.js', 'utf8');

test('processed-food lookup expands bilingual brand aliases and prioritizes manufacturer matches', () => {
  assert.match(foodSearchApi, /const _BRAND_QUERY_ALIASES = Object\.freeze/);
  assert.match(foodSearchApi, /benson: \['벤슨', '베러스쿱', '베러스쿱크리머리'\]/);
  assert.match(foodSearchApi, /manufacturer.*queryVariants\.some|queryVariants\.some\(query => query && mLower\.includes\(query\)\)/);
  assert.match(foodSearchApi, /id: `gov_\$\{encodeURIComponent\(name\)\}_\$\{encodeURIComponent\(manufacturer\)\}`/);
  assert.match(foodSearchApi, /const _GOV_CACHE_TTL = 6 \* 60 \* 60 \* 1000/);
});

test('new commercial products have a live branded-food fallback with complete nutrition only', () => {
  assert.match(foodSearchApi, /export async function searchOpenFoodFacts/);
  assert.match(foodSearchApi, /world\.openfoodfacts\.org\/cgi\/search\.pl/);
  assert.match(foodSearchApi, /energy-kcal_100g/);
  assert.match(foodSearchApi, /if \(!\(energy > 0\) && !\(protein > 0 \|\| carbs > 0 \|\| fat > 0\)\) continue/);
  assert.match(nutritionFeature, /searchOpenFoodFacts\(q\)/);
  assert.match(nutritionFeature, /🏷️ 최신 브랜드 식품/);
});

test('a selected live branded product is stored with its brand and aliases for future local search', () => {
  assert.match(nutritionFeature, /manufacturer: item\.manufacturer/);
  assert.match(nutritionData, /item\?\.brand/);
  assert.match(normalize, /aliases: Array\.isArray\(item\.aliases\) \? \[\.\.\.item\.aliases\] : \[\]/);
  assert.match(normalize, /aliases: Array\.isArray\(canonical\.aliases\) \? \[\.\.\.canonical\.aliases\] : \[\]/);
});

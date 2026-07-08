# 식단 자주/최근 음식 추천 compact 개선 계획

## 요청

식단 탭의 `이때 자주 먹었던 것` 추천 영역을 더 작게 만들어 한 줄에 3개가 들어오게 하고, `최근에 먹은 것`도 위 자주 먹은 항목과 중복되지 않게 3개 표시한다.

## 그릴 결과

- 핵심 질문: `최근에 먹은 것`은 어떤 기준으로 뽑을지?
- 코드베이스 확인 결과: 기존 추천은 `workout/render.js`에서 현재 선택일을 제외하고 최근 90일 `bFoods/lFoods/dFoods`를 훑으며, 현재 끼니에 이미 추가된 음식은 제외한다.
- 결정: `최근에 먹은 것`은 같은 끼니의 히스토리를 최신 날짜 순서로 훑어 최대 3개를 뽑고, 현재 끼니에 이미 추가된 음식과 `이때 자주 먹었던 것`에 노출된 `groupKey`는 제외한다.
- 남은 가정: 추천이 3개 미만이면 임의 기본값을 만들지 않고 가능한 수만 표시한다.

## 현재 구조

- `index.html`의 아침/점심/저녁에는 `wt-frequent-<meal>` container가 있고, 간식은 제외되어 있다.
- `workout/render.js`의 `_collectFrequentFoodSuggestions(meal)`가 빈도 기반 후보를 최대 3개 계산한다.
- `_renderFrequentFoodSuggestions(meal)`는 단일 카드 안에 `이때 자주 먹었던 것` label과 option 버튼들을 렌더한다.
- `style.css`에는 `.diet-frequent-food-*` 기본 스타일과 `#tab-diet` override가 있다.
- `workout/render.js`, `style.css`는 `sw.js` `STATIC_ASSETS`에 포함되므로 같은 변경에서 `CACHE_VERSION` bump가 필요하다.

## 실행 Slice 1

1. `tests/diet-frequent-food-suggestions.test.js`에 다음 회귀 조건을 추가한다.
   - 빈도 추천은 `.slice(0, 3)`으로 유지된다.
   - 최근 추천 collector가 빈도 추천 `groupKey`를 제외한다.
   - 렌더 HTML에 `최근에 먹은 것` label이 추가된다.
   - `#tab-diet .diet-frequent-food-options`가 3열 grid를 사용한다.
   - 추천 option 폰트가 더 작은 Seed/TDS token으로 내려간다.
2. `workout/render.js`에 최근 음식 추천 collector를 추가한다.
   - 같은 끼니 히스토리 최신순으로 훑는다.
   - 현재 끼니에 이미 추가된 음식과 빈도 추천 groupKey를 제외한다.
   - 최대 3개를 `_frequentFoodSuggestions` map에 등록해 기존 `wtAddFrequentFoodSuggestion()` 경로를 그대로 쓴다.
3. `_renderFrequentFoodSuggestions(meal)`를 두 섹션 카드로 바꾼다.
   - 첫 섹션: `이때 자주 먹었던 것`
   - 두 번째 섹션: `최근에 먹은 것`
   - 둘 다 후보가 없으면 container를 숨긴다.
4. `style.css`를 조정한다.
   - 옵션 영역은 안정적인 3열 grid로 배치한다.
   - option 폰트/간격을 줄여 모바일 360~390px에서 3개가 들어오게 한다.
   - 실제 섭취 음식 chip과 추천 option의 시각 위계는 유지한다.
5. `sw.js` `CACHE_VERSION`과 cache marker 테스트 기대값을 갱신한다.

## 검증 계획

1. RED: `node --test tests/diet-frequent-food-suggestions.test.js`.
2. PASS 목표: `node --check workout/render.js && node --check sw.js`.
3. PASS 목표: `node --test tests/diet-frequent-food-suggestions.test.js tests/diet-add-button-binding.test.js tests/save-schema.test.js`.
4. PASS 목표: `npm.cmd run verify:assets`.
5. UI 검증: 식단 탭 아침/점심/저녁 추천 카드에서 `이때 자주 먹었던 것` 3개와 `최근에 먹은 것` 최대 3개가 서로 중복 없이 3열로 표시되고, 버튼 클릭 시 기존 음식 추가 경로로 추가되는지 확인한다.

## 다음 액션

`실행 Slice 1`을 바로 실행한다. 범위 밖의 식단 저장 schema, 간식 추천, AI 추천 로직은 수정하지 않는다.

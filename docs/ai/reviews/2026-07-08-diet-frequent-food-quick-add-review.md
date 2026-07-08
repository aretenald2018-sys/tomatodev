# 식단 자주 먹는 음식 빠른추가 리뷰

## 범위

- 계획: `docs/ai/features/2026-07-08-diet-frequent-food-quick-add.md`
- Slice: Diet Frequent Food Quick Add Slice 1
- 요청: 식단 탭의 아침/점심/저녁 `메모 (선택)` visible 영역을 해당 끼니에 최근 자주 추가한 음식 2~3개를 담은 큰 추천 묶음 chip으로 대체하고, 내부 추천 option을 누르면 기존 음식 추가/저장 경로로 자동 추가되게 한다.

## 리뷰 결과

PASS. 아침/점심/저녁에는 끼니별 최근 반복 음식 묶음이 `이때 자주 먹었던 것` label이 있는 큰 chip/card로 표시되고, 간식은 이번 slice에서 제외됐다. 내부 추천 option은 별도 chip처럼 보이지 않는 텍스트 버튼이며, 클릭 시 `안 먹었어요` 상태를 먼저 해제한 뒤 기존 `wtAddFoodItem()` 및 `_autoSaveDiet({ meal })` 경로를 탄다.

## 확인한 변경

1. `index.html`의 아침/점심/저녁 visible memo 영역을 `diet-frequent-foods` container로 바꾸고, 기존 `wt-meal-*` input은 숨김 DOM으로 유지했다.
2. `workout/render.js`가 최근 90일 cache의 `bFoods/lFoods/dFoods`에서 같은 이름/중량이 2회 이상 나온 후보를 최대 3개 계산하고 렌더한다.
3. `app.js`, `workout/index.js`, `render-workout.js`가 `data-action="addFrequentFood"`와 `wtAddFrequentFoodSuggestion()` 노출을 연결한다.
4. `style.css`는 실제 섭취 음식 chip을 더 두껍고 bold로, 추천 묶음은 더 옅은 큰 group chip과 regular-weight inline option으로 구분했다.
5. `sw.js` `CACHE_VERSION`과 query/cache marker 테스트를 `tomatofarm-v20260708z3-diet-frequent-foods`로 동기화했다.

## 검증

1. PASS: RED 확인 - 추천 영역/action이 없는 상태에서 focused tests 3건 실패를 먼저 확인했다.
2. PASS: `node --check app.js && node --check workout/render.js && node --check workout/index.js && node --check render-workout.js && node --check sw.js`.
3. PASS: `node --test tests/diet-add-button-binding.test.js tests/diet-frequent-food-suggestions.test.js tests/save-schema.test.js`.
4. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=909`.
5. PASS: `node --test tests/*.test.js` - 744 tests, 744 pass.
6. PASS: `git diff --check`.
7. PASS: `git push origin HEAD:main` - `1dfcca2b07cb8e355d71efafc52928b56d1604a7`를 `origin/main`에 push.
8. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 1dfcca2b07cb8e355d71efafc52928b56d1604a7` - deployed commit/cache/static assets 확인.
9. PASS: production browser QA - 모바일 390x844에서 큰 추천 묶음 chip, `이때 자주 먹었던 것` label, inline 추천 option, 붉은 `+`, visible memo input 0개, snack 추천 container 없음, 점심 option 클릭 후 `안 먹었어요` 해제 및 `현미밥 180g 280kcal` 자동 추가 확인.
10. PASS: visual QA - 운영 screenshot에서 실제 섭취 음식 chip은 더 두껍고 bold이며, 추천 option은 옅은 regular-weight 텍스트로 구분된다. 측정값: 추천 option `font-weight: 500`, 실제 음식명 `font-weight: 700`.

## 운영 확인

운영 URL `https://aretenald2018-sys.github.io/tomatofarm/`에서 `tomatofarm-v20260708z3-diet-frequent-foods` cache version, 큰 추천 묶음 chip 표시, inline 추천 option 클릭 자동 추가 flow를 확인했다.

## 제한

추천은 사용자의 기존 cache에 같은 이름/중량 음식이 2회 이상 있을 때만 표시된다. 히스토리가 부족하면 임의 기본 추천을 만들지 않고 영역을 숨긴다.

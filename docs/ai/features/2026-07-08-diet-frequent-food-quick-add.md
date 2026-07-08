# 식단 자주 먹는 음식 빠른추가 설계

## 요청

- 식단 탭의 아침/점심/저녁 행에서 `메모 (선택)` 입력 자리 대신, 이용자가 해당 끼니에 자주 추가하던 음식 2~3개를 `안 먹었어요` 버튼처럼 바로 누를 수 있는 버튼으로 보여준다.
- 버튼을 누르면 검색/직접입력 모달을 거치지 않고 해당 음식이 끼니에 자동 추가된다.
- 이번 세션은 계획 세션이므로 앱 코드는 수정하지 않는다.

## 그릴 결과

- 핵심 질문: 추천 음식은 고정 목록인가, 사용자 기록 기반인가?
- 답변/결정: 요청의 "이용자가 주로 추가하곤 하는 음식"을 기준으로, 저장된 식단 기록의 `bFoods/lFoods/dFoods`에서 끼니별 빈도와 최근성을 계산한다.
- 남은 가정: 히스토리가 부족하면 임의 기본 추천을 만들지 않는다. 해당 끼니에 추천 후보가 없으면 기존 `+ 음식 추가`와 `안 먹었어요`만 유지한다.

## 현재 구조

- `index.html`의 아침/점심/저녁 행은 `+ 음식 추가`, `안 먹었어요`, 음식 chip 영역, 사진 input, `diet-meal-input` 메모 input, `diet-result` 순서로 구성되어 있다.
- `app.js`는 `.diet-grid` 클릭 위임으로 `openMealQuickAdd(meal)`을 열고, quick-add sheet 안에서 검색/직접입력/사진/skip 액션을 처리한다.
- `workout/render.js`의 `wtAddFoodItem(meal, item)`이 `S.diet.*Foods`에 item을 추가하고, `_recalcMealMacros()`, `_renderMealFoodItems()`, `_renderDietResults()`, `_autoSaveDiet({ meal })`까지 수행한다.
- `data.js`는 `getCache()`, `getAllDateKeys()`, `getDiet()`를 제공하며, 식단 데이터는 `workouts/{dateKey}` 문서의 `bFoods/lFoods/dFoods/sFoods`와 kcal/macro 필드에 저장된다.
- `DESIGN.md`는 `Meal Quick Add Sheet`와 반복 입력용 chip/compact control을 Seed/TDS 토큰으로 유지하라고 규정한다.

## 설계 결정

1. 아침/점심/저녁만 적용한다.
   - 사용자가 요청한 범위가 세 끼이므로 간식은 이번 slice에서 제외한다.
   - 간식 `메모 (선택)`은 그대로 둔다.

2. visible `메모 (선택)` 자리는 빠른추가 chip 영역으로 대체한다.
   - 아침/점심/저녁의 기존 `wt-meal-breakfast/lunch/dinner` input id는 저장 동기화와 기존 데이터 보존을 위해 DOM에 남긴다.
   - 단, 기본 화면에서는 보이지 않게 하고 `diet-frequent-foods` 영역을 같은 위치에 렌더한다.
   - 기존 날짜에 텍스트 메모가 이미 있으면 데이터는 삭제하지 않는다. 실행 시에는 숨김 input의 value를 유지하거나, 기존 메모 표시가 필요하면 읽기 전용 보조 텍스트로만 보여준다.

3. 추천 후보는 현재 사용자 cache에서 끼니별로 계산한다.
   - `getAllDateKeys()` 또는 `getCache()` 기준 최근 60~90일을 훑는다.
   - 현재 편집 중인 날짜는 제외한다.
   - breakfast는 `bFoods`, lunch는 `lFoods`, dinner는 `dFoods`만 본다.
   - 후보 조건: `name`이 있고 `kcal > 0`인 음식 item.
   - 그룹 키: 정규화한 음식명 + 대표 중량. 같은 이름이라도 중량이 크게 다르면 다른 후보로 본다.
   - 점수: 빈도 우선, 동률이면 최근성, 그 다음 최근 item의 kcal/macro 완성도.
   - 대표 item은 가장 최근에 저장된 완전한 item을 clone해 사용한다.
   - 이미 현재 끼니에 들어간 음식은 추천 chip에서 제외한다.

4. 버튼 클릭은 기존 저장 경로를 재사용한다.
   - 새 action 예: `data-action="addFrequentFood"`와 `data-meal`, `data-food-key`.
   - `app.js` 위임 핸들러가 action을 받고 `window.wtAddFrequentFoodSuggestion(meal, key)` 같은 안정된 전역 API를 호출한다.
   - API 내부는 대표 item을 clone해서 `wtAddFoodItem(meal, item)`으로 넘긴다.
   - 해당 끼니가 `안 먹었어요` 상태라면 먼저 skip flag를 해제하고 토글 UI를 갱신한 뒤 음식을 추가한다.
   - 성공 시 chip이 즉시 음식 목록에 추가되고 kcal header/result가 갱신된다. 별도 저장 버튼 없이 `_autoSaveDiet({ meal })` 경로를 그대로 탄다.

5. 저장 스키마는 늘리지 않는다.
   - 새 top-level Firestore 필드나 settings 컬렉션을 만들지 않는다.
   - 저장되는 음식 item은 기존 food chip shape를 유지한다.
   - 추천 계산은 현재 cache에서 파생하는 UI 상태다.

6. UI 밀도는 현재 식단 행을 유지한다.
   - 추천 후보는 큰 묶음 chip/card 하나 안에 배치하고, 좌측 상단에 `이때 자주 먹었던 것` label을 둔다.
   - 묶음 안의 각 추천 후보는 별도 chip이 아니라 텍스트형 button으로 보이게 하며, 옆의 붉은 `+`로 추가 후보임을 표시한다.
   - 실제 섭취 음식 chip은 추천 option보다 더 두껍고 bold하게 보여 이미 추가된 음식과 추천 후보를 구분한다.
   - 후보가 1개뿐이면 1개만 보여준다. 후보가 없으면 영역 자체를 숨긴다.

## 실행 Slice 1

### 범위

1. `index.html`
   - 아침/점심/저녁 `diet-meal-input`의 visible 위치를 `diet-frequent-foods` container로 대체한다.
   - 기존 `wt-meal-breakfast/lunch/dinner` id는 저장 동기화와 기존 값 보존을 위해 유지한다.
   - 간식 행은 변경하지 않는다.

2. `workout/render.js`
   - 끼니별 자주 먹는 음식 후보 계산 헬퍼를 추가한다.
   - `_renderDietResults()` 또는 음식 item 렌더 후 `diet-frequent-foods` 영역을 갱신한다.
   - `wtAddFrequentFoodSuggestion(meal, key)`를 추가해 기존 `wtAddFoodItem()` 경로를 재사용한다.
   - 음식 삭제 후에도 후보 chip이 다시 나타나도록 렌더 순서를 맞춘다.

3. `app.js`
   - `.diet-grid` 위임 핸들러에 `addFrequentFood` action을 추가한다.
   - meal 누락, 추천 key 누락, 전역 API 미등록 시 기존 토스트 패턴으로 오류를 표시한다.

4. `workout/index.js`, `render-workout.js`
   - 새 API가 필요하면 기존 workout render export/window 노출 패턴에 맞춰 연결한다.

5. `style.css`
   - `.diet-frequent-foods`, `.diet-frequent-food-card`, `.diet-frequent-food-option` 스타일을 TDS/Seed 토큰 기반으로 추가한다.
   - 360px 모바일에서 텍스트가 겹치지 않도록 min-height, gap, ellipsis, wrapping 정책을 고정한다.

6. `sw.js`
   - `STATIC_ASSETS`에 포함된 파일을 수정하므로 `CACHE_VERSION`을 반드시 bump한다.

7. 테스트
   - `tests/diet-add-button-binding.test.js`에 `addFrequentFood` 위임과 기존 quick-add/skip 회귀를 추가한다.
   - 필요하면 `tests/diet-frequent-food-suggestions.test.js`를 추가해 빈도/최근성/현재 끼니 중복 제외/skip 해제 동작을 고정한다.
   - `tests/save-schema.test.js`는 새 top-level 식단 key가 생기지 않았음을 확인하는 회귀 근거로 사용한다.

### 제외

- 간식 빠른추천.
- 새 Firestore 필드, 별도 settings 저장, 서버/API 기반 추천.
- AI 추정, 사진 업로드, nutrition search modal, 직접입력 modal의 기능 변경.
- 기존 식단 기록의 `breakfast/lunch/dinner` 텍스트 필드 삭제.
- `www/` 직접 수정.

## 검증

1. RED 우선
   - 추천 후보가 없는 현재 코드에서 `tests/diet-frequent-food-suggestions.test.js` 또는 확장된 `tests/diet-add-button-binding.test.js`가 실패하는 것을 먼저 확인한다.
   - 실패 이유는 import/syntax 오류가 아니라 "자주 먹는 음식 버튼/액션이 없음"이어야 한다.

2. 정적 검증
   - `node --check app.js && node --check workout/render.js && node --check workout/index.js && node --check render-workout.js && node --check sw.js`
   - `git diff --check`

3. 테스트
   - `node --test tests/diet-add-button-binding.test.js tests/diet-frequent-food-suggestions.test.js tests/save-schema.test.js`
   - `node --test tests/*.test.js`
   - `npm.cmd run verify:assets`

4. 브라우저 QA
   - 모바일 390x844에서 식단 탭 아침/점심/저녁 행을 열었을 때 `메모 (선택)` 대신 2~3개 이하의 추천 chip이 보인다.
   - 추천 chip 하나를 누르면 같은 끼니 음식 chip으로 즉시 추가되고 kcal header/result가 갱신된다.
   - `안 먹었어요`가 켜진 상태에서 추천 chip을 누르면 skip이 해제되고 음식이 추가된다.
   - 추천 후보가 없는 끼니는 빈 영역이나 placeholder 없이 기존 `+ 음식 추가`와 `안 먹었어요`만 보인다.
   - `+ 음식 추가`, 검색/직접입력/사진/AI/skip 기존 flow가 계속 동작한다.

5. 운영 검증
   - `npm.cmd run deploy:production`
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
   - production Pages URL에서 식단 탭 빠른추천 클릭 flow를 직접 확인한다.

## 다음 세션 시작점

`docs/ai/features/2026-07-08-diet-frequent-food-quick-add.md`의 `실행 Slice 1`을 실행한다. 계획 범위 밖의 앱 변경은 하지 말고, 아침/점심/저녁의 `메모 (선택)` visible 영역을 자주 먹는 음식 빠른추가 chip으로 대체한다. `index.html`, `app.js`, `workout/render.js`, `workout/index.js`, `render-workout.js`, `style.css` 중 실제 변경한 파일이 `sw.js` `STATIC_ASSETS`에 있으면 같은 커밋에서 `CACHE_VERSION`을 bump한다.

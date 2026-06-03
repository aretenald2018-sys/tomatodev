# 식단 음식 추가 모달 열기 오류 수정 계획

## 요청

- Discord 요청 ID: `devreq_discord_1511667718951272609`
- 첨부 스크린샷 증상: 식단 탭에서 `음식 추가 창을 열지 못했어요. 잠시 후 다시 시도해주세요.` 토스트가 표시됨.
- 스티어링: `오류해결해`

## 진단

스크린샷의 오류 문구는 `app.js`의 식단 `data-action="addFood"` 위임 핸들러에서 `window.openNutritionSearch(meal)` 호출이 throw 되었을 때만 표시된다.

현재 `feature-nutrition.js`의 `openNutritionSearch()`는 `#nutrition-search-input`을 먼저 접근한 뒤 모달을 여는 구조라, 모달 HTML이 아직 주입되지 않았거나 로딩 중이면 null 접근으로 실패한다.

또한 `modal-manager.js`의 `loadAndInjectModals()`는 진행 중인 로딩 Promise를 공유하지 않아, 초기 로딩이 타임아웃으로 백그라운드 진행 중일 때 사용자가 음식 추가를 누르면 중복 로딩/DOM 재주입 경쟁이 생길 수 있다.

## 반증 가능한 원인 가설

1. `nutrition-search-modal` 주입 전 `openNutritionSearch()`가 호출되어 input null 접근으로 실패한다.
2. 초기 `loadAndInjectModals()`가 타임아웃 후 백그라운드 진행 중인데 음식 추가 클릭이 두 번째 모달 로딩을 시작해 DOM 재주입 경쟁이 생긴다.
3. `feature-nutrition.js` window 등록 자체가 누락되었다.
4. `data-meal` 추출이 실패해 meal 없이 호출된다.

코드 확인상 3, 4는 이미 별도 토스트/테스트가 있고, 첨부 문구와 일치하는 직접 원인은 1 또는 2다.

## Slice 1: 영양 검색 모달 열기 경로 안정화

### 변경 범위

- `modal-manager.js`
  - 모달 로딩 중복 실행을 막는 single-flight Promise 추가.
- `feature-nutrition.js`
  - `openNutritionSearch()`가 `loadAndInjectModals()`를 await한 뒤 필수 DOM을 검증.
  - 검색 input/results 접근은 null-safe하게 방어.
  - 가능하면 `window._openModal()`을 사용해 기존 모달 스택과 body overflow 처리를 따른다.
- `tests/diet-add-button-binding.test.js`
  - 음식 추가 검색 모달이 모달 주입을 먼저 보장한다는 회귀 테스트 추가.
- `sw.js`
  - `STATIC_ASSETS` 대상 파일 변경에 따른 `CACHE_VERSION` bump.

### 하지 않을 것

- 식단 UI 디자인 변경.
- 음식 저장 스키마 변경.
- 사진/AI 추정 플로우 변경.
- `www/` 산출물 직접 수정.

## 검증

- `git diff --check`
- `node --check feature-nutrition.js`
- `node --check modal-manager.js`
- `node --check sw.js`
- `node --test tests/diet-add-button-binding.test.js`
- 배포 후 원격 URL HTTP 200 및 `sw.js` 캐시 버전 확인.
- 가능하면 배포 페이지에서 식단 탭 음식 추가 클릭 시 `#nutrition-search-modal.open` 확인.

## 다음 세션 시작점

`Slice 1: 영양 검색 모달 열기 경로 안정화`를 실행하고, 변경 후 리뷰 문서를 작성한다.

## 실행 결과

- 상태: 완료
- 변경:
  - `modal-manager.js`에 in-flight `_modalsLoadPromise`를 추가해 모달 주입 중복 실행을 막았다.
  - `feature-nutrition.js`의 `openNutritionSearch()`가 `loadAndInjectModals()` 완료 후 `nutrition-search-modal/input/results`를 검증하도록 변경했다.
  - `debouncedNutritionSearch()`, `renderNutritionSearchInitial()`, `renderNutritionSearchResults()`에 null-safe 방어를 추가했다.
  - `tests/diet-add-button-binding.test.js`에 회귀 테스트 2개를 추가했다.
  - `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260603-diet-add-modal-open`으로 bump했다.

## 검증 결과

- PASS: `git diff --check`
- PASS: `node --check feature-nutrition.js`
- PASS: `node --check modal-manager.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/diet-add-button-binding.test.js` (`4` pass)
- PASS: `node --test tests/*.test.js` (`377` pass)
- FAIL(기존 이슈): `node scripts/verify-runtime-assets.mjs`
  - `mockups/poc/*`, `mockups/trio-renewal/shared.css` 등 기존 untracked mockup reference가 원인이다.
  - 이번 변경 파일(`feature-nutrition.js`, `modal-manager.js`, `sw.js`)과 직접 관련 없는 기준선 문제다.

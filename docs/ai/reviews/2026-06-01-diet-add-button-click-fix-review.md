# 식단 음식 추가 버튼 클릭 수정 리뷰

- 계획 문서: `docs/ai/features/2026-06-01-diet-add-button-click-fix.md`
- 요청 ID: `devreq_discord_1510857301576388760`
- 리뷰 대상: `app.js`, `index.html`, `sw.js`, `tests/diet-add-button-binding.test.js`

## 결과

차단 이슈 없음.

## 확인 내용

- `index.html`의 네 끼니 `+ 음식 추가` 버튼은 인라인 `openNutritionSearch(...)` 호출 대신 `data-action="addFood"`와 `data-meal`을 사용한다.
- `app.js`의 `.diet-grid` 위임 핸들러는 `addFood` 액션에서 선택 끼니를 검증한 뒤 `window.openNutritionSearch(meal)`을 호출한다.
- `openNutritionSearch`가 미등록되거나 호출 중 예외가 나면 콘솔과 토스트로 실패를 드러낸다.
- `index.html`과 `app.js`는 `sw.js` `STATIC_ASSETS`에 포함되므로 `CACHE_VERSION`을 함께 범프했다.
- 회귀 테스트가 버튼 바인딩과 검색 모달 진입 함수 호출을 함께 확인한다.

## 검증

- PASS: `node --check app.js`
- PASS: `node --check feature-nutrition.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/diet-add-button-binding.test.js`
- PASS: `git diff --check`
- PASS: `node --test tests/*.test.js` (`373` tests)
- not verified yet: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 미추적 mockup 참조 때문에 실패했다.
- PASS: 배포 URL `https://aretenald2018-sys.github.io/tomatofarm/` HTTP `200 OK`.
- PASS: 배포 `sw.js`에서 `tomatofarm-v20260601-diet-add-btn` 확인.
- PASS: 배포 `index.html`에서 네 끼니 버튼의 `data-action="addFood"`와 `app.js?v=20260601a` 확인.
- PASS: Puppeteer 배포 페이지 클릭 검증에서 `#nutrition-search-modal.open`, `window._nutritionSearchMeal === 'breakfast'`, add 버튼 4개 확인.
- 참고: 로컬 dev server는 응답하지 않아 로컬 UI 클릭은 별도 실행하지 않았다.

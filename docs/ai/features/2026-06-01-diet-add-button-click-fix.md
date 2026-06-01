# 식단 음식 추가 버튼 클릭 수정

- 요청 ID: `devreq_discord_1510857301576388760`
- 요청: 토마토키우기 음식추가가 안눌러짐
- 세션 유형: `/diagnose` 기반 버그 수정

## 진단

증상은 식단 탭 끼니별 `+ 음식 추가` 버튼 클릭 시 음식 검색 모달이 열리지 않는 것이다.

우선순위 가설:

1. `index.html`의 버튼이 인라인 `onclick="openNutritionSearch(...)"`에 의존해, 전역 함수 등록이 늦거나 깨지면 클릭이 무시된다.
2. `app.js`에는 이미 `.diet-grid` 위임 핸들러가 있지만 현재 버튼에 `data-action`이 없어 실행되지 않는다.
3. 기존 위임 핸들러의 `addFood` 액션은 음식 검색 모달이 아니라 직접 입력 모달을 열도록 되어 있어 버튼을 `data-action`으로만 바꿔도 UX가 달라진다.
4. `index.html`/`app.js`는 `sw.js` `STATIC_ASSETS`에 포함되므로 수정 시 `CACHE_VERSION` 미범프가 배포 반영 지연을 만들 수 있다.

## 실행 슬라이스

### Slice 1: 식단 음식 추가 버튼 바인딩 복구

수정 범위:

- `index.html`: 끼니별 `+ 음식 추가` 버튼을 `data-action="addFood"`/`data-meal` 기반으로 전환하고 앱 스크립트 쿼리 버전을 갱신한다.
- `app.js`: `.diet-grid` 위임 핸들러의 `addFood` 액션이 선택 끼니의 `window.openNutritionSearch(meal)`를 호출하게 한다.
- `sw.js`: `STATIC_ASSETS` 파일 변경에 맞춰 `CACHE_VERSION`을 범프한다.
- `tests/`: 버튼과 위임 핸들러의 연결을 고정하는 회귀 테스트를 추가한다.

제외 범위:

- 음식 검색/중량 계산/저장 로직 변경
- 사진 업로드 및 AI 추정 버튼 변경
- `www/` 빌드 산출물 직접 수정

검증:

- `node --check app.js`
- `node --check feature-nutrition.js`
- `node --check sw.js`
- `node --test tests/diet-add-button-binding.test.js`
- `git diff --check`

UI 확인 기준:

- 사용자 로컬 터미널에서 `npm.cmd run dev` 실행
- 출력된 URL에서 식단 탭 진입
- 아침/점심/저녁/간식 행을 열고 `+ 음식 추가` 클릭
- `#nutrition-search-modal`이 열리고 검색 입력이 포커스되면 통과

## 다음 세션 프롬프트

`docs/ai/features/2026-06-01-diet-add-button-click-fix.md`의 Slice 1을 실행한다. 식단 탭 `+ 음식 추가` 버튼을 인라인 전역 호출 의존에서 `.diet-grid` 위임 핸들러로 전환하고, 버튼 클릭이 `openNutritionSearch(meal)`로 이어지는 회귀 테스트를 추가한다. `index.html` 또는 `app.js`를 수정하면 `sw.js` `CACHE_VERSION`도 함께 범프한다.

## 실행 결과

- Slice 1 완료: 끼니별 `+ 음식 추가` 버튼을 `data-action="addFood"`와 `data-meal` 기반 위임 버튼으로 변경했다.
- Slice 1 완료: `app.js`의 `.diet-grid` 위임 핸들러가 `window.openNutritionSearch(meal)`를 호출하도록 변경했다.
- Slice 1 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260601-diet-add-btn`로 범프했다.
- Slice 1 완료: `tests/diet-add-button-binding.test.js`를 추가해 버튼 바인딩과 `openNutritionSearch(meal)` 호출을 고정했다.

## 검증 결과

- PASS: `node --check app.js`
- PASS: `node --check feature-nutrition.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/diet-add-button-binding.test.js`
- PASS: `git diff --check`
- PASS: `node --test tests/*.test.js` (`373` tests)
- not verified yet: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 미추적 mockup 파일 참조 때문에 실패했다. 이번 변경 파일(`app.js`, `index.html`, `sw.js`) 누락은 보고되지 않았다.
- PASS: 배포 URL `https://aretenald2018-sys.github.io/tomatofarm/`이 HTTP `200 OK`를 반환했다.
- PASS: 배포 `sw.js`가 `tomatofarm-v20260601-diet-add-btn`를 반환했다. CDN 캐시 회피를 위해 `Cache-Control: no-cache`로 확인했다.
- PASS: 배포 `index.html`에서 네 끼니 버튼이 `data-action="addFood"`와 `data-meal`을 포함하고, `app.js?v=20260601a`를 로드하는 것을 확인했다.
- PASS: Puppeteer로 배포 페이지에서 아침 `+ 음식 추가` 버튼을 클릭해 `#nutrition-search-modal.open`과 `window._nutritionSearchMeal === 'breakfast'`를 확인했다.
- 참고: 로컬 dev server는 `localhost:5500`, `5501`, `5502`에서 응답하지 않아 로컬 UI 플로우는 별도 실행하지 않았다.

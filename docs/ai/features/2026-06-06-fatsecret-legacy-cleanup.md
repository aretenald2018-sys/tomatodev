# FatSecret 레거시 제거 계획

## 요청 요약

FatSecret을 실제로 사용하지 않으므로, 이름만 남았거나 호출되지 않는 FatSecret 전용 레거시를 제거한다.

## 그릴 결과

- 핵심 질문: `fatsecret-api.js`까지 삭제할 것인가, 아니면 실제 식품 검색 기능은 보존할 것인가?
- 코드 확인 결과: `fatsecret-api.js`는 이름과 달리 `public/data/foods.csv` 로컬 CSV와 식품의약품안전처 공공DB 검색을 제공하며 `app.js`, `feature-nutrition.js`, `render-cooking.js`에서 사용 중이다.
- 결정: 실제 식단/요리 검색 기능은 보존한다. 호출되지 않는 FatSecret 전용 UI/문서만 제거한다.
- 남은 가정: `api/food-search.js`는 현재 프론트 검색 흐름에서 직접 호출되지 않지만 식품의약품안전처 프록시 역할이므로 이번 FatSecret 레거시 제거 범위에서는 삭제하지 않는다.

## 현재 코드 관찰

- `app.js`는 `feature-fatsecret.js`를 정적 import하지만, 현재 식단 추가 버튼은 `openNutritionSearch()`로 연결되어 있다.
- `feature-fatsecret.js`는 `openFatSecretSearch()`, `fatsecretSearch()` 등 FatSecret 이름의 전역 함수를 등록하지만 실제 구현은 CSV + 공공DB 검색이다.
- `modal-manager.js`는 `fatsecret-modal`을 로드한다.
- `modals/fatsecret-modal.js`는 별도 FatSecret 검색 모달 HTML이다.
- `docs/FATSECRET_SETUP.md`는 실제 현재 구현과 맞지 않는 FatSecret OAuth/Vercel 프록시 설정 문서다.
- `sw.js` `STATIC_ASSETS`에 `feature-fatsecret.js`가 있으므로 제거 시 `CACHE_VERSION`을 bump해야 한다.

## 실행 슬라이스

### Slice 1: FatSecret 전용 레거시 UI와 문서 제거

목표:

- 호출되지 않는 FatSecret 전용 모달과 전역 함수 등록 모듈을 제거한다.
- 실제 식단 검색 경로인 `nutrition-search-modal`과 `feature-nutrition.js`는 유지한다.
- 실제 식품DB 검색 모듈인 `fatsecret-api.js`는 유지한다.

예상 변경 파일:

- `app.js`: `feature-fatsecret.js` 정적 import 제거
- `modal-manager.js`: `fatsecret-modal` 등록 제거
- `sw.js`: `STATIC_ASSETS`에서 `feature-fatsecret.js` 제거 및 `CACHE_VERSION` bump
- `feature-fatsecret.js`: 삭제
- `modals/fatsecret-modal.js`: 삭제
- `docs/FATSECRET_SETUP.md`: 삭제

범위 제외:

- `fatsecret-api.js` 이름 변경은 이번 슬라이스에서 하지 않는다. 이 파일은 현재 활성 식품DB 모듈이므로 별도 리네이밍 슬라이스가 더 안전하다.
- `api/food-search.js` 삭제 여부는 이번 슬라이스에서 판단하지 않는다.
- 식단 검색 UI, 영양정보 저장 로직, 요리 재료 검색 로직은 변경하지 않는다.

검증:

- `rg -n -S --glob '!docs/**' --glob '!www/**' --glob '!node_modules/**' "openFatSecretSearch|fatsecret-modal|feature-fatsecret|fatsecretSearch|fatsecretAddFood" .` 결과가 없어야 한다.
- `node --check app.js`
- `node --check modal-manager.js`
- `node --check sw.js`
- `node --check feature-nutrition.js`
- 로컬 UI 확인은 사용자가 일반 터미널에서 `npm.cmd run dev` 실행 후 식단 탭에서 `+ 음식 추가`를 눌러 `nutrition-search-modal`이 열리고 검색 결과가 표시되면 통과한다.

## 다음 세션 시작 지침

`Slice 1: FatSecret 전용 레거시 UI와 문서 제거`를 실행한다. 실제 식품 검색에 쓰이는 `fatsecret-api.js`는 삭제하지 말고, `feature-fatsecret.js`, `modals/fatsecret-modal.js`, `docs/FATSECRET_SETUP.md`와 그 import/등록/캐시 항목만 제거한다. `sw.js` `STATIC_ASSETS` 변경에 맞춰 `CACHE_VERSION`을 bump한다.

## 실행 기록

- 상태: 완료
- 실행 슬라이스: `Slice 1: FatSecret 전용 레거시 UI와 문서 제거`
- 삭제:
  - `feature-fatsecret.js`
  - `modals/fatsecret-modal.js`
  - `docs/FATSECRET_SETUP.md`
- 정리:
  - `app.js`에서 `feature-fatsecret.js` 정적 import 제거
  - `modal-manager.js`에서 `fatsecret-modal` 등록 제거
  - `sw.js`에서 `feature-fatsecret.js` precache 제거 및 `CACHE_VERSION`을 `tomatofarm-v20260606-fatsecret-legacy-cleanup`으로 bump
  - README, ARCHITECTURE, CLAUDE, PRD, TDS/Nutrition 관련 문서의 FatSecret API/삭제 파일 표기 정리

## 검증 기록

- PASS: `rg -n -S --glob '!docs/**' --glob '!www/**' --glob '!node_modules/**' "openFatSecretSearch|fatsecret-modal|feature-fatsecret|fatsecretSearch|fatsecretAddFood|FatSecret|FATSECRET_SETUP" .` 결과 없음
- PASS: `node --check app.js`
- PASS: `node --check modal-manager.js`
- PASS: `node --check sw.js`
- PASS: `node --check feature-nutrition.js`
- PASS: `node --check tests/calc.nutrition.test.js`
- PASS: `git diff --check`
- not verified yet: 프로젝트 규칙에 따라 Codex 세션에서 장기 dev server를 시작하지 않았으므로 실제 브라우저 식단 검색 UI 플로우는 사용자가 로컬 터미널에서 확인해야 한다.


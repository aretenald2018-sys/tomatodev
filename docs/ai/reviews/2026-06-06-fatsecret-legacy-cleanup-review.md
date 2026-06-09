# FatSecret 레거시 제거 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-06-fatsecret-legacy-cleanup.md`
- 실행 슬라이스: `Slice 1: FatSecret 전용 레거시 UI와 문서 제거`

## 결과

차단 이슈 없음.

## 확인 내용

- `feature-fatsecret.js`, `modals/fatsecret-modal.js`, `docs/FATSECRET_SETUP.md`가 삭제되었다.
- `app.js`의 `feature-fatsecret.js` 정적 import와 관련 주석이 제거되었다.
- `modal-manager.js`에서 `fatsecret-modal` 등록이 제거되어 삭제된 모달을 동적 import하지 않는다.
- `sw.js` `STATIC_ASSETS`에서 `feature-fatsecret.js`가 제거되었고 `CACHE_VERSION`이 `tomatofarm-v20260606-fatsecret-legacy-cleanup`으로 bump되었다.
- 실제 식품 검색에 쓰이는 `fatsecret-api.js`, `feature-nutrition.js`, `render-cooking.js` 경로는 유지되었다.
- README/ARCHITECTURE/CLAUDE/PRD/TDS/Nutrition 문서에서 FatSecret API 설정 또는 삭제 파일처럼 보이는 표기가 정리되었다.

## 검증

- PASS: FatSecret 전용 함수/모달/삭제 파일명 검색 결과 없음
- PASS: `node --check app.js`
- PASS: `node --check modal-manager.js`
- PASS: `node --check sw.js`
- PASS: `node --check feature-nutrition.js`
- PASS: `node --check tests/calc.nutrition.test.js`
- PASS: `git diff --check`

## 남은 검증 공백

- not verified yet: 로컬 dev server를 Codex 세션에서 시작하지 않았으므로, 식단 탭 `+ 음식 추가`가 `nutrition-search-modal`을 열고 음식 검색 결과를 표시하는 브라우저 플로우는 사용자가 일반 터미널에서 확인해야 한다.


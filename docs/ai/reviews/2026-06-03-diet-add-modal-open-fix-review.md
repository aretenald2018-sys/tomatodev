# 식단 음식 추가 모달 열기 오류 수정 리뷰

## 범위

- 계획 문서: `docs/ai/features/2026-06-03-diet-add-modal-open-fix.md`
- 변경 파일:
  - `feature-nutrition.js`
  - `modal-manager.js`
  - `tests/diet-add-button-binding.test.js`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
  - `docs/ai/features/2026-06-03-diet-add-modal-open-fix.md`

## 리뷰 결과

차단 이슈 없음.

## 확인 사항

- `openNutritionSearch()`가 검색 input 접근 전에 `loadAndInjectModals()`를 await한다.
- `modal-manager.js`가 진행 중인 모달 로딩 Promise를 공유하므로 초기 모달 로딩 타임아웃 후 사용자가 음식 추가를 눌러도 중복 DOM 재주입 경쟁을 만들지 않는다.
- `feature-nutrition.js`, `modal-manager.js`는 `sw.js` `STATIC_ASSETS`에 포함되어 있고, `CACHE_VERSION`이 함께 bump되었다.
- 저장 로직과 `setDoc` payload는 변경하지 않았다.

## 검증

- PASS: `git diff --check`
- PASS: `node --check feature-nutrition.js`
- PASS: `node --check modal-manager.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/diet-add-button-binding.test.js` (`4` pass)
- PASS: `node --test tests/*.test.js` (`377` pass)
- FAIL(기존 기준선): `node scripts/verify-runtime-assets.mjs`
  - 기존 untracked mockup reference가 원인이다.
  - 이번 수정의 런타임 자산 경로 실패는 확인되지 않았다.

## 남은 검증 공백

- 로컬 dev server는 프로젝트 규칙상 Codex 세션에서 장기 실행하지 않아 실제 로컬 UI 클릭 플로우는 not verified yet이다.
- 배포 후 원격 URL에서 식단 탭 음식 추가 클릭으로 `#nutrition-search-modal.open` 상태를 확인해야 한다.

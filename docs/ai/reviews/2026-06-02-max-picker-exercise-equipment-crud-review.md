# 맥스 종목 선택 시트 CRUD 리뷰

## 범위

- 계획 문서: `docs/ai/features/2026-06-02-max-picker-exercise-equipment-crud.md`
- 슬라이스: `Slice 1: 맥스 종목 선택 시트 CRUD 진입 및 기구 수정 보강`
- 변경 파일: `workout/exercises.js`, `workout/expert/max.js`, `style.css`, `expert-mode.css`, `sw.js`, `docs/ai/NEXT_ACTION.md`

## Findings

차단 이슈 없음.

## 확인 내용

- 맥스 벤치마크 피커에서 숨겨져 있던 종목 추가 진입이 다시 노출되며, `wtOpenExerciseEditor()`를 통해 기존 `saveExercise()`/`deleteExercise()` 경로를 사용한다.
- `기구 관리`는 클릭 핸들러에서 `workout/expert/max.js`를 동적 import하므로 lazy module 전역 `onclick` 의존을 만들지 않는다.
- 기구 CRUD는 `data/data-equipment-pool.js`의 `createGymExclusive()`, `updateEquipment()`, `deleteEquipment()`, `toggleGymPool()`을 사용하므로 view에서 Firestore 직접 호출이 없다.
- 피커에서 기구 모달을 열 때 현재 헬스장 ID를 넘기고, 모달 내부 재렌더도 같은 gym context를 유지한다.
- `style.css`, `expert-mode.css`, `workout/exercises.js`, `workout/expert/max.js`는 `sw.js` `STATIC_ASSETS`에 포함되며, `CACHE_VERSION` bump가 함께 반영됐다.

## 검증

- PASS: `git diff --check`
- PASS: `node --check workout/exercises.js`
- PASS: `node --check workout/expert/max.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/calc.max.test.js` (`54` tests)
- not verified yet: 실제 모바일 UI 클릭 플로우는 dev server를 Codex 세션에서 장기 실행하지 않는 프로젝트 규칙 때문에 수행하지 않았다.
- 참고: `node scripts/verify-runtime-assets.mjs`는 기존 미추적 mockup asset 참조로 실패했다.

## 결론

계획 범위에 맞게 구현됐고, 코드/회귀 테스트 기준 차단 이슈는 없다.

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

## Slice 2 리뷰

### 범위

- 계획 문서: `docs/ai/features/2026-06-02-max-picker-exercise-equipment-crud.md`
- 슬라이스: `Slice 2: 맥스 피커 삭제/빈 데이터/수정 아이콘 후속 보정`
- 변경 파일: `workout/exercises.js`, `style.css`, `sw.js`, `docs/ai/NEXT_ACTION.md`, `docs/ai/features/2026-06-02-max-picker-exercise-equipment-crud.md`

### Findings

차단 이슈 없음.

### 확인 내용

- 맥스 피커에서 벤치마크가 없는 등록 후보는 `데이터 없음` 중립 배지로 표시된다.
- 맥스 피커 후보는 `_isExerciseEditable()` 조건과 무관하게 삭제 액션을 보여 주며, 클릭 시 기존 `data.js`의 `deleteExercise()` 경로를 사용한다.
- 삭제 확인 문구는 과거 운동 기록이 유지된다는 점을 명시한다.
- 수정 버튼은 이모지 대신 고정 크기 inline SVG icon button을 사용하며, 모바일에서 배지/액션이 줄바꿈될 수 있게 스타일이 보강됐다.
- `workout/exercises.js`, `style.css`는 `sw.js` `STATIC_ASSETS`에 포함되며, `CACHE_VERSION`이 함께 bump됐다.
- TDS 관점 수동 리뷰: 새 UI는 기존 피커 토큰/간격을 유지하고, 버튼 터치 영역은 30px로 기존 피커 내 소형 액션보다 커졌다. 별도 카드 중첩이나 신규 색상 팔레트 확장은 없다.

### 검증

- PASS: `git diff --check`
- PASS: `node --check workout/exercises.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/calc.max.test.js` (`54` tests)
- not verified yet: 실제 모바일 UI 클릭 플로우는 dev server를 Codex 세션에서 장기 실행하지 않는 프로젝트 규칙 때문에 수행하지 않았다.

### 결론

후속 피드백 범위에 맞게 보정됐고, 코드/회귀 테스트 기준 차단 이슈는 없다.

# 운동 picker 기본 세트 1행 Slice 9 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md` Slice 9
- 변경 파일:
  - `workout/exercises.js`
  - `sw.js`
  - `tests/workout-test-mode-unified.test.js`

## 결과

- PASS: `_testModeSetsFromPrescription()`는 더 이상 prescription의 `sets` 또는 `targetSets` 개수로 초기 세트 행을 만들지 않는다.
- PASS: 새 picker 추가 운동은 `_defaultTestModeSet()` 기반 1행으로 시작한다.
- PASS: prescription의 `startKg`, `repsHigh`, `repsLow`를 kg/reps 초기값으로 복사하지 않아 기존 renderer에서 빈 입력칸으로 표시된다.
- PASS: benchmark picker entry처럼 `maxPrescription.sets`가 포함된 entry도 `entry?.maxPrescription` 때문에 기존 4행을 유지하지 않는다.
- PASS: Max 처방 계산, 저장 스키마, 기존 운동 카드 세트 데이터는 변경하지 않았다.
- PASS: `workout/exercises.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z28-picker-one-empty-set`으로 bump했다.

## 검증

- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/workout-test-mode-unified.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포와 인증 계정 UI 클릭 검증은 배포 단계에서 진행한다.

## 잔여 리스크

- RIR/ROM 기본값은 기존 테스트모드 기본값을 유지했다. 사용자가 kg/reps 외 보조값까지 빈칸을 요구하면 별도 Slice로 조정한다.
- 배포 URL은 로그인 화면에 막힐 수 있어, 실제 `운동 탭 -> + -> 운동 row 클릭 -> 카드 세트 1행 빈 kg/reps` UI 상태는 인증 계정으로 최종 확인이 필요하다.

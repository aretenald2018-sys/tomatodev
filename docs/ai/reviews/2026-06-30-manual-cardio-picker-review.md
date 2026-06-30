# 운동 picker 유산소 수기 입력 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-30-manual-cardio-picker.md`
- 변경 파일:
  - `workout/exercises.js`
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/*.test.js` 캐시 버전 기대값 및 유산소 회귀 테스트

## 결론

문제 없음. Slice 1 범위 안에서 구현됐고, GPS 러닝 세션 흐름과 기존 러닝 저장 schema는 유지됐다.

## 확인 내용

- `유산소` tile은 `data-picker-activity="manual-cardio"`로 기존 `running` tile과 분리됐다.
- 수기 입력은 기존 `S.workout.runData`와 `workoutSessions[2]` 저장 경로를 재사용한다.
- 저장 직전 `S.workout.exercises`, CF/수영/스트레칭, 세션 메타를 임시 격리해 헬스 회차 데이터가 러닝 회차로 복제되지 않게 했다.
- 저장 실패 시 기존 `S.workout` snapshot과 메모 입력값을 복원한다.
- 저장 성공 후 상세 시트 열기 실패는 저장 실패로 오인하지 않고 `console.warn`만 남긴다.
- `render-calendar.js`는 `manual-cardio` source를 `수기 입력`으로 표시하고 속도 metric을 추가한다.
- `style.css`와 `workout/exercises.js`가 `STATIC_ASSETS` 대상이므로 `sw.js` cache version이 함께 bump됐다.

## 검증

- PASS: `node --check workout/exercises.js; node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js tests/pwa-update-auto-reload.test.js`
- PASS: 전체 테스트 파일 묶음 — `node --test --test-reporter=dot @files`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 리스크

- 실제 모바일 인증 세션에서 `운동 탭 -> + -> 유산소 -> 저장 -> 러닝 상세 카드` UI flow는 배포 URL에서 직접 조작해야 최종 확인된다.

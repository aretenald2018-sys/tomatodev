# 운동 하단 시트 카드 지난 기록 복구 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-07-02-workout-sheet-previous-record-card.md`
- 변경 파일: `render-calendar.js`, `tests/workout-calendar-bottom-sheet.test.js`, `sw.js`, cache marker 테스트, `docs/ai/NEXT_ACTION.md`
- 요청: 하단 시트 운동 카드의 참고 기록을 현재 오늘 기록이 아니라 직전 과거 기록으로 렌더하고, 사라진 `프리`/`디로드` 등 세트 역할 칩을 복구한다.

## 발견 사항

- 치명/높음: 없음.
- 중간: 없음.
- 낮음: 없음.

## 확인한 내용

- `_renderWorkoutExerciseDetailCard()`의 `.wt-max-last` 영역이 `row.setDetails`의 오늘 세트 요약을 직접 렌더하지 않고 `row.previousRecord` 기반 `지난 기록` 요약을 렌더한다.
- `_exerciseRows()`가 `includePreviousRecord` 옵션으로 이전 날짜의 같은 운동 entry를 찾고, 회차 모델인 `workoutSessions`를 기준으로 기록을 정규화한다.
- 세트 detail 변환에서 `wendlerRole`, `supplementalKind`, `wendlerPct`, `amrap`이 유지되어 `프리`, `메인`, `BBB`, `FSL`, `디로드` 라벨 복구가 가능하다.
- 하단 시트 집계 필터가 `warmup`과 `deload` 세트를 제외해 `프리`/`디로드` 무게가 볼륨에 반영되지 않는다.
- `render-calendar.js`가 `STATIC_ASSETS` 대상이므로 `sw.js` cache version이 함께 갱신되었다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`

## 남은 리스크

- not verified yet: 배포 URL에서 인증 계정으로 `운동 탭 -> 오늘 하단 시트 -> 운동 카드` 실제 UI flow는 아직 직접 클릭 확인하지 못했다.
- not verified yet: Dashboard3/운영계 Pages 배포 검증은 커밋/푸시 후 수행해야 한다.

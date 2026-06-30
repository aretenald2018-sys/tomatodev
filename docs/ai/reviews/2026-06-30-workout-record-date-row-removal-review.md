# 운동 기록 화면 날짜 행 제거 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-30-workout-record-date-row-removal.md`
- 변경 파일:
  - `style.css`
  - `sw.js`
  - `tests/workout-navigation-stack.test.js`
  - cache-version marker 테스트들

## 결과

- 발견된 차단 이슈 없음.

## 확인한 사항

- 날짜 UI 행은 운동 기록 화면(`wt-workout-record-mode`)에서만 숨겨진다.
- 월간 캘린더 홈은 이미 날짜 행이 숨겨진 상태를 유지하고, 운동 상세 화면과 식단 탭은 이번 변경 대상이 아니다.
- 기록 화면 본문 상단 padding이 `20px`로 줄어 `헬스 종목` 섹션이 날짜 행 제거 위치에서 시작한다.
- `style.css`는 `STATIC_ASSETS` 대상이며, `sw.js` cache version bump가 포함됐다.

## 검증

- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js` — 10 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`

## 남은 위험

- not verified yet: 인증 계정이 없어 실제 Dashboard3 운동 기록 화면에서 날짜 행 제거 후 `헬스 종목` 위치는 직접 확인하지 못했다.

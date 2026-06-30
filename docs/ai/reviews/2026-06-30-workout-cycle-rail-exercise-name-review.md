# 운동 캘린더 사이클 레일 종목명 복원 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-30-workout-cycle-rail-exercise-name.md`
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache-version marker 테스트들

## 결과

- 발견된 차단 이슈 없음.

## 확인한 사항

- 레일 칩 첫 줄은 `W1 + 종목명` 구조로 바뀌었고, 둘째 줄 `목표 kg`는 유지됐다.
- 종목명은 `benchmark.short`를 우선 사용하고 fallback으로 `benchmark.label`을 사용한다.
- `.cal-cycle-branch-name`은 flex item으로 줄어들 수 있고, 긴 이름은 CSS ellipsis로 처리된다.
- `render-calendar.js`와 `style.css`는 `STATIC_ASSETS` 대상이며, `sw.js` cache version bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` — 16 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test tests/workout-navigation-stack.test.js` — 5 tests passed
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: Dashboard3 Pages 배포 검증 — `a41a02546fcc`, `tomatofarm-v20260630z06-cycle-rail-exercise-name`
- PASS: Dashboard3 Pages marker 직접 fetch — `sw.js` cache version, `render-calendar.js`의 `exerciseLabel`/`cal-cycle-branch-name`, `style.css`의 `.cal-cycle-branch-name`/`text-overflow: ellipsis` 확인

## 남은 위험

- not verified yet: 인증 계정이 없어 실제 Dashboard3 운동 탭 월간 캘린더에서 `W1 스모데드` 형태의 시각 상태는 직접 확인하지 못했다.

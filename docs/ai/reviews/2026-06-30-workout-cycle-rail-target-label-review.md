# 운동 캘린더 사이클 레일 목표 라벨 축약 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-30-workout-cycle-rail-target-label.md`
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache-version marker 테스트들

## 결과

- 발견된 차단 이슈 없음.

## 확인한 사항

- 레일 버튼 화면 텍스트는 운동명 없이 `Wn`과 `목표 nkg` 두 줄로 분리됐다.
- 운동명, 주차, 프로그램 주차, 트랙, kg, reps 정보는 `title`/`aria-label`에 남아 있어 설정 대상 정보가 유지된다.
- 레일 버튼은 작은 폰트와 낮은 line-height로 조정되어 기존 week row 높이를 늘리지 않는다.
- `render-calendar.js`와 `style.css`는 `STATIC_ASSETS` 대상이며, 최종 cache version bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` — 16 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b01a336` — `b01a336c8f56`, `tomatofarm-v20260630z05-workout-record-date-row`
- PASS: Dashboard3 Pages marker 직접 fetch — `sw.js`, `render-calendar.js`, `style.css` marker 확인

## 남은 위험

- not verified yet: 인증 계정이 없어 실제 Dashboard3 운동 탭 월간 캘린더에서 사이클 레일 라벨 시각 상태는 직접 확인하지 못했다.

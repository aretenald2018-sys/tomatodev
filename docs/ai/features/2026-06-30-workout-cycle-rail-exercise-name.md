# 운동 캘린더 사이클 레일 종목명 복원

## 요청

좌측 사이클 목표 칩에서 `W1`과 `목표 kg`는 유지하되, 어떤 운동인지 보이도록 `W1 스모데드`처럼 주차 옆에 종목명을 다시 표시한다. 종목명이 길면 기존처럼 말줄임 처리한다.

## 그릴 결과

- 핵심 질문: 목표 kg 2줄 구조를 되돌릴 것인가?
- 답변/결정: 되돌리지 않는다. 첫 줄은 `W1 + 종목명`, 둘째 줄은 `목표 75kg`로 유지한다.
- 남은 가정: 종목명은 `benchmark.short`를 우선 사용하고 없으면 `benchmark.label`을 사용한다. 긴 종목명은 CSS `text-overflow: ellipsis`로 처리한다.

## Slice 1 — 첫 줄에 주차와 종목명 함께 표시

### 포함

- `render-calendar.js`에서 사이클 레일 item에 `exerciseLabel`을 추가한다.
- 레일 버튼 첫 줄을 `W1 스모데드` 형태로 렌더한다.
- `style.css`에서 첫 줄을 flex row로 만들고 종목명에 ellipsis를 적용한다.
- `tests/workout-calendar-bottom-sheet.test.js`에 렌더/CSS marker 회귀 테스트를 갱신한다.
- `render-calendar.js`, `style.css`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- 목표 kg 줄 제거 또는 위치 변경.
- 사이클/웬들러 처방 계산 변경.
- 레일 폭, 캘린더 날짜 셀, 하단 day sheet 동작 변경.
- `www/` 직접 수정.
- `tomatofarm` remote 배포.

## 예상 변경 파일

- `render-calendar.js`
- `style.css`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- cache-version marker 테스트들
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/reviews/2026-06-30-workout-cycle-rail-exercise-name-review.md`

## 검증 계획

- `node --check render-calendar.js`
- `node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test --test-reporter=dot tests/*.test.js`
- `git diff --check`
- 커밋 후 `git push origin main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL marker 확인:
  - `render-calendar.js`의 `exerciseLabel`
  - `style.css`의 `.cal-cycle-branch-name`
  - `sw.js`의 새 cache version

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-workout-cycle-rail-exercise-name.md` Slice 1을 실행한다.

## 실행 결과

- `render-calendar.js`에 `_cycleRailExerciseLabel()`을 추가해 `benchmark.short` 우선, 없으면 `benchmark.label`을 사용하도록 했다.
- 사이클 레일 item에 `exerciseLabel`을 추가했다.
- 레일 버튼 첫 줄은 `cal-cycle-branch-head` 안에 `W1`과 종목명을 나란히 렌더하고, 둘째 줄 `목표 75kg`는 유지했다.
- `style.css`에서 첫 줄을 flex row로 만들고 `.cal-cycle-branch-name`에 `min-width: 0`, `text-overflow: ellipsis`가 적용되도록 했다.
- `tests/workout-calendar-bottom-sheet.test.js`에 종목명 복원과 ellipsis CSS marker를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z06-cycle-rail-exercise-name`으로 bump하고 cache marker 테스트 기대값을 갱신했다.

검증:

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` — 16 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test tests/workout-navigation-stack.test.js` — 5 tests passed
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: Dashboard3 Pages 배포 검증 — `a41a02546fcc`, `tomatofarm-v20260630z06-cycle-rail-exercise-name`
- PASS: Dashboard3 Pages marker 직접 fetch — `sw.js` cache version, `render-calendar.js`의 `exerciseLabel`/`cal-cycle-branch-name`, `style.css`의 `.cal-cycle-branch-name`/`text-overflow: ellipsis` 확인
- not verified yet: 인증 계정 실제 `운동 탭 -> 월간 캘린더 좌측 사이클 레일` UI flow 확인이 남아 있다.

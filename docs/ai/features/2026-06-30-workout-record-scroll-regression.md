# 운동 기록 화면 스크롤 회귀 수정

## 요청

운동 기록 화면에서 위/아래 스크롤이 되지 않는 증상을 수정한다. 사용자는 직전 날짜 행 제거 지시가 스크롤 차단으로 잘못 반영된 것인지 의심하고 있다.

## 진단

- 재현 대상: `운동 탭 -> 운동 기록 화면 -> 운동 카드/세트 리스트에서 세로 스크롤`.
- 1순위 원인: `app.js`의 전역 workout pull-back gesture가 기록 화면 본문에서 시작한 세로 touchmove에도 `preventDefault()`를 호출할 수 있다.
- 2순위 원인: 기록 화면 `.workout-tab-content`에 세로 pan 허용과 하단 고정 타이머 여유가 명시되지 않아 모바일 WebView에서 스크롤/터치 우선순위가 불안정할 수 있다.
- 날짜 행 제거 자체는 `display: none`과 `padding-top` 조정만 하므로 직접적인 스크롤 잠금 원인은 아니다.

## Slice 1 — 기록 화면 본문 스크롤 우선

### 포함

- `app.js`에서 운동 기록/상세 본문에서 시작한 touch gesture는 pull-back 대상으로 보지 않게 한다.
- `style.css`에서 기록 화면 본문에 `touch-action: pan-y`, 모바일 스크롤 힌트, 고정 타이머/하단 탭 여유 padding을 추가한다.
- `tests/workout-navigation-stack.test.js`와 필요 시 CSS 테스트에 회귀 marker를 추가한다.
- `app.js`, `style.css`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 bump하고 cache marker 테스트를 갱신한다.

### 제외

- 날짜 행 복구.
- 운동 카드 레이아웃 재설계.
- 타이머 바 제거 또는 위치 변경.
- 캘린더 day sheet drag 동작 변경.
- `www/` 직접 수정.
- `tomatofarm` remote 배포.

## 검증 계획

- `node --check app.js`
- `node --check sw.js`
- `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test --test-reporter=dot tests/*.test.js`
- `git diff --check`
- 커밋 후 `git push origin HEAD:main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL marker 확인:
  - `app.js`의 기록/상세 scroll target pull-back 차단 marker
  - `style.css`의 기록 화면 `touch-action: pan-y`
  - `sw.js`의 새 cache version

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-workout-record-scroll-regression.md` Slice 1을 실행한다.

## 실행 결과

- `app.js`에 `_isWorkoutRecordScrollTarget()`을 추가해 기록/상세 본문에서 시작한 touch gesture를 pull-back 대상에서 제외했다.
- `_workoutPageScrollTop()`을 추가해 `document.scrollingElement`, `document.documentElement`, `document.body`, `window.scrollY` 중 실제 스크롤 값을 더 안정적으로 보도록 했다.
- `style.css`에서 기록 화면 본문에 `touch-action: pan-y`, `overscroll-behavior-y: contain`, `-webkit-overflow-scrolling: touch`를 명시했다.
- 하단 타이머 바가 열렸을 때 기록 화면 하단 컨텐츠가 가려지지 않도록 `:has(#wt-workout-timer-bar.wt-open)` padding-bottom 여유를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z07-workout-record-scroll`로 bump하고 cache marker 테스트 기대값을 갱신했다.

검증:

- PASS: `node --check app.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js` — 10 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포와 인증 계정 실제 `운동 탭 -> 기록 화면 -> 카드 리스트 세로 스크롤` UI flow 확인이 남아 있다.

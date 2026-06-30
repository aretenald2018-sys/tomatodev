# 운동 기록 화면 날짜 행 제거

## 요청

운동 추가 후 기록 화면에서 `헬스 종목` 위쪽에 보이는 날짜 UI 행을 제거하고, 그 위치부터 `헬스 종목` 섹션이 바로 보이게 한다.

## 그릴 결과

- 핵심 질문: 날짜 이동/오늘 버튼 기능 자체를 삭제할 것인가?
- 답변/결정: 월간 캘린더 홈과 식단 탭의 날짜 UI는 유지한다. 운동 기록 화면(`wt-workout-record-mode`)에서만 날짜 행을 숨기고 본문 상단 여백을 줄인다.
- 남은 가정: 날짜 이동 기능을 기록 화면에서 숨기면 해당 화면의 날짜 전환은 캘린더로 돌아가서 수행한다.

## Slice 1 — 기록 화면 날짜 행 숨김

### 포함

- `style.css`에서 `#tab-workout.wt-workout-record-mode > .workout-date-nav`를 숨긴다.
- 같은 모드의 `.workout-tab-content` 상단 padding을 줄여 `헬스 종목` 섹션이 위에서 시작하게 한다.
- 관련 CSS/source 회귀 테스트를 추가한다.
- `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- 캘린더 홈의 하단 sheet/월간 캘린더 UI 변경.
- 운동 상세 화면(`wt-workout-detail-mode`) 변경.
- 날짜 라벨 렌더 함수 또는 날짜 이동 로직 삭제.
- `www/` 직접 수정.
- `tomatofarm` remote 배포.

## 예상 변경 파일

- `style.css`
- `sw.js`
- `tests/workout-navigation-stack.test.js`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/reviews/2026-06-30-workout-record-date-row-removal-review.md`

## 검증 계획

- `node --check sw.js`
- `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test --test-reporter=dot tests/*.test.js`
- `git diff --check`
- 커밋 후 `git push origin main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL marker 확인:
  - `style.css`의 `#tab-workout.wt-workout-record-mode > .workout-date-nav`
  - `style.css`의 `padding-top: 20px`
  - `sw.js`의 새 cache version

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-workout-record-date-row-removal.md` Slice 1을 실행한다.

## 실행 결과

- `style.css`에서 `#tab-workout.wt-workout-record-mode > .workout-date-nav`를 `display: none` 처리했다.
- 같은 기록 모드의 `.workout-tab-content`에 `padding-top: 20px`를 적용해 날짜 행이 사라진 자리에서 `헬스 종목` 섹션이 시작하게 했다.
- 월간 캘린더 홈, 운동 상세 화면, 식단 탭 날짜 UI는 변경하지 않았다.
- `tests/workout-navigation-stack.test.js`에 기록 모드 날짜 행 숨김과 상단 padding marker를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z05-workout-record-date-row`로 bump하고 cache marker 테스트 기대값을 갱신했다.

검증:

- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js` — 10 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: Dashboard3 Pages 배포 검증 — `b01a336c8f56`, `tomatofarm-v20260630z05-workout-record-date-row`
- PASS: Dashboard3 Pages marker 직접 fetch — `style.css`의 `#tab-workout.wt-workout-record-mode > .workout-date-nav`, `padding-top: 20px`, `sw.js`의 cache version 확인
- not verified yet: 인증 계정 실제 `운동 탭 -> 날짜 선택 -> 운동 기록 화면 -> 헬스 종목이 상단부터 표시` UI flow 확인이 남아 있다.

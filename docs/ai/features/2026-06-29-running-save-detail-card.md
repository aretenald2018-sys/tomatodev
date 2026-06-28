# 러닝 저장 후 운동 상세 카드 진입

## 그릴 결과

- 핵심 질문: 러닝 요약 화면의 `저장` 이후 사용자가 봐야 하는 화면은 기록 편집 폼인가, 저장된 운동 상세인가?
- 결정: 저장 직후 운동 탭의 캘린더 상세 시트로 바로 전환한다. 사용자가 첨부한 3번 화면처럼 해당 날짜와 회차가 열린 상태여야 한다.
- 결정: 상세 시트의 러닝 항목은 기존 활동 카드가 아니라 헬스 종목 카드와 유사한 읽기 카드 골격을 사용한다. 단, `REP`, `RIR`, 세트, 볼륨 중심 정보는 표출하지 않고 거리, 시간, 페이스, 칼로리, 고도, 케이던스, 경로 요약 등 러닝 정보만 보여준다.
- 남은 가정: 러닝 저장은 현재 활성 운동 날짜와 `S.workout.sessionIndex` 회차에 저장된다. 저장 후 같은 날짜/회차 상세를 열면 된다.

## /diagnose

### 증상

- 러닝 요약 화면에서 `저장`을 누르면 저장 후 운동 기록 편집 화면으로 돌아간다.
- 사용자가 원하는 화면은 운동 탭 캘린더 상세 시트의 저장된 러닝 카드 화면이다.

### 재현/검증 루프

- 정적 재현: `workout/running-session.js`의 `_saveSummary()`가 `saveWorkoutDay({ silent: true })` 후 `wtCloseRunningSession()`만 호출하는지 확인한다.
- 라우팅 검증: `app.js`에 캘린더 상세 시트를 여는 공개 진입점이 있고, 러닝 저장 후 이 진입점을 호출하는지 테스트한다.
- 카드 검증: `render-calendar.js`의 러닝 활동 카드가 `wt-max-read-card` 계열 구조를 사용하고 러닝 전용 필드만 렌더하는지 테스트한다.

### 원인 가설

1. `_saveSummary()`가 저장 완료 후 별도 화면 전환 없이 러닝 overlay를 닫는다.
2. `wtCloseRunningSession()`이 `window._wtSetActiveType?.('gym')`을 호출해 운동 편집 폼의 기본 탭으로 복귀시킨다.
3. 캘린더 상세 시트를 외부에서 직접 여는 전용 `window.*` 진입점이 없다.
4. 운동 상세의 러닝 항목은 `wt-day-activity-card` 단순 카드라 헬스 카드와 같은 정보 구조를 제공하지 않는다.

## 실행 슬라이스

### Slice 1: 러닝 저장 후 상세 시트 진입 및 러닝 카드 개편

범위:

- `app.js`: 날짜/회차를 받아 운동 탭 캘린더 상세 시트를 여는 공개 함수 추가.
- `workout/running-session.js`: 저장 성공 후 러닝 overlay를 닫고 저장 날짜/회차의 캘린더 상세 시트로 이동.
- `render-calendar.js`: 러닝 활동 카드만 헬스 읽기 카드 골격으로 렌더하고 러닝 전용 metric builder를 추가.
- `style.css`: 러닝 상세 카드의 metric grid, 경로/정확도 요약 스타일 추가.
- `sw.js`: 수정한 정적 자산에 맞춰 `CACHE_VERSION` bump.
- `tests/`: 라우팅, 러닝 저장, 상세 카드, cache marker 회귀 테스트 추가/갱신.

제외:

- 새 러닝 아트에셋 작업.
- 러닝 통계 탭 통합.
- 운동 완료 알림 모달 폐지.
- 러닝 저장 데이터 schema 확장. 기존 `runRouteSummary`, `runAvgPaceSecPerKm`, `runGpsAccuracySummary`를 우선 사용한다.

## 검증 계획

- `node --check app.js; node --check workout/running-session.js; node --check render-calendar.js; node --check sw.js`
- `node --test tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- 전체 테스트: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 marker: `sw.js` cache version, `app.js`의 `wtOpenWorkoutDaySheet`, `workout/running-session.js`의 저장 후 상세 진입, `render-calendar.js`의 러닝 전용 카드/metric class.

## 실행 결과

- 상태: Slice 1 구현 완료.
- 저장 후 라우팅: `app.js`에 `window.wtOpenWorkoutDaySheet`를 추가하고, `workout/running-session.js` 저장 성공 후 `running:save-detail` action으로 같은 날짜/회차 상세 시트를 연다.
- 상세 카드: `render-calendar.js`의 러닝 activity row가 GPS summary 필드를 보존하고, 러닝 항목만 `wt-running-read-card`로 렌더한다. 카드에는 거리, 시간, 평균 페이스, 칼로리, 고도 상승, 케이던스, 평균 심박, 경로 포인트, GPS 정확도 등 존재하는 러닝 정보만 표출한다.
- 캐시: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z4-running-save-detail-card`로 bump했다.
- 로컬 검증:
  - PASS: `node --check app.js; node --check workout/running-session.js; node --check render-calendar.js; node --check sw.js`
  - PASS: `node --test tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
  - PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 590 tests passed
  - PASS: `node scripts/verify-runtime-assets.mjs` — `refs=853`
  - PASS: `git diff --check`

## 다음 실행 프롬프트

`docs/ai/features/2026-06-29-running-save-detail-card.md` Slice 1을 실행한다. 러닝 요약 저장 후 운동 기록 편집 폼이 아니라 캘린더 상세 시트로 바로 전환하고, 상세 시트의 러닝 카드를 헬스 카드와 같은 읽기 카드 골격에 러닝 전용 정보로 렌더한다.

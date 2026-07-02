# 운동 하단 시트 카드 지난 기록 복구 계획

## 요청

- 증상 1: 하단 시트 운동 카드의 기록 요약이 현재 선택 날짜의 오늘 기록을 렌더링한다.
- 증상 2: 세트 칩에서 기존에 보이던 `프리`/웬들러 보조 세트 구분이 사라지고 `본` 위주로 보인다.
- 목표: 운동 카드의 참고 기록 영역은 오늘 입력값이 아니라 직전 과거 기록을 보여주고, 세트 칩은 저장된 세트 역할을 보존해 렌더한다.

## /diagnose

### 재현 루프

1. 운동 탭에서 오늘 하단 시트를 연다.
2. 운동 종목을 추가하거나 기존 카드를 연다.
3. 카드의 기록 요약 영역을 확인한다.
4. 기대: 참고 영역은 오늘 입력 중인 세트가 아니라 이전 운동 기록을 보여야 한다.
5. 웬들러/프로그램 세트는 `프리`/`메인`/`BBB`/`FSL` 같은 역할 칩이 유지되어야 한다.

### 가설

1. `_renderWorkoutExerciseDetailCard()`가 `row.setDetails`에서 만든 `_workoutSetSummary(row)`를 `오늘 기록`으로 그대로 렌더해, 현재 입력 중인 세트가 참고 기록처럼 보인다.
2. `_exerciseRows()`가 세트 detail로 변환할 때 `wendlerRole`, `supplementalKind`, `wendlerPct`, `amrap` 같은 역할 메타를 버려서 하단 시트 칩이 모두 일반 `setType` 기준으로 보인다.
3. 하단 시트는 `getWorkoutSessions()` 기반 회차 모델을 쓰므로, 직전 기록 조회도 legacy top-level `exercises`뿐 아니라 `workoutSessions`를 함께 탐색해야 한다.

## Slice 1

### 범위

- `render-calendar.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `sw.js`
- `docs/ai/NEXT_ACTION.md`

### 구현

1. 선택 날짜보다 이전 날짜의 같은 운동 entry를 `getWorkoutSessions()` 기반으로 찾아 `previousRecord`로 붙인다.
2. 카드의 `.wt-max-last` 영역은 `지난 기록`과 `previousRecord` 요약만 렌더한다.
3. `setDetails`/`rawSetDetails`가 `wendlerRole`/`supplementalKind` 등 세트 역할 메타를 유지하게 한다.
4. 하단 시트 세트 칩 라벨을 `wendlerRole` 우선으로 `프리`/`메인`/`BBB`/`FSL`/`본`으로 렌더한다.
5. `render-calendar.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- 일반 운동 탭 카드(`workout/exercises.js`) 수정
- 세트 타입 변경 UI 추가
- 웬들러 처방 생성 로직 변경
- 볼륨/강도/웬들러 통계 산식 변경

### 검증

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node --test tests/workout-calendar-bottom-sheet.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `node --test --test-reporter=dot tests/*.test.js`
6. `git diff --check`
7. 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
8. 운영계 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`

## 상태

- 상태: `static_verified_deploy_pending`
- 현재 세션: Slice 1 실행 및 정적 검증 완료, 배포 검증 대기
- 구현 완료:
  1. 하단 시트 운동 카드가 선택 날짜의 오늘 세트 요약 대신 이전 날짜의 같은 운동 기록을 조회해 `지난 기록`으로 렌더한다.
  2. 이전 기록 조회는 `workoutSessions`의 회차별 entry를 기준으로 `exerciseId`, `movementId`, 운동명 순서로 매칭한다.
  3. `setDetails`/`rawSetDetails`에 `wendlerRole`, `supplementalKind`, `wendlerPct`, `amrap` 메타를 보존한다.
  4. 세트 칩 라벨은 웬들러 역할을 우선해 `프리`, `메인`, `BBB`, `FSL`, `보조`, `디로드`를 복구한다.
  5. 하단 시트 볼륨/세트 집계에서 `프리`와 `디로드` 세트를 제외한다.
  6. `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z11-workout-sheet-previous-record`로 갱신했다.
- 검증 완료:
  1. PASS: `node --check render-calendar.js`
  2. PASS: `node --check sw.js`
  3. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `node --test --test-reporter=dot tests/*.test.js`
  6. PASS: `git diff --check`
- not verified yet: Dashboard3/운영계 Pages 배포 후 URL 검증 및 인증 계정 실제 하단 시트 UI flow 확인 필요.

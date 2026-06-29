# 운동 중 새로고침 세션 복구 UX

## 상태

- 상태: `implemented_static_verified`
- 요청: 타이머로 운동을 기록하다 배포판 업데이트/새로고침을 하면 타이머와 미완료 운동 흐름이 날아가 운동 종료 및 오늘의 리포트를 받을 수 없는 문제를 개선한다.
- 적용 트리거: `/diagnose` 우선. 증상은 새로고침/업데이트 시 진행 중 세션이 메모리에서 사라지는 회귀성 UX 문제다.

## 진단 요약

1. `workout/timers.js`는 `active_timer`를 `_settings`와 유저별 `localStorage`에 저장해 running 타이머 시작 시각은 복구할 수 있다.
2. 하지만 입력 중 세트 초안은 `input` 이벤트에서는 메모리만 갱신하고, `change`/저장 왕복 전에 새로고침하면 당일 운동 세션 전체가 복구 대상으로 보장되지 않는다.
3. 운동 종료/오늘 리포트는 `wtFinishWorkout()` 저장 성공 이후 흐름이라, 새로고침 뒤 세션이 빈 상태로 로드되면 사용자는 종료 버튼과 리포트 진입을 잃는다.
4. PWA 업데이트 버튼은 자동 새로고침이 아니라 수동 `새로고침` 버튼이지만, 운동 중 상태를 설명하거나 클릭 직전 초안을 flush하지 않는다.

## 그릴 결과

- 핵심 질문: “업데이트를 운동 중에 막아야 하나, 복구 가능한 상태로 허용해야 하나?”
- 결정: 자동 갱신은 계속 하지 않고, 수동 업데이트 버튼은 운동 중 문구를 `운동 끝내고 업데이트`로 바꾼다. 클릭 직전에도 로컬 초안을 저장한다.
- 결정: 새로고침 복구의 기준은 서버 저장이 아니라 `진행 중 운동 세션 초안`이다. 세트/메모/운동시간/회차/타이머 날짜를 로컬에 즉시 남긴다.
- 가정: 이번 슬라이스는 IndexedDB 신규 계층을 만들지 않고 기존 유저별 `localStorage` 패턴에 맞춘다. 이미 앱은 active timer 백업에 localStorage를 사용하고 있어 모바일 reload 회복에는 충분하다.

## Slice 1: 활성 운동 세션 로컬 초안 저장/복구

### 구현 범위

1. `workout/timers.js`에 활성 운동 세션 초안 저장/읽기/삭제/복구 유틸을 추가한다.
2. 초안에는 최소한 `date`, `sessionIndex`, `sessionId`, `exercises`, `workoutDuration`, `workoutStartTime`, `workoutTimerDate`, `memo`, `gymId`, `pickerGymFilter`, `routineMeta`, `maxMeta`를 담는다.
3. 세트 입력 `input` 단계, 세트 추가/삭제/완료/타입 변경, 운동 추가/삭제, 타이머 시작/일시정지/리셋/종료에서 초안을 갱신하거나 정리한다.
4. `loadWorkoutDate()`에서 당일/해당 회차 로드 직후 서버 데이터 위에 더 최신 로컬 초안을 병합하고, 사용자가 알아차릴 수 있게 한 번 토스트를 띄운다.
5. PWA 업데이트 패널은 운동 중이면 문구와 버튼을 “운동 기록 저장됨 / 운동 끝내고 업데이트” 톤으로 바꾸고, reload 직전에 `window.__wtPersistActiveDraft()`를 호출한다.
6. 서비스워커 캐시 대상 파일을 수정하므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외 범위

- IndexedDB 기반 영구 큐 신규 도입.
- 로그인 전/다른 계정 간 초안 공유.
- 서버 저장 실패 재시도 큐.
- 오늘의 리포트 모달 내용 재설계.

### 검증

1. `node --check workout/timers.js workout/exercises.js workout/load.js utils/build-info.js sw.js`
2. 활성 운동 초안 저장/복구 source-level 회귀 테스트 추가 및 실행.
3. 업데이트 버튼이 운동 중 문구/flush hook을 포함하는 source-level 회귀 테스트 추가 및 실행.
4. `node scripts/verify-runtime-assets.mjs`
5. `git diff --check`
6. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
7. UI 직접 검증은 인증 화면에 막히면 `not verified yet`로 기록한다. 인증 후 기대 상태: 운동 중 새로고침 후 같은 날짜/회차에서 세트와 타이머가 복구되고, `끝내기`로 오늘 리포트 진입이 가능하다.

### 실행 결과

1. `workout/timers.js`에 유저별 `tomatofarm_active_workout_draft_` 로컬 초안 저장/읽기/복구/삭제 API를 추가했다.
2. 세트 입력, 세트 추가/삭제/완료/타입/정렬, 종목 추가/삭제, 운동 메모 입력, 타이머 시작/일시정지/리셋/종료에 초안 저장/정리 훅을 연결했다.
3. `workout/load.js`에서 같은 날짜/회차 초안을 서버 세션 위에 적용하고 복구 토스트를 표시한다.
4. `utils/build-info.js`의 앱 업데이트 버튼은 활성 운동 초안이 있으면 운동 기록 보존 문구로 바뀌고, reload 직전 초안을 flush한다.
5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z31-active-workout-recovery`로 올렸다.

### 실행 검증

1. PASS: `node --check workout/timers.js; node --check workout/exercises.js; node --check workout/load.js; node --check utils/build-info.js; node --check sw.js`
2. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-track-graph-delta.test.js tests/workout-test-mode-unified.test.js tests/stats-muscle-fatigue-insight.test.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `git diff --check`
5. not verified yet: Dashboard3 Pages 배포와 인증 후 UI 플로우 확인은 후속 UI 수정까지 합쳐 최종 배포에서 수행한다.

## 다음 세션 시작 지시

`docs/ai/features/2026-06-24-workout-active-session-recovery.md`의 Slice 1을 실행한다.

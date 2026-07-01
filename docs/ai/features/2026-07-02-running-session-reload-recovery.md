# 러닝 세션 리로드 복구 계획

## 문제

러닝 기록 중 앱이 백그라운드로 갔다가 OS/브라우저에 의해 리로드되면, 저장 버튼을 누르기 전 live 러닝 기록이 전부 사라진다.

## 진단

- 러닝 세션은 `workout/running-session.js`의 모듈 전역 `_session`에 `startedAt`, `pausedMs`, `route`, `goal`, `placeSummary`를 보관한다.
- 저장 버튼을 누른 뒤에만 `_syncWorkoutRunData()`와 `saveWorkoutDay()`를 통해 Firestore day/session payload로 영속화된다.
- 일반 운동 타이머 draft는 `workout/timers.js`가 `beforeunload`/`visibilitychange`에서 localStorage에 보존하지만, live 러닝 `_session`은 그 draft에 연결되어 있지 않다.
- 따라서 리로드가 발생하면 `_session`이 초기화되고, 복구할 local draft가 없어 진행 중 또는 요약 화면의 러닝 기록이 사라진다.

## 반증 가능한 가설

1. `running-session.js`에 reload-safe draft 저장이 없어서 `_session.route`와 `startedAt`이 손실된다.
2. `_finishRun()` 후 summary 화면에서 저장 전 리로드가 발생해도 `S.workout.runData` 또는 day payload가 아직 저장되지 않아 기록이 없다.
3. 기존 `wtPersistActiveWorkoutDraft()`는 `S.workout.runData`만 보므로 live 러닝 중 route push마다 갱신되지 않는다.
4. 저장 완료 후에는 `saveWorkoutDay()`가 day/session payload를 쓰므로 같은 문제는 재현되지 않는다.

## 결정

- `running-session.js` 안에 유저별 localStorage draft를 추가한다.
- draft에는 `phase`, `startedAt`, `endedAt`, `pausedAt`, `pausedMs`, `route`, `placeSummary`, `goal`, `audioGuide`, 음성 안내 진행 상태를 저장한다.
- `start`, `route push`, `pause`, `resume`, `finish`, goal 변경, `visibilitychange`, `pagehide`, `beforeunload`에서 draft를 갱신한다.
- `wtOpenRunningSession()`은 유효한 draft가 있으면 새 세션으로 초기화하지 않고 draft를 복원해 progress/summary 화면을 다시 보여준다.
- 저장 성공 또는 명시 닫기 시 draft를 삭제한다.
- `running-session.js`는 `sw.js` `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 같은 변경에서 bump한다.

## 실행 Slice 1

### 변경 파일

- `workout/running-session.js`
- `sw.js`
- `tests/running-entry.test.js`
- `docs/ai/NEXT_ACTION.md`

### 포함

- live/summary 러닝 draft 저장 및 복구
- route/시간/목표/장소 summary 복원
- 저장 완료/닫기 시 draft cleanup
- cache version bump
- 정적 테스트 업데이트

### 제외

- Firestore에 미저장 live 러닝을 자동 저장하는 기능
- 백그라운드 GPS 지속 추적 네이티브 구현
- 지도 provider 변경
- 러닝 UI redesign
- 기존 `workout/exercises.js` 미커밋 변경 수정

## 검증

- `node --check workout/running-session.js; node --check sw.js`
- `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/workout-sessions.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 배포가 필요한 최종 검증 시 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-07-02-running-session-reload-recovery.md`의 실행 Slice 1을 진행한다. live 러닝 세션이 리로드 후 draft에서 복구되도록 구현하고, `running-session.js` 변경에 맞춰 `sw.js` cache version과 관련 테스트를 업데이트한다.

# 러닝 세션 리로드 복구 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-07-02-running-session-reload-recovery.md`
- 주요 변경: `workout/running-session.js`, `sw.js`, 러닝/캐시 관련 테스트
- 제외: 기존 미커밋 `workout/exercises.js` 변경, `www/` 산출물, Firebase 저장 스키마 변경

## 결과

문제 없음.

## 확인 내용

- 저장 전 live 러닝 상태가 `tomatofarm_running_session_draft_<user>` localStorage key로 저장된다.
- 저장 대상은 `phase`, `startedAt`, `endedAt`, `pausedAt`, `pausedMs`, `route`, `placeSummary`, `goal`, 음성 안내 진행 상태이며 24시간을 넘은 draft는 복구하지 않는다.
- `pagehide`, `beforeunload`, `visibilitychange(hidden)`, route point 추가, pause/resume/finish/goal save 시 draft가 갱신된다.
- `wtOpenRunningSession()`은 유효한 draft가 있을 때 progress/summary 화면을 복원하고, 저장 성공 또는 명시 닫기 시 draft를 삭제한다.
- Firestore 저장 경로는 기존 `saveWorkoutDay()`와 `_syncWorkoutRunData()` payload shape를 유지한다. 새 `saveDay()`/`setDoc()` 호출은 추가하지 않았다.
- `running-session.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z1-running-session-reload-recovery`로 bump했다.

## 검증

- PASS: `node --check workout/running-session.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/workout-sessions.test.js` - 25 tests passed
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
- PASS: `git diff --check`

## 남은 확인

- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` 실행이 남아 있다.
- 실제 모바일 OS가 백그라운드에서 GPS sampling을 계속 제공하는지는 네이티브 권한/플랫폼 정책 영역이다. 이번 변경의 보장 범위는 앱 리로드 후 저장 전 draft를 잃지 않는 것이다.

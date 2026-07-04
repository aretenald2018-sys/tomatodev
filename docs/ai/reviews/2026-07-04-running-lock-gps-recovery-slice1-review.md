# 2026-07-04 러닝 잠금/복구 Slice 1 리뷰

## 결론

- 상태: `complete`
- 계획: `docs/ai/features/2026-07-04-running-lock-gps-recovery.md`
- 범위: Slice 1, 웹 러닝 세션 복구와 가짜 좌우 스와이프 점 제거
- 남은 범위: Slice 2, Android native foreground location bridge

## 검토 결과

1. PASS: 러닝 진행 화면의 `.wt-run-live-pages` DOM과 CSS를 제거해 좌우 스와이프 가능처럼 보이는 점 표시를 없앴다.
2. PASS: 러닝 draft를 현재 사용자 `ownerId`와 active fallback key로 저장해, 앱 재시작/로그인 재진입 후 현재 사용자와 일치하는 러닝만 복구한다.
3. PASS: `wtRestoreRunningSessionIfActive()`를 앱 boot 경로에서 일반 팝업보다 먼저 호출하고, 복구 중에는 다이어트/웰컴/튜토리얼/PWA 배너가 러닝 화면 위에 뜨지 않게 했다.
4. PASS: 리뷰 중 발견된 dateKey 저장 블로커를 수정했다. 복구 draft의 `dateKey`를 `S.shared.date`에 반영하고, non-admin boot의 `loadWorkoutDate(TODAY)`가 복구된 날짜를 덮지 않게 막았다.
5. PASS: `saveWorkoutDay()`가 no-op이면 `false`를 반환하게 하고, 러닝 저장은 `false`를 성공으로 처리하지 않도록 했다. 저장 실패/skip 시 세션과 draft를 닫거나 지우지 않는다.
6. PASS: 복구 가능한 러닝 draft가 있으면 기존 사용자 길드 온보딩을 생략하고, 러닝 root를 `document.body` 직속 overlay로 승격해 홈 탭 부팅에서도 러닝 진행 화면이 390x844 전면으로 표시된다.
7. LIMITATION: WebView `navigator.geolocation.watchPosition()`만으로 잠금 중 GPS point 수집을 보장할 수 없다. 실제 백그라운드 GPS 연속성은 Slice 2 native foreground service에서 처리해야 한다.

## 검증

1. PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/running-session-recovery-behavior.test.js`
   - 23 pass
   - `tests/running-session-recovery-behavior.test.js`는 Puppeteer file harness로 실제 DOM/import flow를 실행한다.
   - 복구된 summary가 오염된 boot 날짜가 아니라 draft 날짜 `2026-07-03`으로 저장되는지 검증했다.
   - 저장 날짜가 없을 때 save no-op 이후 세션과 draft가 유지되는지 검증했다.
2. PASS: `node --check workout/running-session.js && node --check workout/save.js && node --check app.js && node --check tests/running-session-recovery-behavior.test.js && node --check tests/running-entry.test.js`
3. PASS: `npm.cmd run verify:assets`
   - `[runtime-assets] ok refs=880`
   - cache marker: `tomatofarm-v20260704z6-running-restore-overlay`
4. PASS: `node --test tests/*.test.js`
   - 700 pass
5. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 8e8e9ee6f40a`
   - deployed commit/cache 확인.
6. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260704z6-running-restore-overlay feature-login.js::_hasRestorableRunningDraftForUser feature-login.js::tomatofarm_running_session_draft_active 'workout/running-session.js::document.body.appendChild(root)' workout/running-session.js::_ensureRunningWorkoutDate app.js::runningSessionRestored`
7. PASS: production authenticated running restore smoke
   - evidence: `.omo/evidence/running-lock-gps-20260704/production-authenticated-running-restore-8e8e9ee6f40a-final.json`
   - screenshot: `.omo/evidence/running-lock-gps-20260704/production-authenticated-running-restore-8e8e9ee6f40a-final.png`
   - 결과: `screen=progress`, `rootParentIsBody=true`, `rootRect=390x844`, `centerHitInsideRunningRoot=true`, `dotCount=0`, `loginVisible=false`, `guildOnboardingVisible=false`, `pageErrors=[]`.

## 남은 범위

- Slice 1은 운영 Pages에서 검증 완료됐다.
- 잠금 중 WebView가 OS에 의해 정지된 상태에서도 GPS point를 계속 수집하려면 Slice 2에서 Android foreground location service/notification bridge가 필요하다.

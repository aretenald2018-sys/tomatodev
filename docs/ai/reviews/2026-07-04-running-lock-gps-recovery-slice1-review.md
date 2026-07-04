# 2026-07-04 러닝 잠금/복구 Slice 1 리뷰

## 결론

- 상태: `ready_for_final_deploy`
- 계획: `docs/ai/features/2026-07-04-running-lock-gps-recovery.md`
- 범위: Slice 1, 웹 러닝 세션 복구와 가짜 좌우 스와이프 점 제거
- 남은 범위: Slice 2, Android native foreground location bridge

## 검토 결과

1. PASS: 러닝 진행 화면의 `.wt-run-live-pages` DOM과 CSS를 제거해 좌우 스와이프 가능처럼 보이는 점 표시를 없앴다.
2. PASS: 러닝 draft를 현재 사용자 `ownerId`와 active fallback key로 저장해, 앱 재시작/로그인 재진입 후 현재 사용자와 일치하는 러닝만 복구한다.
3. PASS: `wtRestoreRunningSessionIfActive()`를 앱 boot 경로에서 일반 팝업보다 먼저 호출하고, 복구 중에는 다이어트/웰컴/튜토리얼/PWA 배너가 러닝 화면 위에 뜨지 않게 했다.
4. PASS: 리뷰 중 발견된 dateKey 저장 블로커를 수정했다. 복구 draft의 `dateKey`를 `S.shared.date`에 반영하고, non-admin boot의 `loadWorkoutDate(TODAY)`가 복구된 날짜를 덮지 않게 막았다.
5. PASS: `saveWorkoutDay()`가 no-op이면 `false`를 반환하게 하고, 러닝 저장은 `false`를 성공으로 처리하지 않도록 했다. 저장 실패/skip 시 세션과 draft를 닫거나 지우지 않는다.
6. LIMITATION: WebView `navigator.geolocation.watchPosition()`만으로 잠금 중 GPS point 수집을 보장할 수 없다. 실제 백그라운드 GPS 연속성은 Slice 2 native foreground service에서 처리해야 한다.

## 검증

1. PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/running-session-recovery-behavior.test.js`
   - 23 pass
   - `tests/running-session-recovery-behavior.test.js`는 Puppeteer file harness로 실제 DOM/import flow를 실행한다.
   - 복구된 summary가 오염된 boot 날짜가 아니라 draft 날짜 `2026-07-03`으로 저장되는지 검증했다.
   - 저장 날짜가 없을 때 save no-op 이후 세션과 draft가 유지되는지 검증했다.
2. PASS: `node --check workout/running-session.js && node --check workout/save.js && node --check app.js && node --check tests/running-session-recovery-behavior.test.js && node --check tests/running-entry.test.js`
3. PASS: `npm.cmd run verify:assets`
   - `[runtime-assets] ok refs=880`
   - cache marker: `tomatofarm-v20260704z4-running-lock-gps-recovery`
4. PASS: `node --test tests/*.test.js`
   - 697 pass

## 운영 검증 대기

- 다음 단계: 이 리뷰와 코드 변경을 커밋/푸시한 뒤 Tomato Farm Pages에서 최종 deploy verify와 authenticated running restore smoke를 수행한다.
- 완료 후 `docs/ai/NEXT_ACTION.md`를 `complete`로 닫는다.

# 앱 업데이트 새로고침 인증 루프 안정화 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-06-app-update-refresh-auth-loop.md`
- 실행 slice: Slice 1 - `pwa-register.js` 앱 Service Worker 업데이트 자동 적용 안정화
- 주요 변경 파일:
  - `pwa-register.js`
  - `index.html`
  - `sw.js`
  - `tests/pwa-update-auto-reload.test.js`
  - cache marker assertion tests

## 결론

PASS. 로컬 회귀, post-implementation review, Production Pages 배포 검증까지 완료했다.

## 확인 결과

1. 요청한 현상인 앱 업데이트/새로고침 시 반복 reload가 auth bootstrap을 여러 번 재진입시키는 경로는 `pwa-register.js`의 timeout fallback reload에서 발생할 수 있었다.
2. 수정 후 자동 reload는 `controllerchange`에서만 발생한다.
3. `controllerchange`가 오지 않는 timeout 경로는 update banner fallback으로 바뀌어 강제 새로고침을 반복하지 않는다.
4. 같은 SW update key는 한 탭 세션에서 자동 적용을 1회만 시도한다.
5. active workout draft 보호 경로는 자동 reload 대신 배너를 보여주는 행동 테스트로 고정했다.
6. `pwa-register.js`와 `index.html`은 `STATIC_ASSETS` 대상이므로 `sw.js` cache version bump와 관련 cache marker 테스트 갱신이 함께 들어갔다.

## 검증

1. PASS: focused RED/GREEN - `tests/pwa-update-auto-reload.test.js`.
2. PASS: `node --check pwa-register.js`.
3. PASS: `node --check sw.js`.
4. PASS: `node --check tests/pwa-update-auto-reload.test.js`.
5. PASS: `node --test tests/pwa-update-auto-reload.test.js` - 5 pass.
6. PASS: `node --test tests/*.test.js` - 713 pass.
7. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=882`.
8. PASS: `git diff --check`.
9. PASS: post-implementation review lanes:
   - Context mining: PASS, prior auto-update requirement was `SKIP_WAITING` + `controllerchange`; timeout reload was not a hard requirement.
   - QA: PASS, focused/full tests rerun.
   - Code quality: PASS, no blockers.
   - Security: PASS, severity NONE.
10. PASS: `npm.cmd run deploy:production` - pushed and verified `95cb27110d45` on `origin/main`.
11. PASS: Production Pages deploy marker - `[deploy-verify] ok 95cb27110d45 tomatofarm-v20260706z6-sw-reload-stability static=242`.
12. PASS: deployed refresh-loop harness - deployed `index.html`, `pwa-register.js`, `sw.js` returned HTTP 200; timeout without `controllerchange` produced `reloads=0`, `banners=1`; same update key applied only once; actual `controllerchange` still produced exactly one reload.

## 남은 검증

없음.

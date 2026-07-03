# 2026-07-03 전역 상호작용 결합 완화 Slice 5 리뷰

## 범위

- 계획: `docs/ai/features/2026-07-03-global-interaction-decoupling-refactor.md`
- Slice: `click performance pass`
- 변경 파일:
  - `workout/expert/max.js`
  - `sw.js`
  - `tests/max-render-scheduler.test.js`
  - cache marker를 참조하는 `tests/*.test.js`

## 리뷰 결과

- 발견 사항: 없음

## 확인한 리스크

1. `window.renderExpertTopArea()` 직접 호출이 helper 외부에 남아 있으면 같은 Max 클릭 경로에서 전체 상단 렌더가 다시 흩어질 수 있다.
   - 확인: `tests/max-render-scheduler.test.js`가 helper 외부의 `window.renderExpertTopArea` 참조를 금지한다.
2. scheduler가 렌더를 너무 늦추면 저장 직후 UI 갱신이 체감될 수 있다.
   - 확인: `requestAnimationFrame` 1회 지연으로 같은 프레임 안의 중복만 병합하고, 다음 paint 전에 렌더 요청을 수행하도록 제한했다.
3. `workout/expert/max.js`는 `STATIC_ASSETS` 대상이므로 서비스워커 캐시 버전 누락 시 운영에서 이전 코드가 남을 수 있다.
   - 확인: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z17-max-render-scheduler`로 bump했고 관련 cache marker 테스트를 갱신했다.

## 검증

1. PASS: `node --check workout/expert/max.js; node --check sw.js; node --check tests/max-render-scheduler.test.js`
2. PASS: `node --test tests/max-render-scheduler.test.js tests/max-auxiliary-modal-actions.test.js tests/max-wendler.test.js tests/max-settle.test.js tests/workout-test-mode-unified.test.js tests/workout-save-mode-guard.test.js tests/pwa-update-auto-reload.test.js` - 46 pass
3. PASS: `node --test tests/*.test.js` - 683 pass
4. PASS: `git diff --check`
5. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
6. INFO: `f4442872c4435761ef848ddd6b2d5b41a4c78548` push 후 Pages deploy action이 GitHub 내부 오류 `Deployment failed, try again later.`로 실패했다.
7. INFO: 수동 workflow run `28655912543`, `28656159691`도 같은 Pages 내부 오류로 실패했고, 운영 URL은 아직 이전 `07bc8743222e`/z16을 서빙한다.
8. PASS: 새 docs commit `34b0bc01b23a`로 Pages deploy를 재트리거했고 `npm.cmd run deploy:production`이 통과했다.
9. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 34b0bc01b23a`
10. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260703z17-max-render-scheduler workout/expert/max.js::_scheduleExpertTopAreaRender workout/expert/max.js::_expertTopAreaRenderScheduled workout/expert/max.js::requestAnimationFrame tests/max-render-scheduler.test.js::_scheduleExpertTopAreaRender`
11. PASS: 운영 URL in-app browser 로드 - title `토마토 키우기`, `html[data-app-shell-actions-bound="1"]`, `data-app-action` controls 18개, console error 0건
12. not verified yet: 실제 Max UI click flow는 로그인 화면이 운동 탭 hit target을 덮어 인증 없이 열 수 없었다. `#tab-nav [data-tab="workout"]` center hit target이 `#login-screen`이었다.

# PWA Calendar Backdrop Touch Fix Review

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-30-pwa-calendar-backdrop-touch-fix.md`
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache marker 테스트 파일들

## 확인 결과

- 이슈 없음.
- bar 상태 bottom sheet backdrop은 `hidden` 속성과 CSS `display: none`으로 터치 협상에서 제외된다.
- full 상태 backdrop만 `display: block`, `pointer-events: auto`, `touch-action: none`을 갖고 배경 입력을 차단한다.
- 기존 full sheet 내부 scroll chain 방지와 배경 입력 차단 코드는 유지된다.
- `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z15-pwa-backdrop-touch`로 bump했다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/pwa-update-auto-reload.test.js` — 21 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
- PASS: `git diff --check`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: Tomato Farm 운영계 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 6415021` → `[deploy-verify] ok 64150211994b tomatofarm-v20260630z15-pwa-backdrop-touch static=233`
- PASS: Tomato Farm 운영계 marker 검증 — `sw.js::tomatofarm-v20260630z15-pwa-backdrop-touch`, `render-calendar.js::backdropHiddenAttr`, `render-calendar.js::toggleAttribute('hidden', !expanded)`, `style.css::.cal-workout-day-backdrop.is-full`, `style.css::touch-action: auto`
- PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 6415021` → `[deploy-verify] ok 64150211994b tomatofarm-v20260630z15-pwa-backdrop-touch static=233`
- PASS: Dashboard3 Pages marker 검증 — 동일 marker 확인

## 남은 리스크

- 인증 세션이 없어 실제 운영 PWA에서 `운동 탭 -> 캘린더 본문 세로 드래그`를 직접 손으로 조작하지는 못했다. 운영 배포와 asset marker는 확인됐고, 최종 체감 동작은 사용자 기기 PWA에서 확인해야 한다.

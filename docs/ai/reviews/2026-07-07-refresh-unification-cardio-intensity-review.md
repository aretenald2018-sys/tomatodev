# 헤더 새로고침 통합 및 유산소 강도 입력 리뷰

## 범위

- 계획: `docs/ai/features/2026-07-07-refresh-unification-cardio-intensity.md`
- Slice: Refresh Unification Cardio Intensity Slice 1
- 요청: 헤더 새로고침 버튼으로 중복 update/refresh UI를 통합하고, `마이마운틴` 유산소 종목과 각도/단계 기반 칼로리 계산을 추가한 뒤 캐시 버전 갱신 및 운영 배포까지 검증한다.

## 리뷰 결과

PASS. 기존 floating update indicator는 헤더 `#app-refresh-btn` 상태 표시로 통합됐고, active workout draft 보존 reload 경로는 유지된다. `마이마운틴` 각도와 `스텝머신` 단계 값은 자동 칼로리 계산, 저장 payload, 미리보기, 날짜 시트 metric까지 같은 필드로 전달된다.

## 확인한 변경

1. `utils/build-info.js`에서 legacy `#app-update-indicator` UI 생성을 제거하고 update-ready/loading 상태를 `#app-refresh-btn`에 반영했다.
2. `style.css`에서 floating update panel 스타일을 제거하고 헤더 refresh button update dot/loading 회전을 추가했다.
3. `workout/exercises.js`에 `마이마운틴` 카탈로그, `angleDeg` 입력, `step-machine` `level` 입력, 종목별 강도 multiplier를 추가했다.
4. `render-calendar.js`가 저장된 유산소 카드의 각도/단계를 summary와 metric grid에 표시한다.
5. `assets/workout/cardio/my-mountain.png`를 새로 생성해 `sw.js` `STATIC_ASSETS`에 추가했다.
6. `app.js`, `index.html`, `sw.js`, `build-info.json`, 관련 테스트의 cache/query marker를 `tomatofarm-v20260707z20-refresh-cardio-intensity` 기준으로 갱신했다.

## 검증

1. PASS: `git diff --check`.
2. PASS: `node --check app.js && node --check utils/build-info.js && node --check workout/exercises.js && node --check render-calendar.js && node --check sw.js`.
3. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=905`.
4. PASS: `node --test tests/*.test.js` - 741 tests, 741 pass.
5. PASS: local browser QA harness - header refresh button 1개, legacy update indicator 0개, `마이마운틴` 목록 1개, angle 12 -> 522 kcal, step level 10 -> 450 kcal, pageerror 없음.
6. PASS: `npm.cmd run deploy:production` - `f42b2e8ad398055a1c1899d3a2ffda141b200c40`를 `origin/main`에 push하고 Pages deploy verify 통과.
7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ f42b2e8ad398055a1c1899d3a2ffda141b200c40` - deployed commit/cache/static assets 확인.
8. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ index.html::20260707e-refresh-cardio-intensity app.js::20260707e-refresh-cardio-intensity utils/build-info.js::app-refresh-btn workout/exercises.js::my-mountain workout/exercises.js::ex-cardio-angle workout/exercises.js::ex-cardio-level render-calendar.js::angleDeg sw.js::assets/workout/cardio/my-mountain.png`.
9. PASS: production browser QA - actual URL HTTP 200, pageerror 0, `#app-refresh-btn` 1개, legacy `#app-update-indicator` 0개, `window.__requestTomatoAppRefresh` 함수 노출, DOM click 후 page complete.
10. PASS: production module harness QA - deployed `workout/exercises.js`/`style.css` 기준 `마이마운틴` 목록 1개, `my-mountain.png` HTTP 200 `image/png`, angle 12 -> 522 kcal, step level 10 -> 450 kcal, pageerror/console error 없음.

## 운영 확인

운영 URL `https://aretenald2018-sys.github.io/tomatofarm/`에서 배포 commit, cacheVersion, 새 asset, 헤더 refresh 단일 entrypoint, 유산소 강도 입력 flow를 확인했다.

## 제한

`review-work`의 병렬 sub-agent 리뷰는 현재 도구 규칙상 사용자가 명시적으로 병렬 에이전트를 요청하지 않은 경우 spawn이 금지되어 실행하지 않았다. 대신 정적 검증, 전체 회귀 테스트, asset 검증, local/production browser QA로 대체했다. Clean production browser는 비로그인 상태라 화면 포인터 클릭은 로그인 오버레이에 막히므로, 헤더 refresh는 DOM click/reload와 함수 노출로 검증했다.

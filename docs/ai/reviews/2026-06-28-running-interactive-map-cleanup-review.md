# 러닝 인터랙티브 지도 UI 정리 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-28-running-interactive-map-cleanup.md`
- 변경 범위:
  - `workout/running-map.js`
  - `workout/running-session.js`
  - `style.css`
  - `sw.js`
  - `tests/*.test.js`

## Findings

- 발견된 차단 이슈 없음.

## 확인한 사항

- VWorld 지도는 더 이상 고정 렌더만 하지 않고 pointer drag, wheel, double click, pinch gesture에 반응해 타일을 다시 그린다.
- route polyline과 marker는 pan/zoom 후에도 동일 좌표계에서 다시 렌더된다.
- `러닝 가이드` 탭과 handler, `현재 위치` label chip markup/CSS가 제거됐다.
- 시작 버튼은 기존 154px 상한에서 110px 상한으로 줄어 면적이 약 절반 수준이 됐다.
- 캘린더 테스트가 금지하는 `is-dragging` class와 충돌하지 않도록 VWorld 전용 dragging class를 사용했다.
- 서비스워커 캐시 marker가 `tomatofarm-v20260628z7-running-interactive-map`로 갱신됐다.

## 검증

- PASS: `node --check workout/running-session.js; node --check workout/running-map.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js`
- PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`
- PASS: `node --test tests/*.test.js` — 576 tests passed
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ ff6ed86182ce332ea2ede63f8f58ca207261de5d`
  - 결과: `[deploy-verify] ok ff6ed86182ce tomatofarm-v20260628z7-running-interactive-map static=221`
- PASS: deployed marker 검증 — cache marker, pointer/wheel/double click/pinch marker, 축소 시작 버튼 CSS
- PASS: 배포된 `workout/running-session.js`, `style.css`에 `러닝 가이드`, `현재 위치`, `wt-run-map-label` 없음

## 남은 리스크

- VWorld는 raster tile 기반이라 Google Maps/Mapbox 같은 vector 지도 수준의 부드러운 연속 확대는 아니다. 현재 구현은 지도앱처럼 조작 가능한 step zoom/pan이며, 필요하면 후속에서 zoom easing과 타일 캐시를 보강한다.
- 인증 세션과 실제 모바일 터치/핀치 감각은 배포 후 사용자 기기에서 최종 확인해야 한다.

# 러닝 인터랙티브 지도 UI 정리 계획

## 상태

- 단계: implemented
- 요청: 러닝 시작 화면의 VWorld 지도를 고정 이미지처럼 송출하지 않고 지도앱처럼 확대/축소 가능하게 하며, 시작 버튼 면적을 절반 수준으로 줄이고, `현재 위치` 칩과 `러닝 가이드` 탭을 제거한다.
- 결정: 이번 변경은 `Slice 1. 러닝 시작 지도 인터랙션 및 UI 축소`만 실행한다.

## 구현 슬라이스

### Slice 1. 러닝 시작 지도 인터랙션 및 UI 축소

- 상태: implemented
- 목표:
  - VWorld 지도는 drag pan, wheel zoom, double click/tap zoom, pinch zoom을 지원한다.
  - 기존 route/현재 위치 marker는 지도 pan/zoom 후에도 타일 위 같은 좌표계에 유지한다.
  - 시작 화면에는 `바로 시작` 단일 탭만 남기고 `러닝 가이드` 탭은 제거한다.
  - 지도 위 `현재 위치`/`위치 권한 대기` label chip을 렌더하지 않는다.
  - 시작 버튼의 지름/면적을 기존 대비 약 절반 수준으로 줄인다.
- 예상 변경:
  - `workout/running-map.js`: VWorld interactive renderer로 교체
  - `workout/running-session.js`: 가이드 탭과 지도 label chip 제거
  - `style.css`: 단일 탭/작아진 시작 버튼/지도 interaction CSS
  - `sw.js`: `CACHE_VERSION` bump
  - `tests/*`: 회귀 테스트 갱신
- 검증:
  - `node --check workout/running-session.js; node --check workout/running-map.js; node --check sw.js`
  - `node --test tests/running-entry.test.js tests/running-tracker.test.js`
  - `node --test tests/*.test.js`
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
  - Dashboard3 Pages 배포 검증

## 다음 세션 시작 기준

Slice 1 실행과 리뷰가 완료됐다. 후속으로 더 자연스러운 연속 zoom animation이 필요하면 별도 슬라이스에서 inertial pan/zoom easing을 다룬다.

## 실행 결과

- `workout/running-map.js`: VWorld 지도를 상태 기반 인스턴스로 바꾸고 drag pan, wheel zoom, double click zoom, pinch zoom을 추가했다.
- `workout/running-map.js`: pan/zoom 후에도 route polyline과 시작/종료 marker가 같은 좌표계에서 다시 그려지도록 했다.
- `workout/running-session.js`: `러닝 가이드` 탭과 guide handler를 제거했다.
- `workout/running-session.js`: `현재 위치`/`위치 권한 대기` visible chip을 제거하고 지도 aria label만 유지했다.
- `style.css`: 시작 버튼을 `min(24vw, 110px)`/`82px` 최소 크기로 축소했다.
- `style.css`: VWorld 지도에 grab/grabbing cursor와 overscroll containment를 추가했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z7-running-interactive-map`로 올렸다.

## 로컬 검증

- PASS: `node --check workout/running-session.js; node --check workout/running-map.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js`
- PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`
- PASS: `node --test tests/*.test.js` — 576 tests passed

## 배포 검증

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ ff6ed86182ce332ea2ede63f8f58ca207261de5d`
  - 결과: `[deploy-verify] ok ff6ed86182ce tomatofarm-v20260628z7-running-interactive-map static=221`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ ...`
  - `sw.js::tomatofarm-v20260628z7-running-interactive-map`
  - `workout/running-map.js::pointerdown`
  - `workout/running-map.js::pointermove`
  - `workout/running-map.js::wheel`
  - `workout/running-map.js::dblclick`
  - `workout/running-map.js::pointerDistance`
  - `style.css::width: min(24vw, 110px)`
  - `style.css::cursor: grab`
  - `workout/running-session.js::러닝 지도`
- PASS: 배포된 `workout/running-session.js`, `style.css`는 `러닝 가이드`, `현재 위치`, `wt-run-map-label`을 포함하지 않는다.

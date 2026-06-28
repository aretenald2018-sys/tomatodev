# 러닝 시작 지도 UI 정리 계획

## 상태

- 단계: implemented
- 요청: 러닝 시작 화면에서 `밤에 러닝하시나요?` 카드 자체를 제거하고, 시작 버튼 주변 원형 보조 버튼을 모두 제거하며, VWorld 지도 글자가 깨져 보이지 않게 보정한다.
- 결정: 이번 변경은 `Slice 1. 러닝 시작 지도 UI 정리`만 실행한다.

## 구현 슬라이스

### Slice 1. 러닝 시작 지도 UI 정리

- 상태: implemented
- 목표:
  - 시작 전 지도 화면에서 안내 카드 블록을 렌더하지 않는다.
  - 시작 버튼 주변 원형 보조 버튼 4개를 렌더하지 않는다.
  - 시작 버튼과 목표 설정 버튼만 지도 위에 유지한다.
  - VWorld 타일은 `image-rendering: auto`, 고정 타일 크기, 브라우저 기본 폰트 렌더링 보정으로 한글 라벨이 더 깨져 보이지 않게 한다.
- 예상 변경:
  - `workout/running-session.js`: 안내 카드와 보조 원형 버튼 markup 제거
  - `style.css`: 제거된 요소 스타일 정리, VWorld tile 글자/이미지 렌더링 보정
  - `sw.js`: `CACHE_VERSION` bump
  - `tests/*`: markup 제거, map tile style, cache marker 회귀 테스트 갱신
- 검증:
  - `node --check workout/running-session.js; node --check sw.js`
  - `node --test tests/running-entry.test.js`
  - `node --test tests/*.test.js`
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
  - Dashboard3 Pages 배포 검증

## 다음 세션 시작 기준

Slice 1 실행과 리뷰가 완료됐다. 후속으로 실제 지도 라벨 품질을 더 높여야 하면 VWorld 지도 layer 선택 또는 vector 지도 SDK 전환을 별도 계획에서 다룬다.

## 실행 결과

- `workout/running-session.js`: `밤에 러닝하시나요?` 카드 markup을 제거했다.
- `workout/running-session.js`: 시작 버튼 주변 원형 보조 버튼 4개를 제거했다.
- `style.css`: 제거된 카드/원형 버튼 스타일과 모바일 보정 잔여 규칙을 삭제했다.
- `workout/running-map.js`: 고해상도 화면에서 VWorld tile을 한 단계 높은 zoom으로 받아 축소 렌더하는 DPR 보정을 추가했다.
- `style.css`: VWorld tile에 `image-rendering: auto`, font smoothing, text rendering 보정을 명시했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z6-running-start-map-cleanup`로 올렸다.

## 로컬 검증

- PASS: `node --check workout/running-session.js; node --check workout/running-map.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js` — 12 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`
- PASS: `node --test tests/*.test.js` — 576 tests passed

## 배포 검증

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 1f2f3771f362ffce9789e43a5de9f8df3cf6e983`
  - 결과: `[deploy-verify] ok 1f2f3771f362 tomatofarm-v20260628z6-running-start-map-cleanup static=221`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ ...`
  - `sw.js::tomatofarm-v20260628z6-running-start-map-cleanup`
  - `workout/running-map.js::devicePixelRatio`
  - `workout/running-map.js::tileCssSize`
  - `style.css::image-rendering: auto`
  - `style.css::-webkit-font-smoothing: antialiased`
  - `workout/running-session.js::wt-run-start-btn`
  - `workout/running-session.js::wt-run-goal-btn`
- PASS: 배포된 `workout/running-session.js`, `style.css`는 `밤에 러닝하시나요`, `wt-run-tip-card`, `wt-run-float`를 포함하지 않는다.

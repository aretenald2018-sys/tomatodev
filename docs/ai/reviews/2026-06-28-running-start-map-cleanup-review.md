# 러닝 시작 지도 UI 정리 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-28-running-start-map-cleanup.md`
- 변경 범위:
  - `workout/running-session.js`
  - `workout/running-map.js`
  - `style.css`
  - `sw.js`
  - `tests/*.test.js`

## Findings

- 발견된 차단 이슈 없음.

## 확인한 사항

- 시작 화면에서 `밤에 러닝하시나요?` 카드 markup이 제거됐다.
- 시작 버튼 주변 원형 보조 버튼 markup과 CSS가 제거됐다.
- VWorld tile은 DPR 1.5 이상에서 가능하면 한 단계 높은 zoom tile을 받아 축소 렌더한다.
- VWorld tile CSS는 `image-rendering: auto`와 font smoothing 보정을 명시한다.
- 서비스워커 캐시 marker가 `tomatofarm-v20260628z6-running-start-map-cleanup`로 갱신됐다.

## 검증

- PASS: `node --check workout/running-session.js; node --check workout/running-map.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js` — 12 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`
- PASS: `node --test tests/*.test.js` — 576 tests passed

## 남은 리스크

- VWorld 기본 지도 자체가 raster tile이라 지도에 인쇄된 한글 라벨 품질은 provider tile 원본의 한계를 따른다. 이번 변경은 브라우저 확대/보간으로 더 깨져 보이는 문제를 줄이는 보정이다.
- 실제 모바일 GPS 권한 flow와 지도 시각 상태는 인증된 사용자 기기에서 최종 확인해야 한다.

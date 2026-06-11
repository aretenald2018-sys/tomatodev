# 통계 종목 선택 칩 미표출 리뷰

## 대상

- 계획 문서: `docs/ai/features/2026-06-11-hide-stats-volume-selector.md`
- 변경 파일: `render-stats.js`, `sw.js`, `docs/ai/NEXT_ACTION.md`

## 결과

- 발견 이슈: 없음
- 범위 확인: `종목별 볼륨 추이` 상단의 `vol-selector`/`vol-ex-btn` 렌더링만 제거했고, 차트와 최근 기록 표는 유지했다.
- 캐시 확인: `render-stats.js`가 `sw.js`의 `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION`을 함께 범프했다.

## 검증

- `node --check render-stats.js`
- `node --check sw.js`
- `npm.cmd run dev` 실행 후 `http://localhost:5500/index.html` HTTP 200 확인
- 헤드리스 브라우저 검증:
  - HTTP status: `200`
  - `#volume-section .vol-selector`: `0`
  - `#volume-section .vol-ex-btn`: `0`
  - `#volume-section canvas#vol-chart`: 존재
  - `#volume-section .vol-row`: `2`

## 배포 전 주의

- `build-info.json`은 배포 직전 새 커밋 기준으로 갱신되어야 한다.
- 배포 후 `scripts/verify-deploy.mjs <url> <commit>`로 `build-info.json`과 `sw.js`의 캐시 버전 일치를 확인한다.

# 모바일 세로 드래그 스크롤 복구 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-05-28-mobile-vertical-drag-scroll-fix.md`
- 변경 파일:
  - `styles/components.css`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
  - `docs/ai/features/2026-05-28-mobile-vertical-drag-scroll-fix.md`

## Findings

발견된 차단 이슈 없음.

## 확인 내용

- `body`는 `overflow-y: auto`와 `-webkit-overflow-scrolling: touch`를 가져 모바일 세로 팬 제스처가 본문 스크롤로 이어질 수 있다.
- 기존 가로 오버플로 방어는 유지되고, 지원 브라우저에서는 `overflow-x: clip`으로 더 좁게 적용된다.
- `.tab-panel`에 `overflow-y: visible`이 명시되어 탭 패널이 세로 스크롤을 자체적으로 막지 않는다.
- `styles/components.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js`의 `CACHE_VERSION` 범프가 포함됐다.

## 검증

- PASS: Puppeteer 모바일 CSS 프로브, 터치 드래그 후 `window.scrollY=507`
- PASS: Puppeteer 모바일 CSS 프로브, `documentElement.scrollWidth=398`, `innerWidth=398`
- PASS: `git diff --check`
- BLOCKED: `node scripts/verify-runtime-assets.mjs`는 기존 미추적 mockup 참조(`mockups/trio-renewal/shared.css`) 때문에 실패했다.

## 결론

계획한 Slice 1 범위 안에서 완료. 배포 후 실제 GitHub Pages URL에서 새 `CACHE_VERSION`과 모바일 스크롤을 확인한다.

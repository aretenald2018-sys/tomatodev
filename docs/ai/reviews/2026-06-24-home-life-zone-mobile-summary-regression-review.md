# 홈 라이프존 모바일 요약 행 회귀 리뷰

- 대상 계획: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 대상 Slice: Slice 10 — 모바일 요약 구획 회귀 복원
- 리뷰 일자: 2026-06-24

## 리뷰 결과

- 결론: 통과.
- 회귀 원인은 `@media (max-width: 420px)` 안의 `.lz-summary-strip { grid-template-columns: 1fr; }` 규칙이었다.
- 기본 `.lz-summary-strip`의 좌우 2칸 grid는 유지하고, 모바일에서는 버튼 padding과 숫자 크기만 줄이도록 수정했다.
- `style.css`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 함께 bump했다.

## 검증

- PASS: `node --check sw.js`
- PASS: `node --check home/life-zone.js`
- PASS: `node --check home/life-zone-state.js`
- PASS: `node --test tests/home-life-zone-state.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: 정적 CSS 확인 — 모바일 media query에서 `.lz-summary-strip` 1열 override 제거, 기본 2컬럼 유지.

## 잔여 리스크

- 로그인 세션이 필요한 실제 모바일 홈탭 UI 플로우는 개발계 배포 후 사용자 기기에서 최종 확인한다.

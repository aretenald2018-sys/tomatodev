# 운동 추가 분류형 진입 UI 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`
- 변경 파일:
  - `modals/ex-picker-modal.js`
  - `workout/exercises.js`
  - `style.css`
  - `sw.js`

## 리뷰 결과

- 발견 이슈: 없음.
- `workout/exercises.js`의 기존 선택/수정/숨김/삭제 흐름은 새 `category/list` 상태와 분리되어 유지된다.
- 검색 진입은 전역 목록으로 전환되고, clear 버튼은 CSS `display:none`과 충돌하지 않도록 JS에서 `grid`로 표시한다.
- `style.css`와 `workout/exercises.js`가 `STATIC_ASSETS`에 포함되어 있으며, `sw.js` `CACHE_VERSION`이 함께 bump되었다.

## 검증

- PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 URL에서 인증 계정으로 운동 탭 `+` → 분류 첫 화면 → 부위 tile → 운동 추가 flow를 직접 클릭해야 한다.

## 결론

- 코드 리뷰 기준 통과.
- 다음 단계는 `origin/main` 배포 후 Dashboard3 Pages에서 배포/흐름 검증이다.

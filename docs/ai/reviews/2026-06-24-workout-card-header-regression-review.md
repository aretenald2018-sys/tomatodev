# 운동 카드 헤더 회귀 수정 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md` Slice 5
- 변경 파일:
  - `style.css`
  - `sw.js`
  - `tests/workout-card-layout-css.test.js`
  - `docs/ai/diagnoses/2026-06-24-workout-card-header-regression.md`
  - `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`

## 결과

- Blocking findings: 없음.
- 운동 카드 헤더는 더 이상 제목, 스파크라인, 삭제 버튼을 한 줄에 강제 배치하지 않는다.
- 스파크라인은 카드 헤더의 다음 줄 전체 폭으로 내려가므로 모바일에서 운동명 영역이 보장된다.
- 삭제 버튼의 기존 `margin-left:auto`가 `#tab-workout` 범위에서 제거되어 flex wrap 시 불필요한 공간 압박을 만들지 않는다.
- `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION` bump가 반영됐다.
- 같은 회귀를 막기 위해 `tests/workout-card-layout-css.test.js`를 추가했다.

## 검증

- PASS: `node --test tests/workout-card-layout-css.test.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 리스크

- 실제 모바일 UI 클릭 검증은 Dashboard3 로그인 게이트 때문에 인증 계정으로 확인해야 한다.

# 운동 추가 분류형 진입 UI Slice 2 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`
- Slice: `Slice 2: 우하단 + 직접 picker 진입과 부위 아트 자산 대체`
- 변경 파일:
  - `render-calendar.js`
  - `workout/exercises.js`
  - `style.css`
  - `sw.js`
  - `assets/workout/muscles/*.png`
  - `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`

## 결과

- PASS: 차단 이슈 없음.

## 확인 내용

- `render-calendar.js`의 `_wtCalAddSession()`이 대상 회차를 로드한 뒤 `wtOpenExercisePicker()`를 바로 호출한다.
- picker 열기 실패 시 기존 편집 화면 진입으로 fallback되어 사용자가 막히지 않는다.
- `workout/exercises.js`는 기본 부위 8개만 이미지 자산을 사용하고, 커스텀 부위는 기존 CSS fallback을 유지한다.
- 이미지 경로는 문서 기준 상대 경로 `./assets/workout/muscles/*.png`라 GitHub Pages 하위 경로에서도 깨지지 않는다.
- `sw.js`에 새 PNG 8개가 `STATIC_ASSETS`로 등록됐고 `CACHE_VERSION`이 bump됐다.
- `style.css` staged hunk는 운동 picker 이미지 렌더링만 포함한다. 별도 통계탭 CSS 변경은 이번 리뷰 대상에서 제외했다.

## 검증

- PASS: `node --check render-calendar.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `assets/workout/muscles/` PNG 8개 존재 및 `sw.js` 등록 확인
- PASS: `git diff --check`
- PASS: `git diff --cached --check`

## 남은 검증

- not verified yet: 커밋/푸시 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` 필요.
- not verified yet: Dashboard3 Pages에서 운동 탭 → 오늘 운동 상세 → 우하단 `+` → picker 분류 화면 → `가슴` 선택 → 운동 목록 표시 → 운동 추가 흐름 클릭 검증 필요.

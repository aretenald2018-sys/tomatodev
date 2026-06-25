# 운동 navigation stack 회귀 수정 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-25-workout-navigation-stack-regression-fix.md`
- 변경 파일:
  - `app.js`
  - `render-calendar.js`
  - `style.css`
  - `index.html`
  - `render-workout.js`
  - `workout/exercises.js`
  - `workout/index.js`
  - `workout/load.js`
  - `workout/navigation-stack.js`
  - `sw.js`
  - 관련 테스트

## 리뷰 결과

차단 이슈 없음.

## 확인한 점

1. picker가 열린 상태에서는 `wtHandleExercisePickerBack()`이 picker list/category/editor 상태를 먼저 소비한다.
2. Android `backButton` hook과 PWA `popstate` hook 모두 workout route pop보다 overlay back을 먼저 처리한다.
3. picker에서 이미 추가된 종목 클릭은 기존 entry detail route로 이동하고, 새 종목 클릭은 push 후 새 entry detail route로 이동한다.
4. BottomSheet handle click은 action/main/toggle 버튼을 제외하고 full/bar toggle을 수행한다.
5. full sheet 하향 drag는 낮춘 collapse threshold와 `closeLatched` 경로로 `bar`에 안착한다.
6. `sw.js` `CACHE_VERSION`과 versioned module query가 `tomatofarm-v20260625z45-workout-nav-regression` 계열로 갱신됐다.

## 검증

- PASS: `node --check app.js; node --check render-calendar.js; node --check workout/exercises.js; node --check workout/index.js; node --check workout/navigation-stack.js; node --check render-workout.js; node --check workout/load.js; node --check sw.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node --test .\tests\*.test.js` — 512 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 리스크

- 인증 계정이 필요한 실제 UI flow는 아직 자동화하지 못했다.
- 배포 후 최신 Pages commit과 marker 검증이 필요하다.

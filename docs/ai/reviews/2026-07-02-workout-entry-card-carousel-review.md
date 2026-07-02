# Workout Entry Card Carousel 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-07-02-workout-entry-card-carousel.md`
- 변경 파일: `workout/exercises.js`, `style.css`, `sw.js`, cache marker tests, `tests/workout-test-mode-unified.test.js`, `tests/workout-card-layout-css.test.js`
- 요청: 기존 책갈피 WIP를 폐기하고, 운동종목 카드를 좌우로 넘기는 캐러셀 방식으로 전환한다.

## 발견 사항

- 치명/높음: 없음.
- 중간: 없음.
- 낮음: 없음.

## 확인한 내용

- `_renderExerciseList()`가 운동종목 카드를 `ex-entry-carousel-track` 안의 `data-wt-entry-slide-idx` slide로 렌더한다.
- 기존 `ex-entry-bookmark`/`data-wt-entry-tab-idx`/`_renderWorkoutEntryBookmarks` 이름은 제거되었다.
- active index는 저장 schema에 넣지 않고 모듈 UI 상태로만 관리한다.
- picker의 기존/신규 종목 선택 경로가 `wtFocusWorkoutEntryCard()`를 통해 해당 slide로 이동한다.
- 운동 완료 버튼은 `uiCollapsed`로 접지 않고 `_advanceWorkoutEntry()`를 통해 다음 카드로 이동한다.
- `workout/exercises.js`와 `style.css`가 `STATIC_ASSETS` 대상이므로 `sw.js` cache version이 함께 갱신되었다.

## 검증

- PASS: `node --check workout/exercises.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-test-mode-unified.test.js tests/workout-card-layout-css.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`

## 남은 리스크

- PASS: Dashboard3/운영계 Pages 배포 검증과 marker 검증을 완료했다.
- not verified yet: 인증 계정으로 `운동 탭 -> 종목 여러 개 추가 -> 좌우 swipe/이전/다음/완료 이동` 실제 UI flow는 아직 직접 클릭 확인하지 못했다.

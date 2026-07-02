# Workout Entry Card Carousel 계획

## 요청

- 기존 WIP의 번호 책갈피 스타일은 폐기한다.
- 운동종목 카드를 여러 개 추가했을 때 세로로 길게 쌓는 대신, 캐러셀처럼 좌우로 넘겨 볼 수 있게 한다.
- 운동 완료 흐름은 다음 종목 카드로 자연스럽게 이동해야 한다.

## 그릴 결과

- 질문: 캐러셀은 별도 책갈피 UI 중심인가, 카드 자체 스와이프 중심인가?
- 결정: 사용자가 “책갈피 스타일이 아니라”라고 명시했으므로 카드 자체를 좌우로 넘기는 `scroll-snap` 캐러셀로 구현한다.
- 결정: 번호는 책갈피 장식이 아니라 현재 위치를 알려주는 작은 상태 표시와 이전/다음 버튼에만 사용한다.
- 결정: 운동 데이터 schema는 변경하지 않고, active index는 모듈 UI 상태로만 둔다.
- 결정: 캘린더 하단 시트 카드나 성장보드 내장 카드는 이번 범위에서 바꾸지 않는다.

## Slice 1 범위

- `workout/exercises.js`
  1. 기존 책갈피 WIP helper를 캐러셀 active index/helper로 전환한다.
  2. `_renderExerciseList()`가 여러 운동종목을 `ex-entry-carousel`/`ex-entry-carousel-track` 안에 렌더한다.
  3. 각 카드는 `scroll-snap-align` 대상이 되고, 스크롤 종료 시 가장 가까운 카드 index를 active로 동기화한다.
  4. 이전/다음 버튼과 dot indicator로 카드 이동을 지원한다.
  5. picker에서 종목 추가/기존 선택 시 해당 카드로 이동한다.
  6. 운동 완료 버튼은 카드를 접는 대신 다음 카드로 이동한다.
- `style.css`
  1. 캐러셀 shell, track, slide, controls, dots 스타일을 추가한다.
  2. 모바일에서 카드 폭이 안정적으로 잡히고 텍스트/입력 요소가 넘치지 않게 한다.
- `tests/workout-test-mode-unified.test.js` 또는 `tests/workout-card-layout-css.test.js`
  1. DOM 구조가 책갈피가 아니라 캐러셀 track/slide/indicator를 렌더하는지 확인한다.
  2. 기존 test-mode card template 회귀 조건을 유지한다.
- `sw.js`
  1. `workout/exercises.js`, `style.css`가 `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 bump한다.

## 제외

- 캘린더 과거 기록 read card 구조 변경
- 성장보드 내장 `renderEmbeddedMaxExerciseCard` UX 변경
- 운동 데이터 schema 변경
- 세트 row 디자인 재작성
- 드래그 순서 변경 방식 개편

## 검증 계획

1. `node --check workout/exercises.js`
2. `node --check sw.js`
3. `node --test tests/workout-test-mode-unified.test.js tests/workout-card-layout-css.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `node --test --test-reporter=dot tests/*.test.js`
6. `git diff --check`
7. 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
8. 운영계 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
9. 배포 asset marker에서 cache version, `ex-entry-carousel-track`, `data-wt-entry-slide-idx`, `wtSelectWorkoutEntryCard` 확인

## 상태

- 상태: `deployed_verified`
- 현재 세션: Slice 1 구현, 정적 검증, Dashboard3/운영계 배포 검증 완료
- 구현 완료:
  1. 번호 책갈피 WIP를 제거하고 운동종목 입력 카드를 `scroll-snap` 기반 좌우 캐러셀로 렌더한다.
  2. 이전/다음 버튼과 dot indicator를 추가해 현재 카드 위치와 완료 상태를 보여준다.
  3. picker에서 기존/신규 종목 선택 시 해당 카드 slide로 이동한다.
  4. 운동 완료 버튼은 카드를 접지 않고 다음 종목 카드로 이동한다.
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z12-workout-entry-carousel`로 갱신했다.
- 검증 완료:
  1. PASS: `node --check workout/exercises.js`
  2. PASS: `node --check sw.js`
  3. PASS: `node --test tests/workout-test-mode-unified.test.js tests/workout-card-layout-css.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `node --test --test-reporter=dot tests/*.test.js`
  6. PASS: `git diff --check`
- 배포 검증 완료:
  1. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ ae474809ca0287a8cd27e93bc5ba63895032c082`
  2. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ ae474809ca0287a8cd27e93bc5ba63895032c082`
  3. PASS: Dashboard3/운영계 marker 검증 - `tomatofarm-v20260702z12-workout-entry-carousel`, `ex-entry-carousel-track`, `data-wt-entry-slide-idx`, `wtSelectWorkoutEntryCard`, `scroll-snap-type: x mandatory`
- not verified yet: 인증 계정 실제 UI swipe flow 확인 필요.

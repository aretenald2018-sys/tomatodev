# 다음 자동 액션

## 현재 상태

- 상태: `complete`
- 계획 문서: `docs/ai/features/2026-06-26-workout-cycle-settings-sheet-unification.md`
- 현재 단계: `complete — workout cycle settings sheet unification`
- 마지막 완료: `캘린더 rail 목표 칩 클릭 경로를 종목 설정 sheet로 통합, 리뷰, Dashboard3 Pages 배포 검증했다.`
- 다음 액션: `없음`
- 차단 사유: `없음`

## 이번 실행 검증

- 계획 완료: `docs/ai/features/2026-06-26-workout-cycle-settings-sheet-unification.md`
- 구현 완료: `workout/test-v2/board-render.js` 캘린더 rail 설정 전용 진입, 트랙 구성 웬들러 칩 통합, 종목별 6주 가로 레일 추가
- 리뷰 완료: `docs/ai/reviews/2026-06-26-workout-cycle-settings-sheet-unification-review.md`
- PASS: `node --check workout/test-v2/board-render.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js` — 53 tests passed
- PASS: `node --test .\tests\*.test.js` — 546 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 23de6af`
  - 결과: `[deploy-verify] ok 23de6af6e44c tomatofarm-v20260626z10-cycle-settings-sheet static=219`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z10-cycle-settings-sheet" "workout/test-v2/board-render.js::S.settingsOnly = true" "workout/test-v2/board-render.js::data-tm2-col-cycle" "workout/test-v2/board-render.js::document.dispatchEvent(new CustomEvent('sheet:saved'))" "test-mode-v2.css::.tm2-col-cycle-line" "test-mode-v2.css::.tm2-track-toggle button.tm2-program-wendler.tm2-on"`
- not verified yet: 인증 계정 세션이 없어 배포 URL에서 `운동 탭 -> 월간 캘린더 -> 좌측 cycle rail 목표 칩 -> 종목 설정 sheet` 실제 UI flow는 직접 조작하지 못함

## 리뷰 대상

- `workout/timeline.js`
- `workout/exercises.js`
- `workout/timers.js`
- `workout/save.js`
- `workout/load.js`
- `workout/sessions.js`
- `workout/state.js`
- `workout/save-schema.js`
- `render-calendar.js`
- `data/data-load.js`
- `data/data-pure.js`
- `home/life-zone-state.js`
- `sw.js`
- 관련 테스트 파일

## 직전 실행 검증

- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/exercise-program-editor.test.js` — 3 tests passed
- PASS: `node --test .\tests\*.test.js` — 528 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 66bf22b`
  - 결과: `[deploy-verify] ok 66bf22bb1564 tomatofarm-v20260625z66-wendler-calendar-density static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260625z66-wendler-calendar-density" "workout/exercises.js::ex-program-calendar-row" "style.css::position: static" "style.css::min-height: 24px"`
- not verified yet: 인증 계정이 없어 `운동 탭 -> 종목 수정 -> 웬들러 -> 시작 주 캘린더 선택 -> 저장` 실제 UI flow는 직접 저장 확인 미완료

## 현재 실행 검증

- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/workout-test-mode-unified.test.js tests/test-v2.board-core.test.js` — 43 tests passed
- PASS: `node --test .\tests\*.test.js` — 531 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `docs/ai/reviews/2026-06-26-exercise-program-wendler-recommendation-priority-review.md`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 36be474`
  - 결과: `[deploy-verify] ok 36be47482068 tomatofarm-v20260626z4-wendler-recommendation-priority static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z4-wendler-recommendation-priority" "workout/exercises.js::const programEntry = _buildProgramPickerExerciseEntry(ex)" "workout/exercises.js::buildMaxPickerExerciseEntry({"`
- not verified yet: 인증 계정이 없어 실제 모바일 UI에서 `추천 종목 · 선택 헬스장 -> 웬들러 설정 종목 추가` 클릭 플로우는 직접 확인 필요

## 완료한 작업

- 계획 파일: `docs/ai/features/2026-06-25-life-zone-npc-quest-bubble.md`
- 변경 파일:
  1. `assets/home/life-zone/ui/npc-quest-bubble.png`
  2. `home/life-zone.js`
  3. `style.css`
  4. `sw.js`
  5. `scripts/validate-life-zone-assets.py`
  6. `tests/home-life-zone-npc-quest.test.js`
  7. `docs/ai/features/2026-06-25-life-zone-npc-quest-bubble.md`
  8. `docs/ai/reviews/2026-06-25-life-zone-npc-quest-bubble-review.md`

- 실행 검증:
  1. PASS: `python scripts/validate-life-zone-assets.py`
  2. PASS: `node --check home/life-zone.js; node --check sw.js`
  3. PASS: `node --test tests/home-life-zone-npc-quest.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `node --test .\tests\*.test.js` — 518 tests passed
  6. PASS: `git diff --check`
  7. 리뷰: `docs/ai/reviews/2026-06-25-life-zone-npc-quest-bubble-review.md`
  8. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ bb8bf7e`
  9. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260625z59-life-zone-npc-quest" "home/life-zone.js::npc-quest-bubble.png" "home/life-zone.js::life-zone:npc-quest" "sw.js::assets/home/life-zone/ui/npc-quest-bubble.png"`
  10. PASS: 배포 URL의 `assets/home/life-zone/ui/npc-quest-bubble.png`가 HTTP 200, `192x258`, RGBA alpha `(0, 255)`, corner alpha 0으로 내려오며 로컬 파일과 SHA-256이 일치

## 이전 완료 흐름

- 계획 파일: `docs/ai/features/2026-06-25-workout-calendar-add-fab-click-fix.md`
- 변경 파일:
  1. `render-calendar.js`
  2. `style.css`
  3. `sw.js`
  4. `tests/workout-calendar-bottom-sheet.test.js`
  5. `tests/workout-empty-picker-density.test.js`
  6. cache version 참조 테스트들
  7. `docs/ai/features/2026-06-25-workout-calendar-add-fab-click-fix.md`
  8. `docs/ai/NEXT_ACTION.md`

- 실행 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-navigation-stack.test.js`
  3. PASS: `node --test .\tests\*.test.js` — 515 tests passed
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e119fca1e0398b56406dcaa729cc7c37469cd861`
  7. PASS: 배포 자산 마커에서 z58 cache, `_bindWorkoutHomeSheetActions`, `data-wt-day-add-session`, `_addWorkoutHomeSession(key)`, `touch-action: manipulation` 확인
  8. not verified yet: 인증 계정 실제 UI flow 확인 필요

## 이전 실행 기록

- 계획 파일: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md`
- 완료한 Slice 12:
  1. `render-calendar.js`에서 full sheet scroll lock과 sheet body touch boundary guard를 추가한다.
  2. full 상태의 아래 방향 drag release가 항상 `bar` 끝점으로 정착하도록 닫힘 latch를 강화한다.
  3. `style.css`에 full sheet scroll-lock과 내부 scroller momentum 정책을 추가한다.
  4. `tests/workout-calendar-bottom-sheet.test.js`에 scroll ownership/source contract 테스트를 추가한다.
  5. `sw.js` `CACHE_VERSION`을 bump한다.

- Slice 12 검증:
  1. PASS: `node --check app.js; node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
  3. PASS: 영향권 테스트 38개
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: 전체 Node 테스트 514개
  6. PASS: `git diff --check`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ d23ca4cd775936b4acdb53d662d7c71c8d22b8c2`
  8. PASS: 배포 asset marker에 `wt-workout-sheet-scroll-lock`, `WORKOUT_HOME_SHEET_DRAG_HARD_CLOSE_PX = 8`, `_bindWorkoutHomeSheetScrollGuard`, `[data-wt-day-sheet]`, z57 cache marker 반영
  9. not verified yet: 인증 계정 실제 UI flow 확인 필요

- Slice 12 리뷰:
  - `docs/ai/reviews/2026-06-25-workout-calendar-sheet-scroll-lock-review.md`

- 완료한 Slice 11:
  1. 운동탭 활성 상태에만 `body.wt-workout-tab-active` class 적용.
  2. 운동탭 활성 상태에서 root overscroll/pull-to-refresh 체인 차단.
  3. 최상단 아래 방향 touch gesture를 `handleWorkoutBack({ action: 'pull:back' })` 경로로 흡수.
  4. nested scroll 영역이 아직 위로 스크롤될 수 있으면 gesture를 가로채지 않도록 조건 추가.
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z56-workout-pull-back`로 bump.
  6. 진단/리뷰 문서 작성.

- 검증:
  1. PASS: `node --check app.js; node --check sw.js`
  2. PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
  3. PASS: `node --test .\tests\*.test.js` — 513 tests passed
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a8461e8`
  7. PASS: 배포 URL asset marker에서 z56 cache, `initWorkoutPullBackGesture`, `action: 'pull:back'`, `body.wt-workout-tab-active` 확인

## 직전 완료 흐름

- 계획 파일: `docs/ai/features/2026-06-25-workout-navigation-stack-redesign.md`
- 완료한 Slice 1-6:
  1. `workout/navigation-stack.js` 추가: `CalendarScreen`, `WorkoutRecordScreen`, `WorkoutDetailScreen` route stack, saved state, PWA history snapshot.
  2. `render-calendar.js` 바텀시트 상태를 navigation state와 동기화하고 record 진입을 `wtOpenWorkoutRecord()`로 교체.
  3. `app.js` 운동 탭 surface를 `calendar/record/detail`로 확장하고 record/detail 상태 보존 렌더 연결.
  4. `workout/exercises.js` detail screen 렌더와 운동 카드 detail 진입 추가.
  5. Capacitor `backButton` hook과 browser `popstate` 기반 PWA back 복원 추가.
  6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z44-workout-nav-stack`로 bump하고 새 runtime asset을 precache에 추가.

- 검증:
  1. PASS: `node --check app.js render-calendar.js workout/navigation-stack.js workout/exercises.js workout/index.js`
  2. PASS: `node --check workout/load.js; node --check render-workout.js; node --check sw.js`
  3. PASS: `node --test .\tests\*.test.js` — 512 tests passed
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ ad707121d63019be2f2f5bae181c89ce53fbd460`
     - 결과: `[deploy-verify] ok ad707121d630 tomatofarm-v20260625z44-workout-nav-stack static=215`
  7. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "workout/navigation-stack.js::WORKOUT_ROUTES" "app.js::enableWorkoutPwaHistory" "render-calendar.js::wtOpenWorkoutRecord" "index.html::wt-exercise-detail-root" "sw.js::tomatofarm-v20260625z44-workout-nav-stack"`

- 리뷰:
  - `docs/ai/reviews/2026-06-25-workout-navigation-stack-redesign-review.md`

- 남은 수동 확인:
  1. 배포 URL에서 인증 계정으로 `운동 탭 -> 날짜 클릭 -> BottomSheet -> 운동 진입 -> 운동 상세 -> Android/PWA back 순서` 확인.

## 이전 실행 기록

- 계획 파일: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md`
- 완료한 Slice 1:
  1. 운동 홈 월간 렌더에서 기존 `.cal-workout-day-bar`를 헤더로 쓰는 `.cal-workout-day-sheet` 렌더
  2. 날짜 클릭/오늘 상세/닫기 상태 전환을 하단 시트 기준으로 정리
  3. 날짜 클릭 시 `bar -> full`로 올라오는 애니메이션 적용
  4. 시트 handle pointer drag로 `bar`/`mid`/`full` 상태 전환 구현
  5. sheet 내부 상세 본문과 회차/session action bar CSS 조정
  6. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 1 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 3d76b141d0a47b4d60af24e5fc07e147269808f9`
  7. PASS: 배포 URL 브라우저 접근 시 최신 앱이 열리고 로그인 화면이 표시되는 것을 확인
  8. not verified yet: 로그인 화면에 막혀 인증 계정의 `운동 탭 -> 날짜 탭 -> 하단 시트 표시 -> handle 위/아래 드래그 -> + 버튼` UI flow 직접 조작은 미완료

- 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-review.md`

- 완료한 Slice 2:
  1. 접힌 sheet 높이를 절반 수준으로 줄이고 한 행 compact bar로 조정
  2. 좌측 위 화살표에 glow/pulse affordance 추가
  3. 날짜/화살표 영역 drag hit area 허용, `오늘`/`루틴` action만 drag 제외
  4. drag 후 click이 상태를 되돌리지 않도록 suppress guard 추가
  5. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 2 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0f061f103c69150688c80e284ce5b53ae54c601a`
  7. not verified yet: 인증 계정 실제 drag UI flow 확인 필요

- Slice 2 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-compact-review.md`

- 다음 Slice 3:
  1. 위 방향 drag/key step을 거리와 무관하게 `full`로 정착
  2. 아래 방향 drag/key step은 `bar`로 접기
  3. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신
  4. 정적 검증, 리뷰, Dashboard3 Pages 배포 검증

- Slice 3 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-full-open-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a65721dbb3e6423206d505118ead185c7c6f2926`
  8. PASS: 배포 URL HTTP 200, `sw.js` cache version `tomatofarm-v20260624z37-workout-day-sheet-full-open`, `render-calendar.js` full 전이/`12px` threshold 확인
  9. not verified yet: 로그인 화면에 막혀 인증 계정 실제 drag UI flow 확인 필요

- Slice 3 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-full-open-review.md`

- 다음 Slice 4:
  1. 드래그 후 click suppression을 1회성 boolean에서 timestamp window 방식으로 변경
  2. suppression window 동안 여러 지연 click을 모두 무시
  3. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신
  4. 정적 검증, 리뷰, Dashboard3 Pages 배포 검증

- Slice 4 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-drag-lock-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 684c6fc2025dbf20f3be4c52ab14b41cc6528831`
  8. not verified yet: 로그인 화면에 막혀 인증 계정 실제 drag UI flow 확인 필요

- Slice 4 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-drag-lock-review.md`

- 다음 Slice 5:
  1. drag release target을 거리/속도 기반 snap resolver로 결정
  2. `bar`에서 위 방향은 쉽게 열고, `full`에서 아래 방향은 의도적 제스처에서만 접기
  3. 열린 상태의 동일 날짜 탭 no-op 처리
  4. sheet grip affordance와 열린 상태 arrow pulse 정리
  5. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 5 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-snap-ux-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b872a13e4f24c3460df45e1ef01e553728602709`
  8. not verified yet: 로그인 화면에 막혀 인증 계정 실제 drag UI flow 확인 필요

- Slice 5 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-snap-ux-review.md`

- 다음 Slice 6:
  1. `bar` 상태에서 drag 가능한 전체 확장 거리의 10% threshold 계산
  2. 위로 10%를 넘으면 drag preview를 즉시 full 높이로 표시
  3. release snap도 동일한 10% 기준으로 full 선택
  4. 아래 방향 속도만으로 닫히지 않도록 collapse는 `max(220px, dragTravel * 0.35)` 거리 기준으로 제한
  5. 작은 pointer move 뒤 release가 snap 기준 미만이어도 후속 click이 header toggle로 오인되지 않게 suppress
  6. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 6 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-open-10pct-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ d6606731f076a0ba8540c6b2b82d6f570e2417f0`
  8. PASS: 배포 URL의 `build-info.json`, `sw.js`, `render-calendar.js`가 `d6606731f076`, z40 cache, 10% open ratio, `hasMoved` click suppression, velocity-close 제거를 반환
  9. not verified yet: 로그인 화면에 막혀 인증 계정 실제 drag UI flow 확인 필요

- Slice 6 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-open-10pct-review.md`

- 다음 Slice 7:
  1. open threshold를 full 확장 거리 기준에서 접힌 bar 높이 기준 10%로 변경
  2. `bar`에서 위 방향 drag가 threshold를 넘으면 `openLatched` 고정
  3. release snap에서 `openLatched`가 true면 무조건 `full` 선택
  4. `full` 시작 drag는 latch하지 않아 큰 아래 drag로 닫기 유지
  5. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 7 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-open-latch-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ bda8fd26b49e731fc43807844b737ed155fa7ed6`
  8. PASS: 배포 URL의 `build-info.json`, `sw.js`, `render-calendar.js`가 `bda8fd26b49e`, z41 cache, bar-height 10% open threshold, `openLatched`, velocity-close 제거를 반환
  9. not verified yet: 로그인 화면에 막혀 인증 계정 실제 drag UI flow 확인 필요

- Slice 7 리뷰:
  - `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-open-latch-review.md`

- 다음 Slice 8:
  1. full sheet 높이에 상단 clearance를 적용해 날짜/오늘/루틴 헤더가 앱 상단 아래로 드러나게 변경
  2. 열린 상태 화살표를 파란 아래 방향 affordance로 변경
  3. 하단 회차 bar의 연필 편집 버튼 제거
  4. `+` 운동 추가 버튼을 우측 하단 floating button으로 복구
  5. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 8 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-fab-reveal-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 1fca224816f59b9bce1257bcf2c652d4dd065fcd`
  8. PASS: 배포 URL의 `render-calendar.js`, `style.css`, `sw.js`가 `wt-day-fab`, `WORKOUT_HOME_SHEET_FULL_CLEARANCE_PX`, `--wt-day-sheet-full-clearance: 112px`, `wt-sheet-arrow-pulse-down`, z42 cache marker를 반환
  9. not verified yet: 로그인 화면에 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet full/open-close/add` UI flow 확인 필요

- Slice 8 리뷰:
  - `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-fab-reveal-review.md`

- 다음 Slice 9:
  1. drag release snap을 raw pointer 좌표가 아니라 clamp된 preview 이동량 기준으로 변경
  2. full 시작 아래 방향 drag에 `closeLatched` 추가
  3. close threshold를 handle drag에 맞는 작은 거리로 조정
  4. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 9 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-drag-settle-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ da94c74f943735f54c04ef74199da060c3939c26`
  8. PASS: 배포 URL의 `render-calendar.js`, `sw.js`가 `closeLatched`, `lastDragY`, `const dy = lastDragY`, z43 cache marker를 반환
  9. not verified yet: 로그인 화면에 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet drag up/down settle` UI flow 확인 필요

- Slice 9 리뷰:
  - `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-drag-settle-review.md`

- 이전 계획 파일: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`
- 완료한 Slice 4:
  1. picker 목록 상태에서 상단 탭을 `분류 + 부위 탭` 구조로 동적 렌더링
  2. 목록 내부 `필터 적용` 배너와 부위/헬스장 필터 스택 제거
  3. 목록 상단에 `최근`/`빈도`/`이름` 정렬과 `전체`/`즐겨찾기`/`커스텀` 범위 컨트롤 추가
  4. 캐시 기반 `총 n번, n일 전` 메타와 정렬 통계 추가
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z16-picker-filter-layout`로 bump

- 검증:
  1. PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
  2. PASS: `node scripts/verify-runtime-assets.mjs`
  3. PASS: `git diff --check`
  4. PASS: `docs/ai/reviews/2026-06-24-exercise-picker-filter-layout-review.md`
  5. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 9594418`
  6. not verified yet: 로그인 화면에 막혀 운동 picker 필터 UI 클릭 흐름은 인증 계정으로 확인 필요

- 완료한 Slice 5:
  1. `style.css`에서 오늘 운동 카드 헤더가 줄바꿈 가능한 레이아웃이 되도록 수정
  2. 운동명 최소 폭과 `word-break: keep-all` 적용
  3. 스파크라인을 헤더 다음 줄 전체 폭으로 이동
  4. `tests/workout-card-layout-css.test.js` 회귀 테스트 추가
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z17-workout-card-header`로 bump

- Slice 5 검증:
  1. PASS: `node --test tests/workout-card-layout-css.test.js`
  2. PASS: `node --check sw.js`
  3. PASS: `node scripts/verify-runtime-assets.mjs`
  4. PASS: `git diff --check`
  5. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ c682986`
  6. PASS: 배포 URL의 `style.css`에 카드 헤더 회귀 수정 CSS가 포함된 것을 확인
  7. not verified yet: 로그인 화면에 막혀 운동 추가 후 카드 UI 클릭 흐름은 인증 계정으로 확인 필요

- Slice 5 추가 하드닝:
  1. `workout/exercises.js` 일반 운동 카드 DOM에서 `${sparkline}`을 `ex-block-header` 밖으로 이동
  2. `style.css`에 `ex-block-trend` 행 스타일 추가
  3. `tests/workout-card-layout-css.test.js`에 DOM source check 추가
  4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z18-workout-card-trend-row`로 bump
  5. PASS: `node --check workout/exercises.js; node --check sw.js; node --test tests/workout-card-layout-css.test.js`
  6. PASS: `node scripts/verify-runtime-assets.mjs`
  7. PASS: `git diff --check`
  8. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ f44e832`
  9. PASS: 배포 URL의 `workout/exercises.js`, `style.css`, `sw.js`에 DOM 분리와 z18 캐시 버전 반영 확인

- 완료한 Slice 6:
  1. `modals/ex-picker-modal.js`에 picker footer와 `#ex-picker-done` 추가
  2. `workout/exercises.js` row 선택 handler에서 즉시 닫기 제거
  3. 선택된 row는 `already`/`✓`로 표시하고 완료 버튼 활성화
  4. `tests/ex-picker-selection-flow.test.js` 추가
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z19-picker-staged-done`으로 bump

- Slice 6 검증:
  1. PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
  2. PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node scripts/verify-runtime-assets.mjs`
  4. PASS: `git diff --check`
  5. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 3de3708`
  6. PASS: 배포 URL의 `modals/ex-picker-modal.js`, `workout/exercises.js`, `sw.js`에 `ex-picker-done`, `_syncPickerDoneButton`, `tomatofarm-v20260624z19-picker-staged-done` 반영 확인
  7. not verified yet: 배포 브라우저는 로그인 화면에 막혀 `운동 탭 -> + -> 가슴 -> row tap -> picker 유지 -> 완료` UI 클릭 흐름은 인증 계정으로 확인 필요
- 완료한 Slice 3:
  1. `assets/workout/muscles/*.png` 8개를 `384x288` RGBA 투명 PNG로 교체
  2. 기존 파일명/경로 유지
  3. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z15-sharp-muscle-assets`로 bump
  4. `docs/ai/reviews/2026-06-24-exercise-picker-assets-sharp-review.md` 작성

- 검증:
  1. PASS: PNG 8개 크기 `384x288`, 모드 `RGBA`, 모서리 alpha 0 확인
  2. PASS: `node --check sw.js`
  3. PASS: `node scripts/verify-runtime-assets.mjs`
  4. PASS: `git diff --check`
  5. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 562a572`
  6. PASS: 배포 URL의 `assets/workout/muscles/*.png` 8개가 모두 `384x288` RGBA 파일로 내려오는 것을 확인
  7. not verified yet: 로그인 화면에 막혀 운동 picker 분류 화면의 시각 상태는 인증 계정으로 확인 필요

- 이전 완료 흐름:
  - 계획 파일: `docs/ai/features/2026-06-23-stats-muscle-fatigue-render.md`
- 완료한 Slice 2:
  1. `render-stats.js` 근육 활성 기간을 `주별`/`월별`로 제한
  2. 활성 부위만 렌더링하고, 다색 그룹 색상 대신 붉은색 단일 intensity 값 적용
  3. `style.css` 근육 활성 카드 레이아웃/텍스트 가시성 복구
  4. `sw.js` `CACHE_VERSION` bump
  5. `workoutSessions` 기반 다회차 운동 기록도 근육 활성 계산에 반영
  6. 정적 검증 및 리뷰 완료

- 검증:
  1. PASS: `node --check render-stats.js`
  2. PASS: `node --check sw.js`
  3. PASS: red-only source check — `render-stats.js`에 이전 다색 hex 및 `일별` 출력 없음
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e2f2a99`
  7. PASS: 배포된 `render-stats.js`에 `getWorkoutSessions`, red tint, 활성 부위 빈 상태 문구가 있고 `label: '일별'`은 없음
  8. not verified yet: 로그인 화면에 막혀 더보기 → 통계 → 운동 활성 부위 카드 UI 클릭 흐름은 인증 계정으로 확인 필요

- 함께 배포된 이전 Slice:
  1. `docs/ai/features/2026-06-24-exercise-picker-category-entry.md` Slice 2 우하단 `+` 직접 picker 진입
  2. 첨부 이미지 기반 `assets/workout/muscles/*.png` 추가
  3. picker 분류 타일 이미지 자산 적용 및 `sw.js` `CACHE_VERSION` bump

- 완료한 Slice 1:
  1. `modals/ex-picker-modal.js` 상단 구조를 전체 화면형 검색/탭/추가 버튼 레이아웃으로 변경
  2. `workout/exercises.js`에 picker view 상태, 분류 화면, 부위 타일 drilldown, 전체/커스텀 목록 전환 추가
  3. `style.css`에 전체 화면 picker, 탭, 부위 그리드, 모바일 레이아웃 스타일 추가
  4. `sw.js` `CACHE_VERSION` bump

- 검증:
  1. PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
  2. PASS: `node scripts/verify-runtime-assets.mjs`
  3. PASS: `git diff --check`
  4. PASS: `docs/ai/reviews/2026-06-24-exercise-picker-category-entry-review.md`
  5. not verified yet: Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` 필요
  6. not verified yet: 운동 탭 → 오늘 운동 화면 → 우측 하단 `+` → 분류 첫 화면 → 부위 타일 선택 → 해당 부위 운동 목록 → 운동 추가 UI flow는 배포 URL에서 확인 필요

## 이전 흐름 요약

- 이전 홈 라이프존 Slice 9:
  1. `home/life-zone-state.js`에 actor owner id 후보와 `readAccountId` 추가
  2. `home/life-zone.js`에서 이웃 actor의 오늘 문서를 owner id 후보로 읽도록 보정
  3. 방금 입력한 기록이 바로 반영되도록 라이프존 actor 상태 캐시 비활성화
  4. `tests/home-life-zone-state.test.js`에 줍스 식단-only 상태 회귀 테스트 추가
  5. `sw.js` `CACHE_VERSION` bump
  6. `docs/ai/reviews/2026-06-23-home-life-zone-diet-read-review.md` 작성

- 방금 완료한 Slice 8:
  1. `home/life-zone-state.js`에서 `workoutDuration > 0`을 운동 활동으로 판정
  2. `tests/home-life-zone-state.test.js`에 운동 시간만 입력된 날의 라이프존 회귀 테스트 추가
  3. `sw.js` `CACHE_VERSION` bump
  4. `docs/ai/reviews/2026-06-23-home-life-zone-duration-review.md` 작성

- 방금 완료한 Slice 7:
  1. `style.css` `.lz-speech` 배경을 반투명 흰색으로 변경
  2. `style.css` `.lz-speech`에 `backdrop-filter` 추가
  3. `sw.js` `CACHE_VERSION` bump

- 방금 완료한 Slice 6:
  1. `home/life-zone-state.js`에 운동/식단/업무 말풍선 문구 생성 로직 추가
  2. `home/life-zone.js`에서 actor sprite 위 말풍선 렌더링 추가
  3. `style.css`에 `.lz-speech` 스타일 추가
  4. `tests/home-life-zone-state.test.js`에 대근육/식단 말풍선 테스트 추가
  5. `sw.js` `CACHE_VERSION` bump
  6. `docs/ai/reviews/2026-06-23-home-life-zone-speech-review.md` 작성

- 방금 완료한 Slice 5:
  1. `scripts/make-life-zone-base-alpha.py`에서 anti-aliased outline 생성으로 변경
  2. `assets/home/life-zone/base-room-alpha.png` 재생성
  3. `style.css` `.lz-base`를 `image-rendering:auto`로 변경
  4. `docs/pixel-life-zone-mockup.html` base preview 렌더링 변경
  5. `scripts/validate-life-zone-assets.py` outline 검증 기준 변경
  6. `sw.js` `CACHE_VERSION` bump
  7. `docs/ai/reviews/2026-06-23-home-life-zone-soft-border-review.md` 작성

- 방금 완료한 Slice 3:
  1. `home/hero.js`에서 랭킹 렌더링 대상을 상위 5명으로 제한
  2. `sw.js` `CACHE_VERSION` bump
  3. `docs/ai/reviews/2026-06-23-home-ranking-top5-review.md` 작성

- 방금 완료한 Slice 2:
  1. `home/hero.js`에서 랭킹 참가자 소스를 전체 계정으로 변경
  2. 누적/주간 모두 전체 계정의 기록을 읽어 계산
  3. `sw.js` `CACHE_VERSION` bump
  4. `docs/ai/reviews/2026-06-23-home-ranking-all-accounts-review.md` 작성

- 방금 완료한 Slice:
  1. `index.html`에서 함께 축하해요 카드와 길드 카드를 제거하고 랭킹 UI를 `랭킹`/`누적·주간`으로 변경
  2. `home/index.js`에서 공용 축하 카드와 홈 길드 카드 렌더 호출 제거
  3. `home/hero.js`에서 랭킹 상태를 `cumulative/weekly`로 전환하고 선택값 저장
  4. `sw.js` `CACHE_VERSION` bump
  5. `docs/ai/reviews/2026-06-23-home-ranking-cleanup-review.md` 작성

## 이전 완료 항목

- 계획 파일: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 방금 완료한 Slice 0:
  1. `assets/home/life-zone/base-room.png`
  2. `assets/home/life-zone/sprites/*.png` 27개
  3. `assets/home/life-zone/manifest.json`
  4. `scripts/process-life-zone-sprites.py`
  5. `docs/pixel-life-zone-mockup.html`
- 방금 완료한 Slice 1:
  1. `home/life-zone-state.js`
  2. `home/life-zone.js`
  3. `home/tomato.js`
  4. `style.css`
  5. `sw.js`
  6. `tests/home-life-zone-state.test.js`
  7. `assets/home/life-zone/base-room-alpha.png`
  8. `scripts/make-life-zone-base-alpha.py`
- 다음 실행 후보:
  1. 계정 id 고정 매핑: `줍스`, `문정토마토`, `이재헌`의 실제 account id를 roster에 반영
  2. Slice 4: 저장 시점 activity snapshot으로 "방금 올림/방금 운동함" 최근성 반영
  3. 운동 모션 실험: lat pulldown 2프레임 sprite를 만들고 낮은 비용의 frame animation으로 검증

## 보류 중 (이전 흐름)

- `docs/ai/features/2026-06-23-pixel-life-zone-mockup.md` — bitmap 생성/정적 검증 완료, HTTP/UI 시각 검증은 not verified yet.
- `docs/ai/features/2026-06-12-test-mode-simplify-wendler.md` — v1 개편 실행 완료(커밋 2922b64까지), 리뷰 미수행. **v2 구현으로 v1은 동결 상태** — 해당 리뷰는 폐기 권장.
- `docs/ai/features/2026-06-20-calendar-workout-tab.md` — Slice 1 구현, 리뷰, tomatofarm 원격 배포 완료. 후속 Slice 2는 로컬 정적 검증 완료, 브라우저 UI 플로우는 not verified yet.
- `docs/ai/features/2026-06-20-growth-board-wendler-default-history.md` — 로컬 정적 검증 완료, 브라우저 UI 플로우는 not verified yet.

## 상태값

- `idle`: 진행 중인 자동 액션 없음
- `needs_user_decision`: 사용자 결정이 필요함
- `ready_for_execution`: 다음 실행 슬라이스를 바로 진행
- `ready_for_review`: 직전 실행 결과를 바로 리뷰
- `ready_for_fix`: 리뷰에서 발견된 문제만 바로 수정
- `complete`: 현재 계획 완료

## 자동 진행 규칙

- 세션 시작 시 이 파일을 먼저 읽는다.
- 사용자가 "계속", "다음", "진행", "리뷰해", "해줘"처럼 짧게 말하면 이 파일의 `다음 액션`을 실행한다.
- 사용자가 새로운 요청을 명시하면 새 요청이 우선한다. 단, 기존 대기 액션과 충돌하면 어느 흐름을 계속할지 한 번만 확인한다.
- 계획 세션 종료 후 차단 질문이 없으면 `ready_for_execution`으로 갱신한다.
- 실행 세션 종료 후 `ready_for_review`로 갱신한다.
- 리뷰 세션 종료 후 문제가 있으면 `ready_for_fix`, 문제가 없고 다음 슬라이스가 있으면 `ready_for_execution`, 모든 슬라이스가 끝났으면 `complete`로 갱신한다.
- 다음 프롬프트나 리뷰 프롬프트를 사용자에게 복붙하라고 요구하지 않는다. 필요한 프롬프트 내용은 계획 문서와 이 파일에 남기고 에이전트가 직접 읽어 진행한다.

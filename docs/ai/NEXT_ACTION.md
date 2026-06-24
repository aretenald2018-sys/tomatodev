# 다음 자동 액션

## 현재 상태

- 상태: `complete`
- 계획 문서: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md`
- 현재 단계: `reviewed — Slice 4 keep opened sheet from collapsing after drag`
- 마지막 완료: `드래그 release 뒤 지연 click이 sheet를 다시 접지 못하도록 click suppression을 timestamp window 방식으로 강화하고 리뷰까지 완료했다.`
- 다음 액션: `Dashboard3 Pages 배포 검증과 인증 계정 실제 drag UI flow 확인을 진행한다.`
- 차단 사유: `없음`

## 다음 실행 대상

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
  7. not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 drag UI flow 확인 필요

- Slice 4 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-drag-lock-review.md`

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

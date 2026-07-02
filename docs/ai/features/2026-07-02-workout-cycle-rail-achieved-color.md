# 운동 캘린더 좌측 목표 달성 색상 강조

## 요청

운동 탭에서 좌측에 있는 목표를 그 주에 달성했을 경우 더 채도가 높은 파란색으로 칠한다.

## 그릴 결과

- 핵심 질문: "그 주에 달성"을 어떤 기준으로 판정할 것인가?
- 코드 기반 결정: 기존 `workoutRecordsForBenchmarkWeek()`가 연결하는 같은 벤치마크 운동 기록 중 해당 주 best set의 `kg`와 `reps`가 레일 목표 `kg/reps` 이상이면 달성으로 본다.
- 이유: 운동 탭 레일 목표는 `buildExerciseProgramWorkoutPrescription()`의 주차별 처방에서 나오므로, 같은 처방 기준으로 실제 기록을 비교해야 성장보드/운동 기록 흐름과 어긋나지 않는다.
- 남은 가정: 인증 계정이 없어 실제 배포 UI 클릭 흐름은 로그인 화면에 막힐 수 있다. 이 경우 정적/회귀 테스트와 Dashboard3 Pages marker 검증을 수행하고, 실제 UI flow는 `not verified yet`으로 남긴다.

## Slice 1 - 좌측 목표 달성 카드만 선명한 파란색 적용

### 포함

- `render-calendar.js`의 workout-home cycle rail item 생성 시 주간 목표 달성 여부를 계산한다.
- 달성한 item에는 `is-achieved` 클래스를 렌더하고 `title`/`aria-label`에도 달성 상태를 반영한다.
- `style.css`에서 `.cal-cycle-branch.is-achieved`를 기존 연한 청회색보다 채도가 높은 파란색으로 칠한다.
- `tests/workout-calendar-bottom-sheet.test.js`에 달성 판정/class/CSS marker 회귀 테스트를 추가한다.
- `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- 성장보드 데이터 모델, cycle/step 계산, 웬들러 처방 산식 변경.
- 목표 설정 시트, 운동 기록 저장 schema, 하단 day sheet 동작 변경.
- 좌측 레일 레이아웃/폭/클릭 동작 변경.
- `www/` 직접 수정.
- `tomatofarm` remote 배포.

## 예상 변경 파일

- `render-calendar.js`
- `style.css`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/reviews/2026-07-02-workout-cycle-rail-achieved-color-review.md`

## 검증 계획

- `node --check render-calendar.js`
- `node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test --test-reporter=dot tests/*.test.js`
- `git diff --check`
- 커밋 후 `git push origin main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 marker 확인:
  - `render-calendar.js`의 `isAchieved` / `cal-cycle-branch is-achieved`
  - `style.css`의 `.cal-cycle-branch.is-achieved`
  - `sw.js`의 새 `CACHE_VERSION`

## 다음 실행 프롬프트

`docs/ai/features/2026-07-02-workout-cycle-rail-achieved-color.md` Slice 1을 실행한다.

## 실행 결과

- `render-calendar.js`에서 `workoutRecordsForBenchmarkWeek()`를 사용해 해당 주 best set이 목표 `kg/reps` 이상인지 계산하는 `_cycleRailGoalStatus()`를 추가했다.
- workout-home month grid가 `cache`를 cycle rail item 생성에 전달하도록 연결했다.
- 달성한 좌측 목표 button에 `is-achieved` class를 붙이고, `title`/`aria-label`에는 `달성 nkg x n회` 상태를 덧붙였다.
- `style.css`에서 `.cal-cycle-branch.is-achieved`를 기존 연한 청회색보다 선명한 파란색(`#2f7df4`)과 흰색 텍스트로 표시하도록 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z2-workout-rail-achieved-blue`로 bump했다.
- `tests/workout-calendar-bottom-sheet.test.js`와 cache-version marker 테스트들을 새 달성 class/cache version에 맞게 갱신했다.

## 검증 결과

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 19 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: 구현 커밋 `242cf4b fix: highlight achieved workout rail goals`를 `origin/main`에 push했다.
- PASS: Dashboard3 Pages 배포 검증 - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 242cf4b` -> `[deploy-verify] ok 242cf4b8a0e8 tomatofarm-v20260702z2-workout-rail-achieved-blue static=236`
- PASS: Dashboard3 Pages marker 검증 - `sw.js` cache version, `render-calendar.js` `_cycleRailGoalStatus`/`workoutRecordsForBenchmarkWeek`/`is-achieved`, `style.css` `.cal-cycle-branch.is-achieved`/`background: #2f7df4`
- not verified yet: 인증 계정 실제 `운동 탭 -> 월간 캘린더 좌측 목표 달성 색상` UI flow 확인은 아직 남아 있다.

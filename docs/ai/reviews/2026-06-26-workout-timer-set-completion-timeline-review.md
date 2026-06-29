# 운동 타이머 세트 완료 타임라인 전환 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-26-workout-timer-set-completion-timeline.md`
- 구현 커밋: `7c59ab3`
- 핵심 변경:
  - `workout/timeline.js`
  - `workout/exercises.js`
  - `workout/timers.js`
  - `workout/save.js`
  - `workout/load.js`
  - `workout/sessions.js`
  - `render-calendar.js`
  - `data/data-load.js`
  - `data/data-pure.js`
  - `home/life-zone-state.js`
  - `sw.js`
  - 관련 테스트 파일

## 발견된 문제

없음.

## 확인한 동작

- 세트 완료 체크 시 `completedAt`이 기록되고, 체크 해제 또는 kg/reps 수정으로 미완료가 되면 timestamp가 제거된다.
- 근력 운동 시간은 live stopwatch elapsed가 아니라 완료 세트들의 첫 완료 시각부터 마지막 완료 시각까지의 span으로 계산된다.
- 한 세트만 완료한 경우 기록은 남지만 span은 0초로 유지된다.
- timestamp가 없는 과거 기록은 기존 `workoutDuration`을 fallback으로 사용한다.
- 세션 집계, active draft, 저장 payload, 캘린더 집계, life-zone 활동 판정이 `workoutTimeline`을 보존한다.
- `sw.js`는 새 런타임 모듈 `./workout/timeline.js`를 precache하고 캐시 버전이 bump됐다.

## 검증

- PASS: `node --check workout/timeline.js; node --check workout/exercises.js; node --check workout/timers.js; node --check workout/save.js; node --check workout/load.js; node --check workout/sessions.js; node --check workout/state.js; node --check render-calendar.js; node --check data/data-load.js; node --check data/data-pure.js; node --check home/life-zone-state.js; node --check sw.js`
- PASS: `node --test .\tests\*.test.js` - 545 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- PASS: `git diff --cached --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 7c59ab3`
  - 결과: `[deploy-verify] ok 7c59ab3c099f tomatofarm-v20260626z8-set-completion-timeline static=219`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z8-set-completion-timeline" "workout/timeline.js::buildWorkoutSetTimeline" "workout/exercises.js::stampSetCompletedAt(set)" "workout/timers.js::syncWorkoutTimeline(S.workout)" "workout/save.js::workoutTimeline" "render-calendar.js::buildWorkoutSetTimeline"`

## 남은 리스크

- not verified yet: 인증 계정 세션이 없어 배포 URL에서 `운동 탭 -> 세트 여러 개 체크 -> 저장 -> 월간 캘린더 시간 반영` 실제 UI flow는 직접 조작하지 못했다.

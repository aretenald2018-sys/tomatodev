# 2026-07-07 운동 세트 간 쉬는시간 원형 카운터 리뷰

## 판정

- 로컬 구현/정적 검증: PASS
- 브라우저 시각 QA: PASS
- production Pages 배포 검증: not verified yet

## 범위

계획 `docs/ai/features/2026-07-07-workout-rest-counter.md` Slice 1 기준으로 다음을 검토했다.

- 운동 화면 쉬는시간 표시를 초록 원형 카운터로 변경
- 시간 초과 후 `+m:ss` 증가 카운팅 유지
- 카운터 더블클릭으로 휴식시간 변경 sheet 연결
- 세트별 휴식 메타 저장
- `restBetweenSets` top-level workout payload 추가
- `전체통계` raw export에서 `daily[].raw.workout.restBetweenSets` 추출 가능
- `sw.js` cache version bump

## 변경 파일

- `index.html`
- `style.css`
- `workout/state.js`
- `workout/timers.js`
- `workout/exercises.js`
- `workout/save.js`
- `workout/save-schema.js`
- `tests/workout-rest-counter.test.js`
- `tests/save-schema.test.js`
- `tests/stats-raw-export-download.test.js`
- `sw.js`
- `build-info.json`
- `.omo/evidence/rest-counter-20260707/*`
- `.omo/ulw-loop/rest-counter-20260707/*`

## 검증

- PASS: `node --test tests/workout-rest-counter.test.js`
- PASS: `node --test tests/workout-rest-counter.test.js tests/save-schema.test.js tests/stats-raw-export-download.test.js`
- PASS: `node --check workout/timers.js workout/exercises.js workout/save.js workout/save-schema.js workout/state.js render-stats.js`
- PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=898`
- PASS: `git diff --check`
- PASS: localhost browser harness at `390x844` - `#wt-rest-section` visible, green circular ring, `#wt-rest-time = 0:58`, no counter/control overlap, cleanup confirmed
- PASS: final focused rerun `node --test tests/workout-rest-counter.test.js tests/save-schema.test.js tests/stats-raw-export-download.test.js` - 66 pass
- evidence: `.omo/evidence/rest-counter-20260707/rest-counter-red-green.txt`
- evidence: `.omo/evidence/rest-counter-20260707/static-verify.txt`
- evidence: `.omo/evidence/rest-counter-20260707/rest-counter-browser-pass.png`
- evidence: `.omo/evidence/rest-counter-20260707/rest-counter-browser-action-log.json`

## 리뷰 결과

- PASS: 기존 `workout/timers.js` rest timer 흐름을 재사용했고 별도 타이머 시스템을 만들지 않았다.
- PASS: 세트 완료 시 `entryIdx`, `setIdx`, 운동명, 세트 번호를 타이머 origin으로 넘기며 저장 전에 세트 메타가 기록된다.
- PASS: 다음 세트 시작, skip, restart, finish에서 휴식 기록이 finalize되어 `restElapsedSec`와 `restOverSec`가 남는다.
- PASS: 완료 취소 시 해당 세트의 휴식 메타를 삭제한다.
- PASS: `restBetweenSets`가 `WORKOUT_PAYLOAD_KEYS`에 포함되어 기존 `buildStatsRawExport()` 경로로 raw export에 들어간다.
- PASS: `index.html`, `style.css`, `workout/*.js`, `workout/save-schema.js`가 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 `tomatofarm-v20260707z17-rest-counter`로 bump했다.
- PASS: `file://` harness 차단 후 임시 localhost harness로 재검증했다. 모바일 뷰포트에서 초록 원형 카운터, `0:58` 텍스트, 더블클릭 handler attribute, 컨트롤 비겹침을 DOM과 스크린샷으로 확인했다.
- WARN: `tests/workout-rest-counter.test.js`는 현재 DOM 런타임 fake timer가 아니라 정적 계약 테스트 중심이다. 브라우저 하네스가 시각/레이아웃 근거를 보강한다.
- BLOCKED: 워크트리에 unrelated staged/unstaged 변경이 많아 production Pages 배포/검증은 수행하지 않았다.
- BLOCKED: `review-work`의 5-agent orchestration은 현재 sub-agent 도구 정책상 사용자가 명시적으로 병렬 에이전트 작업을 요청하지 않으면 spawn이 금지되어 실행하지 않았다.

## 다음 액션

1. 사용자가 로컬에서 `npm.cmd run dev`로 실행 후 운동 화면에서 세트 완료를 눌러 원형 카운터와 더블클릭 sheet를 직접 확인한다.
2. unrelated 작업트리를 정리한 뒤 production deploy가 가능해지면 `origin/main`에 배포하고 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`를 실행한다.
3. 배포 URL에서 인증된 상태로 `운동 -> 세트 완료 -> 쉬는시간 카운터 -> 더블클릭 휴식시간 변경 -> 전체통계 다운로드` flow를 exercise한다.

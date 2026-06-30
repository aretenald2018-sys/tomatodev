# 운동 picker 유산소 수기 입력 계획

## 그릴 결과

- 핵심 질문: 첨부 화면의 `런닝/조깅` GPS 진입과 별도로, 속도와 시간을 손으로 넣는 진입점이 필요한가?
- 답변/결정: 필요하다. 기존 `런닝/조깅`은 GPS 러닝 세션을 유지하고, picker 분류 화면에 `유산소` 버튼을 추가한다.
- 남은 가정: 수기 입력 유산소는 기존 러닝 저장 schema를 재사용한다. 사용자가 입력한 `km/h`와 `분`은 거리, 페이스, 칼로리 요약으로 환산해 저장한다.

## 문제

운동 picker 분류 화면에는 GPS 러닝용 `런닝/조깅` 타일만 있다. 사용자가 실내 트레드밀이나 수동 기록처럼 `몇 km/h로 몇 분 걷거나 뛰었는지`만 입력하려면 GPS 세션을 시작해야 해서 흐름이 맞지 않는다.

## Slice 1: picker 유산소 수기 입력

### 범위

1. `workout/exercises.js`
   - picker 분류 화면에 `유산소` activity tile을 추가한다.
   - `유산소` 클릭 시 picker 내부에서 수기 입력 sheet/form을 연다.
   - 입력 항목은 걷기/뛰기 모드, 속도 `km/h`, 시간 `분`으로 제한한다.
   - 저장 시 기존 `S.workout.runData`에 `source: 'manual-cardio'`, 거리, 시간, 페이스, `routeSummary`를 채우고 `saveWorkoutDay({ silent: true })`를 호출한다.
2. `render-calendar.js`
   - `manual-cardio` 기록을 상세 카드에서 `유산소`/`걷기`로 읽히게 하고, 속도 `km/h` metric을 보여준다.
3. `style.css`
   - 유산소 tile과 수기 입력 sheet/form 스타일을 추가한다.
4. `tests/`
   - picker tile/form/save marker 테스트와 상세 카드 속도 metric 테스트를 갱신한다.
5. `sw.js`
   - `STATIC_ASSETS` 대상 파일을 수정하므로 `CACHE_VERSION`을 bump한다.

### 제외

- GPS 러닝 세션 UI/저장 흐름 변경.
- 러닝 통계 화면 재설계.
- 새 Firestore top-level schema 필드 추가.
- 식단/칼로리 목표 정책 변경.

## 검증

1. `node --check workout/exercises.js; node --check render-calendar.js; node --check sw.js`
2. `node --test tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js tests/pwa-update-auto-reload.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. 배포 검증: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 실행 결과

- 완료: picker 분류 화면에 기존 `런닝/조깅`과 별개인 `유산소` activity tile을 추가했다.
- 완료: `유산소` tile은 picker 내부 하단 sheet를 열고, 걷기/뛰기 모드, 속도 `km/h`, 시간 `분`을 입력받는다.
- 완료: 저장 시 `PICKER_MANUAL_CARDIO_SESSION_INDEX = 2` 전용 러닝 회차에 `source: 'manual-cardio'`, `speedKmh`, 거리, 시간, 페이스, 칼로리 요약을 저장한다.
- 완료: 유산소 저장 payload를 만들기 전에 현재 헬스 회차 상태를 임시 격리하고, 저장 후 기존 상태를 복원해 헬스 종목이 러닝 회차에 섞이지 않게 했다.
- 완료: 캘린더 상세 러닝 카드가 `manual-cardio` 기록을 `유산소`/`걷기`로 표시하고 `속도` metric을 보여준다.
- 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z17-manual-cardio-picker`로 bump했다.

## 실행 검증

- PASS: `node --check workout/exercises.js; node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js tests/pwa-update-auto-reload.test.js`
- PASS: 전체 테스트 파일 묶음 — `rg --files tests | *.test.js` 목록을 `node --test --test-reporter=dot`로 실행
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0574140` — `[deploy-verify] ok 0574140da32f tomatofarm-v20260630z17-manual-cardio-picker static=233`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ ...` — `sw.js`, `workout/exercises.js`, `render-calendar.js`, `style.css` marker 확인
- not verified yet: 인증 세션이 없어 실제 `운동 탭 -> + -> 유산소 -> 저장 -> 러닝 상세 카드` UI flow는 직접 조작하지 못했다.

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-manual-cardio-picker.md`의 Slice 1을 실행한다. picker 분류 화면에 `유산소` 수기 입력 버튼을 추가하고, 속도와 시간을 기존 러닝 기록 필드로 저장해 상세 카드에서 확인 가능하게 만든다.

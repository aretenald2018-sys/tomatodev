# 런닝/조깅 진입점 Slice 1 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-27-running-jogging-entry.md`
- 슬라이스: Slice 1. 분류 타일 + 기존 런닝 기록 화면 복원
- 변경 파일:
  - `index.html`
  - `workout-ui.js`
  - `workout/exercises.js`
  - `style.css`
  - `sw.js`
  - `tests/running-entry.test.js`
  - cache marker 기대값을 가진 기존 테스트 파일들

## 결과

- Finding 없음.

## 확인 내용

- `index.html`에 `wt-chip-running`, `wt-running-section`, `wt-run-distance`, `wt-run-duration-min`, `wt-run-duration-sec`, `wt-run-memo`, `wt-running-last-copy`가 추가되어 기존 `workout/activity-forms.js`의 런닝 렌더/저장 경로와 ID가 맞는다.
- `workout-ui.js`의 `_WT_TYPE_SECTIONS`가 `running -> wt-running-section`을 알게 되어 `wtSwitchType('running')`으로 section 전환이 가능하다.
- `workout/exercises.js`의 picker category는 새 `data-picker-activity="running"` 타일을 렌더하고, 클릭 시 `wtCloseExercisePicker()`를 먼저 호출한 뒤 `wtSwitchType('running')`으로 이동한다. 새 타일 클릭만으로 `S.workout.running`을 true로 만들지 않아 빈 기록 오염은 없다.
- `style.css`에 런닝 activity tile과 런닝 입력 form 스타일이 추가되었다.
- `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260627z15-running-entry`로 bump되었고, 기존 cache marker 테스트들도 새 버전으로 정렬되었다.

## 검증

- PASS: `node --check workout/exercises.js; node --check workout/activity-forms.js; node --check workout-ui.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/ex-picker-selection-flow.test.js tests/workout-picker-gym-rail.test.js tests/stats-picker-ui-polish.test.js` — 17 tests passed.
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 558 tests passed.
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`.
- PASS: `git diff --check`.

## 남은 리스크

- not verified yet: Dashboard3 Pages 배포 후 인증 계정으로 `운동 탭 -> + -> 분류 -> 런닝/조깅 -> 런닝 기록 section -> 거리/시간 입력 저장` 실제 UI flow를 확인해야 한다.
- 한국 지도/동네/공원명 표시는 아직 구현하지 않았다. 계획상 Slice 2~3 범위이며, 실제 한국 지도 검증에는 Kakao JavaScript key 또는 동등한 국내 지도 provider key가 필요하다.

# 운동 시트 iOS 숫자 입력 스크롤 안정화

- 날짜: 2026-07-02
- 상태: approved for execution
- 진단 문서: `docs/ai/diagnoses/2026-07-02-workout-ios-sheet-input-scroll.md`
- 트리거: `/diagnose`

## 문제

iPhone PWA에서 운동종목 추가 후 세트의 무게나 반복 횟수를 입력/수정할 때 화면이 위로 자동 스크롤된다는 제보가 있다. 같은 영역에서 세트를 추가하면 KG/REP input에 숫자가 미리 들어 있어 사용자가 값을 지우고 다시 입력해야 한다.

## 목표

1. 세트 숫자 input 저장 후 iOS PWA에서 시트/페이지 스크롤이 위로 튀지 않도록 포커스와 스크롤 위치를 보존한다.
2. 새 운동 세트의 KG/REP 최초 입력값을 빈 값으로 표시한다.
3. 사용자가 KG/REP 값을 비워 둔 상태를 `0`으로 즉시 되돌리지 않는다.
4. 기존 저장 경로와 운동 완료 토글, RIR/ROM 기본 동작은 유지한다.

## 비목표

- 운동 입력 UI 전체 재설계
- 운동 입력 카드 전체 레이아웃 변경
- Firestore 저장 구조 변경
- iOS 전용 브라우저 계측 코드 상시 추가

## 실행 Slice 1

1. `render-calendar.js`
   - 세트 숫자 input에 `data-wt-set-input`, `data-session-index`, `data-exercise-index`, `data-set-index`, `data-field`를 부여한다.
   - 저장 전 active input과 `.wt-day-sheet-scroll`/운동 캘린더 루트 scrollTop을 캡처한다.
   - 저장 후 재렌더가 끝난 다음 동일 input을 `preventScroll`로 다시 포커스하고 selection과 scrollTop을 복원한다.
   - 새 세트 `kg`/`reps` 기본값을 빈 문자열로 만들고, KG/REP 빈 입력을 보존한다.
2. `workout/exercises.js`
   - 실제 운동 입력 카드의 `wtAddSet()`도 KG/REP를 빈 문자열로 시작한다.
   - KG/REP 입력 parser가 빈 값을 `0`으로 되돌리지 않게 한다.
   - 저장 후 행/카드 재렌더 시 document scrollTop을 복원한다.
3. `tests/workout-calendar-bottom-sheet.test.js`, `tests/workout-card-layout-css.test.js`
   - input state 캡처/복원 계약, `preventScroll`, `data-*` 식별자, blank KG/REP 기본값 회귀 테스트를 추가한다.
4. `sw.js`와 cache-version 참조 테스트
   - `CACHE_VERSION`을 `tomatofarm-v20260702z4-workout-ios-sheet-input-scroll`로 bump한다.

## 검증 계획

1. `node --check render-calendar.js`
2. `node --check workout/exercises.js`
3. `node --check sw.js`
4. `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js`
5. `node scripts/verify-runtime-assets.mjs`
6. `node --test --test-reporter=dot tests/*.test.js`
7. `git diff --check`
8. `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
9. 배포 marker 확인
   - `sw.js::tomatofarm-v20260702z4-workout-ios-sheet-input-scroll`
   - `render-calendar.js::_captureWorkoutSheetInputState`
   - `render-calendar.js::preventScroll: true`
   - `render-calendar.js::data-wt-set-input`
   - `workout/exercises.js::_captureWorkoutNumberInputRenderScroll`
   - `render-calendar.js::kg: ''`

## 그릴 결과

- 질문: 전체 재렌더를 제거할 것인가, 재렌더는 유지하고 iOS 포커스/스크롤을 복원할 것인가?
- 답변: 저장 후 달력/시트 상태를 최신화하는 기존 계약을 유지하기 위해 재렌더는 유지한다.
- 결정: input별 안정 식별자를 추가하고 저장 전후 스크롤/포커스를 복원한다.
- 남은 가정: 인증 iPhone PWA에서 실제 키보드 동작은 배포 후 수동 확인이 필요하다.

## 실행 결과

- `render-calendar.js`에 운동 시트 숫자 input 상태 캡처/복원 헬퍼를 추가했다.
- 시트 세트 input에 `data-wt-set-input`과 세션/운동/세트/필드 식별자를 부여했다.
- 시트 KG/REP 새 세트 기본값과 빈 입력 저장값을 `''`로 보존했다.
- `workout/exercises.js`의 실제 운동 입력 카드 `wtAddSet()`도 KG/REP를 빈 값으로 시작하게 했고, KG/REP parser가 빈 입력을 `0`으로 되돌리지 않게 했다.
- 실제 운동 입력 카드의 change 저장 재렌더 후 document scrollTop을 복원했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z4-workout-ios-sheet-input-scroll`로 bump했고 cache marker 테스트를 갱신했다.

## 로컬 검증

1. PASS: `node --check render-calendar.js`
2. PASS: `node --check workout/exercises.js`
3. PASS: `node --check sw.js`
4. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js`
5. PASS: `node scripts/verify-runtime-assets.mjs`
6. PASS: `node --test --test-reporter=dot tests/*.test.js`
7. PASS: `git diff --check`
8. PASS: Dashboard3 Pages 배포 검증 - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 30e018d75677c57f6d4632adfe1ef85d006b57ab` -> `[deploy-verify] ok 30e018d75677 tomatofarm-v20260702z4-workout-ios-sheet-input-scroll static=236`
9. PASS: Dashboard3 Pages marker 검증 - `sw.js` cache version, `render-calendar.js` input restore markers, `workout/exercises.js` render-scroll/blank parser markers 확인
10. not verified yet: 인증 iPhone PWA 실제 `운동 탭 -> 종목 추가 -> KG/REP 입력/수정 -> 세트 추가` UI flow 확인은 아직 수행하지 않았다.

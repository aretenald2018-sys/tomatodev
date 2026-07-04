# 운동 세트 미니멀 BodyCalendar 보정 리뷰

## 범위

- 계획: `docs/ai/features/2026-07-04-workout-set-copy-expand-edit.md` Slice 2
- 구현 커밋: `391a4f4 fix: simplify workout set entry rows`
- 운영 배포 커밋: `e43f24e fix: recover running sessions after reload`
- 배포 관계: `e43f24e`는 `391a4f4`를 포함한다.
- 현재 운영 cache marker: `tomatofarm-v20260704z5-workout-set-type-menu-close`

## 요청 반영 확인

1. `세트 입력 대기`와 `지난 기록` 블록은 유지했다.
2. 추천/프로그램 운동 추가 시 처음 보이는 입력 행은 첫 세트 1개만 생성한다.
3. 전체 처방 세트는 `maxPrescription`에 보존한다.
4. collapsed 세트 행은 완료 체크, 세트 번호/유형, 무게, 횟수, 삭제, 우측 펼침만 노출한다.
5. `무게/횟수/RIR/ROM` 입력은 우측 펼침 편집 패널에서만 노출한다.
6. 좌측 세트 번호 버튼은 `M/W/D/F` 세트 유형 메뉴를 연다.
7. 세트 유형 선택 후 메뉴는 닫힌 상태로 재렌더된다.

## 변경 파일

- `render-calendar.js`
- `style.css`
- `workout/exercises.js`
- `workout/expert/max-benchmark-picker.js`
- `tests/calc.max.test.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `tests/workout-set-minimal-dom.test.js`
- `tests/workout-test-mode-unified.test.js`
- `sw.js`
- cache marker assertion test files

## 검증

1. PASS: RED `node --test tests/calc.max.test.js tests/workout-test-mode-unified.test.js tests/workout-calendar-bottom-sheet.test.js`
   - 구현 전 `entry.sets.length === 1`, set-type menu/action marker가 실패했다.
2. PASS: `node --check render-calendar.js && node --check workout/exercises.js && node --check workout/expert/max-benchmark-picker.js && node --check sw.js`
3. PASS: `node --test tests/calc.max.test.js tests/workout-test-mode-unified.test.js tests/workout-calendar-bottom-sheet.test.js` - 95 pass
4. PASS: `node --test tests/workout-set-minimal-dom.test.js` - 2 pass
   - 브라우저 DOM에서 우측 펼침 클릭, 좌측 M/W/D/F 메뉴 클릭, `failure` 선택, 메뉴 닫힘, completion marker clear를 확인했다.
5. PASS: `node --test tests/*.test.js` - 695 pass
6. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=880`
7. PASS: `git diff --check HEAD`
8. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
9. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260704z5-workout-set-type-menu-close render-calendar.js::WORKOUT_SET_TYPE_OPTIONS render-calendar.js::toggle-set-type render-calendar.js::set-set-type render-calendar.js::data-wt-set-type-option style.css::wt-max-set-type-menu workout/exercises.js::_firstTestModePrescriptionSet workout/expert/max-benchmark-picker.js::_firstPickerSetFromPrescription tests/workout-calendar-bottom-sheet.test.js::wt-max-set-type-btn tests/workout-set-minimal-dom.test.js::menuOpenCount tests/calc.max.test.js::maxPrescription.sets.length`
10. PASS: 운영 URL browser 확인
   - URL: `https://aretenald2018-sys.github.io/tomatofarm/`
   - title: `토마토 키우기`
   - 로그인 화면과 앱 shell 표시
   - console error 0건
11. not verified yet: 인증 세션이 없어 운영 URL에서 실제 사용자 계정의 `운동 탭 -> 종목 카드 -> 세트 유형 메뉴/우측 편집` 클릭 flow는 자동으로 수행하지 못했다. 대신 브라우저 DOM harness에서 같은 행 렌더/클릭/mutation 경로를 실행했다.

## 리뷰 결과

- QA executor: PASS. 커밋 아카이브 기준 focused checks와 95개 테스트 통과.
- Code quality reviewer: PASS/WATCH. 차단 이슈 없음.
- Security/data-integrity reviewer: PASS/WATCH. 세트 유형 handler는 date/session/exercise/set index로 대상을 한정하고, 저장은 기존 `upsertWorkoutSession()`/`saveDay(..., merge)` 경로를 유지한다.
- Context explorer: PASS. 소스 위치와 테스트 계약 확인.
- Gate reviewer: 초기 REJECT.
  - 사유: 운영 Pages가 `391a4f4`가 아니라 후속 커밋 `e43f24e`를 보고 있었고, stale 리뷰 문서가 Slice 2를 포함하지 않았다.
  - 조치: `e43f24e`가 `391a4f4`를 포함하는 ancestor 관계를 확인했고, 현재 운영 marker/cache version으로 배포 검증을 다시 통과했다. 이 문서로 Slice 2 리뷰를 별도로 남긴다.
- Gate reviewer 2차 REJECT.
  - 사유: 인증된 운영 workout sheet 클릭 flow와 DOM/action proof가 부족했고 ULW goal evidence가 비어 있었다.
  - 조치: `tests/workout-set-minimal-dom.test.js`를 추가해 Puppeteer 브라우저 DOM에서 우측 펼침, 좌측 세트 유형 메뉴, 유형 선택 mutation, 메뉴 닫힘을 검증했다. `.omo/ulw-loop/workout-set-minimal-correction-20260704/goals.json`과 `ledger.jsonl`에도 evidence를 기록했다.

## 잔여 리스크

- 세트 유형 메뉴의 click mutation 경로는 `tests/workout-set-minimal-dom.test.js`에서 브라우저 DOM harness로 보강했다.
- 운영 내부 workout flow는 인증 세션이 필요해 자동 브라우저 클릭 검증은 하지 못했다.

## 결론

PASS. 사용자 피드백 범위의 세트 입력 UI 보정은 구현, 테스트, 운영 배포 marker 검증까지 완료됐다.

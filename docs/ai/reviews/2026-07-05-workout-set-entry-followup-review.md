# 운동 세트 첫 행/편집 행 후속 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-07-05-workout-set-entry-followup.md`
- 변경 파일:
  - `render-calendar.js`
  - `workout/exercises.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `tests/workout-set-minimal-dom.test.js`
  - `tests/workout-test-mode-unified.test.js`
  - cache marker를 공유하는 기존 테스트 파일들
- 참고: `omo:review-work`는 이 세션에서 읽고 체크리스트를 적용했다. 다만 현재 멀티에이전트 도구가 사용자의 명시적 subagent 요청 없이는 spawn을 금지하므로 5개 병렬 subagent 레인은 실행하지 않았다.

## 결과

- verdict: PASS
- blocker: 없음
- residual risk: 운영 URL의 인증된 실제 계정 플로우는 세션 자격이 없어 직접 클릭 검증하지 못했다. DOM/visual harness와 전체 테스트로 대체 검증했다.

## 요구사항 확인

1. 일반 운동 첫 추가 기본값
   - PASS: `_defaultPickerExerciseSet(ex)`가 `_latestPickerExerciseSet(ex?.id)`를 우선 사용하고 없으면 `40/10`을 반환한다.
   - PASS: Max 추천 피커가 비벤치마크 수동 엔트리를 반환하는 경우도 `_buildPickerExerciseEntry()`에서 같은 seed로 덮어쓴다.
2. 달력 시트 세트 추가 기본값
   - PASS: `_defaultWorkoutSheetSet(prev)`가 직전 세트가 없거나 값이 비어 있으면 `40kg x 10회`를 사용한다.
3. 접힌 행 입력칸 오인 제거
   - PASS: collapsed 행에는 `[data-wt-set-input]`이 없고, 값 배경을 투명화했다.
   - PASS: 레거시 빈 값은 `-` 박스가 아니라 `미입력` 텍스트로 표출한다.
4. 우측 펼침 버튼 강조
   - PASS: `.wt-max-set-expand` 기본 상태에 파란 배경/색상/box-shadow affordance를 추가했다.
5. 펼친 편집 필드 한 줄
   - PASS: `.wt-max-set-editor`가 `repeat(4, minmax(0, 1fr))` grid로 렌더되고, visual harness에서 4개 input top이 동일함을 확인했다.
6. `메인/웜업` 라벨
   - PASS: `render-calendar.js`와 `workout/exercises.js`의 일반/웬들러 라벨을 `메인/웜업`으로 변경했다.
7. 웬들러 전체 세트
   - PASS: `_testModeSetsFromPrescription()`은 `prescription.applySets === true && prescription.program === 'wendler'`일 때 `prescription.sets.map(...)`으로 전체 처방을 반환한다.
   - PASS: `tests/calc.max.test.js`의 기존 Max 벤치마크 1행 계약은 유지됐다.
8. 서비스워커 캐시
   - PASS: `sw.js` cache marker를 `tomatofarm-v20260705z1-workout-set-entry-followup`로 bump했고 cache marker 테스트를 갱신했다.

## 검증 증거

1. RED 확인:
   - `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js tests/workout-test-mode-unified.test.js`
   - 기존 소스에서 `프리/본`, 빈 기본값, 1행 Wendler, cache marker 기대값으로 실패 확인.
2. 타깃 회귀:
   - `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js tests/workout-test-mode-unified.test.js tests/calc.max.test.js`
   - 결과: 98 pass.
3. 전체 회귀:
   - `node --test tests/*.test.js`
   - 결과: 701 pass.
4. Visual/DOM QA:
   - Puppeteer 390px harness.
   - 확인값: collapsed input count `0`, values `70kg`, `10회`, `미입력`, transparent value background, blue expand glow, editor fields `kg,reps,rir,romPct`, same-line labels/inputs.
   - 증거: `.omo/evidence/workout-set-entry-followup-dom.png`.

## 리뷰 판단

- 기능 요구사항은 모두 충족한다.
- 변경 범위는 계획된 파일과 cache marker 테스트 갱신에 머물렀다.
- `STATIC_ASSETS` 포함 파일 수정에 따른 `CACHE_VERSION` bump가 반영됐다.
- 운영 배포 후에는 `verify:deploy`와 marker 검증으로 최종 Pages 반영을 확인해야 한다.

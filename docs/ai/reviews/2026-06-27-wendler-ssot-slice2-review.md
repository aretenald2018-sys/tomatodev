# Wendler SSOT Slice 2 리뷰

## 리뷰 대상

- `render-calendar.js`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- cache-version 참조 테스트들
- `docs/ai/features/2026-06-27-wendler-program-ssot-diagnosis.md`

## 결론

블로킹 이슈 없음.

## 확인 내용

- 캘린더 cycle rail은 Wendler 항목의 보이는 주차와 title/aria label을 `rx.plan.cycleWeek`와 `rx.plan.programWeek`에서 가져온다. 따라서 하체 group active cycle week가 밀려 있어도 rail 문구는 종목별 `programStartDate` 기준 주차를 표시한다.
- 기존 종목 수정 UI는 `programStartDate`와 단일 `tmKg`를 `upsertExerciseProgramBenchmark()`에 전달하고, board-core가 해당 시작 주의 `tmAnchors[]`를 upsert한다. 복수 anchor 관리 UI와 cascade 재계산 UX는 계획 범위 밖으로 유지했다.
- `render-calendar.js`와 `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 `tomatofarm-v20260627z3-wendler-ui-rail`로 bump했고, 참조 테스트도 함께 갱신했다.

## 남은 리스크

- 인증 계정이 필요한 실제 UI flow, 즉 `운동 탭 -> 종목 수정 -> 웬들러 시작 주/TM 저장 -> 캘린더 rail 확인`은 로컬 정적 테스트만으로는 완전히 대체되지 않는다.
- 운영 Firestore의 스모데드/스쿼트(와이드) 명시 anchor 보정은 Slice 3 범위로 남아 있다. 이번 리뷰 대상에는 production data write가 포함되지 않는다.

## 검증

- PASS: `node --check render-calendar.js sw.js workout/exercises.js workout/test-v2/board-core.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/exercise-program-editor.test.js tests/test-v2.board-core.test.js`
- PASS: `node --test tests/*.test.js` — 550 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

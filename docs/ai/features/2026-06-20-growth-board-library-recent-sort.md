# 성장 보드 운동 라이브러리 최신순 정렬 계획

## 그릴 결과

- 핵심 질문: “최근” 기준을 화면에 표시되는 `최근 kg×reps`와 같은 실제 운동 기록으로 볼 것인가?
- 결정: 예. 성장 보드 후보가 이미 쓰는 `buildRecentMap()`의 `dateKey`를 기준으로 정렬한다.
- 남은 가정: 기록이 없는 종목은 기존 상대 순서를 유지하며 아래로 보낸다. 오늘 세션에서 수행한 종목은 오늘 날짜로 보아 최상단에 둔다.

## 실행 슬라이스

1. `workout/test-v2/board-core.js`
   - `sessionRecentMap()`에 선택적 날짜 인자를 추가해 오늘 세션 후보도 최신일을 갖게 한다.
   - 성장 보드 후보 배열을 `tracks.volume.dateKey` 최신순으로 정렬하는 순수 헬퍼를 추가한다.
2. `workout/test-v2/board-render.js`
   - `_candidates(groupId)`에서 후보를 부위별 필터 후 최신순으로 반환한다.
3. `tests/test-v2.board-core.test.js`
   - 기록 있는 후보가 최신순으로 먼저 오고, 기록 없는 후보는 뒤에 남는지 검증한다.
4. `sw.js`
   - `STATIC_ASSETS`에 포함된 성장 보드 파일 변경에 맞춰 `CACHE_VERSION`을 bump한다.

## 제외

- UI 문구, 색상, 레이아웃 변경은 하지 않는다.
- 일반 운동 탭의 `wtOpenExercisePicker()` 정렬은 이번 범위에 포함하지 않는다.
- 배포/푸시는 하지 않는다.

## 검증

- `node --check workout/test-v2/board-core.js`
- `node --check workout/test-v2/board-render.js`
- `node --check sw.js`
- `node --test tests/test-v2.board-core.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 로컬 UI: `npm.cmd run dev` 후 성장 보드에서 하체 등 부위의 `종목 추가 — 운동 라이브러리` 목록이 최근 수행일 최신순인지 확인한다.

## 실행 결과

- 완료: `sessionRecentMap()`에 선택적 날짜 인자를 추가해 오늘 세션 후보도 최신 정렬 기준을 갖게 했다.
- 완료: `sortCandidatesByRecent()`를 추가하고 성장 보드의 `_candidates(groupId)` 반환값에 적용했다.
- 완료: 같은 하체 그룹 안에서 `2026-06-15` 기록 후보가 `2026-06-01` 기록 후보보다 먼저 오고, 기록 없는 후보는 뒤에 남는 테스트를 추가했다.
- 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260620z3-growth-board-library-recent-sort`로 bump했다.
- 검증: 구문 검사, 테스트, 런타임 자산 검증, `git diff --check` 통과.
- 남은 검증: sandbox에서 dev server를 시작하지 않아 실제 브라우저 UI 플로우는 not verified yet.

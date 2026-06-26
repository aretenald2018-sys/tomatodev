# 운동 캘린더 사이클 설정 시트 통합

## 배경

운동 홈 캘린더 좌측 cycle rail의 목표 칩을 누르면 현재 `tm2OpenBenchmarkSettings()`가 성장 보드 overlay를 렌더한 뒤 종목 설정 sheet를 띄운다. 사용자는 이 흐름에서 성장 보드 메인 grid 화면과 온보딩 시작 sheet를 더 이상 보지 않고, 첫 번째 사진의 종목 설정 sheet 안에서 웬들러 설정과 해당 종목의 6주 사이클 흐름을 한 번에 다루길 원한다.

## 그릴 결과

- 핵심 질문: `볼륨/강도`는 그대로 기본 계단 트랙 선택으로 두고, `웬들러`를 같은 행의 세 번째 칩으로 넣어 프로그램 선택까지 통합해도 되는가?
- 답변/결정: 사용자의 설명상 맞다. `운동 방식` 별도 행은 제거하고, `트랙 구성` 행에서 `볼륨`, `강도`, `웬들러`를 함께 선택한다.
- 남은 가정: 캘린더 rail에서 들어온 경우에는 2번 성장 보드 grid를 배경으로 렌더하지 않는다. 기존 디버그/전역 `tm2OpenBoard()` 진입은 당장은 유지한다.
- 남은 가정: “해당 운동종목의 사이클만”은 설정 sheet 내부에 현재 벤치마크의 활성 6주 사이클만 가로 레일로 표시하는 의미로 처리한다.

## 실행 Slice 1 — Calendar rail target settings unification

1. `workout/test-v2/board-render.js`의 `tm2OpenBenchmarkSettings()` 경로가 성장 보드 본문 grid를 렌더하지 않고 바로 종목 설정 sheet만 열도록 분리한다.
2. 종목 설정 sheet의 `트랙 구성` 행에 `웬들러` 칩을 추가하고, `운동 방식` 행은 제거한다.
3. `웬들러` 칩 선택 시 기존 보라색 `tm2-wbox` 설정 카드가 그대로 표시되게 `ctx.program` 전환 로직을 재사용한다.
4. `볼륨`/`강도` 칩 선택은 기본 계단 프로그램 선택을 의미하게 하고, 웬들러에서 볼륨/강도 칩을 누르면 `program: stair`로 복귀하게 한다.
5. 설정 sheet 하단에 현재 종목의 활성 6주 사이클만 가로 화살표/실선 레일로 표시한다. 셀 카드 형태 대신 주차 노드와 주간 연결선, 연결선 위 무게 표기를 사용한다.
6. `test-mode-v2.css`에 설정 sheet 전용 레일 스타일을 추가한다.
7. `workout/test-v2/board-render.js`, `test-mode-v2.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.
8. 관련 회귀 테스트를 추가/수정한다.

## 구현 금지

- 웬들러 처방 계산식 변경
- 기본 계단/웬들러 저장 데이터 모델 변경
- 날짜별 운동 추가 sheet 변경
- 성장 보드 전체 grid 레이아웃 재설계
- `www/` 직접 수정

## 예상 변경 파일

- `workout/test-v2/board-render.js`
- `test-mode-v2.css`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- 필요 시 `docs/ai/NEXT_ACTION.md`

## 검증

- `node --check workout/test-v2/board-render.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 배포 시 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 수동 확인 흐름

- Dashboard3 Pages에서 인증 계정으로 `운동 탭 -> 월간 캘린더 -> 좌측 cycle rail 목표 칩`을 누른다.
- 바로 종목 설정 sheet가 뜨고 성장 보드 grid/온보딩 시작 sheet가 보이지 않아야 한다.
- `트랙 구성` 행에 `볼륨`, `강도`, `웬들러`가 있고 별도의 `운동 방식` 행은 없어야 한다.
- `웬들러` 선택 시 보라색 웬들러 설정 카드가 표시되어야 한다.
- sheet 하단에서 해당 종목의 활성 6주 사이클만 가로 레일로 표시되고, 주차 사이 실선 위에 무게가 보여야 한다.

## 다음 실행

이 계획의 Slice 1을 실행한다. 변경 범위는 `workout/test-v2/board-render.js`, `test-mode-v2.css`, `sw.js`, 관련 테스트, 문서 갱신으로 제한한다.

## Slice 1 구현 결과

- `tm2OpenBenchmarkSettings()`를 설정 전용 진입으로 분리해 캘린더 cycle rail 클릭 시 성장 보드 grid overlay를 열지 않게 했다.
- 목표 종목을 찾지 못한 경우에도 온보딩 시작 sheet로 fallback하지 않고 경고만 표시하게 했다.
- 종목 설정 sheet의 `트랙 구성` 행에 `웬들러` 칩을 통합하고, 별도 `운동 방식` 행을 제거했다.
- `볼륨`/`강도` 칩을 누르면 기본 계단(`program: stair`)으로 복귀하고, `웬들러` 칩을 누르면 기존 보라색 `tm2-wbox` 설정 카드가 표시된다.
- 설정 sheet 하단에 현재 벤치마크의 활성 6주 사이클만 가로 레일로 표시한다. 주차 노드 사이 실선 커넥터에 주별 무게를 표시한다.
- 설정 전용 저장 후 `sheet:saved`를 dispatch해 캘린더 rail이 현재 탭에서 다시 렌더될 수 있게 했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260626z10-cycle-settings-sheet`로 bump했다.

## Slice 1 검증

- PASS: `node --check workout/test-v2/board-render.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js` — 53 tests passed
- PASS: `node --test .\tests\*.test.js` — 546 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- not verified yet: 아직 Dashboard3 Pages 배포 및 인증 계정 UI flow 확인 전이다.

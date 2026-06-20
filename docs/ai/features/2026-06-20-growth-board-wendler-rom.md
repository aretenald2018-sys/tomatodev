# 성장 보드 웬들러 카드 ROM 입력 추가

## 요청

- 제보: 성장 보드 하체 웬들러 운동 카드에서 `ROM` 입력이 보이지 않는다.
- 첨부 화면: 웬들러 `준비 운동`, `메인`, `BBB` 전용 세트 UI에는 반복 횟수와 kg만 표시된다.
- 추가 요청: 수정 후 배포까지 진행한다.

## 진단

- 일반 성장 보드 운동 카드는 `renderEmbeddedMaxExerciseCard`를 사용하므로 공용 맥스 세트 UI의 `ROM` 행이 표시된다.
- 웬들러 운동 카드는 `workout/test-v2/board-render.js`의 `_renderWendlerWorkoutCard`와 `_wendlerSectionHtml`로 별도 렌더링된다.
- 웬들러 세트 데이터에는 `romPct: 100` 기본값이 이미 들어가지만, 전용 렌더러가 `romPct` 입력을 만들지 않고 `_onSheetChange`도 `kg`/`reps` 형식만 처리한다.

## 실행 범위

- `workout/test-v2/board-render.js`
  - 웬들러 `준비 운동`, `메인`, `BBB` 세트 행에 `ROM` 숫자 입력을 추가한다.
  - `romPct` 변경 시 0-100 정수로 정규화해 저장하고 기존 draft save 흐름을 유지한다.
- `test-mode-v2.css`
  - 웬들러 세트 grid에 ROM 열을 추가하고 390px 이하 모바일에서도 넘치지 않게 축소한다.
- `sw.js`
  - `STATIC_ASSETS`에 포함된 파일 변경이므로 `CACHE_VERSION`을 범프한다.

## 제외

- 운동 데이터 모델과 Firebase 저장 경로는 변경하지 않는다.
- 일반 운동카드의 공용 ROM UI는 변경하지 않는다.
- `www/` 산출물은 직접 수정하지 않는다.
- 캘린더 운동탭 대기 계획은 이번 배포에 포함하지 않는다.

## 검증

1. `node --check workout/test-v2/board-render.js`
2. `node --check sw.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. 모바일 폭 fixture 또는 DOM smoke로 웬들러 세트 행에 `ROM` 입력이 있고 viewport overflow가 없는지 확인
6. 배포 후 원격 URL HTTP 200, 원격 `sw.js` 캐시 버전 확인

## 실행 결과

- 상태: 구현 완료, 배포 진행 전 검증 완료
- 변경:
  - `workout/test-v2/board-render.js`: 웬들러 전용 세트 행에 `ROM` 숫자 입력을 추가하고, `romPct`를 0-100 정수로 정규화해 draft save 흐름에 저장하게 했다.
  - `test-mode-v2.css`: 웬들러 세트 grid를 6열로 조정하고 390px 이하 모바일 폭에서도 입력 행이 넘치지 않게 축소했다.
  - `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260620z6-growth-board-wendler-rom`으로 범프했다.
- 검증:
  - PASS: `npm.cmd run verify:assets`
  - PASS: `node --check workout/test-v2/board-render.js`
  - PASS: `node --check sw.js`
  - PASS: `git diff --check`
  - PASS: `node --test tests/test-v2.board-core.test.js` — 29개 통과
  - PASS: Node REPL source smoke — `romPct` 입력, `ROM` 헤더, 0-100 클램프, 6열 CSS, 캐시 버전 확인
  - PASS: Puppeteer 360px layout smoke — ROM 입력 존재, `rowOverflow=0`, `sheetOverflow=0`, `romRight=289 <= 360`

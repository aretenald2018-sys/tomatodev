# 성장 보드 모달 ROM 잘림 및 타이머 가림 수정

## 요청

- Discord 요청: `devreq_discord_1517367317896495186`
- 제보: 성장모드 모달에서 `ROM` 영역이 오른쪽으로 잘리고, 테스트모드에 있던 하단 타이머도 보이지 않는다.
- 첨부 화면: `docs/ai/inbox/requests/devreq_discord_1517367317896495186/attachments/01-Screenshot_20260619_121522_Chrome.jpg`

## 진단

- 성장 보드 시트는 `#tm2-sheets`를 `body` 바로 아래에 렌더한다.
- 임베디드 맥스 운동 카드는 공용 세트 렌더러의 `.set-row`를 재사용한다.
- `#tab-workout .ex-block--max-v2 .ex-max-v2-set` 보정은 workout 탭 내부에만 적용되므로, body 직속 성장 보드 시트에서는 공용 `.set-row { display:flex }`가 적용된다.
- 그 결과 `ex-max-v2-main-row`와 `ex-max-v2-rom`이 같은 가로 줄에 놓여 모바일 폭에서 오른쪽으로 넘친다.
- `#tm2-sheets` 레이어가 하단 통합 타이머보다 높은 z-index로 화면 하단을 덮어 타이머가 사라진 것처럼 보인다.

## 실행 범위

### Slice 1

- `test-mode-v2.css`
  - 성장 보드 시트 안의 `.ex-max-v2-set`을 명시적으로 세로 grid로 고정한다.
  - 세트 입력 행과 ROM 행에 `min-width: 0`, `max-width: 100%`, 모바일용 축소 grid를 적용해 가로 overflow를 막는다.
  - `#tm2-sheets`가 하단 통합 타이머 위 공간까지만 차지하도록 bottom inset을 둔다.
- `sw.js`
  - `test-mode-v2.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 범프한다.

### Slice 2

- Steering 추가: 목표 달성이 안 됐는데 운동은 수행한 칸은 진한 초록 채움이 아니라 연한 초록 배경과 진녹색 테두리로 표시한다.
- `workout/test-v2/board-core.js`
  - 목표 미달 기록(`recordMiss`)에 수행 여부를 남기고, 셀 전개 시 `miss`와 별도의 `attempted` 상태로 반환한다.
  - 웬들러/계단식 보드 모두 목표 미달 수행 칸이 `attempted` 상태가 되게 한다.
- `workout/test-v2/board-render.js`
  - 운동 카드 완료 버튼 문구에서 무조건 칸 색칠을 암시하지 않도록 수정한다.
  - 목표 미달 후 조정 시트로 넘어가는 경로에도 수행 여부를 보존한다.
- `test-mode-v2.css`
  - `.tm2-attempted` 상태를 연한 초록 배경 + 진녹색 테두리로 추가한다.
- `tests/test-v2.board-core.test.js`
  - 목표 미달 수행 기록이 `attempted` 상태로 전개되는 회귀 테스트를 추가/수정한다.
- `sw.js`
  - `STATIC_ASSETS`에 포함된 파일 변경이므로 `CACHE_VERSION`을 범프한다.

## 제외

- 세트 저장 로직, 운동 데이터 모델, Firebase 경로는 변경하지 않는다.
- `www/` 산출물은 직접 수정하지 않는다.

## 검증

1. `node --check sw.js`
2. `node --check workout/exercises.js`
3. `node --check workout/test-v2/board-core.js`
4. `node --check workout/test-v2/board-render.js`
5. `node --test tests/test-v2.board-core.test.js`
6. `node scripts/verify-runtime-assets.mjs`
7. `npm.cmd run dev`로 출력된 URL HTTP 200 확인
8. 모바일 폭에서 성장 보드 모달을 열었을 때 `ROM` 입력이 잘리지 않고, 하단 타이머 공간이 보이는지 확인
9. 목표 미달 수행 칸이 연한 초록 배경 + 진녹색 테두리로 표시되는지 확인
10. 배포 후 `https://aretenald2018-sys.github.io/tomatofarm/` HTTP 200 및 `sw.js` 캐시 버전 확인

## 실행 결과

- 상태: Slice 1 완료
- 변경:
  - `test-mode-v2.css`: 성장 보드 시트의 임베디드 맥스 세트 행을 grid로 고정하고, ROM 행을 별도 grid 줄로 배치했다. 모바일 폭에서 삭제 버튼/입력/ROM range의 폭을 줄여 가로 overflow를 제거했다.
  - `test-mode-v2.css`: `#tm2-sheets.tm2-open` 상태에서 `#wt-workout-timer-bar.wt-open`의 z-index를 시트 위로 올리고, 시트 하단 padding을 늘려 타이머와 버튼이 겹치지 않게 했다.
  - `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260619z2-growth-board-rom-timer`로 범프했다.
- 검증:
  - PASS: `node --check sw.js`
  - PASS: `node --check workout/exercises.js`
  - PASS: `git diff --check`
  - PASS: `node scripts/verify-runtime-assets.mjs`
  - PASS: `npm.cmd run dev` 후 `http://localhost:5500/index.html` HTTP 200
  - PASS: Chrome 360px fixture에서 `sheet.scrollWidth === sheet.clientWidth`, `row.scrollWidth === row.clientWidth`, ROM 입력 우측 `311px <= 360px`, 타이머 `z-index: 10080`, 타이머가 최상단 hit target임을 확인
- 남은 배포 검증:
  - PASS: `git push tomatofarm main` (`6a6145a`)
  - PASS: `https://aretenald2018-sys.github.io/tomatofarm/` HTTP 200
  - PASS: 원격 `sw.js`에서 `tomatofarm-v20260619z2-growth-board-rom-timer` 확인
  - PASS: 원격 `test-mode-v2.css`에서 `z-index: 10080` 확인
  - 참고: `node scripts/verify-deploy.mjs https://aretenald2018-sys.github.io/tomatofarm/ 6a6145a`는 기존 `build-info.json`이 `93581936...`를 가리켜 실패한다. 실제 앱 파일과 service worker는 반영되어 있다.

## Slice 2 실행 결과

- 상태: Slice 2 완료
- 변경:
  - `workout/test-v2/board-core.js`: `recordMiss`에 `attempted` 의미를 추가하고, 수행 값이 있는 목표 미달 칸은 `attempted` 상태로 전개되게 했다. 기존 missed 집계는 유지한다.
  - `workout/test-v2/board-render.js`: 운동 카드 완료 버튼 문구를 `운동 완료`로 바꾸고, 목표 미달 시 최고 수행 kg/reps를 조정 시트와 miss 기록에 보존한다.
  - `test-mode-v2.css`: `.tm2-attempted` 상태를 연한 초록 배경 + 진녹색 테두리로 추가했다.
  - `tests/test-v2.board-core.test.js`: 목표 미달 수행 칸은 `attempted`, 수행 값 없는 미달은 `miss`로 남는 회귀 테스트를 추가했다.
  - `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260620z2-growth-board-attempted`로 범프했다.
- 검증:
  - PASS: `node --check sw.js`
  - PASS: `node --check workout/test-v2/board-core.js`
  - PASS: `node --check workout/test-v2/board-render.js`
  - PASS: `node --test tests/test-v2.board-core.test.js` — 28개 통과
  - PASS: `node scripts/verify-runtime-assets.mjs`
  - PASS: `git diff --check`
  - PASS: `npm.cmd run dev` 후 `http://localhost:5500/index.html` HTTP 200
  - PASS: Puppeteer 360px smoke — `attempted` 칸 배경 `rgb(221, 242, 231)`, 테두리 `rgb(20, 55, 39)`, `done` 칸은 기존 진녹색 유지
  - PASS: Puppeteer 360px smoke — ROM 입력 우측 `317px <= 360px`, 시트/행 가로 overflow 없음, 타이머 `z-index: 10080` 및 hit target 확인

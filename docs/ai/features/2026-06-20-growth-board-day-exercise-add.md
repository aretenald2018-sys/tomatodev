# 성장 보드 날짜별 운동 추가 열

## 요청

- Discord 요청 `devreq_discord_1517372029643522089`
- 성장 보드 모달의 마지막 열에 `+` 버튼을 두고, 클릭하면 운동 종목 리스트를 불러와 그 날 할 특정 운동을 추가할 수 있게 한다.
- 첨부 화면 기준 대상은 `workout/test-v2` 성장 보드의 주차 그리드다.

## 진단

- `workout/test-v2/board-core.js`에는 이미 날짜별 라인업 저장용 `lineups`, `getLineup()`, `toggleLineup()`이 있다.
- `workout/test-v2/board-render.js`는 이 API를 import하지 않고, 보드 오른쪽에 날짜별 추가 버튼도 렌더하지 않는다.
- 종목 관리 시트는 그룹 메뉴에 종목을 추가하는 기능이고, 요청한 "그 날 할 운동 추가"와는 UX 목적이 다르다.

## 실행 범위

### Slice 1

- `workout/test-v2/board-render.js`
  - 보드 오른쪽 마지막 열에 날짜별 `+` 셀을 추가한다.
  - `+` 셀 클릭 시 해당 주/날짜의 "오늘의 배열" 선택 시트를 연다.
  - 시트에서는 현재 그룹의 활성 종목과 운동 라이브러리 후보를 보여주고, 선택 시 해당 날짜 라인업에 저장한다.
  - 현재 주차를 선택한 경우 실제 오늘 운동 목록(`WS.workout.exercises`)에도 같은 종목을 추가해 운동 카드와 이어지게 한다.
- `test-mode-v2.css`
  - 마지막 추가 열과 라인업 시트 스타일을 추가한다.
- `sw.js`
  - 위 두 파일이 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 범프한다.

## 제외

- 운동 라이브러리 CRUD, 온보딩, 정산 알고리즘은 변경하지 않는다.
- `www/` 산출물은 직접 수정하지 않는다.
- Max V4(`workout/expert/max*.js`)는 수정하지 않는다.
- 배포 외 별도 데이터 마이그레이션은 하지 않는다.

## 검증

1. `node --check workout/test-v2/board-render.js`
2. `node --check sw.js`
3. `npm.cmd run dev` 후 실제 URL HTTP 200 확인
4. 성장 보드 모달에서 오른쪽 `+` 셀을 눌러 운동 목록 시트가 열리는지 확인
5. 종목 선택 후 해당 날짜 라인업 표시와 현재 주차 운동 목록 반영을 확인
6. `node scripts/verify-runtime-assets.mjs`
7. `git diff --check`

## 실행 결과

- 상태: Slice 1 완료
- 변경:
  - `workout/test-v2/board-render.js`: 성장 보드 오른쪽 마지막 열에 날짜별 `+` 셀을 추가하고, 클릭 시 "그 날 할 운동 추가" 시트를 열도록 했다.
  - `workout/test-v2/board-render.js`: 보드 활성 종목은 `담기/빼기`로 `board.lineups[date]`에 저장하고, 현재 주차 선택은 오늘 운동 엔트리에도 같은 처방 세트로 추가되게 했다.
  - `workout/test-v2/board-render.js`: 라이브러리 새 종목은 시작 무게/횟수 확인 후 보드 메뉴와 날짜별 라인업에 함께 추가되게 했다.
  - `test-mode-v2.css`: 오른쪽 `+` 열, 선택 상태, 라인업 시트 행 스타일을 추가했다.
  - `sw.js`: `STATIC_ASSETS` 대상 변경 반영을 위해 `CACHE_VERSION`을 범프했다.
- 검증:
  1. PASS: `node --check workout/test-v2/board-render.js`
  2. PASS: `node --check sw.js`
  3. PASS: `node scripts/verify-runtime-assets.mjs`
  4. PASS: `git diff --check`
  5. PASS: `npm.cmd run dev` 후 `http://localhost:5500` HTTP 200 확인
  6. PASS: Puppeteer UI smoke — 성장 보드 `+` 열 18개 렌더, 오늘 `+` 클릭 시 "그 날 할 운동 추가" 시트 오픈
  7. PASS: Puppeteer UI smoke — 종목 `담기` 후 오늘 셀이 `1 담김`으로 바뀌고, 오늘 운동 상태에 `인클라인` 4세트(`70kg x 12`) 엔트리가 생성됨

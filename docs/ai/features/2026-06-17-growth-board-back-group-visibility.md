# 성장 보드 등 그룹 표시 누락 수정 계획

## 요청

- Discord `devreq_discord_1516270292027052164`
- 제보: `등운동 몇개 선택해서 들어와도 이런식으로 등이 안보이는 문제 해결`
- 첨부 원본 URL은 404였고, 로컬 `.codex-remote-attachments`에는 이번 증상 스크린샷이 없어 화면 자체는 확인하지 못했다.
- steering note: `해결해`

## 진단 결과

- `/diagnose` 적용 대상: 성장 보드/테스트모드 UI에서 선택한 등 운동 그룹이 보이지 않는 버그.
- 재현 가능한 코드 경로:
  - `workout/test-v2/board-core.js`의 `exerciseGroupId()`가 등록 운동의 `muscleId`, `muscleIds`, `movementId`로 성장 보드 그룹을 판정한다.
  - `workout/test-v2/board-render.js`의 `_readTodayGroupIds()`가 오늘 선택한 운동/선택 부위를 그룹으로 정규화한 뒤 보이는 그룹 칩을 필터링한다.
- 반증한 가설:
  - `back_width`, `back_thickness`는 이미 `back`으로 매핑되어 단독 누락 원인은 아니다.
  - 성장 보드 그룹 정의에는 `back` 그룹 자체가 존재한다.
- 유력 원인:
  - 두 파일 모두 `posterior`를 `lower`로 매핑한다.
  - 반면 맥스/전문가 비교 로직은 `posterior`를 등 계열로 취급한다.
  - RDL/데드리프트처럼 `primary: 'back'`, `subPattern: 'posterior'`인 등 운동이 `muscleIds: ['posterior']`만 가진 등록 종목이면 성장 보드 후보와 오늘 표시 그룹에서 하체로 잘못 들어갈 수 있다.

## 실행 Slice 1

### 목표

- 성장 보드 v2에서 `posterior` 계열 등 운동이 등 그룹으로 보이게 한다.
- `movement.primary === 'back'`인 운동은 `muscleIds`에 `posterior`만 있어도 등 그룹으로 판정한다.

### 변경 대상

- `workout/test-v2/board-core.js`
  - `posterior` 세부 부위의 성장 보드 그룹 매핑을 `back`으로 조정한다.
  - 가능하면 movement의 `primary` 판정이 세부 부위보다 먼저 유지되는지 테스트로 고정한다.
- `workout/test-v2/board-render.js`
  - 오늘 선택 운동/부위 정규화에서도 `posterior`를 `back`으로 맞춘다.
- `tests/test-v2.board-core.test.js`
  - `muscleIds: ['posterior']`와 `movementId: 'rdl'` 조합이 `back` 후보로 들어오는 회귀 테스트를 추가한다.
- `sw.js`
  - `workout/test-v2/board-core.js`, `workout/test-v2/board-render.js`가 `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 범프한다.

### 하지 않을 일

- 성장 보드 데이터 모델 변경 없음.
- 운동 선택 UX/카드 레이아웃 변경 없음.
- `www/` 산출물 직접 수정 없음.
- 기존 미커밋 변경(`workout/exercises.js`, `test-mode-v2.css` 등) 수정/되돌림 없음.

### 검증

1. 변경 전 `node --test tests/test-v2.board-core.test.js`에서 새 회귀 테스트가 실패하는지 확인.
2. 변경 후 `node --test tests/test-v2.board-core.test.js` 통과.
3. `node --check workout/test-v2/board-core.js`
4. `node --check workout/test-v2/board-render.js`
5. `node --check sw.js`
6. `npm.cmd run dev`로 실제 URL 확인.
7. HTTP 200 확인.
8. 브라우저/스크립트 검증: 성장 보드 그룹 판정에서 `posterior` 등 운동이 `back`으로 들어가는지 확인.

## 상태

- Slice 1 실행 완료.
- `workout/test-v2/board-core.js`와 `workout/test-v2/board-render.js`에서 `posterior`를 성장 보드 `back` 그룹으로 분류하도록 맞췄다.
- `tests/test-v2.board-core.test.js`에 `muscleIds: ['posterior']` + `movementId: 'rdl'` 조합 회귀 테스트를 추가했다.
- `workout/test-v2/board-core.js`, `workout/test-v2/board-render.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260617z1-growth-board-back-group`로 범프했다.
- 검증 완료:
  1. 수정 전 `node --test tests/test-v2.board-core.test.js`에서 새 테스트가 `'lower' !== 'back'`으로 실패
  2. 수정 후 `node --test tests/test-v2.board-core.test.js`
  3. `node --check workout/test-v2/board-core.js`
  4. `node --check workout/test-v2/board-render.js`
  5. `node --check sw.js`
  6. `npm.cmd run dev` 실행 후 `http://localhost:5500/` HTTP 200 확인
  7. Puppeteer 브라우저 검증: `posterior` RDL 테스트 보드에서 성장 보드 overlay가 열리고 칩에 `등`, 상단 상태에 `등 · 1주차`, 열 헤더에 `루마니안` 표시

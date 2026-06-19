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

## 제외

- 세트 저장 로직, 운동 데이터 모델, Firebase 경로는 변경하지 않는다.
- `www/` 산출물은 직접 수정하지 않는다.

## 검증

1. `node --check sw.js`
2. `node --check workout/exercises.js`
3. `npm.cmd run dev`로 출력된 URL HTTP 200 확인
4. 모바일 폭에서 성장 보드 모달을 열었을 때 `ROM` 입력이 잘리지 않고, 하단 타이머 공간이 보이는지 확인
5. 배포 후 `https://aretenald2018-sys.github.io/tomatofarm/` HTTP 200 및 `sw.js` 캐시 버전 확인

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

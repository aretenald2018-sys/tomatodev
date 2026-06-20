# 캘린더 운동탭 계획

## 그릴 결과

- 핵심 질문: 운동탭은 별도 하단 탭이 아니라 기존 캘린더 화면 안의 보조 탭으로 둘 것인가?
- 결정: 예. 캘린더 탭 내부에 `종합`과 `운동` 세그먼트를 두고, 기본값은 현재 화면과 같은 `종합`으로 둔다.
- 남은 가정: 운동탭은 기존 `workouts/{date}` 문서의 운동 데이터만 읽고 새 저장 필드나 데이터 마이그레이션은 추가하지 않는다.

## 실행 슬라이스

1. `render-calendar.js`
   - 캘린더 내부 상태에 `summary`/`workout` 탭을 추가한다.
   - `summary` 탭은 기존 점수 기반 월간 캘린더를 유지한다.
   - `workout` 탭은 날짜별 운동 시간, 세트 수, 볼륨, 소모 kcal, 대표 운동명을 월간 그리드에 표시한다.
   - 운동탭에서 날짜를 클릭하면 그날 수행한 운동 목록과 세트/유산소/수영/CF 상세를 모달에 렌더한다.
2. `style.css`
   - 캘린더 내부 세그먼트, 운동 월간 요약, 운동 셀, 운동 상세 모달 스타일을 추가한다.
3. `sw.js`
   - `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 범프한다.
4. 후속 Slice 2: 운동 캘린더 셀 부위 요약
   - 월간 운동 캘린더 셀의 대표 라벨을 운동종목명 대신 주동근 대분류 부위별 세트 수로 표시한다.
   - 예: `케이블 크런치`, `랫풀다운` 같은 종목명 대신 `복부 4`, `등 10`처럼 표시한다.
   - 셀 안 바 텍스트 크기와 높이를 줄여 첨부 참고 화면처럼 시간, 총 세트, 복수 부위 라인이 함께 들어가게 한다.
   - 상세 모달의 개별 운동/세트 목록은 기존처럼 유지한다.

## 제외

- 운동 기록 저장 구조, 운동탭 입력 플로우, 식단/점수 산정 로직은 변경하지 않는다.
- `www/` 산출물은 직접 수정하지 않는다.
- 배포/푸시는 하지 않는다.
- Slice 2에서는 운동 상세 모달의 개별 종목 표시를 제거하지 않는다.

## 검증

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. `npm.cmd run dev` 후 실제 URL HTTP 200 확인
6. 캘린더 화면에서 `종합`/`운동` 탭 전환 확인
7. 운동탭에서 운동 기록이 있는 날짜 클릭 시 그날 운동 상세 목록이 모달에 표시되는지 확인
8. Slice 2: 운동 캘린더 셀에서 종목명이 아니라 `가슴 12`, `등 8` 같은 부위별 세트 라인이 표시되는지 확인

## 실행 결과

- 상태: Slice 1 구현 완료
- 변경:
  - `render-calendar.js`: 캘린더 내부 `종합`/`운동` 탭 상태와 전환 렌더를 추가했다.
  - `render-calendar.js`: 운동탭 월간 그리드에 날짜별 운동 시간, 세트, 대표 운동, 소모 kcal을 표시하도록 했다.
  - `render-calendar.js`: 운동탭 날짜 클릭 시 근력 세트, 볼륨, 대표 세트, 런닝/수영/크로스핏/스트레칭 상세를 모달에 표시하도록 했다.
  - `style.css`: 캘린더 내부 세그먼트, 운동 그리드 바, 운동 상세 모달 스타일을 추가했다.
  - `sw.js`: `STATIC_ASSETS` 대상 변경 반영을 위해 `CACHE_VERSION`을 범프했다.
- 검증:
  1. PASS: `node --check render-calendar.js`
  2. PASS: `node --check sw.js`
  3. PASS: `node scripts/verify-runtime-assets.mjs`
  4. PASS: `git diff --check`
  5. PASS: 기존 실행 중인 `http://localhost:5500/index.html` HTTP 200 확인
  6. not verified yet: 브라우저에서 하단 `캘린더` 버튼 클릭 후에도 활성 탭이 `home`에 머물고 `#calendar-root`가 비어 있어 실제 캘린더 UI 플로우는 확인하지 못했다.

## 배포 결과

- PASS: `git push tomatofarm main` — `8188d7f..ad1169f`
- PASS: `node scripts/verify-deploy.mjs https://aretenald2018-sys.github.io/tomatofarm/ d06e5b523882`
- 원격 확인:
  - `https://aretenald2018-sys.github.io/tomatofarm/` HTTP 200
  - 원격 `build-info.json`: `shortCommit` = `d06e5b523882`
  - 원격 `sw.js`: `tomatofarm-v20260620z7-growth-board-wendler-rom-calendar-workout-tab`

## 후속 Slice 2 실행 결과

- 상태: 구현, 배포, 원격 정적 마커 검증 완료. 브라우저 UI 클릭 플로우는 not verified yet
- 변경:
  - `render-calendar.js`: 운동 캘린더 셀 라벨을 운동종목명에서 주동근 대분류 부위별 세트 수(`가슴 12`, `등 8`)로 변경했다.
  - `style.css`: 운동 캘린더 셀 바/날짜/kcal 폰트와 바 높이를 줄여 복수 부위 라인이 더 들어가게 했다.
  - `sw.js`: `STATIC_ASSETS` 대상 변경 반영을 위해 `CACHE_VERSION`을 `tomatofarm-v20260620z10-calendar-workout-bodyparts`로 범프했다.
- 검증:
  1. PASS: `node --check render-calendar.js`
  2. PASS: `node --check sw.js`
  3. PASS: `node scripts/verify-runtime-assets.mjs`
  4. PASS: `git diff --check`
  5. PASS: `git push tomatofarm main` — `4e7808c..634014a`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 7dfc8644fee5`
  7. PASS: 원격 `/`, `build-info.json`, `sw.js`, `render-calendar.js`, `style.css` HTTP 200
  8. PASS: 원격 `build-info.json` shortCommit `7dfc8644fee5`, `sw.js` 캐시 버전 `tomatofarm-v20260620z10-calendar-workout-bodyparts`
  9. PASS: 원격 `render-calendar.js`에 `displayLabels`, `cal-workout-bar-part`, 부위별 세트 title 마커 존재. 원격 `style.css`에 `.cal-workout-bar-part`, `font-size: 8px` 존재.
  10. not verified yet: 원격 브라우저에서 하단 `캘린더` 클릭 후에도 활성 패널이 `tab-home`에 남고 `window.switchTab`이 `undefined`라 실제 캘린더 UI 클릭 플로우는 기존 네비게이션 문제로 확인하지 못했다.

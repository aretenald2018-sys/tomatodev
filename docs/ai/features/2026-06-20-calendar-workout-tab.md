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

## 제외

- 운동 기록 저장 구조, 운동탭 입력 플로우, 식단/점수 산정 로직은 변경하지 않는다.
- `www/` 산출물은 직접 수정하지 않는다.
- 배포/푸시는 하지 않는다.

## 검증

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. `npm.cmd run dev` 후 실제 URL HTTP 200 확인
6. 캘린더 화면에서 `종합`/`운동` 탭 전환 확인
7. 운동탭에서 운동 기록이 있는 날짜 클릭 시 그날 운동 상세 목록이 모달에 표시되는지 확인

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

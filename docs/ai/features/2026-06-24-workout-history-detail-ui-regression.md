# 운동 홈 과거 상세 UI 회귀 수정 계획

## 배경

- 사용자 제보:
  1. 과거 운동 상세 첫 화면에서 `오늘`, `루틴`, `내보내기`, `삭제`, `수정`, `27세트`, `42k톤`이 세로로 흩어져 UI가 깨져 보인다.
  2. 과거 운동 기록 상세 카드에서 실제 완료된 세트인데 체크 표시가 완료 상태로 보이지 않는다.
  3. 상세 카드 그래프가 테스트모드에서 보던 부드러운 렌더링이 아니라 직선/거친 그래프로 보인다.
  4. 과거 상세의 `루틴` 버튼을 누르면 운동 편집/루틴 UI로 이동해 이전 버전 UI로 회귀하는 것처럼 보인다.

## /diagnose 재현 루프

1. 배포 URL `https://aretenald2018-sys.github.io/dashboard3/`에서 운동 탭을 연다.
2. 과거 기록 날짜를 선택해 운동 홈 상세 화면으로 들어간다.
3. 상단 영역에서 `오늘`, `루틴`, `내보내기`, `삭제`, `수정`, 세트/볼륨 지표가 한 줄 또는 근접한 상단 액션 구역에 정리되는지 확인한다.
4. 운동 상세 카드의 세트 행을 펼쳐 완료 체크가 실제 기록 상태와 일치하는지 확인한다.
5. 카드 그래프가 테스트모드 성장보드처럼 부드러운 곡선/선 스타일로 보이는지 확인한다.
6. 과거 날짜에서 `루틴` 버튼을 눌러도 현재 운동 편집 UI로 튀거나 회귀하지 않는지 확인한다.

## 원인 가설

1. `render-calendar.js`는 `오늘/루틴`을 `.wt-day-head-actions`, `내보내기/삭제`를 `.wt-day-utility`, `수정/세트/볼륨`을 `.wt-day-metrics`에 따로 렌더한다. `style.css`도 `.wt-day-utility`에 큰 상하 margin을 줘서 모바일에서 상단 지표 구획이 깨진다.
2. `render-calendar.js`의 `_exerciseRows()`는 `_isActualWorkoutSet()`으로 완료 추론을 한 뒤, `setDetails` 생성 시 `done: set.done === true`만 사용한다. 과거 레거시 기록처럼 `done` 필드가 없지만 kg/reps가 있는 세트는 상세 UI에서 미완료처럼 렌더된다.
3. `_renderWorkoutSparkline()`은 `<polyline>`만 사용한다. 테스트모드/Max 카드류와 시각 톤을 맞추려면 points를 기반으로 cubic bezier `path`를 생성하고 CSS stroke/linecap을 보정해야 한다.
4. `_openWorkoutHomeRoutine()`은 과거 상세에서도 `_loadWorkoutEditorForSession()`을 호출해 운동 탭 편집 surface를 연 뒤 루틴/테스트모드 진입을 시도한다. 과거 기록 조회 화면에서 루틴 버튼이 "현재 운동 시작/편집" 액션으로 작동해 UI 회귀처럼 보인다.

## 실행 Slice 1

하나의 기능 단위: `운동 홈 과거 상세 화면의 상단 액션/카드 표시 회귀를 복구한다.`

상태: 실행 완료.

수정 범위:

1. `render-calendar.js`
   - 상세 상단 액션을 하나의 compact action row로 묶는다.
   - `오늘`, `루틴`, `내보내기`, `삭제`, `수정`을 같은 상단 구역에 렌더한다.
   - `운동시간`, `세트`, `볼륨`은 바로 아래 compact metric row로 렌더해 첫 화면에서 흩어지지 않게 한다.
   - `setDetails.done`은 `_isActualWorkoutSet(set)` 기준을 재사용한다.
   - `_renderWorkoutSparkline()`을 smooth SVG path 렌더로 바꾼다.
   - 과거 날짜의 `루틴` 버튼은 편집 화면으로 직접 이동하지 않게 막고, 오늘 날짜만 루틴 시작/수정 진입을 허용한다. 과거 날짜에서는 토스트나 비활성 상태로 처리한다.
2. `style.css`
   - `.wt-day-head`, `.wt-day-actions`, `.wt-day-metrics` 모바일 compact 레이아웃을 조정한다.
   - 360px대 모바일에서 액션 버튼들이 한 줄에 들어가도록 버튼 min-width, height, padding, font-size를 줄인다.
   - `.wt-day-utility`의 큰 margin으로 생긴 첫 화면 공백을 제거하거나 새 클래스 기준으로 대체한다.
   - smooth graph용 `path` 스타일을 추가한다.
3. `sw.js`
   - `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

## 수정하지 않을 것

- 운동 편집 화면 자체의 세트 입력 UI 구조는 바꾸지 않는다.
- 테스트모드 보드의 코어 로직이나 데이터 모델은 바꾸지 않는다.
- 과거 기록 데이터를 마이그레이션하지 않는다. 화면 변환 단계에서 레거시 `done` 누락을 보정한다.
- 새 라우팅/프레임워크를 추가하지 않는다.

## 검증 기준

정적 검증:

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`

UI 검증:

1. `npm.cmd run dev`
2. 운동 탭 월간 홈에서 `2026-06-02` 같은 과거 운동 상세 열기
3. 상단에 `오늘`, `루틴`, `내보내기`, `삭제`, `수정`이 compact row로 들어가고 `27세트`, `42k톤` 지표가 위쪽 compact metric row에 정렬되는지 확인
4. 과거 상세 카드의 완료 세트 체크가 켜져 있는지 확인
5. 카드 그래프가 smooth path로 렌더되는지 확인
6. 과거 날짜 `루틴` 클릭 시 운동 편집 UI로 이동하지 않는지 확인

## 배포 검증

사용자가 배포를 다시 명시하면:

1. 변경 파일 커밋
2. `git push origin HEAD:main`
3. GitHub Pages workflow 성공 확인
4. `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-06-24-workout-history-detail-ui-regression.md`의 Slice 1을 실행해줘. 과거 운동 상세 상단 액션 row, 완료 체크 보정, smooth graph, 과거 날짜 루틴 버튼 회귀 방지를 한 번에 수정하고 정적 검증까지 해줘.

## 실행 결과

- `render-calendar.js`:
  - 상세 상단 액션을 `.wt-day-actions` 한 줄로 통합했다.
  - `수정`을 상단 액션 row로 올리고, `내보내기`/`삭제`와 함께 표시한다.
  - 운동 지표를 `운동시간`/`세트`/`볼륨` 3칸 compact row로 바꿨다.
  - 레거시 과거 기록의 `done` 누락은 `_isActualWorkoutSet(set)` 기준으로 완료 처리한다.
  - 그래프는 Catmull-Rom 기반 cubic SVG `path`로 렌더한다.
  - 과거 날짜 `루틴` 클릭은 편집 화면으로 이동하지 않고 안내 토스트만 띄운다.
- `style.css`:
  - 430px 이하에서 액션 5개가 한 줄에 들어가도록 버튼 높이/폰트/간격을 조정했다.
  - 지표 row와 smooth graph `path` 스타일을 추가했다.
- `sw.js`:
  - `CACHE_VERSION`을 `tomatofarm-v20260624z5-workout-history-detail-ui`로 bump했다.

## 실행 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: 실제 모바일 UI 플로우는 로그인 세션과 과거 운동 데이터가 필요해 이 세션에서 브라우저로 확인하지 않았다.

## 후속 Slice 2

사용자 피드백:

- 첫 화면의 `자유 운동` 제목과 우측 `1회차` 표시를 제거한다.
- 버튼 row를 날짜 아래 넓은 공백 쪽으로 올리고, 제목 영역 아래로 밀리지 않게 한다.
- 그래프는 현재 세트 값만 이어 그리지 말고, live 운동 카드처럼 최근 기록 기반 track graph로 렌더한다.

수정 범위:

1. `render-calendar.js`
   - `_renderWorkoutDetailRecorded()`에서 `.wt-day-session-label`과 `.wt-day-title-row`를 렌더하지 않는다.
   - `_exerciseRows()`에 원본 `exerciseId`, `recommendationMeta`, `maxPrescription`, `maxTrackPreference` 추론에 필요한 필드를 보존한다.
   - `calc.js`의 `getTrackMetricHistory`, `normalizeWorkoutTrack`를 사용해 live Max 카드와 같은 최근 기록 기반 그래프를 만든다.
2. `style.css`
   - `.wt-day-actions`를 헤더 우측/상단 쪽으로 이동시키고, 모바일에서도 5개 버튼이 한 줄에 들어가게 크기를 더 줄인다.
   - `.wt-day-session-label`, `.wt-day-title-row` 의존 여백을 제거한다.
   - 과거 상세 그래프를 live 카드의 `ex-max-track-graph`와 유사한 compact track graph 스타일로 조정한다.
3. `sw.js`
   - `render-calendar.js`/`style.css` 변경에 맞춰 `CACHE_VERSION`을 bump한다.

검증:

- `node --check render-calendar.js`
- `node --check sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `git push origin HEAD:main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 후속 Slice 2 실행 결과

- `render-calendar.js`:
  - 과거 상세 첫 화면에서 `자유 운동` 제목과 상단 우측 별도 `n회차` 라벨을 렌더하지 않게 했다.
  - 운동 row에 `exerciseId`, `recommendationMeta`, `maxPrescription`, `maxTrackPreference`를 보존해 과거 상세 카드에서도 track 판단이 가능하게 했다.
  - `getTrackMetricHistory()`와 `normalizeWorkoutTrack()` 기반으로 최근 기록 track 값을 가져오고, 해당 날짜 이전 기록만 사용해 그래프를 렌더한다.
  - 그래프 SVG에 live 카드와 같은 곡선 path, 그라데이션 fill, 마지막 점을 추가했다.
- `style.css`:
  - `.wt-day-actions`를 날짜 헤더 본문 열 안의 compact row로 이동하고 모바일 버튼 크기를 더 줄였다.
  - 그래프 area/path/dot 전용 스타일과 증감률 색상 클래스를 추가했다.
- `sw.js`:
  - `CACHE_VERSION`을 `tomatofarm-v20260624z6-workout-history-detail-graph`로 bump했다.

## 후속 Slice 2 실행 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `git push origin HEAD:main` (`16284fc`)
- PASS: GitHub Actions `Verify Pages Runtime Assets` run `28068294368`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 16284fc`
- 배포 확인: `[deploy-verify] ok 16284fcbc989 tomatofarm-v20260624z6-workout-history-detail-graph static=202`

## 후속 Slice 3

사용자 피드백:

- 상단 `오늘`, `루틴`, `내보내기`, `삭제`, `수정` 액션이 여전히 둥근 칩처럼 보인다.
- 이 액션들을 날짜 오른쪽 빈 헤더 영역에 몰아 넣고, 칩 형태가 아닌 직사각형/flat toolbar 형태로 바꾼다.

수정 범위:

1. `style.css`
   - `.wt-day-head`를 뒤로가기, 날짜 영역, 우측 액션 영역 3열로 조정한다.
   - `.wt-day-actions`를 우측 액션 열에 배치하고 2-row compact toolbar로 렌더한다.
   - 개별 버튼은 pill/chip 배경, 그림자, 둥근 border를 제거하고 toolbar cell처럼 보이게 한다.
2. `sw.js`
   - `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

검증:

- `node --check sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `git push origin HEAD:main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 후속 Slice 3 실행 결과

- `style.css`:
  - `.wt-day-head`를 뒤로가기/날짜/우측 액션 3열 grid로 바꿨다.
  - `.wt-day-actions`를 날짜 오른쪽 우측 열에 고정했다.
  - 액션은 3열 compact toolbar cell로 렌더하고, 개별 버튼의 pill border-radius, chip background, shadow를 제거했다.
  - 기록 있음 5개 버튼과 기록 없음 3개 버튼 모두 하단 border가 어색하게 남지 않도록 보정했다.
- `sw.js`:
  - `CACHE_VERSION`을 `tomatofarm-v20260624z7-workout-history-actions-toolbar`로 bump했다.

## 후속 Slice 3 실행 검증

- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `git push origin HEAD:main` (`0f8d2c5`)
- PASS: GitHub Actions `Verify Pages Runtime Assets` run `28068594416`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0f8d2c5`
- 배포 확인: `[deploy-verify] ok 0f8d2c5ab3fb tomatofarm-v20260624z7-workout-history-actions-toolbar static=202`

## 후속 Slice 4

사용자 피드백:

- 스크린샷에서 파란 X로 표시한 상단 우측 `오늘/루틴/내보내기/삭제/수정` toolbar 표출을 없앤다.
- 기존에 `운동시간`, `세트`, `볼륨` 3개 카드로 표출되던 정보를 그 자리의 단일 정보 카드로 합쳐 단순 표출한다.
- 운동 카드의 별도 그래프 행을 없애고, `오늘 성공 기준` 행을 2분할해 오른쪽에 그래프를 넣는다.

그릴 결과:

- 적용 트리거: `/grill-me`
- 핵심 질문: 상단 우측 toolbar를 제거하면 기존 작업 버튼을 어디에 남길지 결정해야 하는가?
- 추천 답변: 사용자가 표시 제거를 명확히 지시했고, 하단 회차 bar의 편집 버튼과 카드 내부 흐름이 이미 있으므로 이번 slice에서는 상단 toolbar 표출을 제거한다.
- 사용자 답변: 스크린샷 주석과 요청 문구 기준으로 상단 toolbar 제거, 요약 정보 카드 대체, 그래프 우측 배치를 확정한다.
- 확정된 결정: 새 액션 메뉴를 만들지 않고, 표시 밀도를 낮추는 레이아웃 변경만 수행한다.
- 남은 가정: `오늘/루틴/내보내기/삭제/수정`의 상단 즉시 노출은 이번 화면에서 필수 기능이 아니다.

수정 범위:

1. `render-calendar.js`
   - `_renderWorkoutHomeDetail()`의 `.wt-day-actions` header toolbar 렌더를 제거한다.
   - `wx` 요약 값을 받아 헤더 우측에 단일 `.wt-day-summary-card`를 렌더한다.
   - `_renderWorkoutDetailRecorded()`의 별도 `.wt-day-metrics` 3-card row를 제거해 중복 표출을 막는다.
   - `_renderWorkoutExerciseDetailCard()`에서 `.wt-max-trend`를 `.wt-max-plan` 오른쪽 칸으로 이동한다.
   - 기존 `.wt-max-track` 단독 카드는 제거하고, 트랙 정보는 성공 기준의 보조 문구 또는 그래프 라벨 안에 남긴다.
2. `style.css`
   - `.wt-day-head`를 뒤로가기/날짜/요약 정보 카드 3열로 재정의한다.
   - `.wt-day-summary-card`와 내부 `운동시간/세트/볼륨` compact label/value 스타일을 추가한다.
   - `.wt-day-metrics`, `.wt-day-actions` 의존 모바일 스타일을 정리한다.
   - `.wt-max-plan`을 좌측 성공 기준, 우측 그래프의 2분할 row로 조정한다.
   - 우측 그래프가 360px대 모바일에서도 텍스트/선이 겹치지 않도록 column width, padding, font-size를 보정한다.
3. `sw.js`
   - `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

수정하지 않을 것:

- 운동 데이터 모델, 세트 저장 로직, 루틴/내보내기/삭제 함수 구현은 바꾸지 않는다.
- `www/` 산출물은 직접 수정하지 않는다.
- Max V4 plan sheet나 live 운동 입력 카드 구조는 건드리지 않는다.

검증:

- `node --check render-calendar.js`
- `node --check sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `git push origin HEAD:main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- Dashboard3 배포 URL에서 운동 탭의 과거 기록 날짜 상세를 열어, 상단 toolbar가 사라지고 요약 카드가 표시되며 운동 카드 그래프가 `오늘 성공 기준` 오른쪽 칸에 들어간 것을 확인한다.

다음 세션 시작 프롬프트:

`docs/ai/features/2026-06-24-workout-history-detail-ui-regression.md`의 Slice 4를 실행해줘. 과거 운동 상세 상단 toolbar 표출을 제거하고, 운동시간/세트/볼륨을 헤더 우측 단일 정보 카드로 합치며, 운동 카드 그래프를 오늘 성공 기준 row의 오른쪽 칸으로 옮겨. `render-calendar.js`, `style.css`, `sw.js`만 범위로 하고 정적 검증과 Dashboard3 배포 검증까지 진행해줘.

## 후속 Slice 4 실행 결과

- `render-calendar.js`:
  - 과거 운동 상세 헤더의 `.wt-day-actions` toolbar 렌더를 제거했다.
  - `운동시간`/`세트`/`볼륨`을 `.wt-day-summary-card` 단일 정보 카드로 합쳐 헤더 우측에 렌더한다.
  - 별도 `.wt-day-metrics` 3-card row를 제거해 중복 표출을 없앴다.
  - 운동 카드 그래프를 `.wt-max-plan` 오른쪽 칸으로 이동하고, 기존 `.wt-max-track` 단독 카드는 제거했다.
- `style.css`:
  - `.wt-day-summary-card` 스타일과 모바일 폭 overflow 보정을 추가했다.
  - `.wt-max-plan`을 좌측 성공 기준/우측 그래프 2분할 구조로 조정했다.
  - `.wt-max-plan-goal` selector로 범위를 좁혀 그래프 stat에 font/line-height가 누수되지 않게 했다.
  - 우측 그래프는 내부 카드처럼 보이지 않도록 별도 border box 대신 구분선만 사용한다.
- `sw.js`:
  - `CACHE_VERSION`을 `tomatofarm-v20260624z8-workout-history-summary-card`로 bump했다.

## 후속 Slice 4 실행 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- TDS 읽기 전용 리뷰:
  - selector 누수, 요약 카드 overflow, 카드 안 카드 인상은 수정 반영.
  - 상단 toolbar 액션 제거는 사용자 요청 범위와 계획 결정에 맞춰 유지.
- PASS: `git push origin HEAD:main` (`08b13ff`)
- PASS: GitHub Actions `Verify Pages Runtime Assets` run `28069206877`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 08b13ff`
- 배포 확인: `[deploy-verify] ok 08b13ff582c3 tomatofarm-v20260624z8-workout-history-summary-card static=202`
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` -> `HTTP/1.1 200 OK`
- not verified yet: 인증된 계정의 과거 운동 데이터가 필요해 배포 URL에서 실제 과거 상세 UI flow는 클릭 검증하지 못했다.

## 후속 Slice 5

사용자 피드백:

- 과거 운동기록 상세를 열었을 때 이미 기록된 본세트는 기본적으로 체크된 상태로 보여야 한다.
- 스크린샷에서는 `50kg × 30` 본세트들이 기록되어 있는데도 체크 표시가 회색 비활성처럼 보여 미완료처럼 인식된다.

진단:

- `_isActualWorkoutSet(set)`은 `done`이 없더라도 본세트의 `kg > 0 && reps > 0`이면 완료로 판정한다.
- `_exerciseRows()`는 해당 판정을 `setDetails.done`에 저장한다.
- `_renderWorkoutSetRows()`는 `set.done`이면 `.wt-max-set-row.is-done` 클래스를 붙인다.
- `style.css`에는 `.wt-max-set-row.is-done .wt-max-set-check` 활성 스타일이 없어, 완료 row도 체크 아이콘이 회색 기본값으로 보인다.

수정 범위:

1. `style.css`
   - `.wt-max-set-row.is-done`과 `.wt-max-set-row.is-done .wt-max-set-check` 스타일을 추가해 완료 상태가 명확히 보이게 한다.
   - 읽기 전용 과거 상세의 X/그립 보조 아이콘은 체크보다 약하게 보이게 한다.
2. `sw.js`
   - `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

수정하지 않을 것:

- `render-calendar.js`의 완료 판정 로직은 이미 기대 동작과 일치하므로 바꾸지 않는다.
- 과거 기록 데이터 마이그레이션은 하지 않는다.

검증:

- `node --check sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `git push origin HEAD:main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- Dashboard3 배포 URL에서 운동 탭 > 과거 운동 날짜 상세를 열어 기록된 본세트의 체크 아이콘이 활성 상태로 보이는지 확인한다.

## 후속 Slice 5 실행 결과

- `style.css`:
  - `.wt-max-set-row.is-done` 배경을 완료 상태로 보정했다.
  - `.wt-max-set-row.is-done .wt-max-set-check`에 어두운 배경/흰 체크를 적용해 기록된 본세트가 체크된 상태로 보이게 했다.
  - 완료 row의 X/그립 보조 아이콘은 체크보다 약하게 보이도록 조정했다.
- `sw.js`:
  - `CACHE_VERSION`을 `tomatofarm-v20260624z9-workout-history-checked-sets`로 bump했다.

## 후속 Slice 5 실행 검증

- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `git push origin HEAD:main` (`ecf6939`)
- PASS: GitHub Actions `Verify Pages Runtime Assets` run `28069650934`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ ecf6939`
- 배포 확인: `[deploy-verify] ok ecf69398506f tomatofarm-v20260624z9-workout-history-checked-sets static=202`
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` -> `HTTP/1.1 200 OK`
- not verified yet: 인증된 계정의 과거 운동 데이터가 필요해 배포 URL에서 실제 과거 상세 UI flow는 직접 클릭 검증하지 못했다.

## 후속 Slice 6

사용자 피드백:

- 당일 운동 추가 화면의 Max 카드도 과거 상세에서 요청한 것처럼 `오늘 성공 기준` 행을 반반으로 쪼개 오른쪽에 그래프를 표출한다.
- 볼륨모드/강도모드 그래프를 같이 띄우는 방식이 맞다.
- 과거 상세 그래프는 현재 단일 트랙만 렌더되어 라이브 카드와 맞지 않는다.

그릴 결과:

- 적용 트리거: `/grill-me`
- 핵심 질문: 라이브 카드의 별도 그래프 행을 유지할지, 성공 기준 row 오른쪽으로 옮길지 결정해야 한다.
- 추천 답변: 사용자 요청대로 라이브 카드도 성공 기준 row를 좌우 2분할하고, 오른쪽에 볼륨/강도 두 줄 그래프를 넣는다.
- 확정된 결정: 라이브와 과거 상세 모두 같은 원칙을 쓴다. 왼쪽은 오늘 성공 기준, 오른쪽은 볼륨/강도 track graph다.
- 남은 가정: 과거 상세에서는 편집 가능한 `현재 트랙` pace 카드보다 정보성 볼륨/강도 그래프가 우선이다.

수정 범위:

1. `workout/exercises.js`
   - `_buildMaxExerciseCardHeader()`에서 `sparkline`을 `.ex-max-v2-plan` 오른쪽 칸으로 이동한다.
   - 기존 별도 `.ex-max-v2-trend` 행 렌더는 제거한다.
   - 오른쪽 칸에 `현재 트랙` 표시는 유지하지 않고, 그래프의 active row로 현재 트랙을 표시한다.
2. `render-calendar.js`
   - 과거 상세 그래프를 단일 `_buildWorkoutTrackTrend()`/`_renderWorkoutSparkline()` 구조에서 볼륨/강도 두 줄 track graph 구조로 바꾼다.
   - 과거 날짜 기준 이전/해당 날짜 track history만 사용한다.
3. `style.css`
   - `.ex-max-v2-plan`을 성공 기준/그래프 2분할로 조정한다.
   - live 그래프가 오른쪽 반칸 안에서 두 줄로 들어가도록 `.ex-max-track-graph` compact 스타일을 보정한다.
   - 과거 상세 `.wt-max-trend`도 같은 두 줄 graph 스타일로 맞춘다.
4. `sw.js`
   - `workout/exercises.js`, `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

수정하지 않을 것:

- 트랙 전환 로직, maxPrescription 저장 구조, 세트 입력 UI는 바꾸지 않는다.
- 과거 기록 데이터 마이그레이션은 하지 않는다.

검증:

- `node --check workout/exercises.js`
- `node --check render-calendar.js`
- `node --check sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `git push origin HEAD:main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- Dashboard3 배포 URL에서 운동 탭 당일 운동 추가 카드와 과거 운동 상세 카드가 모두 성공 기준/그래프 반반 구조이며, 그래프가 볼륨/강도 두 줄로 보이는지 확인한다.

## 후속 Slice 6 실행 결과

- `workout/exercises.js`:
  - 당일 Max 카드의 `.ex-max-v2-plan`을 좌측 성공 기준/우측 그래프 구조로 바꿨다.
  - 기존 별도 그래프 행 렌더를 제거하고, 그래프가 있으면 오른쪽 칸에 바로 렌더한다.
  - 기록이 없는 Max 카드도 `현재 트랙` 단일 카드로 빠지지 않고 볼륨/강도 두 줄 그래프 skeleton을 유지한다.
- `render-calendar.js`:
  - 과거 운동 상세 그래프를 단일 현재 트랙 그래프에서 볼륨/강도 두 줄 track graph로 변경했다.
  - 과거 상세의 강도 fallback 값과 sparkline은 단순 kg가 아니라 `estimateSet1RM()` 기반으로 계산한다.
  - 현재 active track은 두 줄 그래프의 active row로 표시한다.
- `style.css`:
  - live Max 카드와 과거 상세 카드의 우측 그래프를 같은 compact track graph 스타일로 맞췄다.
  - 과거 상세의 기존 단일 그래프 label/stat 스타일을 제거했다.
- `sw.js`:
  - `CACHE_VERSION`을 `tomatofarm-v20260624z10-workout-dual-track-graphs`로 bump했다.

## 후속 Slice 6 실행 검증

- PASS: `node --check workout/exercises.js`
- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `git push origin HEAD:main` (`08d5f32`)
- PASS: GitHub Actions `Verify Pages Runtime Assets` run `28070130104`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 08d5f32`
- 배포 확인: `[deploy-verify] ok 08d5f321f6ff tomatofarm-v20260624z10-workout-dual-track-graphs static=202`
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` -> `HTTP/1.1 200 OK`
- not verified yet: 인증된 계정의 당일 Max 카드/과거 운동 상세 데이터가 필요해 배포 URL에서 실제 UI flow는 직접 클릭 검증하지 못했다.

## 후속 Slice 7

사용자 피드백:

- 운동 홈 상세 하단의 `1회차`~`3회차` 세션 탭 높이와 전체 사이즈가 너무 크다.
- 해당 탭을 대폭 축소해 하단 공간 점유를 줄인다.

수정 범위:

1. `style.css`
   - `.wt-day-sessionbar` padding/gap을 줄여 하단 fixed bar 높이를 낮춘다.
   - `.wt-day-session-tabs`의 column width, max-width, border-radius를 줄인다.
   - `.wt-day-session-tabs button`의 min-height와 font-size를 줄인다.
   - 기록 표시 red dot 크기와 위치를 축소한다.
   - 모바일 override도 같은 축소 방향으로 맞춘다.
2. `sw.js`
   - `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

수정하지 않을 것:

- 회차 데이터 모델, 회차 개수, 선택/편집/추가 동작은 바꾸지 않는다.
- 하단 `+` FAB의 의미나 클릭 동작은 바꾸지 않는다.

검증:

- `node --check sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `git push origin HEAD:main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- Dashboard3 배포 URL에서 운동 탭 > 오늘 상세를 열어 `1회차`~`3회차` 탭이 이전보다 낮고 좁게 표시되는지 확인한다.

## 후속 Slice 7 실행 결과

- `style.css`:
  - `.wt-day-sessionbar`의 gap과 padding을 줄여 하단 fixed bar 높이를 낮췄다.
  - `.wt-day-session-tabs`의 column width와 max-width를 줄여 `1회차`~`3회차` segment 전체 폭을 축소했다.
  - `.wt-day-session-tabs button`의 min-height를 `58px -> 36px`, 모바일에서는 `48px -> 32px`로 줄였다.
  - 탭 폰트 크기를 줄이고 active/record dot 크기도 축소했다.
  - 줄어든 하단 bar에 맞춰 모바일 상세 화면의 하단 padding과 `+` FAB bottom offset을 조정했다.
- `sw.js`:
  - `CACHE_VERSION`을 `tomatofarm-v20260624z11-workout-session-tabs-compact`로 bump했다.

## 후속 Slice 7 실행 검증

- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `git push origin HEAD:main` (`0c290ff`)
- PASS: GitHub Actions `Verify Pages Runtime Assets` run `28070850429`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0c290ff`
- 배포 확인: `[deploy-verify] ok 0c290ff62faa tomatofarm-v20260624z11-workout-session-tabs-compact static=202`
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` -> `HTTP/1.1 200 OK`
- not verified yet: 인증된 계정의 운동 홈 상세 화면을 열어 실제 모바일 UI flow는 직접 클릭 검증하지 못했다.

## 후속 Slice 8

사용자 피드백:

- 운동 카드 그래프의 등락폭을 현재처럼 상대 변화율 `%`로 표출하기보다 퍼센트포인트 증감량으로 표출하는 편이 낫다.
- 예시 화면에서 `볼륨 15t -8%`, `볼륨 2.5t -63%`처럼 보이는 우측 작은 등락폭 라벨이 대상이다.

그릴 결과:

- 질문: raw 값의 상대 변화율을 계속 쓸지, 그래프 내 기준점 대비 위치 변화로 해석 가능한 pp를 쓸지 결정해야 한다.
- 결정: 최근 그래프 값 중 최고값을 100으로 두고, 직전 점과 현재 점의 위치 차이를 `pp`로 표기한다.
- 근거: raw 변화율은 낮은 이전값에서 크게 튀거나 높은 이전값에서 급락처럼 보일 수 있다. pp는 최근 범위 안에서 "그래프 위치가 얼마나 움직였는지"를 보여줘 작은 카드에서 덜 과장된다.
- 가정: `퍼센트포인트`는 절대 kg/vol 단위 변화가 아니라 그래프 normalized position의 증감량이다.

수정 범위:

1. `workout/exercises.js`
   - `_formatTrackGraphDelta()`를 raw relative percent 계산에서 recent max 대비 position delta 계산으로 변경한다.
   - 표기는 `+12pp`, `-8pp`, `0pp`처럼 한다.
   - delta class의 up/down/flat 판정은 기존 부호 기반을 유지한다.
2. `sw.js`
   - `workout/exercises.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.
3. `tests/workout-track-graph-delta.test.js`
   - `%` 표기가 다시 들어오지 않고 `pp` 표기가 유지되는지 source-level로 검증한다.
4. `tests/workout-test-mode-unified.test.js`
   - 캐시 버전 검증을 갱신한다.

수정하지 않을 것:

- 볼륨/강도 트랙 값 자체 계산.
- 그래프 SVG shape/레이아웃.
- 운동 저장 구조와 maxPrescription.

검증:

- `node --check workout/exercises.js`
- `node --check sw.js`
- `node --test tests/workout-track-graph-delta.test.js tests/workout-test-mode-unified.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 운동 탭 → 운동 카드의 볼륨/강도 그래프 등락폭이 `%`가 아니라 `pp`로 보이는지 확인한다.

## 후속 Slice 8 실행 결과

- 2026-06-24: 후속 Slice 8 구현 완료.
- `workout/exercises.js`:
  - `_formatTrackGraphDelta()`가 최근 6개 그래프 점 중 최고값을 기준으로 직전/현재 위치를 계산한다.
  - raw 상대 변화율 `%` 대신 위치 차이 `pp`를 반환한다.
  - `0pp`, `+12pp`, `-8pp` 형태로 표시한다.
  - up/down/flat class 판정은 기존처럼 문자열 부호 기반으로 유지했다.
- `sw.js`:
  - `CACHE_VERSION`을 `tomatofarm-v20260624z30-track-delta-pp`로 bump했다.
- 테스트:
  - `tests/workout-track-graph-delta.test.js`를 추가했다.
  - `tests/workout-test-mode-unified.test.js`, `tests/stats-muscle-fatigue-insight.test.js`의 캐시 버전 검증을 갱신했다.
- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/workout-track-graph-delta.test.js tests/workout-test-mode-unified.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 리뷰: `docs/ai/reviews/2026-06-24-workout-track-graph-delta-pp-review.md`
- not verified yet: Dashboard3 Pages 배포와 인증 계정 UI 클릭 검증은 다음 단계에서 진행한다.

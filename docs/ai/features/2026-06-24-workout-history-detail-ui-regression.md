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
- pending: Dashboard3 배포 검증

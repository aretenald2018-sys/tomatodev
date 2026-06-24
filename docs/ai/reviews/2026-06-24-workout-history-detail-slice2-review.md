# 운동 홈 과거 상세 UI 회귀 Slice 2 리뷰

## 검토 범위

- 계획: `docs/ai/features/2026-06-24-workout-history-detail-ui-regression.md`
- 변경 파일: `render-calendar.js`, `style.css`, `sw.js`
- 요청: 과거 상세 첫 화면에서 중복 제목/회차 라벨 제거, 상단 버튼 row 위치 보정, 그래프를 live 카드처럼 최근 기록 기반으로 렌더

## 결과

- 문제 없음.

## 확인 내용

- `render-calendar.js`
  - `_renderWorkoutDetailRecorded()`가 더 이상 `.wt-day-session-label`과 `.wt-day-title-row`를 렌더하지 않는다.
  - 과거 상세 row가 `exerciseId`와 track 관련 meta를 보존한다.
  - `_buildWorkoutTrackTrend()`가 `getTrackMetricHistory()` 결과를 현재 날짜 이하로 제한해 과거 기록 화면에서 미래 기록을 섞지 않는다.
  - `_renderWorkoutSparkline()`가 최근 track 값이 2개 이상이면 history 기반 곡선 그래프를 사용하고, 데이터가 부족하면 기존 세트 기반 fallback을 유지한다.
- `style.css`
  - `.wt-day-actions`가 헤더 본문 열 안에서 compact 한 줄 버튼 row로 렌더되도록 조정됐다.
  - `.wt-max-spark-area`가 기존 `path { fill:none }` 규칙에 덮이지 않도록 selector가 조정됐다.
- `sw.js`
  - `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION` bump가 함께 반영됐다.

## 남은 리스크

- 실제 로그인 계정의 과거 운동 데이터 형태가 `workoutSessions`만 있고 top-level aggregate `exercises`가 비어 있는 오래된 레코드라면, history 그래프는 세트 기반 fallback으로 보인다. 현재 저장 경로는 aggregate를 top-level로 저장하므로 신규/최근 데이터는 영향이 없다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- pending: Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

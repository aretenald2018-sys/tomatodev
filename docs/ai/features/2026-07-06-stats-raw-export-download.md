# 2026-07-06 전체통계 raw 데이터 다운로드

## 요청

기간별 운동분석 카드 위에 `전체통계 다운로드` 버튼을 만들고, 운동 및 식단 관련해서 수집한 일자별 raw 데이터를 모두 내보낼 수 있게 한다.

## 그릴 결과

- 핵심 질문: raw 데이터를 CSV로 납작하게 펼칠지, JSON으로 구조를 보존할지.
- 결정: JSON 다운로드로 구현한다.
- 이유: 운동 세트, `workoutSessions`, 러닝 route, 식단 food 배열, 사진/추정 메타는 중첩 구조라 CSV로 내보내면 정보가 손실된다.
- 남은 가정: `getCache()`에 로드된 `users/{uid}/workouts/{date}` 일자 문서를 현재 사용자가 보는 통계의 원천으로 본다. Firestore는 통계 화면에서 직접 호출하지 않는다.

## 범위

### Slice 1: stats 탭 raw 일자별 JSON 다운로드

1. `index.html`의 기간별 통계 컨트롤 카드에 `전체통계 다운로드` 버튼을 추가하고, 기존 하단 `CSV 내보내기` inline handler 버튼은 제거한다.
2. `render-stats.js`에서 버튼을 직접 바인딩하고, `workout/save-schema.js`의 `WORKOUT_PAYLOAD_KEYS`, `DIET_PAYLOAD_KEYS`, `SHARED_PAYLOAD_KEYS`로 일자별 raw export payload를 만든다.
3. export payload는 `schema`, `exportedAt`, `today`, `counts`, `daily[]`, `bodyCheckins[]`를 포함한다.
4. `daily[]`는 날짜별로 `hasWorkout`, `hasDiet`, `dietOk`, derived totals, raw workout/diet/shared field group, full day raw snapshot을 보존한다.
5. 버튼 클릭 시 `tomatofarm-raw-stats-YYYY-MM-DD.json` 파일을 다운로드하고 toast로 결과를 알린다.
6. `style.css`에 TDS/Seed 토큰 기반 버튼 스타일을 추가한다.
7. `sw.js` `STATIC_ASSETS`에 포함된 `index.html`, `style.css`, `render-stats.js`를 수정하므로 `CACHE_VERSION`을 bump한다.

## 제외

- Firestore 직접 조회 추가.
- 별도 모달, 기간 선택 UI, CSV/Excel 변환.
- `www/` 직접 수정.
- 기존 통계 계산 방식 변경.

## 예상 변경 파일

- `index.html`
- `render-stats.js`
- `style.css`
- `sw.js`
- `tests/stats-raw-export-download.test.js`
- `docs/ai/NEXT_ACTION.md`

## 검증 계획

1. `node --test tests/stats-raw-export-download.test.js tests/stats-overall-compact-summary.test.js tests/stats-exercise-performance.test.js tests/stats-unified-health-chart.test.js`
2. `node --check render-stats.js`
3. `npm.cmd run verify:assets`
4. 가능하면 배포 후 `https://aretenald2018-sys.github.io/tomatofarm/`에서 통계 탭 버튼을 눌러 JSON 다운로드가 생성되는지 확인한다.

## 다음 실행 프롬프트

`docs/ai/features/2026-07-06-stats-raw-export-download.md`의 Slice 1을 실행한다.

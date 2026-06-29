# 전체통계 기간 통합과 퍼포먼스 카드 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-29-stats-priority-health-curves.md` Slice 2
- 변경 파일: `index.html`, `render-stats.js`, `style.css`, `sw.js`, `tests/*`, `docs/ai/*`

## 확인 결과

1. 상단 기간 토글에 `이번주`가 추가됐고, `_statsAnalysisRange()`가 `week`를 월요일부터 오늘까지로 계산한다.
2. 운동 활성 부위와 건강지표 내부의 중복 기간 토글이 제거됐다.
3. 운동 활성 부위, 전체 요약, 운동 분석, 건강 지표, 운동별 퍼포먼스 추이가 같은 기간 범위를 사용한다.
4. 건강지표는 단일 캔버스에서 얇은 정규화 선으로 렌더링하고, 범례/툴팁으로 실제 값을 보존한다.
5. `운동별 퍼포먼스 추이` 카드가 `종목별 볼륨 추이` 위에 배치됐고, 볼륨/추정 1RM/판정 열을 제공한다.
6. 트레이너 통계 모달도 동일한 카드 구조를 사용한다.

## 검증

1. PASS: `node --check render-stats.js`
2. PASS: `node --check sw.js`
3. PASS: `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/trainer-quest-modal.test.js tests/stats-exercise-performance.test.js`
4. PASS: `node scripts/verify-runtime-assets.mjs`
5. PASS: `node --test tests/*.test.js`
6. PASS: `git diff --check`
7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ d0b07edfabd5a5a31454f7e20bb33fa7763960c7`

## 잔여 리스크

- 인앱 브라우저 배포 URL 로딩이 제한 시간 안에 완료되지 않아 실제 통계 탭 클릭 흐름은 not verified yet이다. 인증 데이터가 있는 배포 화면에서 차트 밀도와 퍼포먼스 행 수의 체감 스크롤 길이는 추가 시각 확인이 필요하다.
- `운동별 퍼포먼스 추이`는 추정 1RM 표본이 부족한 보조종목을 보수적으로 `점검필요`로 표시한다. 실제 사용자 데이터에서 너무 엄격하면 판정 임계값 조정이 필요할 수 있다.

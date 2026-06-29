# 운동통계 카드 우선순위와 건강지표 곡선 정리 리뷰

## 결론

문제 없음. Slice 1 범위가 계획대로 구현됐고, 정적 회귀 테스트와 런타임 자산 검증을 통과했다.

## 확인한 변경

1. 통계 탭의 정보 순서가 `운동 활성 부위 -> 전체 요약 -> 운동 분석 -> 건강 지표 -> 볼륨`으로 변경됐다.
2. 트레이너 통계 모달도 동일한 순서를 사용한다.
3. 건강지표는 `health-metrics-charts` 컨테이너 아래 지표별 카드로 렌더링되며, 각 카드의 Chart.js 데이터셋은 하나뿐이다.
4. 체크박스 기반 지표 선택 UI와 다중 y축 오버레이 구조가 제거됐다.
5. 전체요약 카드의 수치 영역에서 `var(--font-mono)` 의존을 제거하고 TDS 카드형 간격으로 정리했다.
6. 정적 자산 변경에 맞춰 `sw.js` 캐시 버전이 `tomatofarm-v20260629z16-stats-priority-health-curves`로 올라갔다.

## 리스크

- 낮은 리스크: 실제 통계 데이터가 없는 계정에서는 건강지표 카드 대신 empty 메시지가 보인다. 이는 기존 데이터 부재 처리와 동일한 성격이다.
- 낮은 리스크: 로그인된 배포 환경에서 실제 통계 탭 시각 상태는 최종 육안 확인이 필요하다.

## 검증

1. PASS: `node --check render-stats.js`
2. PASS: `node --check sw.js`
3. PASS: `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/trainer-quest-modal.test.js` — 18 tests passed
4. PASS: `node scripts/verify-runtime-assets.mjs` — refs=860
5. PASS: `node --test tests/*.test.js` — 603 tests passed
6. PASS: `git diff --check`
7. not verified yet: Dashboard3 Pages 배포 검증은 커밋/푸시 후 수행한다.

# 건강지표 월간 칼로리 리포트 카드 병합 계획

## 배경

사용자는 `월간 칼로리 리포트`를 별도 카드로 다시 만든 것이 아니라, 바로 위 건강지표 카드와 한데 표출하라고 요청했다.

현재 구조는 다음처럼 분리되어 있다.

- `체중 & 섭취칼로리 추이` 카드
- `월간 칼로리 리포트` 카드

이 때문에 건강/칼로리 흐름이 두 카드로 끊겨 보인다.

## 목표

- `월간 칼로리 리포트`를 별도 `stats-block` 카드에서 제거한다.
- 같은 `stats-health-block` 안에서 `체중 & 섭취칼로리 추이` 다음 하위 섹션으로 이어 붙인다.
- 전체통계 화면과 트레이너 통계 모달 양쪽 구조를 동일하게 맞춘다.
- 기존 데이터 렌더링 함수와 기간 컨트롤은 유지한다.

## 실행 슬라이스

1. `index.html`
   - `stats-calorie-report-block` 별도 카드 제거.
   - `calorie-month-chart`, `calorie-month-empty`, `calorie-month-summary`를 `stats-health-block` 내부로 이동.

2. `render-stats.js`
   - `renderTrainerQuestStats` 템플릿에서도 동일하게 별도 카드 제거.
   - 월간 칼로리 영역을 건강지표 카드 내부 하위 섹션으로 구성.

3. `style.css`
   - 카드 내부 하위 섹션 구분선/제목 스타일 추가.
   - 기존 `calorie-summary-grid`, `calorie-meal-grid` 스타일은 유지.

4. 캐시/테스트
   - `sw.js` `CACHE_VERSION` 갱신.
   - 별도 `stats-calorie-report-block`이 사라지고 건강지표 카드 내부에 월간 리포트가 들어가는 계약을 테스트로 고정.

## 검증

- `node --check render-stats.js`
- `node --check sw.js`
- `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test tests/*.test.js`
- `git diff --check`
- Dashboard3 Pages 배포 검증

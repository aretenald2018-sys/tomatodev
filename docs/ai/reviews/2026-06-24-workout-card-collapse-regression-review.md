# 운동 카드 접기/펼치기 UI 회귀 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-card-collapse-regression.md`
- 변경 파일:
  - `render-calendar.js`
  - `sw.js`

## 결과

- Findings: 없음.
- 접힌 운동 상세 카드의 `운동 완료` 버튼에서 `_wtCalEditSession()` 호출을 제거했다.
- 펼친 카드의 명시적 `편집하기` 버튼과 상단 `수정` 버튼은 유지되어, 편집 진입 경로는 의도적 액션으로만 남았다.
- `render-calendar.js`가 `sw.js`의 `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION`을 함께 bump했다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `git diff --check`
- not verified yet: 프로젝트 규칙상 장시간 dev server를 여기서 실행해 UI 검증 완료로 주장하지 않았다. 로컬 브라우저에서 아래 플로우 확인이 남아 있다.

## 남은 UI 확인

1. `npm.cmd run dev`
2. 운동 탭 월간 홈에서 기록 날짜 상세 열기
3. `카드 접기` 클릭
4. 접힌 카드의 `운동 완료` 클릭 시 운동 편집 화면으로 이동하지 않는지 확인
5. `세트 다시 보기` 클릭 시 같은 카드가 펼쳐지는지 확인
6. 펼친 카드의 `편집하기` 클릭 시에만 운동 편집 화면으로 이동하는지 확인

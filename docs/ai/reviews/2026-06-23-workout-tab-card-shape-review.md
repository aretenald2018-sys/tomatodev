# 운동탭 날짜 상세 카드 형태 리뷰

## 범위

- 계획 문서: `docs/ai/features/2026-06-23-workout-tab-calendar-home.md`
- 실행 슬라이스: Slice 6 — 날짜 상세 운동 카드 형태 교체
- 리뷰 대상:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`

## 결론

- 차단 이슈 없음.
- 운동 상세 카드에서 기존 참고 이미지 1 형태의 썸네일/하단 체크형 마크업은 제거됐다.
- collapsed 상태는 참고 이미지 2처럼 요약 카드와 `세트 다시 보기` 중심으로 표시된다.
- expanded 상태는 참고 이미지 3처럼 KG/REP/RIR/ROM 세트 행 중심으로 표시된다.

## 확인한 사항

1. `render-calendar.js`
   - `_renderWorkoutExerciseDetailCard()`가 더 이상 `.wt-day-ex-top`, `.wt-day-ex-frames`, `.wt-day-ex-foot` 구조를 출력하지 않는다.
   - 운동 세트의 `kg/reps/rpe/rir/romPct/setType/done`을 read-only 카드 표시용 데이터로 정규화한다.
   - collapsed/expanded 상태는 기존 `_workoutDetailCollapsed` 상태와 `window._wtCalToggleExerciseCard()`를 그대로 사용한다.

2. `style.css`
   - `.wt-max-read-card` 계열로 요약 카드, 트렌드 박스, 오늘 기록, 접힘 안내, 세트 행, ROM 바, 액션 버튼을 새로 스타일링했다.
   - 모바일 폭에서 세트 행 컬럼 폭과 버튼 크기를 별도 보정했다.

3. 캐시
   - `render-calendar.js`와 `style.css`는 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260623-workout-card-shape`로 bump했다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `git diff --check`
- not verified yet: 현재 로그인 데이터에 최근 6개월 운동 기록이 없어 기록 있음 카드의 실제 브라우저 시각 검증은 확인하지 못했다.

## 남은 수동 확인

1. 운동 기록이 있는 날짜 상세에서 collapsed 카드가 참고 이미지 2 형태인지 확인한다.
2. `세트 다시 보기` 클릭 후 expanded 카드가 참고 이미지 3 형태인지 확인한다.
3. 카드 안 텍스트가 모바일 폭에서 줄바꿈되며 겹치지 않는지 확인한다.

# 홈 라이프존 운동 시간 판정 보정 리뷰

- 대상 계획: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 대상 Slice: Slice 8 — 운동 시간만 입력된 날의 라이프존 판정 보정
- 리뷰 일자: 2026-06-23

## 리뷰 결과

- 결론: 통과.
- `data/data-pure.js`의 기존 운동일 판정처럼 `workoutDuration > 0`을 운동 활동으로 인정하도록 `home/life-zone-state.js`를 보정했다.
- 운동 세트 없이 운동 시간만 있는 줍스가 운동존으로 배치되고 `오늘 운동 완료` 말풍선을 받는 회귀 테스트를 추가했다.
- `home/life-zone-state.js`는 `STATIC_ASSETS` 대상이므로 `sw.js`의 `CACHE_VERSION`을 함께 bump했다.

## 잔여 리스크

- 브라우저 UI 플로우는 not verified yet. 정상 터미널에서 dev server를 실행한 뒤 실제 홈탭에서 운동 시간만 입력된 계정이 운동존으로 표시되는지 확인해야 한다.

# 홈 라이프존 식단 actor 상태 보정 리뷰

- 대상 계획: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 대상 Slice: Slice 9 — 식단 입력 actor 최신 상태 반영 보정
- 리뷰 일자: 2026-06-23

## 리뷰 결과

- 결론: 통과.
- `hasLifeZoneDietActivity()`는 식단 텍스트, kcal, food chip, 사진, skip을 이미 인정하고 있었으므로 판정식보다 데이터 읽기 경로가 문제였다.
- actor 계정 id와 실제 workout owner id가 `(guest)` 변형 등으로 다를 때도 이웃 기록을 읽도록 owner id 후보와 `readAccountId`를 추가했다.
- 이웃 actor의 오늘 문서는 후보 id를 순회해 첫 번째 유효 문서를 사용하도록 했다.
- 방금 입력한 식단이 60초 동안 이전 `업무` 상태 캐시에 가려지지 않도록 라이프존 actor 상태 캐시를 비활성화했다.
- 줍스가 점심 식단만 입력하면 `diet` 상태, 식사존 slot, `점심냠냠` 말풍선으로 표시되는 회귀 테스트를 추가했다.

## 잔여 리스크

- 브라우저 UI 플로우는 not verified yet. 정상 터미널에서 dev server를 실행한 뒤 실제 홈탭에서 식단만 입력한 줍스가 식사존으로 표시되는지 확인해야 한다.

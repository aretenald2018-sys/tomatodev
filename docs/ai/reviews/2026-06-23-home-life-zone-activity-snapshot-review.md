# 홈 라이프존 activity snapshot 리뷰

- 대상 계획: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 대상 슬라이스: Slice 4 — 최근성/presence snapshot
- 리뷰 일시: 2026-06-23

## 결론

- 발견된 차단 이슈 없음.
- 원인: `home/life-zone-state.js`의 기존 판정이 오늘 문서 안에 운동과 식단이 함께 있으면 항상 `workout`을 먼저 선택했다. 그래서 문정토마토가 간식을 나중에 입력해도 과거 가슴 운동 말풍선이 유지됐다.
- 수정: 운동 저장은 `lifeZoneWorkoutActivity`, 식단 저장은 `lifeZoneDietActivity`를 별도 도메인 필드로 남기고, 라이프존은 실제 기록이 남아 있는 snapshot 중 더 최근인 쪽을 선택한다.

## 변경 파일

- `home/life-zone-state.js`
- `workout/save.js`
- `workout/save-schema.js`
- `tests/home-life-zone-state.test.js`
- `tests/save-schema.test.js`
- `sw.js`

## 검증

- PASS: `node --check home\life-zone-state.js`
- PASS: `node --check workout\save.js`
- PASS: `node --check workout\save-schema.js`
- PASS: `node --test tests\home-life-zone-state.test.js tests\save-schema.test.js`
- PASS: `git diff --check`
- not verified yet: 로그인된 실제 문정토마토 계정에서 간식 저장 후 홈 라이프존이 `간식냠냠`으로 바뀌는 브라우저 플로우는 이 세션에서 실행하지 않았다.

## 잔여 리스크

- 기존 저장 문서에는 snapshot이 없으므로, 사용자가 수정 후 한 번 더 식단 또는 운동을 저장해야 최근성 우선순위가 생긴다.
- snapshot timestamp가 같은 극단적 케이스는 기존 fallback과 유사하게 먼저 정렬된 항목이 남을 수 있다.

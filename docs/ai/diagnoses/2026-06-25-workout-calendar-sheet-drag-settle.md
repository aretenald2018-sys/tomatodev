# 운동 캘린더 하단 시트 드래그 안착 진단

## 증상

- 짧게 클릭하면 하단 sheet가 위/아래로 잘 전환된다.
- 손으로 드래그하면 release 후 의도한 상태에 안착하지 않고 원래 상태로 돌아간다.

## 가설

1. release snap이 preview에 사용한 clamp된 이동량이 아니라 raw pointer 좌표를 다시 사용한다.
2. 아래 방향 닫기 threshold가 220px 이상이라 실제 모바일 handle drag 감각보다 크다.
3. `openLatched`는 있지만 `closeLatched`가 없어 닫기 방향은 release 직전 값에만 의존한다.

## 수정 방향

- drag 중 계산한 `lastDragY`를 release 기준으로 유지한다.
- `bar` 시작 위 방향은 `openLatched`, `full` 시작 아래 방향은 `closeLatched`로 고정한다.
- close threshold를 handle bar 높이 비율 기반의 작은 값으로 낮춘다.
- 관련 source regex 테스트와 cache version 테스트를 갱신한다.

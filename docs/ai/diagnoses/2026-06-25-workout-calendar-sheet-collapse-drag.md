# 운동 캘린더 바텀시트 내리기 제스처 진단

## 상태

- 날짜: 2026-06-25
- 요청: 바텀시트를 위로 올리는 드래그는 쉬워졌지만 full 상태에서 아래로 내리는 역방향 드래그가 잘 안 되는 문제 수정
- 범위: 운동탭 월간 캘린더 바텀시트 drag 시작 영역과 snap target 판정

## 원인

드래그 시작 이벤트가 `data-wt-sheet-handle` 화살표 버튼 하나에만 붙어 있었다. full 상태에서 사용자는 자연스럽게 시트 헤더 전체를 아래로 스윽 내리지만, 화살표 44x24px 밖에서 시작한 제스처는 drag로 인식되지 않았다.

또한 `_resolveWorkoutHomeSheetDragTarget()`은 upward fling은 `velocityY < -threshold`로 인정했지만, downward fling은 거리 조건만 봤다. 빠르게 아래로 튕겨도 `dy`가 collapse threshold에 못 미치면 full로 되돌아갈 수 있었다.

## 수정 방향

- 시트 헤더 전체에 `data-wt-sheet-bar`를 부여하고 pointer drag 시작 영역을 헤더 전체로 넓힌다.
- 화살표 버튼의 키보드 조작은 기존처럼 유지한다.
- full 상태의 downward fling도 `velocityY > WORKOUT_HOME_SHEET_DRAG_FLING_VELOCITY`일 때 collapse 의도로 인정한다.
- 헤더 영역에 `touch-action: none`을 적용해 브라우저 panning이 drag 제스처를 선점하지 않게 한다.

## 완료 기준

- 화살표뿐 아니라 날짜/요약이 있는 헤더 영역을 아래로 스윽 내려도 bar로 접힌다.
- 아래 방향 빠른 fling이 거리 부족 때문에 full로 되돌아가지 않는다.
- 짧은 클릭 토글과 오늘/루틴 버튼 동작은 유지된다.

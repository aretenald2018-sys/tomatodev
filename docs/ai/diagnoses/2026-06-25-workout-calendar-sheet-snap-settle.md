# 운동 캘린더 바텀시트 드래그 안착 재진단

## 상태

- 날짜: 2026-06-25
- 요청: 파란 화살표를 드래그하거나 빠르게 스윽 밀 때 바텀시트가 끝까지 올라가지 않고 되돌아가는 문제 개선
- 범위: 운동탭 월간 캘린더 바텀시트 드래그 종료 처리

## 원인

드래그 중에는 inline CSS 변수 `--wt-day-sheet-drag-height`가 시트 높이를 우선 지배한다.

기존 종료 처리는 `pointerup`에서 inline preview 변수를 먼저 제거한 뒤 `bar/full` 상태 클래스를 적용했다. 이 순서는 모바일 Chrome/PWA에서 pointerup, pointer capture 해제, layout/transition flush 타이밍에 따라 중간 높이가 한 번 노출될 수 있다.

또한 마지막 `pointermove`와 `pointerup` 사이 간격이 길어지면 `pointerup`에서 재계산한 velocity가 희석되어 빠른 fling 의도가 약하게 판정될 수 있다.

## 수정 방향

- click 합성을 깨지 않기 위해 `pointerdown.preventDefault()`는 계속 사용하지 않는다.
- 의도 있는 drag 종료에서는 target state를 먼저 계산하고 `_setWorkoutHomeSheetState(targetState)`로 클래스를 확정한다.
- inline drag preview 변수는 다음 animation frame에서 제거해 현재 preview 높이에서 최종 CSS 상태로 자연스럽게 transition되게 한다.
- `pointerup` velocity 재계산은 마지막 sample 이후 80ms 이내일 때만 수행한다. 오래 지난 sample이면 마지막 `pointermove` velocity를 유지한다.

## 완료 기준

- 짧은 클릭은 기존처럼 `bar/full` 토글된다.
- 위로 드래그/빠른 스윽 후에는 preview height가 bar로 순간 fallback하지 않고 full로 안착한다.
- 아래로 드래그/빠른 스윽 후에는 bar로 안착한다.

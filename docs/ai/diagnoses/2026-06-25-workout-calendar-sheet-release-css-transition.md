# 운동 캘린더 바텀시트 release CSS 전환 진단

## 상태

- 날짜: 2026-06-25
- 요청: 드래그 후 시트가 손을 놓은 위치에 멈추지 않고 위/아래 방향 끝점으로 안착하게 수정
- 범위: 운동탭 월간 캘린더 바텀시트 `pointerup` 종료 처리

## 원인

드래그 중 `--wt-day-sheet-drag-height` inline CSS 변수가 `height: var(--wt-day-sheet-drag-height, var(--wt-day-sheet-height))`의 최우선 높이로 동작한다.

이전 수정은 `targetState`를 정한 뒤 `settleDragPreview(targetState)`에서 `requestAnimationFrame`으로 inline drag height를 다시 endpoint 높이로 세팅하고 타이머로 제거했다. 하지만 상태 클래스가 이미 `is-full` 또는 `is-bar`로 바뀐 뒤 다음 frame에서 inline 변수가 다시 들어가면 class 기반 `--wt-day-sheet-height`가 무시된다. Android Chrome/PWA에서는 이 타이밍 차이 때문에 release 직전 preview 높이가 유지되어 손을 놓은 위치에 멈춘 것처럼 보일 수 있다.

## 수정 방향

- `settleDragPreview`, settle timer, cleanup timeout을 제거한다.
- `pointerup`에서 `is-dragging`을 제거해 transition을 복구한다.
- 상태 class 변경 전에 `--wt-day-sheet-drag-height`, `--wt-day-sheet-drag-y`를 즉시 제거한다.
- 그 다음 `_setWorkoutHomeSheetState(targetState)`를 호출해 CSS class 기반 `bar/full` height transition만 남긴다.

## 완료 기준

- 드래그 release 후 inline drag height가 남지 않는다.
- 위 방향 release는 `full`, 아래 방향 release는 `bar` class height로 전환된다.
- 회귀 테스트가 rAF/timer settle 구조의 재도입을 막는다.

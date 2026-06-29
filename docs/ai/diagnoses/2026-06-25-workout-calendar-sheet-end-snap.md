# 운동 캘린더 바텀시트 끝점 스냅 진단

## 상태

- 날짜: 2026-06-25
- 요청: 위/아래 방향으로 드래그하면 해당 방향 끝까지 가야 하는데, 아래 방향에서 손을 놓은 지점에 멈추는 문제 수정
- 범위: 운동탭 월간 캘린더 바텀시트 drag 종료 후 preview height 정리

## 원인

드래그 중에는 `--wt-day-sheet-drag-height` inline CSS 변수가 시트 높이를 우선 지배한다. 기존 코드는 drag 종료 후 target state를 `bar/full`로 정하긴 했지만, inline preview height를 target endpoint로 명시적으로 바꾸지 않고 다음 frame에서 제거했다.

모바일 브라우저에서는 이 과정에서 마지막 preview height가 한동안 남아, `bar` 상태로 판정됐더라도 시트가 손을 놓은 지점에 정지한 것처럼 보일 수 있다.

## 수정 방향

- drag 종료 시 `targetState`에 따라 inline preview height를 endpoint로 강제한다.
- `targetState === 'bar'`이면 `minHeight`, `targetState === 'full'`이면 `maxHeight`로 이동시킨다.
- transition 시간 이후 inline preview 변수를 제거해 최종 CSS class height로 정리한다.

## 완료 기준

- 위로 드래그 후 손을 놓으면 마지막 위치와 무관하게 full 끝점으로 간다.
- 아래로 드래그 후 손을 놓으면 마지막 위치와 무관하게 bar 끝점으로 간다.
- 짧은 클릭 토글은 유지된다.

# 운동탭 pull-to-refresh 충돌 진단

## 상태

- 날짜: 2026-06-25
- 요청: 운동탭에서 아래로 당기는 동작이 브라우저 새로고침과 충돌하므로, 운동탭 안에서는 뒤로가기 또는 캘린더 복귀 동작처럼 처리
- 범위: 운동탭 활성 상태의 touch pull-down gesture와 overscroll 체인

## 원인

모바일 Chrome/PWA에서 문서 최상단에서 아래로 당기면 브라우저 pull-to-refresh가 먼저 개입할 수 있다. 운동탭의 바텀시트와 record/detail 화면도 아래 방향 제스처를 사용하므로, root overscroll이 열려 있으면 앱 내부 `pointer`/navigation 처리가 브라우저 새로고침 제스처와 경쟁한다.

기존 navigation stack은 `handleWorkoutBack()`으로 `detail -> record -> calendar -> sheet close` 순서를 이미 처리하지만, touch pull-down 자체를 workout navigation으로 흡수하는 guard가 없었다.

## 수정 방향

- 운동탭이 활성일 때만 `body.wt-workout-tab-active`를 붙인다.
- 해당 상태에서 root overscroll을 차단한다.
- 운동탭 최상단에서 아래로 당기는 touch gesture는 passive false capture listener에서 `preventDefault()`로 pull-to-refresh를 막는다.
- threshold를 넘으면 기존 `handleWorkoutBack({ activeTab: 'workout', preferHistory: true })` 경로를 호출해 record/detail은 캘린더로, calendar sheet는 닫힘으로 처리한다.

## 완료 기준

- 홈/식단/통계 등 다른 탭의 scroll/refresh 정책은 바꾸지 않는다.
- 운동탭 내부 top pull-down은 브라우저 새로고침이 아니라 workout back stack을 우선 사용한다.
- nested scroll 영역이 위로 더 스크롤될 수 있으면 기존 scroll을 방해하지 않는다.

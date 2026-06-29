# 운동 캘린더 바텀시트 스크롤 분리 진단

## 증상

- 운동탭 월간 캘린더에서 바텀시트가 full 상태일 때 시트 내부 스크롤과 뒤의 캘린더/window 스크롤이 함께 움직인다.
- 바텀시트를 완전히 내린 bar 상태에서는 캘린더 스크롤만 조작되어야 하지만, sheet drag/scroll 정책이 섞여 제스처 소유권이 불명확하다.
- full 상태에서 아래로 내리는 gesture는 손가락으로 내린 좌표에 머무는 것처럼 보이고, bar 끝점으로 확실히 닫히지 않는다.

## 반증 가능한 원인 가설

1. full sheet 상태에서도 document/window 스크롤이 잠기지 않아 fixed sheet 뒤의 캘린더가 같은 touch chain에서 스크롤된다.
2. `.wt-day-sheet-scroll`의 `overscroll-behavior: contain`만으로는 모바일 브라우저에서 scroll chaining을 항상 차단하지 못한다.
3. drag 종료는 class state 전환으로 정리됐지만, full에서 아래 방향 gesture가 `closeLatched` 또는 hard-close 정책으로 충분히 빨리 고정되지 않아 preview 좌표에 머무는 느낌이 남는다.
4. 기존 회귀 테스트는 대부분 소스 문자열 매칭이라 실제 scroll ownership 계약을 강제하지 못한다.

## 수정 방향

- full sheet 상태에서는 body에 명시적인 sheet scroll-lock class를 부여하고 window scroll position을 유지한다.
- bar 상태 또는 sheet close 후에는 해당 lock을 즉시 해제해 캘린더/window 스크롤을 돌려준다.
- sheet body touchmove는 내부 scroller가 더 스크롤할 수 있을 때만 통과시키고, 경계에서는 background scroll로 전파되지 않게 막는다.
- full 상태에서 아래 방향 drag가 닫힘 최소 거리 또는 fling 조건을 만족하면 target을 즉시 `bar`로 고정한다.
- 테스트는 500개 전수 의존 대신, 이 계약을 직접 확인하는 좁은 회귀 테스트로 보강한다.

## 완료 기준

- full sheet: `.wt-day-sheet-scroll`만 세로 스크롤되고 document/window scroll은 고정된다.
- bar sheet: body scroll lock이 없고 캘린더/window scroll이 가능하다.
- full에서 아래로 당긴 release는 preview 좌표가 아니라 `bar` class state로 정착한다.
- `render-calendar.js`, `style.css`, `sw.js` 정적 검증과 관련 회귀 테스트가 통과한다.

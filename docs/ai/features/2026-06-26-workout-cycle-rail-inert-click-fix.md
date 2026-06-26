# 현재 사이클 원 클릭 회색 overlay 수정 계획

## 요청

- 종목 설정 sheet의 `현재 사이클` 아래 원/화살표를 클릭하면 sheet가 사라지고 화면이 회색조 overlay 상태로 남는 회귀를 수정한다.

## 진단

- 버그 유형: UI 회귀, sheet/backdrop event 처리 문제.
- 재현 루프: `workout/test-v2/board-render.js`의 sheet open/click routing contract를 정적 테스트로 고정하고, 배포 자산 마커로 확인한다.
- 관찰:
  - `#tm2-sheets` backdrop click handler와 `.tm2-sheet` 내부 click handler가 모두 `_onAction()`을 호출한다.
  - `현재 사이클`의 원/화살표는 실제 명령이 없는 표시용 UI지만 pointer/click target으로 남아 있다.
  - `tm2-sheet-layer.tm2-open`은 화면 전체에 반투명 배경을 깔기 때문에 sheet content가 비거나 사라진 상태로 class가 남으면 사용자가 말한 회색조 화면이 된다.

## 가설

1. 표시용 cycle rail 클릭이 내부 sheet click으로만 끝나지 않고 backdrop layer 위임과 섞여 sheet layer만 남긴다.
2. 원/화살표 span이 pointer target이어서 모바일 tap/click 합성 중 불필요한 click event를 만든다.
3. `.tm2-sheet`가 리렌더될 때 내부 click guard가 사라지는 순간의 이벤트가 layer에 도달한다.

## 실행 Slice 1

1. `#tm2-sheets` layer handler에서 `.tm2-sheet` 내부 click은 backdrop close/중복 action routing으로 처리하지 않게 한다.
2. `.tm2-sheet` 내부 handler에서 `[data-tm2-col-cycle]` 클릭은 명시적으로 `preventDefault`, `stopPropagation`, `stopImmediatePropagation` 후 no-op 처리한다.
3. `test-mode-v2.css`에서 current cycle 원/화살표와 내부 텍스트를 `pointer-events: none`, `user-select: none`으로 표시 전용화한다.
4. `sw.js` `CACHE_VERSION`을 bump한다.
5. `tests/workout-calendar-bottom-sheet.test.js`에 회귀 테스트를 추가한다.

## 비범위

- current cycle 원을 누르면 특정 주차로 이동하거나 편집하는 새 기능은 만들지 않는다.
- calendar 좌측 rail 레이아웃은 변경하지 않는다.
- 인증 데이터/Firestore 저장 구조는 변경하지 않는다.

## 검증

- PASS 필요: `node --check workout/test-v2/board-render.js; node --check sw.js`
- PASS 필요: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js`
- PASS 필요: `node --test .\tests\*.test.js`
- PASS 필요: `node scripts/verify-runtime-assets.mjs`
- PASS 필요: `git diff --check`
- 배포 후: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 후 marker: cache version, current cycle click guard, pointer-events inert CSS.

## 다음 세션 프롬프트

이 계획의 Slice 1을 실행하고, 회색 overlay 회귀 방지 테스트와 Dashboard3 Pages 배포 검증까지 완료한다.

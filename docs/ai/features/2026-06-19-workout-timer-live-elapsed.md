# 운동 타이머 live elapsed 정지 수정

## 요청

- 제보: 운동 타이머 시간이 흐르지 않는다는 불만 접수.
- 목표: 운동 스톱워치가 시작/복원된 뒤 화면 숫자가 `0:00` 또는 저장된 시간에 고정되지 않고 실제 경과 시간을 표시하게 한다.

## 진단

- `workout/timers.js`는 `workoutStartTime`이 있어도 `workoutTimerDate`와 `S.shared.date`가 같을 때만 live elapsed를 더한다.
- 시작/복원 경로에서 날짜 포인터가 비어 있거나 숫자 타입이 아니면 interval은 살아도 `_isViewingTimerDate()`가 false가 되어 화면 시간이 흐르지 않는다.
- `wtStartWorkoutTimer()`는 이미 `workoutStartTime`이 있으면 바로 반환하므로, interval이 사라졌거나 날짜 포인터가 불완전한 상태를 사용자의 재시작 액션으로 복구하지 못한다.

## 실행 범위

### Slice 1

- `workout/timers.js`
  - 타이머 날짜를 숫자 `{ y, m, d }`로 정규화한다.
  - running 상태에서 날짜 포인터가 없으면 현재 workout date 또는 오늘 날짜로 보정한다.
  - running 상태인데 interval이 없으면 시작/복원 경로에서 다시 붙인다.
  - 표시 계산은 정규화된 날짜 비교를 사용한다.
- `sw.js`
  - `workout/timers.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 범프한다.

## 제외

- 세트 저장 로직, 운동 데이터 모델, Firebase 저장 경로는 변경하지 않는다.
- `www/` 산출물은 직접 수정하지 않는다.
- 장기 dev server는 이 세션에서 새로 띄우지 않는다.

## 검증

1. `node --check workout/timers.js`
2. `node --check sw.js`
3. `node scripts/verify-runtime-assets.mjs`
4. 사용자가 `npm.cmd run dev`로 실행 후 운동 탭에서 타이머 시작 또는 세트 입력 시 숫자가 1초 단위로 증가하는지 확인한다.

## 실행 결과

- 상태: Slice 1 완료
- 변경:
  - `workout/timers.js`: timer date를 숫자 객체로 정규화하고, running 상태에서 date/interval이 빠진 경우 시작/표시/복원 경로에서 자가 복구하도록 했다.
  - `workout/timers.js`: 이미 running인 타이머에 시작 액션이 다시 들어와도 interval을 되살리고 보정된 active timer 포인터를 다시 저장하게 했다.
  - `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260619z3-workout-timer-live-elapsed`로 범프했다.
- 검증:
  - PASS: `node --check workout/timers.js`
  - PASS: `node --check sw.js`
  - PASS: `node scripts/verify-runtime-assets.mjs`
  - PASS: `git diff --check`
  - not verified yet: 장기 dev server는 이 세션 지침상 새로 띄우지 않았다. 브라우저 UI 확인은 `npm.cmd run dev` 후 운동 탭에서 타이머 숫자가 증가하는지 확인해야 한다.

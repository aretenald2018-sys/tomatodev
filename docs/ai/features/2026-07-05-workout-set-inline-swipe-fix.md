# 2026-07-05 Workout Set Inline Swipe Fix

## 상태

- 단계: execution-ready
- 요청: 모바일 운동 세트 행에서 `kg/횟수`를 펼침 패널 없이 해당 칸에서 바로 수정하고, 삭제 `×` 터치 영역을 더 크게/왼쪽으로 분리하며, 좌우 스와이프 모두 세트 삭제로 동작하게 한다. 새 종목 추가 후 첫 종목으로 고정되는 회귀가 없는지도 확인한다.

## 그릴 결과

- 사용자 요구가 구체적이므로 추가 질문 없이 진행한다.
- 기존 완료 계획의 구현은 `kg/횟수` 탭을 펼침 editor focus로 연결해 사용자 기대와 다르다.
- 스와이프 삭제는 현재 좌측 방향만 허용되어 “왼쪽 또는 오른쪽” 요구를 만족하지 못한다.

## 실행 범위

1. `render-calendar.js`
   - 접힌 세트 행의 `kg/reps` 값 칸을 인라인 숫자 input으로 전환하는 경로를 추가한다.
   - 인라인 input focus 시 기존 값은 비워져 바로 입력할 수 있게 한다.
   - 펼침 토글은 기존 full editor 전용으로 유지한다.
   - 세트 행 touch swipe 삭제를 좌/우 양방향으로 허용한다.
2. `style.css`
   - 삭제 `×` hit target을 키우고 파란 펼침 토글과 간격을 넓힌다.
   - 인라인 input이 기존 값 칸 크기 안에서 흔들림 없이 보이도록 스타일을 추가한다.
3. `tests/workout-calendar-bottom-sheet.test.js`, `tests/workout-set-minimal-dom.test.js`
   - 기존 “값 탭은 펼침 editor focus” 기대를 “값 칸 인라인 input”으로 바꾼다.
   - 좌/우 스와이프 삭제와 확대된 delete target을 검증한다.
   - 새 종목 추가 후 선택 slide 복원 테스트를 유지/실행한다.
4. `sw.js`
   - `style.css`와 `render-calendar.js`가 `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 bump한다.

## 제외 범위

- 운동 종목 picker 구조 변경.
- 웬들러/프로그램 처방 생성 로직 변경.
- 하단 시트 전체 디자인 재작성.

## 검증 계획

1. RED: 새/수정 테스트가 현재 구현에서 실패함을 확인한다.
2. GREEN: focused tests 통과.
3. Regression: `node --test tests/*.test.js`, `npm.cmd run verify:assets`.
4. Production: `npm.cmd run deploy:production`, `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`.
5. Browser E2E: 모바일 viewport에서 배포 앱/source harness로 다음을 확인한다.
   - `kg/reps` 값 칸 터치 시 펼침 패널 없이 해당 칸 input focus/value `''`.
   - `55kg / 15회` 저장 후 행이 접힌 상태로 표시.
   - 같은 행 또는 다음 행을 왼쪽/오른쪽 swipe하면 세트 삭제.
   - 새 종목 추가 flow의 selected exercise slide 복원 테스트 통과.

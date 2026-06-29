# 운동 캘린더 바텀시트 클릭 회귀 수정 리뷰

## 범위

- `render-calendar.js` 바텀시트 핸들 입력 처리
- `tests/workout-calendar-bottom-sheet.test.js` 회귀 테스트
- `sw.js` 캐시 버전 갱신

## 변경

- 핸들 `pointerdown`의 `event.preventDefault()`를 제거했다.
- 드래그 중 `pointermove`의 `preventDefault()`와 `pointerup.clientY` 최종 좌표 판정은 유지했다.
- 테스트는 시작 클릭을 막지 않는 조건과 이동 중 스크롤 방지 조건을 함께 확인하도록 갱신했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `node --test .\tests\*.test.js` (513 passed)
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 리스크

- 실제 인증 세션 내부 터치 제스처는 브라우저 자동화로 완전히 재현하기 어렵다. 배포 후 사용자가 PWA에서 화살표 짧은 탭과 빠른 위/아래 스윽 동작을 같이 확인해야 한다.

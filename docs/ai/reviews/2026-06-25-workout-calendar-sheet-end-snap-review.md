# 운동 캘린더 바텀시트 끝점 스냅 수정 리뷰

## 범위

- `render-calendar.js` drag 종료 후 inline preview height 정리
- `sw.js` 캐시 버전
- 관련 회귀 테스트

## 변경

- `settleDragPreview(targetState)`를 추가해 release 후 preview height를 target endpoint로 명시적으로 이동시킨다.
- `bar` target은 `minHeight`, `full` target은 `maxHeight`를 inline height로 지정한다.
- transition 완료 이후 inline preview 변수를 제거한다.
- endpoint height를 실제로 적용한 뒤 cleanup timer를 등록하고, 다음 drag 시작 시 이전 timer를 취소한다.
- 기존 deferred clear 테스트를 endpoint snap 테스트로 대체했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `node --test .\tests\*.test.js` (513 passed)
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 리스크

- 실제 Android PWA의 주소창/브라우저 chrome 변화에 따른 `dvh` 차이는 실기기에서 최종 확인해야 한다.

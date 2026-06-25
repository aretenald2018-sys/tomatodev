# 운동 캘린더 바텀시트 드래그 안착 수정 리뷰

## 범위

- `render-calendar.js` 바텀시트 drag 종료 처리
- `sw.js` 캐시 버전
- 바텀시트 및 캐시 버전 회귀 테스트

## 변경

- drag 종료 시 `targetState`를 먼저 계산하고 `_setWorkoutHomeSheetState(targetState)`를 적용한다.
- 의도 있는 drag에서는 inline preview 변수 제거를 `requestAnimationFrame`으로 늦춰 상태 클래스와 preview height 전환이 충돌하지 않게 했다.
- deadzone에서는 preview 변수를 즉시 제거하고 click suppress를 최소화해 짧은 클릭 토글을 유지한다.
- `pointerup` velocity 재계산은 80ms 이내 sample에만 적용한다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `node --test .\tests\*.test.js` (513 passed)
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 리스크

- 실제 Android PWA 터치 제스처는 인증 세션과 브라우저 UI 상태에 따라 달라질 수 있어 배포 후 실기기 확인이 필요하다.

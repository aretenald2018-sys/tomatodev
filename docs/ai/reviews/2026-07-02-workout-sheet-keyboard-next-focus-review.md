# 운동 하단 시트 키보드 다음 포커스 리뷰

## 대상

- 계획 문서: `docs/ai/features/2026-07-02-workout-sheet-keyboard-next-focus.md`
- 변경 파일: `render-calendar.js`, `sw.js`, `tests/*`, `docs/ai/NEXT_ACTION.md`

## 결과

- 문제 없음.

## 확인

1. `_captureWorkoutSheetInputState()`가 현재 active 세트 input을 먼저 캡처하므로, `KG` change 저장보다 키보드 `다음` 포커스 이동이 먼저 끝난 경우 `REP` 포커스를 다시 `KG`로 되돌리지 않는다.
2. 현재 active element가 세트 input이 아닐 때는 `sourceInput` fallback을 유지하므로 기존 iOS PWA 재렌더 후 스크롤/포커스 복원 회귀를 피한다.
3. `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 함께 bump했다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`

## 남은 확인

- not verified yet: 인증된 모바일 PWA 실제 UI에서 `운동 탭 -> 오늘 하단 시트 -> 세트 추가 -> KG 입력 -> 키보드 다음 -> REP 포커스 유지` 흐름은 배포 후 확인해야 한다.

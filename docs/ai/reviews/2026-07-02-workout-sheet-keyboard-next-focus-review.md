# 운동 하단 시트 키보드 다음 포커스 리뷰

## 대상

- 계획 문서: `docs/ai/features/2026-07-02-workout-sheet-keyboard-next-focus.md`
- 변경 파일: `render-calendar.js`, `sw.js`, `tests/*`, `docs/ai/NEXT_ACTION.md`

## 결과

- 문제 없음.
- Slice 2 추가 리뷰: 문제 없음.

## 확인

1. `_captureWorkoutSheetInputState()`가 현재 active 세트 input을 먼저 캡처하므로, `KG` change 저장보다 키보드 `다음` 포커스 이동이 먼저 끝난 경우 `REP` 포커스를 다시 `KG`로 되돌리지 않는다.
2. 현재 active element가 세트 input이 아닐 때는 `sourceInput` fallback을 유지하므로 기존 iOS PWA 재렌더 후 스크롤/포커스 복원 회귀를 피한다.
3. `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 함께 bump했다.
4. Slice 2에서는 세트 값 저장 경로에 한해 `ignoreSourceInput: true`를 사용하므로, `change` 이벤트 시점의 active element가 아직 `KG`여도 그 `KG` input은 복원 후보에서 제외된다.
5. 저장 완료 후 재렌더 직전에 포커스 이동 한 틱을 기다리고 다시 캡처하므로, 실제로 `REP` input으로 이동한 경우에는 새 렌더에서도 `REP`를 복원한다.
6. 복원할 input이 없으면 scroll state만 복원해 포커스를 `KG`로 강제 회귀시키지 않는다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- Slice 2 PASS: `node --check render-calendar.js`
- Slice 2 PASS: `node --check sw.js`
- Slice 2 PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 25 tests passed
- Slice 2 PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
- Slice 2 PASS: `node --test --test-reporter=dot tests/*.test.js`
- Slice 2 PASS: `git diff --check`

## 남은 확인

- not verified yet: 인증된 모바일 PWA 실제 UI에서 `운동 탭 -> 오늘 하단 시트 -> 세트 추가 -> KG 입력 -> 키보드 다음 -> REP 포커스 유지` 흐름은 배포 후 확인해야 한다.

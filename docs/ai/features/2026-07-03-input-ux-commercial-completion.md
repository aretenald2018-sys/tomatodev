# 입력 UX 상용앱 갭 완성 계획

상태: `approved_for_execution`  
원본 계획: `.omo/plans/2026-07-03-input-ux-commercial-completion.md`

## 목표

헬스 종목 입력, 식단 입력, 러닝 및 유산소 입력에서 숨겨진 기능과 비직관적인 경로를 줄인다.

## 이번 실행 Slice

1. 운동 탭의 활동 선택을 `헬스`, `런닝`, `유산소`, `크로스핏`, `스트레칭`, `수영`으로 확장한다.
2. 이미 존재하는 CF/스트레칭/수영 저장/렌더 로직이 실제 DOM 폼을 만날 수 있게 한다.
3. manual cardio sheet를 운동 탭에서 바로 열 수 있게 한다.
4. 식단 `+ 음식 추가`를 quick-add sheet로 바꾸고, 검색/최근, 직접 입력, AI 사진 분석, 사진 첨부, 끼니 스킵을 한 화면에서 고르게 한다.
5. 기존 저장 경로와 사진 필드 보존 계약을 유지한다.

## 제외

barcode scanner, 음악 연동, shoe tagging, social challenge, 장기 러닝 플랜은 이번 slice에서 제외한다.

## 검증

- `node --test tests/running-entry.test.js tests/diet-add-button-binding.test.js tests/input-ux-commercial-completion.test.js`
- `node --test tests/workout-save.test.js tests/workout-save-mode-guard.test.js tests/running-tracker.test.js tests/calc.record.test.js tests/save-schema.test.js`
- `node scripts/verify-runtime-assets.mjs`
- browser QA: 운동 activity tab과 식단 quick-add sheet 클릭
- production Pages verification: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`

# 운동 카드 인라인 세트 추가와 종목완료 리뷰

## 대상

- 계획: `docs/ai/features/2026-07-02-workout-card-inline-set-complete.md`
- 변경 파일: `render-calendar.js`, `style.css`, `sw.js`, 관련 테스트와 cache marker 문서

## 리뷰 결과

- 문제 없음.

## 확인 내용

1. 펼쳐진 운동 카드에서는 세트 행이 바로 입력 가능한 상태로 렌더되고, 리스트 마지막에 `+` 행이 항상 붙는다.
2. 운동 카드 footer는 `종목완료` 단일 버튼만 렌더하며, 기존 `편집 완료`/`세트 추가`/`카드 접기`/`편집하기` footer 버튼은 제거됐다.
3. `종목완료`는 입력값이 있는 세트만 완료 처리해 저장하므로 빈 세트는 확정 대상으로 삼지 않는다.
4. 완료 도장은 `rotate(-45deg)` 붉은 stamp overlay로 렌더되고, reduced motion 환경에서는 애니메이션 없이 표시된다.
5. 러닝 카드, 운동 picker, Firestore schema, 일반 운동 탭 카드는 변경하지 않았다.

## 검증

1. PASS: `node --check render-calendar.js; node --check sw.js`
2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 25 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
4. PASS: `node --test --test-reporter=dot @testFiles`
5. PASS: `git diff --check`
6. not verified yet: Pages 배포와 인증 계정 실제 `운동 탭 -> 카드 + 행 -> 세트 입력 -> 종목완료 -> 완료 도장` UI flow 확인 필요

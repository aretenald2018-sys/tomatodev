# 운동 숫자 입력 키보드 UX 개선 리뷰

## 리뷰 대상

- `docs/ai/features/2026-06-30-workout-number-input-keyboard-ux.md`
- `workout/exercises.js`
- `style.css`
- `sw.js`
- `tests/workout-card-layout-css.test.js`
- `tests/*` cache marker 기대값 변경

## Findings

- 없음.

## 확인한 사항

- `workout/exercises.js`의 focus scroll guard는 `.set-input`, `.set-rpe-input`, `.set-rom-input`으로 한정되어 운동 숫자 입력 외 화면에 영향을 주지 않는다.
- guard는 입력이 이미 화면 안에 충분히 보이는 경우의 작은 scroll delta만 되돌리고, 바닥 근처 입력은 브라우저가 키보드 위로 올릴 수 있게 둔다.
- 일반 세트 input은 `64px`/`36px` hit area와 `inputmode`가 적용됐다.
- Max V2 input은 높이만 `30px`로 키우고 글자는 `14px`로 유지해 360px 이하 한 줄 예산에서 숫자 잘림 리스크를 줄였다.
- 저장 schema, `wtUpdateSet`, `wtUpdateSetRir`, `wtUpdateSet(...romPct)` 경로는 변경하지 않았다.
- `style.css`와 `workout/exercises.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` cache version bump가 필요했고 반영됐다.

## 검증

- PASS: `node --check workout/exercises.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-card-layout-css.test.js tests/workout-navigation-stack.test.js` — 10 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포와 인증 계정 실제 `운동 탭 -> 운동 상세 -> 숫자 입력 -> 모바일 키보드` UI flow 확인이 남아 있다.

## 결정

- 코드 추가 수정 없이 Dashboard3 Pages 배포 검증으로 진행한다.

# 운동탭 pull-down back Slice 11 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 11
- 진단: `docs/ai/diagnoses/2026-06-25-workout-tab-pull-refresh-conflict.md`
- 구현: `app.js`, `style.css`, `sw.js`
- 테스트: `tests/workout-navigation-stack.test.js`, cache version 참조 테스트들

## 발견 사항

- 없음.

## 확인한 사항

- [app.js](../../app.js)는 운동탭 활성 상태에서만 `wt-workout-tab-active`를 body에 부여한다.
- 운동탭 최상단 아래 방향 gesture만 intercept하며, nested scroller가 위로 더 스크롤 가능한 상태에서는 기존 scroll을 방해하지 않는다.
- gesture threshold 이후 기존 workout back stack을 호출하므로 `detail -> record -> calendar -> sheet close` 순서를 재사용한다.
- [style.css](../../style.css)는 운동탭 활성 상태에만 root overscroll을 제한한다.
- [sw.js](../../sw.js) `CACHE_VERSION`이 `tomatofarm-v20260625z56-workout-pull-back`로 갱신됐다.

## 검증

- PASS: `node --check app.js; node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node --test .\tests\*.test.js` — 513 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 UI flow 확인은 남아 있다.

## 결정

- 코드 추가 수정 없이 배포 검증으로 진행한다.

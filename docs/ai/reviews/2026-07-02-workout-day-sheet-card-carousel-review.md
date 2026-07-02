# 운동 하단 시트 카드 캐러셀 리뷰

- 계획: `docs/ai/features/2026-07-02-workout-day-sheet-card-carousel.md`
- 변경 파일: `render-calendar.js`, `style.css`, `sw.js`, `tests/workout-calendar-bottom-sheet.test.js`, cache marker 테스트들, `docs/ai/NEXT_ACTION.md`
- 리뷰 일시: 2026-07-02

## Findings

- 발견된 차단 이슈 없음.

## 확인한 점

- 사용자 스크린샷의 surface가 일반 운동 기록 입력 화면이 아니라 캘린더/운동 홈 하단 시트임을 기준으로 수정 범위를 다시 잡았다.
- `_renderWorkoutDetailCards()`에서 운동종목 카드는 carousel helper로 분리하고, 활동/러닝 카드는 기존 detail card 흐름을 유지해 blast radius를 줄였다.
- 하단 시트 scroller의 기존 `touch-action: pan-y`가 내부 horizontal swipe를 막을 수 있어 `pan-x pan-y`로 변경했고, carousel track도 같은 touch 정책을 가진다.
- `style.css`와 `render-calendar.js`가 service worker `STATIC_ASSETS` 대상이므로 `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 25 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`

## 남은 리스크

- not verified yet: 인증 계정 실제 모바일 UI에서 하단 시트의 여러 운동종목 카드를 좌우로 swipe하는 flow는 아직 직접 확인하지 못했다.

## Slice 2 리뷰

Findings:

- 발견된 차단 이슈 없음.

확인한 점:

- 좌우 드래그가 잘 안 잡히는 원인은 carousel 구조가 아니라 하단 시트 scroller의 touch isolation이 가로 gesture까지 세로 scroll chain 방지 대상으로 처리할 수 있는 점이었다.
- carousel 내부의 명확한 가로 touch/wheel gesture는 `preventDefault()` 없이 빠져나가게 했고, 세로 gesture는 기존 chain 방지 로직을 유지했다.
- `render-calendar.js`가 `STATIC_ASSETS` 대상이므로 `sw.js` cache version bump가 포함됐다.

검증:

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 25 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`

남은 리스크:

- not verified yet: 인증 계정 실제 모바일 UI에서 하단 시트 carousel 좌우 drag 감도는 아직 직접 확인하지 못했다.

# 운동 하단 시트 세트 체크 긴급 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-02-workout-sheet-set-check-toggle.md`
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/*.test.js` cache marker
  - `tests/workout-calendar-bottom-sheet.test.js`

## Findings

- 문제 없음.

## 확인

- `render-calendar.js`는 편집용 `rawSetDetails.done`을 `set.done === true`로 렌더해, 미체크처럼 보이는 행의 첫 탭이 반드시 완료 처리로 들어간다.
- 체크/삭제 버튼은 인라인 `onclick` 대신 `data-wt-set-done-toggle` / `data-wt-set-remove`와 `.cal-workout-day-sheet` 내부 capture 핸들러로 처리한다.
- 체크 토글 저장은 `{ preserveSheetScroll: true }`를 사용해 하단 시트 스크롤 위치를 유지한다.
- `style.css`는 체크 버튼을 30px 터치 타깃으로 키우고, 삭제/그립 열과 분리했다.
- `render-calendar.js`와 `style.css`는 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z8-workout-sheet-check-toggle`로 bump했다.
- `style.css` 변경에 대한 전용 `tds-reviewer` subagent는 도구 정책상 사용자가 명시적으로 delegation을 요청한 경우에만 spawn 가능해 실행하지 못했고, 본 리뷰에서 직접 확인했다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js` - 27 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`

## 남은 확인

- not verified yet: 인증된 모바일 PWA에서 `운동 탭 -> 오늘 하단 시트 -> 편집하기 -> 세트 ✓ 탭` 실제 터치 UI flow는 직접 행사하지 못했다. 배포 후 자산/marker 검증으로 운영 반영 여부를 확인한다.

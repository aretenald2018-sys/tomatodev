# 운동 picker row 밀도 Slice 7 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md` Slice 7
- 변경 파일:
  - `workout/exercises.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-empty-picker-density.test.js`

## 결과

- PASS: picker row는 `58px / 유동 / 84px` 구조로 바뀌어 기존 82px 썸네일 열과 오른쪽 14px padding이 만들던 빈 폭을 줄였다.
- PASS: 운동명은 길이 기반 compact class로 `13px`, `12px`, `11px` 고정 단계만 사용한다. 뷰포트 기반 font scaling은 없다.
- PASS: 운동명은 `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, `word-break: keep-all`로 한 줄 우선 표시된다.
- PASS: 최근 수행 chip은 84px 우측 열 안에서 작게 보이도록 `9px`, `2px 5px` padding으로 축소했다.
- PASS: `style.css`와 `workout/exercises.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z25-picker-row-density`로 bump했다.

## TDS 리뷰

- 발견 1: 오른쪽 padding을 `0`으로 두면 우측 액션이 화면 끝에 붙을 수 있다는 지적이 있었다.
- 처리: `#ex-picker-list.ex-picker-content`의 오른쪽 padding을 `max(4px, env(safe-area-inset-right))`로 조정했다. 기존 14px 여백은 제거하되 최소 edge guard는 남겼다.
- 발견 2: 최근 수행 chip `9px`은 Seed text token보다 작다는 지적이 있었다.
- 처리: 사용자 요청이 chip font 축소이고, 프로젝트 가이드의 Badge sm 기준이 `9px`이므로 유지했다. 대신 테스트가 chip 축소와 우측 열 폭을 명시적으로 방어한다.

## 검증

- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/workout-empty-picker-density.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: read-only TDS review completed; medium finding addressed, low finding accepted with rationale.

## 남은 리스크

- not verified yet: Dashboard3 Pages 배포 후 인증 계정으로 `운동 탭 -> + -> 가슴 선택` 실제 UI flow를 확인해야 한다.

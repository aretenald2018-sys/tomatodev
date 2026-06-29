# 운동 타이머 요약 카드 단일 표시 리뷰

## 검토 범위

- 계획 문서: `docs/ai/features/2026-06-24-workout-timer-summary-only.md`
- 변경 파일: `render-calendar.js`, `style.css`, `sw.js`, `tests/workout-timer-summary-only.test.js`
- 관련 캐시 테스트: `tests/*`의 `CACHE_VERSION` 기대값 갱신

## 결과

- 발견 사항: 없음

## 확인 내용

1. `_renderWorkoutDetailSummaryCard()`는 `운동시간` 항목을 계속 렌더링한다.
2. `_renderWorkoutDetailCards()`는 운동/활동 row가 없을 때도 더 이상 `운동 타이머` activity card를 만들지 않는다.
3. day detail modal body에서 duration-only 섹션과 `운동 타이머 ...` 보조 라인을 제거했다.
4. 제거된 라인의 죽은 `.cal-workout-timer-line` CSS와 삭제 확인용 `timer: '운동 타이머'` 라벨 매핑도 정리했다.
5. `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION` bump가 함께 반영됐다.

## 검증

1. PASS: `node --check render-calendar.js; node --check sw.js`
2. PASS: `node --test tests/workout-timer-summary-only.test.js tests/stats-picker-ui-polish.test.js tests/workout-active-session-recovery.test.js tests/workout-track-graph-delta.test.js tests/workout-test-mode-unified.test.js tests/stats-muscle-fatigue-insight.test.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `git diff --check`

## 남은 리스크

- 배포 브라우저는 인증 이후 화면 접근이 필요하므로, 최종 UI 클릭 흐름은 인증 계정으로 `운동 탭 -> 날짜 상세`에서 확인해야 한다.

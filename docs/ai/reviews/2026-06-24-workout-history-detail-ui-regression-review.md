# 운동 홈 과거 상세 UI 회귀 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-history-detail-ui-regression.md`
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`

## Findings

- Findings: 없음.

## 확인 내용

- 상단 액션 row는 `오늘`, `루틴`, `내보내기`, `삭제`, `수정`을 한 줄 grid로 렌더한다.
- `setDetails.done`이 `_isActualWorkoutSet(set)`을 재사용해, `done` 필드가 없는 과거 kg/reps 기록도 완료 체크로 표시된다.
- 그래프는 기존 `polyline` 대신 cubic SVG `path`로 렌더하고, CSS는 `polyline`과 `path` 모두 지원한다.
- 과거 날짜 `루틴` 버튼은 `_loadWorkoutEditorForSession()`을 호출하기 전에 return하므로 편집 UI로 회귀하지 않는다.
- `style.css`와 `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: 실제 모바일 UI 플로우는 로그인 세션과 과거 운동 데이터가 필요해 이 세션에서 브라우저로 확인하지 않았다.

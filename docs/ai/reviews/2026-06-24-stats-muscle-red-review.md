# 통계탭 근육 활성 붉은색 단일화 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-23-stats-muscle-fatigue-render.md` Slice 2
- 변경 파일:
  - `render-stats.js`
  - `style.css`
  - `sw.js`
  - `docs/ai/features/2026-06-23-stats-muscle-fatigue-render.md`
  - `docs/ai/NEXT_ACTION.md`

## 결과

- 발견한 차단 이슈: 없음
- 배포 UI 검증: not verified yet
  - 이유: 현재 working tree/index에 운동 picker 관련 선행 변경(`assets/workout/muscles/*`, `render-calendar.js`, `workout/exercises.js`, `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`, `sw.js` 일부)이 섞여 있어, 통계탭 수정만 별도로 커밋/푸시하기 어렵다.

## 확인한 내용

1. `render-stats.js`
   - `FATIGUE_PERIODS`에서 `일별`을 제거하고 `주별`/`월별`만 남겼다.
   - `FATIGUE_GROUPS`의 부위별 다색 `color` 값을 제거했다.
   - 활성도 `level`에 따라 `hsl(3, saturation%, lightness%)` 단일 red tint를 계산한다.
   - hotspot과 row 모두 활성 부위만 렌더링한다.
   - 활성 기록이 없으면 0값 row 대신 빈 상태 문구를 렌더링한다.
   - 근육 활성 계산이 `workoutSessions`의 각 회차 `exercises`를 읽도록 보정되어 최신 운동 기록 구조를 반영한다.
2. `style.css`
   - 근육 활성 카드 배경/텍스트를 앱 기본 surface/text 토큰으로 복구했다.
   - hotspot과 bar는 `--mf` red tint만 사용한다.
   - 활성 row를 1열로 바꿔 모바일에서 깨진 다열 목록이 나오지 않게 했다.
3. `sw.js`
   - `render-stats.js`, `style.css`가 `STATIC_ASSETS` 대상이라 `CACHE_VERSION`을 bump했다.

## 검증

- PASS: `node --check render-stats.js`
- PASS: `node --check sw.js`
- PASS: `rg -n "#22c55e|#38bdf8|#f97316|#84cc16|#a78bfa|일별" render-stats.js` 출력 없음
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` 및 통계탭 UI flow 확인 필요

## 남은 결정

- 사용자 결정: 운동 picker 변경과 함께 배포한다.

# 종목추가 모달 오늘 부위 사전필터 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-03-exercise-picker-today-muscle-prefilter.md`
- 슬라이스: `Slice 1: Max 종목 피커의 오늘 부위 스코프 고정`
- 변경 파일:
  - `workout/exercises.js`
  - `sw.js`
  - `docs/ai/features/2026-06-03-exercise-picker-today-muscle-prefilter.md`
  - `docs/ai/NEXT_ACTION.md`

## Findings

- 발견된 코드 blocker 없음.

## 확인 내용

- `workout/exercises.js`는 Max 피커일 때만 `S.workout.maxMeta.selectedMajors` 기반 scope를 계산한다. 일반 피커와 일반 expert 헬스장 필터 경로에는 새 scope가 적용되지 않는다.
- `basePool`, `availableMuscles`, `visibleMuscles`가 같은 오늘 major scope를 공유하므로, 상단 부위 탭과 아래 그룹 목록이 서로 다른 범위를 보이지 않는다.
- `+ 종목 추가`는 오늘 선택 major 첫 항목을 기본 부위로 넘긴다.
- `workout/exercises.js`가 `sw.js` `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION` 갱신이 포함됐다.

## 검증

- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `git diff --check -- workout/exercises.js sw.js docs/ai/features/2026-06-03-exercise-picker-today-muscle-prefilter.md docs/ai/NEXT_ACTION.md`
- not verified yet: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 미추적 mockup 참조(`mockups/poc/*`, `mockups/trio-renewal/shared.css`) 때문에 실패했다.
- not verified yet: 로컬 dev server가 `127.0.0.1:5500/5501/5502/3000/3001/3002`에서 실행 중이지 않아 모달 UI 플로우는 직접 확인하지 못했다.

## 결론

- 리뷰 통과.

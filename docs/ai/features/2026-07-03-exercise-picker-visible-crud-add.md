# 2026-07-03 운동 종목 피커 CRUD 신규 추가 버튼 노출

## 상태

- 단계: `ready_for_execution`
- 트리거: `/diagnose`
- 요청: 운동 종목 목록 화면에서 신규 종목을 추가할 수 있는 버튼이 보이지 않는다. 종목은 CRUD가 되어야 한다.

## 진단

1. `workout/exercises.js`에는 `wtOpenExerciseEditor(null, ...)`, `wtSaveExerciseFromEditor()`, `wtDeleteExerciseFromEditor()` 기반의 생성/수정/삭제 로직이 이미 있다.
2. 피커 상단에는 `#ex-picker-add-top` 아이콘 버튼이 있지만, 화면에서 CRUD 생성 진입점으로 충분히 발견 가능하지 않다.
3. 부위별 목록 하단의 `+ {부위} 종목 추가(선택)` 버튼은 긴 목록 아래에 있어 사용자가 현재 화면에서 신규 추가 가능 여부를 알기 어렵다.
4. 검색/필터 결과가 0건인 경우도 필터 초기화만 보이고, 바로 신규 종목을 만들 수 있는 행동이 없다.

## 목표

- 운동 종목 목록 화면에서 항상 보이는 `+ 종목 추가` 버튼을 제공한다.
- 현재 부위 탭이나 헬스장 범위를 유지해 신규 종목 에디터를 연다.
- 빈 결과 상태에서도 신규 추가 버튼을 제공한다.
- 기존 수정/삭제 동작은 그대로 유지한다.

## 실행 슬라이스 1

범위:

1. `workout/exercises.js`의 피커 목록 툴바에 명시적인 신규 추가 버튼을 추가한다.
2. 빈 결과 상태에 신규 추가 버튼을 추가하고 `wtOpenExerciseEditor(null, _pickerMuscleFilter || null)`로 연결한다.
3. `style.css`에서 모바일 화면에서도 정렬/범위/추가 버튼이 겹치지 않도록 툴바 레이아웃을 조정한다.
4. `sw.js` `CACHE_VERSION`을 bump하고 관련 cache marker 테스트를 갱신한다.
5. 회귀 테스트에 신규 추가 버튼과 CRUD 경로 노출을 고정한다.

제외:

- 종목 데이터 스키마 변경
- 운동 카드 캐러셀 동작 변경
- 헬스장/부위 관리 기능 확장

## 검증 계획

1. `node --check workout/exercises.js sw.js`
2. `node --test tests/stats-picker-ui-polish.test.js tests/workout-empty-picker-density.test.js tests/workout-picker-gym-rail.test.js`
3. `node --test tests/*.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `git diff --check`
6. 운영 Pages 배포 후 `verify:deploy`와 deployed marker 검증


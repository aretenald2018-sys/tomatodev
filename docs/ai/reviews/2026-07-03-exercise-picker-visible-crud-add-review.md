# 2026-07-03 운동 종목 피커 CRUD 신규 추가 버튼 노출 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-exercise-picker-visible-crud-add.md`
- 변경 파일:
  1. `workout/exercises.js`
  2. `style.css`
  3. `sw.js`
  4. `tests/stats-picker-ui-polish.test.js`
  5. cache marker 테스트 파일들
  6. `docs/ai/NEXT_ACTION.md`

## 결과

- 발견 사항: 없음
- 판단: 계획한 Slice 1 범위 안에서 신규 생성 진입점 노출, 빈 상태 생성 CTA, 모바일 툴바 레이아웃, cache marker 갱신이 함께 적용됐다.

## 검토 내용

1. `workout/exercises.js`
   - 목록 툴바에 `data-picker-create-exercise` 버튼이 추가되어 리스트 화면에서 항상 `+ 종목 추가`가 보인다.
   - 버튼은 기존 생성 경로인 `_openPickerEditorFromHeader()`를 호출하며, 현재 부위 필터가 있으면 해당 부위를 기본값으로 넘긴다.
   - 빈 결과 상태에도 `data-picker-empty-create` 버튼이 추가되어 필터 초기화 없이 신규 종목을 만들 수 있다.
   - 기존 수정/삭제 함수와 row edit/delete 경로는 변경하지 않았다.

2. `style.css`
   - 정렬 버튼과 신규 추가 버튼을 같은 row에 두고, 범위 버튼은 다음 row에 배치해 작은 모바일 폭에서 겹침 위험을 줄였다.
   - 신규 추가 버튼은 `white-space: nowrap`과 고정 최소 터치 높이를 가져 텍스트 줄바꿈으로 레이아웃이 흔들리지 않는다.

3. `sw.js`
   - `STATIC_ASSETS`에 포함된 `workout/exercises.js`, `style.css`가 바뀌었으므로 `CACHE_VERSION`을 `tomatofarm-v20260703z7-exercise-picker-crud-add`로 bump했다.

## 검증

1. PASS: `node --check workout/exercises.js; node --check sw.js`
2. PASS: `node --test tests/stats-picker-ui-polish.test.js tests/workout-empty-picker-density.test.js tests/workout-picker-gym-rail.test.js` (14 pass)
3. PASS: `node --test tests/*.test.js` (650 pass)
4. PASS: `node scripts/verify-runtime-assets.mjs` (`refs=868`)
5. PASS: `git diff --check`

## 남은 리스크

- not verified yet: 인증 계정의 실제 모바일 UI에서 `운동 -> 종목 추가 피커 -> 가슴 탭 -> + 종목 추가 -> 저장/삭제` 클릭 플로우는 배포 후 확인해야 한다.


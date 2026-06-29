# 운동 picker 필터 레이아웃 Slice 4 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md` Slice 4
- 변경 파일:
  - `modals/ex-picker-modal.js`
  - `workout/exercises.js`
  - `style.css`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
  - `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`

## 결과

- Blocking findings: 없음.
- 기존 목록 내부 `필터 적용` 배너와 `부위`/`헬스장` 칩 스택이 제거되어 사진 1의 상단 탭 + 목록 헤더 필터 구조로 이동했다.
- 목록 상태의 상단 탭은 `분류 + 부위 탭`으로 렌더링되고, 범위 전환은 목록 헤더의 `전체`/`커스텀` 버튼이 담당한다.
- 숨은 헬스장 필터가 남아 목록이 예기치 않게 좁아지지 않도록 picker open/category/list/reset 경로에서 `pickerGymFilter`를 `전체`로 동기화한다.
- 정렬 통계는 `getCache()`와 `getWorkoutSessions()`를 사용해 legacy 기록과 다회차 기록을 모두 집계한다.
- `style.css`, `workout/exercises.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION` bump가 같이 반영됐다.

## 검증

- PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: inline filter handler 잔존 검색에서 `window._wtSetPicker*`/`window._wtResetAllPickerFilters` onclick 패턴 없음.

## 남은 리스크

- `즐겨찾기` 저장 모델은 이번 범위 밖이라 사진 1처럼 별 아이콘은 보이지만 비활성 상태다.
- 배포 URL의 실제 picker 클릭 흐름은 로그인 게이트 때문에 인증 계정으로 확인해야 한다.

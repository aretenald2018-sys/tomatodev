# 운동 추가 분류형 진입 UI

## 요청

- 운동 탭에서 우측 하단 `+` 운동 추가 버튼을 누르면 현재 `종목 선택` 바텀시트 목록형으로 바로 진입한다.
- 이를 첨부 이미지 3처럼 검색/상단 탭/부위 분류 그리드 중심의 전체 화면형 UI로 바꾼다.
- 이후 특정 부위를 누르면 그 부위에 등록된 운동들이 뜨고, 기존처럼 선택해서 오늘 운동에 추가할 수 있어야 한다.

## 그릴 결과

- 질문: 이미지 3의 해부학 썸네일까지 1차 구현에 포함할지, 먼저 분류 진입 흐름과 레이아웃을 바꿀지가 핵심이다.
- 결정: 1차 실행은 새 bitmap 자산을 추가하지 않고 `가슴/어깨/등/하체/둔부/이두/삼두/복부` 부위 분류 화면과 drilldown 목록 전환을 구현한다.
- 근거: 저장소에는 근육별 이미지 자산이 없고, 현재 picker의 실제 기능은 `workout/exercises.js`의 카탈로그/부위 필터/선택 로직에 집중되어 있다. 새 이미지 자산까지 넣으면 기능 변경과 자산 제작이 섞인다.
- 가정: `등록해둔 운동들`은 기존 `getExList()` 운동 카탈로그를 뜻한다. 부위별 노출은 현재 `_exerciseMajorIds()` 기준으로 `muscleId`, `muscleIds`, `movementId`를 모두 반영한다.
- 탭 결정: `즐겨찾기` 모델은 현재 없으므로 빈 탭을 만들지 않는다. 1차는 실제 동작 가능한 `분류`, `전체`, `커스텀` 진입만 제공한다.

## 실행 슬라이스

### Slice 1: 운동 추가 picker의 분류 첫 화면과 부위 drilldown

대상 파일:

- `modals/ex-picker-modal.js`
- `workout/exercises.js`
- `style.css`
- `sw.js`

구현:

- `wtOpenExercisePicker()` 진입 시 기본 화면을 `분류`로 둔다.
- picker 모달을 바텀시트 느낌에서 모바일 전체 화면형으로 바꾼다.
- 상단에는 뒤로/닫기, 검색 필드, `+` 종목 추가 버튼, 탭 행을 둔다.
- `분류` 탭에서는 전체/커스텀 요약과 부위 그리드를 보여준다.
- 각 부위 타일에는 해당 부위에 매칭되는 등록 운동 수를 표시한다.
- 부위 타일을 누르면 기존 목록 선택 로직을 재사용해 그 부위 운동 목록으로 전환한다.
- `전체` 탭 또는 검색 입력은 기존 전체 목록 흐름으로 전환한다.
- `커스텀` 탭은 `custom_` 종목만 보여주는 목록 흐름으로 전환한다.
- 기존 선택 동작, 종목 수정/숨김/삭제, 헬스장 필터, Max 벤치마크 picker 동작은 유지한다.
- `style.css`와 `workout/exercises.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

범위 밖:

- 새 해부학/근육 이미지 자산 제작.
- 즐겨찾기/최근 30일 데이터 모델 추가.
- 운동 저장 스키마 변경.
- `www/` 직접 수정.
- Firebase 직접 호출 추가.

## 검증 계획

- `node --check modals/ex-picker-modal.js workout/exercises.js sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- UI flow: Dashboard3 Pages에서 운동 탭 → 오늘 운동 화면 → 우측 하단 `+` → 분류 첫 화면 표시 → `가슴` 등 부위 타일 선택 → 해당 부위 운동 목록 표시 → 운동 하나 선택 시 오늘 세션에 추가.

## 상태

- 계획 세션 완료.
- Slice 1 실행 완료.
- 구현 요약:
  - `modals/ex-picker-modal.js`를 전체 화면형 topbar/search/tab/content 구조로 변경했다.
  - `workout/exercises.js`에 `category/list` picker view 상태, 부위 분류 화면, 전체/커스텀 목록 전환, 부위 tile drilldown을 추가했다.
  - `style.css`에 전체 화면 picker, 상단 탭, 분류 rail, 부위 grid/figure 스타일을 추가했다.
  - `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z12-ex-picker-category-entry`로 bump했다.
- 실행 검증:
  - PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
  - PASS: `node scripts/verify-runtime-assets.mjs`
  - PASS: `git diff --check`
  - not verified yet: Dashboard3 Pages 배포 및 인증 계정 UI 클릭 검증은 리뷰/배포 단계에서 진행한다.
- 리뷰:
  - PASS: `docs/ai/reviews/2026-06-24-exercise-picker-category-entry-review.md`
- 다음 단계: Dashboard3 Pages 배포 검증.

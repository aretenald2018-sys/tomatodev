# 운동 추가 분류형 진입 UI

## 요청

- 운동 탭에서 우측 하단 `+` 운동 추가 버튼을 누르면 현재 `종목 선택` 바텀시트 목록형으로 바로 진입한다.
- 이를 첨부 이미지 3처럼 검색/상단 탭/부위 분류 그리드 중심의 전체 화면형 UI로 바꾼다.
- 이후 특정 부위를 누르면 그 부위에 등록된 운동들이 뜨고, 기존처럼 선택해서 오늘 운동에 추가할 수 있어야 한다.
- 2026-06-24 추가 요청: 첨부 이미지 1→2→3의 순서처럼 우하단 `+` 이후 바로 전체 화면 picker로 진입해야 한다. 첨부 이미지 4처럼 현재 앱의 `헬스 종목` 랜딩 화면에 머무르는 흐름은 제거한다.
- 2026-06-24 추가 요청: 부위별 그림은 첨부 이미지 2에서 추출해 현재 picker 부위 도형을 대체한다.

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

### Slice 2: 우하단 + 직접 picker 진입과 부위 아트 자산 대체

대상 파일:

- `render-calendar.js`
- `workout/exercises.js`
- `style.css`
- `sw.js`
- `assets/workout/muscles/*.png`

구현:

- 운동 탭 오늘 상세 화면에서 우하단 `+`를 누르면 기존 `_wtCalAddSession()`의 편집 화면 진입 직후 `wtOpenExercisePicker()`가 바로 열려 `헬스 종목` 랜딩을 거치지 않는다.
- 기존 `헬스 종목` 헤더/본문의 추가 버튼은 유지하되, 빈 상태 첫 진입의 핵심 경로는 사진 1→2 흐름처럼 picker 직접 진입으로 맞춘다.
- picker 분류 화면의 부위 타일은 CSS 도형 대신 `assets/workout/muscles/` 이미지 자산을 렌더한다.
- 이미지 자산은 첨부 이미지 2의 부위 그림에서 현재 앱 기본 부위 8개(`chest`, `shoulder`, `back`, `lower`, `glute`, `bicep`, `tricep`, `abs`)를 추출한다.
- 현재 앱 기본 부위에 없는 `neck`, `trap`, `forearm`, `calf` 등은 새 데이터 모델로 추가하지 않는다. 기존 운동 카탈로그에 실제로 노출되는 부위만 대체한다.
- 이미지가 없거나 커스텀 부위인 경우 기존 CSS fallback이 보이도록 한다.
- `render-calendar.js`, `style.css`, `workout/exercises.js`, 새 이미지 자산을 `STATIC_ASSETS`에 반영하고 `sw.js` `CACHE_VERSION`을 bump한다.

범위 밖:

- 즐겨찾기/최근 30일 정렬 모델 추가.
- 사진 3의 운동별 동작 썸네일 자산 제작.
- 새 근육 부위 데이터 추가.
- 오늘 운동 저장 스키마 변경.
- `www/` 직접 수정.

## 검증 계획

- `node --check modals/ex-picker-modal.js workout/exercises.js sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Slice 2 추가 검증: `node --check render-calendar.js workout/exercises.js sw.js`
- Slice 2 추가 검증: `assets/workout/muscles/` 이미지 8개가 존재하고 `sw.js` `STATIC_ASSETS`에 등록됐는지 확인
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
- 추가 계획:
  - Slice 2 계획 완료.
- Slice 2 실행 완료.
- Slice 2 구현 요약:
  - `render-calendar.js`의 우하단 `+` 흐름을 편집 화면 로드 직후 `wtOpenExercisePicker()`를 여는 방식으로 변경했다.
  - 첨부 이미지 2에서 현재 기본 부위 8개 이미지를 추출해 `assets/workout/muscles/*.png`로 추가했다.
  - `workout/exercises.js`에서 기본 부위 타일은 PNG를 렌더하고, 이미지 없는 커스텀 부위는 기존 CSS fallback을 유지하도록 했다.
  - `style.css`에 이미지 타일 스타일을 추가했다.
  - `sw.js`에 새 PNG 8개를 `STATIC_ASSETS`로 등록하고 `CACHE_VERSION`을 `tomatofarm-v20260624z13-ex-picker-muscle-assets`로 bump했다.
- Slice 2 실행 검증:
  - PASS: `node --check render-calendar.js; node --check workout/exercises.js; node --check sw.js`
  - PASS: `node scripts/verify-runtime-assets.mjs`
  - PASS: `assets/workout/muscles/` PNG 8개 존재 및 `sw.js` 등록 확인
  - PASS: `git diff --check`
  - PASS: `git diff --cached --check`
  - not verified yet: Dashboard3 Pages 배포 및 인증 계정 UI 클릭 검증 필요.
- Slice 2 리뷰:
  - PASS: `docs/ai/reviews/2026-06-24-exercise-picker-category-entry-slice2-review.md`
- 배포 검증:
  - PASS: 커밋 `bb8ae05`를 `origin/main`에 push했다.
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ bb8ae05`
  - not verified yet: 배포 URL은 로그인 화면에 막혀 운동 탭 → 우하단 `+` → picker 분류 화면 UI 클릭 흐름을 인증 계정으로 끝까지 확인하지 못했다.
- 다음 단계: 인증 계정으로 Dashboard3 Pages에 로그인한 뒤 운동 탭 → 오늘 운동 상세 → 우하단 `+` → picker 분류 화면 → `가슴` 선택 → 운동 목록 표시 → 운동 추가를 확인한다.

### Slice 3: 부위 아트 자산 선명도 개선

요청:

- 배포된 picker 부위 아트 자산이 스크린샷 crop 기반이라 화질이 낮아 보인다.
- 모바일 70px 내외 표시에서도 선명하게 보이도록 고해상도 자산으로 교체한다.

대상 파일:

- `assets/workout/muscles/*.png`
- `sw.js`
- `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`
- `docs/ai/reviews/2026-06-24-exercise-picker-assets-sharp-review.md`

구현:

- 이미지 생성 스킬로 만든 고해상도 해부학 contact sheet를 기준으로 현재 기본 부위 8개(`chest`, `shoulder`, `back`, `lower`, `glute`, `bicep`, `tricep`, `abs`)를 다시 추출한다.
- 각 자산은 투명 배경 PNG로 저장하고, UI에서 축소될 때 선명하도록 기존보다 큰 원본 해상도를 사용한다.
- 기존 경로와 파일명은 유지해 `workout/exercises.js` 경로 변경 없이 교체한다.
- `assets/workout/muscles/*.png`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

범위 밖:

- 부위 데이터 모델 추가.
- picker 레이아웃/개수/탭 로직 변경.
- 운동별 동작 썸네일 제작.

검증 계획:

- PNG 8개가 투명 배경과 충분한 해상도를 가지는지 확인한다.
- `node --check sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 `assets/workout/muscles/chest.png` 등 자산이 새 고해상도 파일로 내려오는지 확인한다.

실행 결과:

- 2026-06-24: Slice 3 구현 완료.
- 기존 screenshot crop 기반 저해상도 PNG 8개를 고해상도 생성 contact sheet 기반 `384x288` RGBA PNG로 교체했다.
- 기존 경로와 파일명은 유지했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z15-sharp-muscle-assets`로 bump했다.
- PASS: PNG 8개 크기 `384x288`, 모드 `RGBA`, 모서리 alpha 0 확인
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 리뷰: `docs/ai/reviews/2026-06-24-exercise-picker-assets-sharp-review.md`
- not verified yet: Dashboard3 Pages 배포 및 배포 URL 자산 확인 필요.

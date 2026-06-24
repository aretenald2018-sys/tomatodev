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
- 배포 검증:
  - PASS: 커밋 `562a572`를 `origin/main`에 push했다.
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 562a572`
  - PASS: 배포 URL의 `assets/workout/muscles/*.png` 8개가 모두 `384x288` RGBA 파일로 내려오는 것을 확인했다.
  - not verified yet: 로그인 화면에 막혀 운동 picker 분류 화면의 시각 상태는 인증 계정으로 확인 필요.

### Slice 4: 목록 필터 레이아웃과 정렬 시스템을 사진 1 구조로 변경

요청:

- `가슴` 등 부위 선택 후 나오는 운동 목록 화면의 필터 UI를 사진 1처럼 처리한다.
- 현재처럼 목록 내부에 `필터 적용` 배너, 별도 `부위`/`헬스장` 칩 행, 카드형 추가 안내가 쌓이는 구조를 제거한다.
- 상단 탭은 목록 상태에서 `분류 + 부위 탭`으로 동작하게 하고, 선택된 부위는 탭 underline/active 상태로 표시한다.
- 목록 바로 위에는 `최근`/`빈도`/`이름` 정렬 컨트롤과 `전체`/`즐겨찾기`/`커스텀` 범위 컨트롤을 한 줄에 배치한다.

대상 파일:

- `modals/ex-picker-modal.js`
- `workout/exercises.js`
- `style.css`
- `sw.js`
- `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`
- `docs/ai/reviews/2026-06-24-exercise-picker-filter-layout-review.md`

구현:

- picker 목록 상태에서 상단 탭 DOM을 동적으로 렌더링해 `분류`, 사용 가능한 부위 탭, `전체`, `커스텀`의 활성 상태를 정확히 표시한다.
- `분류` 탭은 분류 첫 화면으로 돌아가고, 부위 탭은 해당 부위 목록으로 이동한다.
- 기존 목록 내부의 활성 필터 배너와 부위/헬스장 필터 스택을 제거한다.
- 목록 상단 컨트롤은 정렬(`최근`, `빈도`, `이름`)과 범위(`전체`, 비활성 `즐겨찾기`, `커스텀`)만 표시한다.
- 정렬은 캐시의 과거 운동 기록을 기준으로 최근 수행일, 총 수행 횟수, 이름순을 지원한다.
- 각 운동 row에는 사진 1처럼 왼쪽 미디어 슬롯, 운동명, `총 n번, n일 전` 메타, 우측 편집/삭제 액션을 배치한다. 운동별 썸네일 자산이 없으면 부위 이미지 기반 fallback 슬롯을 사용한다.
- 검색어가 입력되면 기존처럼 목록으로 전환하되 검색 상태는 필터 배너가 아니라 목록 헤더의 결과 상태로만 표현한다.
- `style.css`, `workout/exercises.js`, `modals/ex-picker-modal.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

범위 밖:

- 즐겨찾기 저장 모델 신규 추가.
- 운동별 동작 썸네일 자산 신규 제작.
- 헬스장 기구 관리 데이터 모델 변경.
- 오늘 운동 저장 스키마 변경.
- `www/` 직접 수정.

검증 계획:

- `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 로그인 후 `운동 탭 -> + -> 가슴 선택` 시 사진 1처럼 상단 부위 탭과 정렬/범위 행이 보이고, `최근`/`빈도`/`이름`을 눌렀을 때 목록 순서가 바뀌는지 확인한다.

실행 결과:

- 2026-06-24: Slice 4 구현 완료.
- `modals/ex-picker-modal.js`의 탭 초기 마크업을 동적 렌더링 전제로 단순화했다.
- `workout/exercises.js`에서 목록 상태의 상단 탭을 `분류 + 사용 가능한 부위 탭`으로 동적 렌더링한다.
- 목록 내부의 `필터 적용` 배너, 부위/헬스장 필터 스택, 상단 quick add 안내 박스를 제거했다.
- 목록 상단에 `최근`/`빈도`/`이름` 정렬과 `전체`/비활성 `즐겨찾기`/`커스텀` 범위 행을 추가했다.
- `getCache()`와 `getWorkoutSessions()` 기반으로 과거 회차별 운동 수행 횟수와 마지막 수행일을 집계해 `총 n번, n일 전` 메타와 정렬에 반영했다.
- picker open/list/category 전환 시 숨은 헬스장 필터가 남지 않도록 `pickerGymFilter`를 `전체` 범위로 동기화했다.
- `style.css`에서 목록 row를 왼쪽 미디어 슬롯, 가운데 이름/기록 메타, 오른쪽 액션 영역의 3열 구조로 변경했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z16-picker-filter-layout`로 bump했다.
- PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 리뷰: `docs/ai/reviews/2026-06-24-exercise-picker-filter-layout-review.md`
- 배포 검증:
  - PASS: 커밋 `9594418`을 `origin/main`에 push했다.
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 9594418`
  - PASS: Dashboard3 Pages가 `tomatofarm-v20260624z16-picker-filter-layout` 캐시 버전을 서빙하는 것을 확인했다.
  - not verified yet: 배포 URL은 로그인 화면에 막혀 `운동 탭 -> + -> 가슴 선택 -> 최근/빈도/이름 정렬` UI 클릭 흐름을 인증 계정으로 끝까지 확인하지 못했다.

### Slice 5: 운동 추가 후 오늘 운동 카드 헤더 UI 회귀 수정

증상:

- 운동을 추가한 직후 오늘 운동 카드에서 운동명이 2~3글자 폭으로 세로 줄바꿈된다.
- 예시: `바벨 벤치프레스`가 `바벨 벤 / 치프레 / 스`처럼 좁은 컬럼에 갇힌다.

진단:

- 일반 운동 카드 헤더는 `muscle chip + name + po-pill + sparkline + remove`를 한 줄 flex로 배치한다.
- `.ex-sparkline-wrap`은 `min-width:176px`로 고정되어 있고, 삭제 버튼도 우측에 고정된다.
- 모바일 카드 폭에서 스파크라인과 삭제 버튼이 공간을 먼저 차지하면서 `.ex-block-name`이 과도하게 줄어드는 구조다.
- 이는 picker 변경 자체가 카드 CSS를 직접 덮은 것은 아니지만, 운동 추가 흐름이 직접 picker로 바뀌면서 카드 진입 직후 회귀가 즉시 노출되는 문제다.

대상 파일:

- `style.css`
- `sw.js`
- `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`
- `docs/ai/reviews/2026-06-24-workout-card-header-regression-review.md`

구현:

- `#tab-workout .ex-block-header`가 줄바꿈 가능한 header layout이 되도록 한다.
- 운동명은 최소 폭을 보장하고 `overflow-wrap:anywhere`를 금지해 단어가 불필요하게 글자 단위로 쪼개지지 않게 한다.
- 스파크라인은 운동명과 같은 줄에서 이름을 밀지 않고 다음 줄 전체 폭으로 내려가도록 한다.
- 삭제 버튼과 프로 모드 `po-pill`은 첫 줄에서 고정 폭 요소로 유지한다.
- `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

범위 밖:

- 운동 카드 기능/저장 로직 변경.
- picker 필터 레이아웃 추가 수정.
- 운동별 썸네일 자산 제작.

검증 계획:

- `node --check sw.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- CSS source check: `#tab-workout .ex-block-header`에 `flex-wrap: wrap`, `.ex-sparkline-wrap`에 `flex-basis: 100%`, `.ex-block-name`에 `min-width`가 있는지 확인한다.
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 로그인 후 `운동 탭 -> + -> 운동 선택 -> 운동 카드`에서 운동명이 정상 폭으로 보이고 스파크라인이 다음 줄로 내려가는지 확인한다.

실행 결과:

- 2026-06-24: Slice 5 구현 완료.
- `style.css`에서 `#tab-workout .ex-block-header`를 줄바꿈 가능한 헤더로 변경했다.
- 운동명은 `min-width:min(11rem, 52vw)`와 `word-break:keep-all`을 적용해 스파크라인에 밀려 글자 단위로 쪼개지지 않게 했다.
- 스파크라인은 `#tab-workout .ex-block-header .ex-sparkline-wrap`에서 다음 줄 전체 폭으로 배치했다.
- 삭제 버튼은 첫 줄 우측에 남되 `margin-left:auto` 상속을 제거해 이름 영역을 압박하지 않게 했다.
- `tests/workout-card-layout-css.test.js`를 추가해 같은 CSS 회귀를 source-level로 방어한다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z17-workout-card-header`로 bump했다.
- 진단: `docs/ai/diagnoses/2026-06-24-workout-card-header-regression.md`
- 리뷰: `docs/ai/reviews/2026-06-24-workout-card-header-regression-review.md`
- PASS: `node --test tests/workout-card-layout-css.test.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 배포 검증:
  - PASS: 커밋 `c682986`을 `origin/main`에 push했다.
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ c682986`
  - PASS: Dashboard3 Pages가 `tomatofarm-v20260624z17-workout-card-header` 캐시 버전을 서빙하는 것을 확인했다.
  - PASS: 배포 URL의 `style.css`에 `flex-wrap: wrap`, `flex: 1 1 100%` 카드 헤더 회귀 수정 CSS가 포함된 것을 확인했다.
  - not verified yet: 배포 URL은 로그인 화면에 막혀 `운동 탭 -> + -> 운동 선택 -> 카드 헤더` UI 클릭 흐름을 인증 계정으로 끝까지 확인하지 못했다.

추가 하드닝:

- 2026-06-24: CSS wrap 의존만으로는 회귀 방어가 약해 일반 운동 카드 DOM을 다시 분리했다.
- 일반 운동 카드의 `ex-block-header`에는 부위, 운동명, `po-pill`, 삭제 버튼만 남기고, 스파크라인은 별도 `ex-block-trend` 행으로 렌더한다.
- `tests/workout-card-layout-css.test.js`에 DOM source check를 추가해 `${sparkline}`이 헤더 안으로 다시 들어오면 실패하게 했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z18-workout-card-trend-row`로 bump했다.
- PASS: `node --check workout/exercises.js; node --check sw.js; node --test tests/workout-card-layout-css.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 배포 검증:
  - PASS: 커밋 `f44e832`을 `origin/main`에 push했다.
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ f44e832`
  - PASS: 배포 URL의 `workout/exercises.js`에 `ex-block-trend` DOM 분리가 포함된 것을 확인했다.
  - PASS: 배포 URL의 `style.css`에 `#tab-workout .ex-block-trend` 스타일이 포함된 것을 확인했다.
  - PASS: Dashboard3 Pages가 `tomatofarm-v20260624z18-workout-card-trend-row` 캐시 버전을 서빙하는 것을 확인했다.

### Slice 6: picker row 선택 시 즉시 오늘 운동 카드로 닫히는 흐름 제거

증상:

- `가슴` 목록에서 운동 row를 누르면 picker가 즉시 닫히고 오늘 운동 카드 화면으로 돌아간다.
- 사용자는 이 동작을 `회귀 UI로 된다`고 지적했다.

진단:

- `_renderPickerList()`의 row click handler가 `S.workout.exercises.push(...)` 직후 `wtCloseExercisePicker()`를 호출한다.
- 따라서 reference UI처럼 picker 안에서 선택 상태를 유지하고 `완료`로 닫는 흐름이 아니라, 선택 즉시 기존 운동 카드 화면으로 전환된다.

구현:

- `modals/ex-picker-modal.js`에 picker footer와 `#ex-picker-done` 완료 버튼을 추가한다.
- row 선택 시 운동은 세션에 추가하되 picker를 닫지 않는다.
- 선택된 row는 `already` 상태와 `✓` 표시로 즉시 갱신한다.
- 완료 버튼은 운동이 하나 이상 선택되면 활성화되고, 사용자가 누를 때만 picker를 닫는다.
- `tests/ex-picker-selection-flow.test.js`를 추가해 row 선택 handler 안에 `wtCloseExercisePicker()`가 다시 들어오면 실패하게 한다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z19-picker-staged-done`으로 bump한다.

검증:

- PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-card-layout-css.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 배포 검증:
  - PASS: 커밋 `3de3708`을 `origin/main`에 push했다.
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 3de3708`
  - PASS: Dashboard3 Pages가 `tomatofarm-v20260624z19-picker-staged-done` 캐시 버전을 서빙하는 것을 확인했다.
  - PASS: 배포 URL의 `modals/ex-picker-modal.js`에 `ex-picker-done`이 포함된 것을 확인했다.
  - PASS: 배포 URL의 `workout/exercises.js`에 `_syncPickerDoneButton`이 포함된 것을 확인했다.
  - not verified yet: 배포 브라우저는 로그인 화면에 막혀 `운동 탭 -> + -> 가슴 -> row tap -> picker 유지 -> 완료` UI 클릭 흐름을 인증 계정으로 끝까지 확인하지 못했다.

### Slice 7: picker 목록 row 오른쪽 여백 제거와 텍스트 피팅

요청:

- 부위별 운동 목록 row에서 오른쪽 빈 여백을 줄인다.
- 운동종목명은 가능한 한 한 줄에 들어가도록 폰트 크기와 줄바꿈 정책을 조정한다.
- 최근 수행 정보 chip은 폰트와 패딩을 줄여 row 폭을 덜 차지하게 한다.

그릴 결과:

- 질문: 운동명을 전체 노출하기 위해 여러 줄을 허용할지, 한 줄 우선으로 말줄임을 허용할지가 핵심이다.
- 결정: 이번 요청은 한 줄 수용을 우선한다. 긴 운동명은 길이에 따라 고정 단계 폰트 크기를 낮추고, 그래도 넘치면 한 줄 말줄임 처리한다.
- 근거: 현재 스크린샷의 문제는 row 오른쪽 액션/최근 수행 chip 때문에 운동명이 여러 줄로 밀리며 목록 밀도가 낮아지는 것이다.
- 가정: `최근 수행 정보 chip`은 picker row 우측의 `.ex-picker-benchmark-meta`를 뜻한다.

대상 파일:

- `workout/exercises.js`
- `style.css`
- `sw.js`
- `tests/workout-empty-picker-density.test.js`
- `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`
- `docs/ai/reviews/2026-06-24-exercise-picker-row-density-review.md`

구현:

- picker row grid의 왼쪽 썸네일 열과 gap을 줄이고 우측 padding을 제거해 실제 row 폭을 더 쓰게 한다.
- 운동명에 길이 기반 compact class를 붙여 `13px -> 12px -> 11px` 고정 단계로 줄인다.
- 운동명은 `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, `word-break: keep-all`로 한 줄 우선 처리한다.
- picker modal 안의 최근 수행 chip 폰트와 padding을 줄이고 우측 액션 열을 오른쪽에 붙인다.
- `style.css`와 `workout/exercises.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

범위 밖:

- 운동별 썸네일 자산 신규 제작.
- 즐겨찾기/최근 기록 데이터 모델 변경.
- picker 선택/저장 플로우 변경.
- `www/` 직접 수정.

검증 계획:

- `node --check workout/exercises.js; node --check sw.js`
- `node --test tests/workout-empty-picker-density.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 로그인 후 `운동 탭 -> + -> 가슴 선택` 시 row 오른쪽 여백이 줄고 긴 운동명이 한 줄 우선으로 보이며 최근 수행 chip이 작아졌는지 확인한다.

실행 결과:

- 2026-06-24: Slice 7 구현 완료.
- `workout/exercises.js`에 운동명 길이 기반 compact class를 추가했다.
- `style.css`에서 picker list 오른쪽 padding을 `max(4px, env(safe-area-inset-right))`로 줄이고, row grid를 `58px / minmax(0, 1fr) / 84px` 중심으로 조정했다.
- 운동명은 한 줄 우선 표시와 길이별 `13px -> 12px -> 11px` 고정 단계 폰트를 적용했다.
- 최근 수행 chip은 84px 우측 열 안에서 작게 보이도록 `9px`, `2px 5px` padding으로 축소했다.
- `tests/workout-empty-picker-density.test.js`를 갱신해 row 밀도, 운동명 한 줄 정책, chip 축소를 source-level로 검증한다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z25-picker-row-density`로 bump했다.
- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/workout-empty-picker-density.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 리뷰: `docs/ai/reviews/2026-06-24-exercise-picker-row-density-review.md`
- 배포 검증:
  - PASS: `npm.cmd run deploy:dashboard3`
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
  - PASS: Dashboard3 Pages가 `tomatofarm-v20260624z25-picker-row-density` 캐시 버전을 서빙하는 것을 확인했다.
  - not verified yet: 배포 URL은 로그인 화면에 막혀 `운동 탭 -> + -> 가슴 선택 -> row 밀도/운동명/최근 수행 chip` UI 클릭 흐름을 인증 계정으로 끝까지 확인하지 못했다.

### Slice 8: picker row 선택 즉시 운동 기록 화면으로 랜딩

요청:

- picker 목록에서 특정 운동을 누르면 현재는 해당 row가 회색조/선택 상태로 바뀌고 picker 안에 남는다.
- 운동 선택 즉시 picker를 닫고 운동 기록 카드 화면으로 이동해야 한다.

그릴 결과:

- 질문: 여러 종목을 연속 선택하는 staged flow를 유지할지, 단일 선택 후 즉시 기록 화면으로 돌아갈지가 핵심이다.
- 결정: 이번 요청은 단일 선택 즉시 기록 화면 랜딩을 우선한다.
- 근거: 첨부 사진 1에서 row 선택 후 회색조로 남는 상태가 문제이며, 사진 2처럼 클릭 직후 운동 기록 카드가 보이는 흐름을 요구했다.
- 가정: `운동기록하는 두번째 사진`은 picker modal이 닫히고 `workout/exercises.js`의 Max V2 운동 카드가 보이는 상태를 뜻한다.

대상 파일:

- `workout/exercises.js`
- `sw.js`
- `tests/ex-picker-selection-flow.test.js`
- `tests/workout-test-mode-unified.test.js`
- `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`
- `docs/ai/reviews/2026-06-24-exercise-picker-immediate-close-review.md`

구현:

- picker row click handler에서 운동을 추가하고 운동 목록을 렌더한 직후 `wtCloseExercisePicker()`를 호출한다.
- 클릭 직후 picker 안에서 `already`/`✓` 상태를 보여주는 DOM 업데이트는 제거한다.
- timer bar open/start 및 save 흐름은 유지한다.
- `workout/exercises.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.
- 기존 staged selection 테스트를 즉시 닫힘 요구로 갱신한다.

범위 밖:

- picker footer 제거/재디자인.
- 여러 종목 연속 선택 UX 재도입.
- 운동 저장 스키마 변경.
- `www/` 직접 수정.

검증 계획:

- `node --check workout/exercises.js; node --check sw.js`
- `node --test tests/ex-picker-selection-flow.test.js tests/workout-test-mode-unified.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 로그인 후 `운동 탭 -> + -> 가슴 선택 -> 운동 row 클릭` 시 picker가 즉시 닫히고 운동 기록 카드 화면이 보이는지 확인한다.

실행 결과:

- 2026-06-24: Slice 8 구현 완료.
- `workout/exercises.js`에서 picker row click handler가 운동 추가와 `_renderExerciseList()` 후 즉시 `wtCloseExercisePicker()`를 호출하도록 변경했다.
- picker 내부 row를 회색조/선택 상태로 남기는 `already` class 추가와 이름 `✓` 업데이트를 제거했다.
- timer bar open/start와 silent save 흐름은 유지했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z27-picker-immediate-close`로 bump했다.
- `tests/ex-picker-selection-flow.test.js`를 즉시 닫힘 요구로 갱신하고, `tests/workout-test-mode-unified.test.js` 캐시 버전 검증을 갱신했다.
- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-test-mode-unified.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 리뷰: `docs/ai/reviews/2026-06-24-exercise-picker-immediate-close-review.md`
- not verified yet: Dashboard3 Pages 배포 및 인증 계정 UI 클릭 검증 필요.

# 유산소 picker 리스트 및 카드형 입력 계획

## 요청

첨부 사진 기준으로 운동 추가 화면의 `런닝/조깅`과 `유산소` 버튼을 기존 부위 버튼과 시각적으로 맞추고, `유산소` 선택 시 기본 유산소 종목 리스트를 보여준다. 하위 종목을 선택하면 한국어 입력 화면에서 기록을 입력하고, 저장된 유산소 운동 카드가 다른 헬스 종목 카드와 같은 디자인/캐러셀 시스템으로 추가되어야 한다.

## 그릴 결과

- 핵심 질문: 유산소 입력 단위는 사진 4의 `mi/mph`를 그대로 따라야 하는가?
- 결정: 앱의 기존 러닝/유산소 저장과 한국어 UI가 `km`, `km/h`, `kcal` 기준이므로 한국어/미터법으로 구현한다. 필드는 `칼로리(kcal)`, `거리(km)`, `속도(km/h)`, `랩/반복`으로 둔다.
- 핵심 질문: 유산소를 현재처럼 러닝 전용 세션으로 저장할지, 운동 카드 캐러셀에 넣을지?
- 결정: 사용자가 “다른 헬스운동종목카드와 디자인 일치”, “캐러셀에 추가하는 방식 동일”을 명시했으므로 기존 날짜 시트/운동 종목 캐러셀에 들어가는 카드형 엔트리로 구현한다.
- 남은 가정: 사진 3의 기본 리스트는 전 사용자 공통 기본값으로 `트레드밀 러닝`, `스텝머신`, `실내 자전거`, `로잉`, `인도어 사이클링`, `리컴번트 바이크` 6개를 제공한다.

## 현재 코드 관찰

- `workout/exercises.js`에는 이미 `data-picker-activity="running"`과 `data-picker-activity="manual-cardio"` 타일이 있다.
- 현재 `manual-cardio`는 하위 리스트 없이 수기 입력 sheet를 바로 열고, 저장 시 `S.workout.running/runData`를 임시로 세팅해 러닝 세션처럼 저장한다.
- 이 방식은 요구사항의 “여러 리스트 선택”, “운동카드 디자인/캐러셀 시스템 동일”과 맞지 않는다.
- 운동 추가 후 캐러셀 포커스 복원은 `render-calendar.js`의 `afterSelect`/pending focus 흐름과 `workout/exercises.js`의 `wtFocusWorkoutEntryCard()`에 이미 있다.
- `workout/exercises.js`, `render-calendar.js`, `style.css`, `index.html`은 `sw.js` `STATIC_ASSETS`에 포함되므로 수정 시 `CACHE_VERSION` bump가 필수다.

## 2026-07-06 후속 진단: picker 위계/렌더링 불일치

- 사용자가 새로 첨부한 화면 기준으로 Slice 1의 카드 저장 흐름은 별도 문제이고, picker 첫 화면의 위계가 아직 맞지 않는다.
- `workout/exercises.js`의 `_renderPickerActivityTiles()`가 `런닝/조깅`, `유산소`를 `data-picker-activity` activity tile로 따로 붙여 근육 부위 tile과 다른 primitive를 사용한다.
- `_renderPickerTabs()`는 `_pickerView === 'cardio'`일 때 상단탭을 `분류 | 유산소`로 따로 렌더링한다. 이 때문에 `유산소`가 가슴/어깨/등/하체 같은 부위 탭 체계와 다른 사일로로 보인다.
- 요구 해석: 러닝/조깅과 유산소는 전신/유산소 범주로서 같은 분류 grid와 top-tab hierarchy 안에 있어야 한다. 아이콘만 있는 별도 activity card가 아니라 기존 근육 tile과 같은 figure/body-rendering primitive를 쓴다.

## 실행 Slice 1: 유산소 리스트와 카드형 입력을 기존 운동 카드 흐름에 통합

### 범위

1. `workout/exercises.js`
   - `유산소` activity tile 클릭 시 직접 입력 sheet가 아니라 유산소 하위 리스트 view를 연다.
   - 기본 유산소 종목 6개를 전 사용자 공통 catalog로 제공한다.
   - 리스트 UI는 기존 picker list toolbar/group/row 밀도와 맞추고, 정렬/전체/커스텀 흐름을 깨지 않는다.
   - 하위 종목 클릭 시 한국어 입력 sheet를 열고 `칼로리`, `거리`, `속도`, `랩/반복` 값을 받는다.
   - 저장 시 기존 운동 엔트리 배열에 cardio 타입 엔트리를 추가하거나 갱신하고, 기존 `afterSelect`/focus 경로를 재사용한다.

2. `render-calendar.js`
   - 날짜 시트의 운동 카드 렌더러가 cardio 타입 엔트리를 다른 헬스 종목 카드와 같은 카드/캐러셀 구조로 렌더링한다.
   - 카드에는 종목명, kcal, 거리, 속도, 랩/반복을 한국어 라벨로 표시한다.
   - 카드 삭제/캐러셀 위치/세션 탭 흐름을 기존 운동 카드와 동일하게 유지한다.

3. `style.css`
   - `런닝/조깅`, `유산소` activity tile을 부위 tile과 같은 크기, radius, spacing, active/pressed 느낌으로 맞춘다.
   - 유산소 하위 리스트와 입력 sheet는 기존 picker row, modal/sheet, Seed/TDS 토큰을 사용한다.
   - 텍스트가 360px 모바일에서 줄바꿈/클리핑되지 않도록 고정 높이와 responsive 제약을 둔다.

4. `index.html`
   - 운동 타입 탭의 `런닝/조깅`, `유산소`가 다른 탭과 다르게 보이는 원인이 markup/icon 구조에 있으면 보정한다.
   - lazy module button rule을 지키고 새 inline handler는 추가하지 않는다.

5. `sw.js`
   - 위 STATIC_ASSETS 중 하나라도 수정하면 `CACHE_VERSION`을 새 값으로 bump한다.

6. 테스트
   - `tests/running-entry.test.js` 또는 새 focused test에 유산소 activity tile -> 하위 리스트 -> 입력 sheet -> 카드 엔트리 계약을 추가한다.
   - `tests/ex-picker-selection-flow.test.js` 또는 `tests/workout-calendar-bottom-sheet.test.js`에 유산소 카드가 캐러셀 카드 시스템에 들어가는 회귀를 추가한다.
   - cache marker 테스트가 있으면 새 `CACHE_VERSION`에 맞춘다.

### 제외

- GPS 러닝 세션, Health Connect, 실제 지도, 러닝 경로 렌더링은 수정하지 않는다.
- 사용자 커스텀 유산소 종목 CRUD는 이번 slice에 포함하지 않는다.
- 기존 헬스 종목 세트 입력 UX를 리팩터링하지 않는다.

### 검증

1. 정적 검증
   - `node --check workout/exercises.js`
   - `node --check render-calendar.js`
   - `node --check sw.js`

2. 테스트
   - focused tests: 유산소 picker/card 관련 테스트
   - `node --test tests/*.test.js`
   - `npm.cmd run verify:assets`

3. 시각/상호작용 QA
   - 모바일 375px 기준: 운동 추가 picker에서 `런닝/조깅`, `유산소` tile이 다른 부위 tile과 같은 밀도/정렬로 보이는지 확인한다.
   - `유산소` 클릭 -> 6개 리스트 노출 -> `스텝머신` 클릭 -> 한국어 입력 sheet 노출 -> 값 입력 -> 저장 -> 날짜 시트/운동 카드 캐러셀에 새 유산소 카드가 추가되고 포커스되는지 확인한다.
   - 카드가 기존 헬스 운동 카드와 같은 radius, spacing, action placement를 쓰는지 확인한다.

4. 운영 검증
   - `npm.cmd run deploy:production`
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
   - 배포 URL `https://aretenald2018-sys.github.io/tomatofarm/`에서 위 유산소 추가 UI flow를 직접 확인한다.

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-07-06-cardio-picker-card-entry.md`의 Slice 1을 실행한다. 앱 코드는 이 계획 범위 안에서만 수정하고, 유산소 리스트/입력/카드가 기존 운동 카드 캐러셀 시스템에 들어가는지 배포 URL까지 검증한다.

## 실행 Slice 2: picker 분류 위계와 전신/유산소 렌더링 통합

### 범위

1. `workout/exercises.js`
   - `런닝/조깅`, `유산소`를 별도 `data-picker-activity` tile이 아니라 picker category 모델의 범주로 렌더링한다.
   - 두 범주는 기존 `.ex-picker-muscle-tile`과 같은 구조/primitive를 사용하고, figure는 `.ex-picker-muscle-figure` 기반 전신/유산소 렌더링으로 맞춘다.
   - `유산소` 클릭은 기존 6개 유산소 리스트로 이동하되, 상단탭은 `분류 | 전체 | ...부위탭` 위계와 일관되게 유지한다.
   - `런닝/조깅` 클릭은 기존 러닝 시작/전환 동작을 유지한다.

2. `style.css`
   - activity 전용 아이콘 카드 스타일 의존을 줄이고, 전신/유산소 figure가 기존 부위 asset tile과 같은 크기, spacing, text density, active/pressed feel을 쓰게 한다.
   - 360-390px 모바일에서 `런닝/조깅`, `유산소` 텍스트가 클리핑/부자연스러운 줄바꿈 없이 표시되게 한다.

3. `tests/workout-picker-cardio-hierarchy.test.js`
   - RED: 기존 코드에서 `data-picker-activity`, `.ex-picker-activity-figure`, cardio-only `분류 | 유산소` tab branch가 남아 있으면 실패한다.
   - GREEN: `런닝/조깅`, `유산소`가 같은 muscle/category tile primitive와 통합 top-tab contract를 만족하면 통과한다.

4. `sw.js`
   - `workout/exercises.js` 또는 `style.css`를 수정하면 `CACHE_VERSION`을 새 값으로 bump한다.

### 제외

- Slice 1에서 구현된 유산소 저장/card entry schema, 날짜 시트 카드 렌더러, GPS 러닝 세션/지도는 변경하지 않는다.
- 사용자 커스텀 유산소 종목 CRUD는 추가하지 않는다.
- picker 전체 리디자인이나 새로운 탭 시스템 리팩터링은 하지 않는다.

### 검증

1. RED/GREEN
   - `node --test tests/workout-picker-cardio-hierarchy.test.js`
   - RED/GREEN 출력은 `.omo/evidence/exercise-picker-cardio/red-green-hierarchy-test.txt`에 남긴다.

2. 정적/회귀
   - `node --check workout/exercises.js sw.js`
   - `node --test tests/workout-picker-cardio-hierarchy.test.js tests/stats-picker-ui-polish.test.js tests/workout-empty-picker-density.test.js`
   - `node --test tests/*.test.js`
   - `npm.cmd run verify:assets`

3. 브라우저/시각 QA
   - 모바일 375x812 기준 picker category를 열어 `런닝/조깅`, `유산소`가 기존 부위 tile grid와 같은 primitive로 보이는지 screenshot을 캡처한다.
   - `유산소` 클릭 후 6개 cardio list가 열려도 상단탭이 cardio-only 사일로(`분류 | 유산소`)가 아닌 통합 위계를 유지하는지 JSON/assertion으로 확인한다.
   - evidence: `.omo/evidence/exercise-picker-cardio/browser-category-after.json`, `.omo/evidence/exercise-picker-cardio/picker-category-after.png`.

4. 운영 검증
   - `npm.cmd run deploy:production`
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
   - 배포 URL에서 로그인 없이 가능한 source/browser harness로 deployed `workout/exercises.js`, `style.css`, cache marker와 picker hierarchy contract를 확인한다. 실제 로그인 UI flow가 막히면 `not verified yet`과 blocker를 명시한다.

## Slice 2 다음 세션 시작 프롬프트

`docs/ai/features/2026-07-06-cardio-picker-card-entry.md`의 Slice 2를 실행한다. 앱 코드는 picker 분류 위계/전신 렌더링 통합 범위로만 수정하고, RED/GREEN 테스트와 모바일 picker browser evidence, production Pages 배포 검증까지 남긴다.

## 실행 Slice 3: 유산소 하위 종목별 회색 기구/제스처 이미지 삽입

### 범위

1. `assets/workout/cardio/`
   - `로잉`, `리컴번트 바이크`, `스텝머신`, `실내 자전거`, `인도어 사이클링`, `트레드밀 러닝` 6개 종목별 bitmap 이미지를 만든다.
   - 전체 톤은 기존 근육/전신 asset과 어울리도록 밝은 회색, 낮은 채도, 투명 배경 중심으로 맞춘다.
   - 이미지는 실제 기구나 운동 제스처가 구분될 정도의 실루엣을 가져야 하며, 앱 row 썸네일에서 텍스트나 badge와 겹치지 않는다.

2. `workout/exercises.js`
   - `CARDIO_PICKER_EXERCISES`에 종목별 image asset 경로를 추가한다.
   - cardio list row는 전신 fallback figure 대신 종목별 figure를 우선 렌더링한다.
   - asset이 없거나 로드되지 않는 경우에도 기존 전신 fallback을 유지한다.

3. `style.css`
   - 종목별 cardio figure가 `.ex-picker-cardio-item` row의 기존 높이/spacing 안에 들어오도록 크기, object-fit, opacity/tone을 고정한다.
   - 375x812 모바일에서 row title, history meta, detail badge와 겹침이 없어야 한다.
   - `최근/빈도/이름` 정렬 컨트롤은 기존 `.ex-picker-list-toolbar` / `.ex-picker-sort-btn` 스타일을 유지한다.
   - row 오른쪽의 `로잉 머신`, `좌식 자전거` 같은 기구명 chip은 제거한다.

4. `tests/workout-picker-cardio-hierarchy.test.js`, `tests/running-entry.test.js`
   - 6개 cardio catalog item이 image asset을 가진다는 정적 계약을 추가한다.
   - legacy 전신-only cardio row 회귀가 생기면 실패한다.

5. `sw.js`
   - 새 cardio asset을 `STATIC_ASSETS`에 추가하고 `CACHE_VERSION`을 bump한다.

### 제외

- 유산소 종목 CRUD, 저장 schema, 날짜 시트 카드 디자인은 변경하지 않는다.
- 실제 사진급 컬러 기구 이미지는 만들지 않는다. 기존 picker와 맞는 회색 bitmap asset만 추가한다.
- `www/` build artifact는 직접 수정하지 않는다.

### 검증

1. 이미지 검증
   - 각 asset이 존재하고 alpha PNG이며, row 썸네일 크기에서 nonblank인지 확인한다.

2. 정적/회귀
   - `node --check workout/exercises.js sw.js`
   - `node --test tests/workout-picker-cardio-hierarchy.test.js tests/running-entry.test.js`
   - `node --test tests/*.test.js`
   - `npm.cmd run verify:assets`

3. 브라우저/시각 QA
   - 모바일 375x812 cardio list screenshot에서 6개 row가 서로 구분되는 기구/제스처 이미지를 표시하는지 확인한다.
   - evidence: `.omo/evidence/exercise-picker-cardio/browser-category-after.json`, `.omo/evidence/exercise-picker-cardio/picker-cardio-after.png`.

4. 운영 검증
   - `npm.cmd run deploy:production`
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
   - 배포 URL의 source/browser harness에서 종목별 asset 경로, HTTP 200, cache marker를 확인한다.

## Slice 3 다음 세션 시작 프롬프트

`docs/ai/features/2026-07-06-cardio-picker-card-entry.md`의 Slice 3를 실행한다. 유산소 하위 종목별 회색 기구/운동 제스처 bitmap asset을 생성해 picker cardio list row에 삽입하고, STATIC_ASSETS/cache bump, tests, browser visual QA, production Pages 배포 검증까지 남긴다.

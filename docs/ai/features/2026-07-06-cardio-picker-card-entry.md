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

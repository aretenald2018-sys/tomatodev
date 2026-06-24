# Dashboard3 테스트모드 운동 UI 일원화 계획

## 사용자 증상

- 기대 UI: 운동 탭 `헬스 종목` 아래에 테스트모드 카드가 렌더된다.
  - 카드 헤더: `벤치마크 · 선택 헬스장`
  - 본문: `오늘 성공 기준`, 볼륨/강도 그래프, `KG / REP / RIR / ROM` 세트 행
  - 액션: `다음 세트 완료`, `세트 추가`
- 실제 UI: 같은 위치에서 일반 운동 카드가 렌더된다.
  - 상단 `+ 종목 추가(선택)` 버튼이 노출된다.
  - 카드가 `가슴/하체` 칩, 일반 sparkline, `kg/회` 단순 세트 행, 메모 영역 형태로 보인다.
- 사용자는 "아까 잘 나오다가 갑자기 중간에 돌아감"이라고 보고했다.

## 코드상 용어 정리

- 사용자가 말한 `테스트모드`는 코드 내부에서 `mode === 'max'`, `Max v2` 렌더러로 구현되어 있다.
- 따라서 이 문서에서 `max`는 별도 제품 모드가 아니라 테스트모드의 내부 식별자다.

## 근본 원인

### 1. 테스트모드 엔트리 판정 기준이 저장/로드와 렌더러에서 다르다

- 저장/로드 계층은 운동 엔트리에 아래 필드 중 하나가 있으면 테스트모드 초안으로 본다.
  - `recommendationMeta.mode === 'max'`
  - `maxPrescription`
  - `maxWeakPart`
- 예: `workout/save-pure.js`의 `hasMaxDraftEntry()`, `workout/load.js`의 `_isMaxDraftEntry()`.
- 하지만 실제 운동 카드 렌더러 `workout/exercises.js`의 `_renderExerciseList()`는 엔트리 필드를 보지 않고 전역 `getExpertMode() === 'max'`만 본다.
- 결과적으로 같은 테스트모드 엔트리라도 전역 preset mode가 `normal` 또는 `pro`로 바뀌면 즉시 일반 카드 HTML 분기로 떨어진다.

### 2. 세트 행 렌더도 같은 전역 모드 의존을 가진다

- `workout/exercises.js`의 `_isMaxEntryMode(entryIdx)`는 현재 `embedded max card` 또는 전역 `_isMaxWorkoutMode()`만 본다.
- 저장된 엔트리의 `maxPrescription`/`recommendationMeta.mode`는 보지 않는다.
- 그래서 카드 껍데기뿐 아니라 `RIR/ROM` 세트 행도 일반 `kg/회` 세트 행으로 회귀한다.

### 3. 종목 피커도 전역 테스트모드가 빠지면 일반 풀로 돌아간다

- `_getMaxBenchmarkPickerPool()`은 `_isMaxWorkoutMode()`와 `_isExpertSessionActive()`가 모두 true일 때만 벤치마크 피커 풀을 만든다.
- 이 조건이 false면 `_getPickerExercisePool()`은 `getExList()` 일반 풀을 반환한다.
- 그 상태에서 행을 누르면 `_buildPickerExerciseEntry()`가 테스트모드 처방 없는 일반 엔트리를 만든다.
- 이 경로가 사용자가 말한 "여기서 누르면 회귀 UI로 된다"와 직접 연결된다.

### 4. 전역 mode를 바꾸는 코드 경로가 여러 개다

- `wtExcShowProView()`는 `saveExpertPreset({ mode: 'pro', enabled: true })`를 호출한다.
- `wtExcSwitchToNormalView()`와 `wtExcLeaveExpertMode()`는 `mode: 'normal'`을 저장한다.
- `wtExcReEnableExpertMode()`는 무조건 `mode: 'pro'`를 저장한다.
- 즉 테스트모드 세션/엔트리가 남아 있어도 전역 preset mode가 다른 경로에서 바뀌면 렌더러는 그것을 테스트모드로 복원하지 않는다.

## 결론

이번 회귀는 CSS나 배포 캐시가 1차 원인이 아니다. 핵심은 `테스트모드 여부`의 단일 진실원이 없다.

- 저장/로드는 엔트리 메타를 테스트모드로 인정한다.
- 렌더러/피커는 전역 preset mode만 인정한다.
- 전역 mode가 중간에 바뀌면 저장된 테스트모드 엔트리도 일반 운동 UI로 렌더된다.

## 추가 사용자 결정

2026-06-24 추가 요청:

- Dashboard3에서 렌더링되는 운동 데이터는 테스트모드 UI와 기능으로 일원화한다.
- 기존 프로모드 또는 일반모드 UI가 현출될 가능성을 제거한다.
- 프로모드 기능은 헬스장별 운동기구 설정 정도만 남긴다.

## /grill-me 결과

- 핵심 결정: Dashboard3 운동 기록 화면의 canonical UI는 테스트모드 카드다. 일반/프로 기록 카드는 fallback UI가 아니라 제거 대상이다.
- 일반모드의 자유 기록 기능은 테스트모드 피커/카드 안에서 수용한다. 처방이 없는 종목도 테스트모드 카드 shell과 `KG/REP/RIR/ROM` 세트 행을 사용한다.
- 프로모드의 루틴 추천/프로 카드/모드 선택 UI는 Dashboard3 운동 기록 화면에서 노출하지 않는다.
- 프로모드에서 남길 기능은 헬스장, 운동기구, 종목 범위 설정이다. 이 기능은 피커/설정 진입점으로만 남기고 기록 UI를 바꾸지 않는다.
- 데이터 마이그레이션은 하지 않는다. 렌더/선택 단계에서 레거시 일반 운동 데이터를 테스트모드 카드로 감싸서 표시한다.

## 새 범위

### 반드시 제거할 회귀 경로

1. `workout/exercises.js`의 일반 카드 HTML 분기
   - Dashboard3 운동 화면에서는 `ex-block-header`, 일반 sparkline, 일반 `kg/회` row가 주 렌더로 나오면 안 된다.
2. `workout/exercises.js`의 프로모드 전용 `expertHtml`, `poPillHtml`, RPE 추천 블록
   - 테스트모드 카드와 기능이 충돌하므로 기록 화면에서는 비활성화한다.
3. `workout/expert.js`의 운동 방식 선택 카드
   - `일반모드`, `프로모드`, `테스트모드`를 고르는 진입 UI를 기록 화면에 노출하지 않는다.
4. 피커의 일반 풀 fallback
   - 테스트모드 컨텍스트에서 피커가 일반 풀을 쓰더라도, 선택 결과는 테스트모드 카드 엔트리로 저장되어야 한다.

### 남길 기능

1. 테스트모드 카드 렌더
   - `오늘 성공 기준`
   - 볼륨/강도 그래프
   - `KG / REP / RIR / ROM` 세트 행
   - `다음 세트 완료`, `세트 추가`
2. 테스트모드 성장 보드/벤치마크/피커
3. 헬스장별 운동기구 설정
   - 헬스장 선택/추가/수정
   - 해당 헬스장 운동기구 등록/수정/삭제
   - 피커의 기구 관리 진입

## Slice 1: 운동 기록 화면 테스트모드 렌더 일원화

수정 범위:

1. `workout/exercises.js`
   - `_isMaxEntryData(entry)` 헬퍼를 추가한다.
   - `_isDashboardTestModeSurface()` 또는 동등한 헬퍼를 추가해 Dashboard3 운동 기록 화면에서는 항상 테스트모드 렌더를 선택한다.
   - `_renderExerciseList()`에서 일반 카드 분기를 fallback으로 쓰지 않고, 모든 운동 엔트리를 테스트모드 카드 shell로 렌더한다.
   - max 카드 class, header, graph, last summary, action 버튼, `maxAllDone`/collapse 판정을 `isTestModeEntry` 기준으로 바꾼다.
   - `_isMaxEntryMode(entryIdx)`도 Dashboard3 테스트모드 표면 또는 엔트리 메타를 보도록 바꿔 `RIR/ROM` 세트 행을 항상 유지한다.
   - 처방이 없는 일반/레거시 엔트리는 `_resolveMaxPrescription()`의 local prescription 또는 안전한 기본값으로 `오늘 성공 기준`을 표시한다.
2. `workout/exercises.js`
   - `_getMaxBenchmarkPickerPool()`이 전역 `mode === 'max'`뿐 아니라 Dashboard3 테스트모드 표면, 현재 세션 `maxMeta.mode === 'max'`, 기존 엔트리의 max 메타를 테스트모드 컨텍스트로 인정하게 한다.
   - 벤치마크가 없는 일반 등록 종목을 선택해도 테스트모드 카드 엔트리 형태로 생성되게 한다.
   - 기존 `buildMaxPickerExerciseEntry()`의 "벤치마크가 아닌 피커 종목은 일반 수동 종목" 계약은 Dashboard3 기록 화면에서는 더 이상 사용하지 않는다. 테스트를 새 정책에 맞게 교체한다.
3. `workout/expert.js`
   - 기록 화면에서 일반모드/프로모드 진입 UI를 노출하는 `_renderWorkoutModeEntry()` 경로를 숨기거나 테스트모드/기구관리 전용으로 축소한다.
   - `wtExcShowProView`, `wtExcSwitchToNormalView`, `wtExcReEnableExpertMode` 같은 전역 mode 전환 함수가 운동 기록 UI를 일반/프로로 바꾸지 못하게 한다.
   - 헬스장/기구 관리 함수는 유지한다.
3. `tests/`
   - 소스 레벨 회귀 테스트를 추가한다.
   - `_renderExerciseList()`가 일반 카드 HTML 분기로 운동 엔트리를 렌더하지 않도록 확인한다.
   - `ex-block--max-v2`, `ex-max-v2-primary`, `ex-max-v2-set`이 Dashboard3 운동 기록의 기본 경로임을 확인한다.
   - 피커 선택 경로가 테스트모드 엔트리 생성 헬퍼를 통과하는지 확인한다.
   - `wtExcShowProView`/`wtExcSwitchToNormalView`가 기록 UI를 일반/프로 카드로 되돌리는 경로를 만들지 않는지 확인한다.
4. `sw.js`
   - `workout/exercises.js`, `workout/expert.js`가 `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 bump한다.

검증:

- `node --check workout/exercises.js`
- `node --check workout/expert.js`
- `node --check sw.js`
- `node --test tests/<new-test>.js tests/ex-picker-selection-flow.test.js tests/workout-card-layout-css.test.js tests/calc.max.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `git push origin HEAD:main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- Dashboard3 배포 URL에서 운동 탭 진입, 기존 일반 기록 로드, 새 운동 추가, 피커 완료 후 모두 `오늘 성공 기준`, 볼륨/강도 그래프, `KG/REP/RIR/ROM`, `다음 세트 완료` UI로 유지되는지 확인한다.
- Dashboard3 배포 URL에서 일반/프로 카드 UI가 기록 화면에 노출되지 않는지 확인한다.
- Dashboard3 배포 URL에서 헬스장/기구 관리 경로는 계속 접근 가능한지 확인한다.

# 운동 피커 헬스장 rail 필터

## 요청

- 운동 피커 분류 화면 왼쪽 rail을 `전체/커스텀/기구 관리`가 아니라 `전체/이용자가 설정한 헬스장1/이용자가 설정한 헬스장2...` 구조로 바꾼다.
- 이용자가 설정한 헬스장을 관리하는 칩을 추가하고, 여기서 해당 헬스장의 운동기구 CRUD를 할 수 있게 한다.
- 기존 프로모드/일반모드 UI가 다시 노출되는 회귀 경로를 줄이고, Dashboard3에 배포한다.

## 진단

### 관찰

- `workout/exercises.js`의 `_renderPickerCategory()`가 왼쪽 rail을 `전체`, `커스텀`, `기구 관리`로 하드코딩한다.
- rail의 `전체/커스텀` 클릭은 분류 화면의 스코프 필터가 아니라 `_openPickerList()`로 바로 목록 전환한다.
- `_openPickerList()`는 매번 `_resetPickerGymScope()`를 호출해서 기존 헬스장 필터를 초기화한다.
- 목록 필터에서 특정 `gymId`는 `gymTags`가 직접 포함된 종목만 남기므로, 공통 종목이 헬스장별 보기에서 사라질 수 있다.
- `workout/expert/max.js`의 `openMaxEquipmentPoolModal({ gymId })`에는 이미 공통 모듈 토글과 헬스장 전용 기구 추가/수정/삭제가 있다.

### 원인 가설과 결론

1. rail이 실제 헬스장 데이터가 아니라 고정 요약 버튼이라 사용자가 원하는 `헬스장별 필터` 역할을 하지 못한다. 채택.
2. `_openPickerList()`가 gym scope를 초기화해서 분류에서 선택한 헬스장 컨텍스트가 부위 목록으로 이어질 수 없다. 채택.
3. 기존 기구 CRUD 모달을 현재 헬스장만 기준으로 열어 선택 rail의 헬스장과 불일치할 수 있다. 채택.
4. 헬스장별 목록에서 공통 종목을 제외하면 “이 헬스장에서 이용 가능한 종목” 의미와 어긋난다. 채택.

## 실행 Slice 1

### 목표

피커 분류 화면의 왼쪽 rail을 실제 저장된 헬스장 데이터 기반 필터로 바꾸고, 선택된 헬스장 기준으로 분류 타일 수와 목록 결과 및 기구 관리 모달이 일관되게 동작하게 한다.

### 변경 범위

- `workout/exercises.js`
  - 헬스장별 usable 필터 헬퍼 추가.
  - 카테고리 rail 렌더를 `전체 + 저장된 gyms + 헬스장 관리`로 변경.
  - rail 선택 시 분류 화면에 머물며 muscle tile count를 선택 스코프로 다시 계산.
  - 부위 타일/부위 탭/목록 전환 시 선택된 gym scope 보존.
  - 특정 gym scope 목록에 공통 종목도 포함.
  - 기구 관리 모달을 선택된 gym scope 우선으로 열기.
- `style.css`
  - 저장된 헬스장 이름이 긴 경우에도 rail 칩이 깨지지 않게 compact active 스타일 보강.
- `sw.js`
  - `STATIC_ASSETS` 변경에 따른 `CACHE_VERSION` bump.
- `tests/`
  - rail 하드코딩 제거, gym scope 보존, selected gym 기반 CRUD 모달 호출을 막는 회귀 테스트 추가.

### 제외

- 헬스장 CRUD 자체의 신규 데이터 모델 변경.
- `openMaxEquipmentPoolModal()`의 내부 CRUD 구조 재설계.
- 운동 카드 기록 UI 변경.
- 피커 상단 `전체/커스텀` 탭 자체 제거.

## 검증

1. `node --check workout/exercises.js`
2. `node --check sw.js`
3. `node --test tests/workout-picker-gym-rail.test.js`
4. `node --test tests/*.test.js`
5. `npm.cmd run verify:assets`
6. `git diff --check`
7. `origin/main`에 push 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
8. Dashboard3 배포 자산에서 다음 문자열이 반영됐는지 확인:
   - `data-picker-gym`
   - `data-picker-action="manage-gyms"`
   - 새 `CACHE_VERSION`

## 실행 결과

- `workout/exercises.js`의 category rail을 `전체 + 저장된 헬스장 + 헬스장 관리`로 변경했다.
- 헬스장 rail 클릭은 분류 화면에 머물며 부위별 count를 선택 스코프 기준으로 다시 계산한다.
- 부위 타일, 부위 탭, back/분류 탭 진입 시 선택된 gym scope가 유지된다.
- 특정 gym scope 목록에는 공통 종목도 포함한다.
- `헬스장 관리`는 선택 rail gym을 우선으로 `openMaxEquipmentPoolModal({ gymId })`를 호출한다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z24-picker-gym-rail`로 bump했다.
- 로컬 검증:
  - PASS: `node --check workout/exercises.js`
  - PASS: `node --check sw.js`
  - PASS: `node --test tests/workout-picker-gym-rail.test.js tests/workout-test-mode-unified.test.js`
  - PASS: `node --test tests/*.test.js`
  - PASS: `npm.cmd run verify:assets`
  - PASS: `git diff --check`

## 다음 실행 프롬프트

`docs/ai/features/2026-06-24-exercise-picker-gym-rail.md` Slice 1을 구현하고 Dashboard3에 배포 검증한다.

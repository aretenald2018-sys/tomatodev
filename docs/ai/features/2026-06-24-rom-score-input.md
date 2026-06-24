# ROM 10점 입력 전환 계획

## 배경

테스트모드 운동 카드 압축 과정에서 ROM 입력을 한 줄 숫자 필드로 만들었지만, 현재 값이 퍼센트 그대로 `80`, `95`, `100`처럼 표시된다. 사용자는 ROM을 퍼센트가 아니라 `8`, `9.5`, `10` 같은 10점 스케일로 입력하길 원한다.

## 목표

- 화면 입력은 10점 스케일로 표시한다.
  - `8` 입력 → 내부 저장 `romPct: 80`
  - `9.5` 입력 → 내부 저장 `romPct: 95`
  - 기존 `romPct: 100` → 화면 표시 `10`
- 저장 스키마와 계산 로직은 기존 `romPct` 퍼센트 값을 유지한다.
- Dashboard3 테스트모드 카드 compact 구조는 유지한다.

## 범위

### 포함

- `workout/exercises.js`
  - `romPct` ↔ 10점 입력값 변환 helper 추가
  - 테스트모드 ROM input의 `min/max/step/value/aria-label/suffix` 변경
  - ROM input 이벤트에서 10점 입력을 퍼센트로 변환 후 저장
- `tests/workout-card-layout-css.test.js`
  - ROM input이 10점 스케일 계약을 따르는지 회귀 테스트 추가
- `tests/workout-test-mode-unified.test.js`
  - `sw.js` cache version 기대값 갱신
- `sw.js`
  - `CACHE_VERSION` bump

### 제외

- 기존 저장 데이터 migration
- ROM 기반 볼륨/e1RM 계산식 변경
- 운동 카드 레이아웃 추가 축소

## 실행 슬라이스

### Slice 1 — ROM score input

1. `romPct` 저장값을 10점 입력 표시값으로 바꾸는 helper를 추가한다.
2. 입력 변경 시 10점 값을 퍼센트로 변환해 기존 `romPct` 필드에 저장한다.
3. 테스트 계약과 service worker cache version을 갱신한다.
4. 정적 테스트 후 Dashboard3에 배포하고 검증한다.

## 검증 계획

- `node --check workout/exercises.js`
- `node --test tests/workout-card-layout-css.test.js tests/workout-test-mode-unified.test.js tests/calc.expert.test.js`
- `node --test tests/*.test.js`
- `npm.cmd run verify:assets`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

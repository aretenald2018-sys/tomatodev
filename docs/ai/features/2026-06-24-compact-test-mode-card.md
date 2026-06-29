# 테스트모드 운동 카드 압축 계획

## 배경

Dashboard3 운동 기록 화면의 테스트모드 종목 카드가 모바일 화면에서 너무 높다. 현재 카드 높이는 세트별 ROM 슬라이더가 2행을 차지하고, 직전 볼륨 기록이 여러 줄로 흐르면서 사용자가 한 화면에서 볼 수 있는 종목 수를 크게 줄인다.

## 목표

- 테스트모드 운동 종목 카드 높이를 현재 체감 높이의 약 60% 수준으로 줄인다.
- `직전 볼륨`은 한 행으로 표시한다.
- 세트 조작 기능은 유지하되, 높이에 직접 영향을 주는 요소를 우선 압축한다.
- Dashboard3의 테스트모드 렌더 일원화는 유지한다.

## 그릴 결과

- 질문: 높이를 가장 많이 차지하는 요소는 무엇인가?
- 답변: 4개 세트 각각의 ROM 슬라이더 2행 구조와 직전 볼륨 줄바꿈이다.
- 결정: ROM은 슬라이더 대신 한 줄의 `ROM %` 숫자 입력으로 유지하고, 세트 행을 1행 그리드로 압축한다.
- 결정: 직전 기록은 `직전 볼륨 04/24 · 60kg×19 1세트 / ...` 형태의 단일 텍스트 행으로 렌더한다.
- 결정: 그래프와 성공 기준 영역은 유지하되 padding, gap, font-size, min-height를 줄인다.
- 남은 가정: 사용자는 ROM을 빠르게 슬라이더로 조정하는 것보다 카드 밀도를 우선한다.

## 범위

### 포함

- `workout/exercises.js`
  - `_buildMaxLastSessionSummary`를 한 줄 요약 마크업으로 변경
  - 테스트모드 세트 행의 ROM 입력을 한 줄 구조로 변경
  - ROM 입력 이벤트 바인딩을 input-only 구조도 처리하도록 변경
- `style.css`
  - `.ex-max-v2-*` 카드, 계획, 직전 기록, 세트 행, 액션 영역의 vertical spacing 축소
  - ROM 슬라이더 대신 compact number field 스타일 추가
- `tests/`
  - 직전 볼륨 단일 행 렌더 계약 추가
  - 세트 행이 ROM 슬라이더에 의존하지 않는지 확인
- `sw.js`
  - `CACHE_VERSION` bump

### 제외

- 피커 레이아웃 변경
- 테스트모드 처방 계산 로직 변경
- 저장 스키마 변경

## 실행 슬라이스

### Slice 1 — 테스트모드 카드 컴팩트화

1. 직전 볼륨 요약을 단일 행 마크업으로 변경한다.
2. 테스트모드 세트 행에서 ROM 슬라이더를 제거하고 `ROM %` 숫자 입력을 한 줄에 넣는다.
3. 카드/세트 CSS를 모바일 기준 compact spacing으로 조정한다.
4. 회귀 테스트를 갱신/추가한다.
5. `sw.js` 캐시 버전을 bump한다.
6. 정적 테스트 후 Dashboard3에 배포하고 검증한다.

## 검증 계획

- `node --check workout/exercises.js`
- `node --test tests/workout-card-layout-css.test.js tests/workout-test-mode-unified.test.js tests/calc.max.test.js`
- `node --test tests/*.test.js`
- `npm.cmd run verify:assets`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`


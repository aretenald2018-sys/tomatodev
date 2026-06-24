# 빈 운동 화면 및 피커 목록 밀도 조정 계획

## 배경

Dashboard3 운동 상세 빈 화면에서 `+` 버튼이 하단 우측 floating 버튼으로 떠 있어 session bar 한 행과 겹친다. 안내문과 덤벨 아이콘도 커서 한 화면 안에 보이는 정보 밀도가 낮다. 운동 선택 피커에서는 상단 `오늘 벤치마크` 안내 배너가 불필요하고, 긴 운동명이 `...`로 잘려 실제 종목 확인이 어렵다.

## 목표

- 운동 상세 빈 화면의 `+` 버튼을 floating이 아니라 회차 탭/편집 버튼과 같은 하단 한 행에 넣는다.
- 빈 화면 덤벨 아이콘, 안내문, 보조 설명의 높이와 폰트를 줄여 스크롤 없이 한 화면 안에 들어오게 한다.
- 운동 피커의 `오늘 벤치마크 ...` 안내 배너를 제거한다.
- 운동명은 ellipsis 처리하지 않고 전체 표시한다.
- 긴 운동명 표시를 위해 피커 폰트와 부위 이미지 크기를 줄인다.

## 범위

### 포함

- `render-calendar.js`
  - `.wt-day-fab` floating 버튼 제거
  - `.wt-day-add-inline` 버튼을 `.wt-day-sessionbar` 내부에 배치
  - 빈 상태 안내 문구의 `우측 하단` 표현 수정
- `workout/exercises.js`
  - 벤치마크 스코프 안내 배너 렌더 제거
- `style.css`
  - 빈 상태 아이콘/텍스트/help 및 session bar compact 조정
  - inline add 버튼 스타일 추가
  - 피커 운동명 ellipsis 제거, 폰트/이미지/메타 영역 compact 조정
- `tests/`
  - floating add 버튼 제거 및 inline add 버튼 계약 추가
  - 피커 벤치마크 안내 배너 제거, 운동명 전체 표시 계약 추가
- `sw.js`
  - `CACHE_VERSION` bump

### 제외

- 운동 피커 검색/필터 동작 변경
- 운동 추가 저장 로직 변경
- 실제 운동 카드 처방/세트 UI 변경

## 실행 슬라이스

### Slice 1 — Empty view and picker density

1. 빈 운동 화면 하단 `+` 버튼을 session bar 내부로 이동한다.
2. 빈 화면 안내 영역의 폰트, 줄간격, 덤벨 아이콘 크기, 여백을 줄인다.
3. 피커 벤치마크 안내 배너를 렌더하지 않는다.
4. 피커 운동명 ellipsis를 제거하고 전체 표시 가능한 compact typography로 바꾼다.
5. 테스트와 service worker cache version을 갱신한다.
6. Dashboard3에 배포하고 검증한다.

## 검증 계획

- `node --check render-calendar.js`
- `node --check workout/exercises.js`
- `node --test tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js tests/workout-test-mode-unified.test.js`
- `node --test tests/*.test.js`
- `npm.cmd run verify:assets`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

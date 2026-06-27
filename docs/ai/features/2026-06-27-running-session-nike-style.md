# 나이키 스타일 러닝 세션 화면 전환 계획

## 상태

- 단계: review-ready
- 요청: 기존 러닝 관련 UI와 현재 GPS 기능을 제거하고, `런닝/조깅` 버튼 클릭 시 첨부 3개 화면처럼 `시작 전 -> 진행 중 -> 결과 요약` 흐름을 제공한다.
- 결정: 운동 기록 폼 안에 러닝 입력 섹션을 붙이는 구조를 폐기하고, 전용 전체 화면 러닝 세션 UI를 새로 만든다.

## 그릴 결과

### 핵심 질문 1. 기존 러닝 기능을 어디까지 삭제할 것인가?

- 답변: 사용자 요청의 “현재 기능 다 삭제”는 기존 inline 러닝 입력/GPS 패널을 제거한다는 뜻으로 적용한다.
- 결정:
  - `index.html`의 `wt-running-section` 상세 입력 UI를 제거한다.
  - `workout/running-tracker.js` 기존 foreground GPS tracker 모듈은 제거한다.
  - 저장 스키마의 `running`, `runDistance`, `runDurationMin`, `runDurationSec`, `runMemo`, `runRoute*` 필드는 과거 데이터 호환을 위해 유지한다.

### 핵심 질문 2. 첨부 화면을 어느 수준으로 구현할 것인가?

- 답변: 이번 슬라이스는 실제 러닝 사용 흐름이 가능한 MVP로 구현한다.
- 결정:
  - 시작 전: 상단 `러닝`, `바로 시작/러닝 가이드` 탭, 지도 배경, 빨간 현재 위치 점, 큰 노란 `시작` 버튼, 목표 설정/설정/음악 아이콘 버튼.
  - 진행 중: 노란 전체 화면, 페이스/BPM/시간 상단 지표, 중앙 심박 placeholder, 하단 음악 바, 일시정지 버튼.
  - 결과 요약: 거리, 평균 페이스, 시간, 칼로리, 고도 상승, 평균 심박수, 케이던스, route map preview, 공유/저장 버튼.
  - 실제 심박/BPM, 케이던스, 음악 연동은 이번 슬라이스에서 placeholder로 두고 UI만 표시한다.

### 핵심 질문 3. GPS와 지도는 어떻게 처리할 것인가?

- 답변: 브라우저/PWA에서 바로 가능한 foreground geolocation만 사용한다.
- 결정:
  - `navigator.geolocation.watchPosition()`으로 경로와 시간을 기록한다.
  - 외부 지도 key 없이도 화면이 깨지지 않도록 CSS map background + SVG polyline preview를 사용한다.
  - 한국 동네/공원명 자동 역지오코딩은 이번 슬라이스 범위 밖이다. 결과 화면 위치 라벨은 provider 연결 전까지 `위치 기록`/`서울특별시, 대한민국` fallback을 표시한다.

## 구현 슬라이스

### Slice 1. 기존 inline 러닝 제거 + 전용 러닝 세션 UI

- 상태: completed
- 목표: `런닝/조깅` 버튼 클릭 시 기존 운동 폼이 아니라 첨부 화면과 유사한 전용 러닝 세션 화면으로 이동한다.
- 예상 변경:
  - `index.html`: `wt-running-section` 제거, 러닝 세션 mount root 추가
  - `workout-ui.js`: `running -> wt-running-section` 전환 제거, `running` 선택 시 전용 화면 open
  - `workout/activity-forms.js`: 기존 `_renderRunningForm`, `_initRunningEvents`의 DOM 의존성 제거 또는 no-op화
  - `workout/running-tracker.js`: 삭제
  - `workout/running-session.js`: 시작 전/진행 중/결과 요약 UI, GPS watch, 요약 계산, 저장 연결
  - `workout/index.js`: 러닝 세션 초기화 연결
  - `workout/exercises.js`: picker `런닝/조깅` activity tile 클릭을 새 화면 open으로 연결
  - `workout/save.js`: DOM sync가 삭제된 러닝 입력 필드에 의존하지 않도록 보정
  - `style.css`: 전용 러닝 화면 스타일
  - `sw.js`: cache version bump, static asset 목록 갱신
  - 테스트: 기존 `running-entry`/`running-tracker` 테스트를 새 세션 UI와 계산 테스트로 교체
- 제외:
  - Nike/NRC 직접 API
  - Health Connect 가져오기
  - 백그라운드 GPS 추적
  - Kakao/Naver 지도 provider 및 실제 동네/공원명 자동 판정
  - 실제 음악 앱 제어와 심박/케이던스 센서 연동
- 검증:
  - `node --check workout/running-session.js workout/activity-forms.js workout/save.js workout/exercises.js workout-ui.js sw.js`
  - 러닝 세션 계산/DOM marker 테스트
  - 전체 `node --test` 회귀
  - `node scripts/verify-runtime-assets.mjs`
  - Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
  - 배포 URL에서 DOM marker 확인: start/progress/summary screen, cache marker, 새 module asset
  - 인증 세션이 없으면 실제 `운동 탭 -> 런닝/조깅 -> 시작 -> 일시정지 -> 저장` UI flow는 `not verified yet`로 보고한다.

#### 구현 결과

- `index.html`: `wt-running-section`, `wt-run-*` 입력/GPS DOM을 제거하고 `wt-running-session-root` mount root를 추가했다.
- `workout/running-tracker.js`: 삭제했다.
- `workout/running-session.js`: 시작 전/진행 중/결과 요약 화면, foreground GPS watch, 거리/시간/페이스/칼로리/route summary 계산, 저장/공유 액션을 구현했다.
- `workout-ui.js`, `workout/exercises.js`, `workout/index.js`, `app.js`: `런닝/조깅` 선택과 picker activity tile을 새 러닝 세션 화면으로 연결하고 시스템 back 처리를 추가했다.
- `workout/activity-forms.js`, `workout/load.js`, `workout/save.js`: 삭제된 inline form 의존성을 제거하고, 저장된 러닝 기록이 있어도 기본 기록 화면은 헬스 탭으로 복원되게 했다.
- `style.css`: 기존 inline 러닝 입력 폼 스타일을 제거하고 첨부 화면형 시작/진행/요약 화면 스타일을 추가했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260627z17-running-session`으로 bump하고 `./workout/running-session.js`를 `STATIC_ASSETS`에 추가했다.
- 테스트: `tests/running-entry.test.js`, `tests/running-tracker.test.js`를 새 세션 UI/계산 계약으로 갱신하고 cache marker 테스트를 z17로 갱신했다.

#### 실행 검증

- PASS: `node --check workout/running-session.js; node --check workout/activity-forms.js; node --check workout/save.js; node --check workout/exercises.js; node --check workout-ui.js; node --check app.js; node --check sw.js`
- PASS: `node --test tests/running-tracker.test.js tests/running-entry.test.js tests/workout-sessions.test.js tests/save-schema.test.js tests/data.load-save.test.js tests/calc.record.test.js` — 138 tests passed.
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 568 tests passed.
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=842`.
- PASS: `git diff --cached --check; git diff --check`.

## 다음 세션 시작 기준

Slice 1 구현이 완료되었다. 리뷰 후 Dashboard3 Pages 배포 marker와 브라우저 DOM marker를 확인한다.

# 헤더 새로고침 통합 및 유산소 강도 입력 계획

## 요청

- 알림 아이콘 오른쪽에 만든 새 헤더 새로고침 버튼으로 기존 새로고침/업데이트 UI를 통합한다.
- 최근 코드 수정이 캐시 때문에 반영되지 않는 문제를 줄이도록 서비스워커 `CACHE_VERSION`과 정적 asset 목록을 갱신하고 배포한다.
- 유산소 기본 종목에 `마이마운틴`을 추가하고 기존 회색 기구 이미지 톤에 맞는 이미지를 생성한다.
- `마이마운틴`은 각도 입력을 받으며, `스텝머신`은 단계 입력을 받는다.
- 각도/단계 값은 자동 칼로리 계산과 저장된 유산소 카드 표시에 반영한다.

## 진단 가설

1. 새 헤더 버튼과 기존 `utils/build-info.js`의 floating update indicator가 동시에 존재해 사용자가 새로고침 버튼을 두 개로 본다.
2. update-available 상태는 별도 floating panel 대신 헤더 `#app-refresh-btn`의 상태 클래스/라벨로 표시하면 단일 진입점이 된다.
3. 유산소 자동 칼로리는 현재 거리/속도 기반 MET 추정만 사용하므로, 종목별 강도 보정값을 저장 schema와 preview/card render에 같이 전달해야 한다.

## 실행 Slice 1

### 범위

1. `utils/build-info.js`
   - `showAppUpdateBanner()`가 더 이상 `#app-update-indicator` floating 버튼/panel을 만들지 않게 한다.
   - update-ready 상태는 `#app-refresh-btn`에 `has-update`, `aria-label`, `title`로 반영한다.
   - 헤더 버튼 클릭은 기존 `requestTomatoAppRefresh()` 경로를 유지하며 active workout draft 보존 경로를 그대로 사용한다.

2. `style.css`
   - legacy `.app-update-indicator` floating UI 스타일을 제거하거나 비활성화한다.
   - `#app-refresh-btn.has-update`에 작은 tomato dot과 loading 회전 상태를 추가하되 헤더 레이아웃 폭을 바꾸지 않는다.
   - 유산소 sheet의 추가 강도 필드가 360-390px 모바일에서 기존 1열 입력 밀도를 유지하게 한다.

3. `workout/exercises.js`
   - `CARDIO_PICKER_EXERCISES`에 `마이마운틴`을 추가하고 `assets/workout/cardio/my-mountain.png`를 연결한다.
   - `마이마운틴` sheet에는 `각도(°)` 입력을 표시한다.
   - `스텝머신` sheet에는 `단계` 입력을 표시한다.
   - 자동 칼로리 계산은 기존 거리/속도 MET 추정에 종목별 강도 multiplier를 적용한다.
   - 저장 payload `entry.cardio`에 `angleDeg` 또는 `level`을 보존하고, preview/운동 카드 metric에 표시한다.

4. `render-calendar.js`
   - 날짜 시트의 유산소 카드 read view가 `angleDeg`/`level` 값을 요약과 metric grid에 표시한다.

5. `assets/workout/cardio/my-mountain.png`
   - 기존 유산소 PNG와 같은 `170x128`, 회색 장비/인물, 투명 배경 톤으로 생성한다.

6. `sw.js`
   - `STATIC_ASSETS`에 새 `my-mountain.png`를 추가한다.
   - `index.html`, `style.css`, `workout/exercises.js`, `render-calendar.js`, `utils/build-info.js`, asset 변경에 맞춰 `CACHE_VERSION`을 새 값으로 bump한다.

7. 테스트
   - PWA update test에 legacy floating update indicator가 생성되지 않고 헤더 버튼이 단일 update entrypoint라는 회귀를 추가한다.
   - 유산소 sheet browser harness에 `마이마운틴` 각도, `스텝머신` 단계 입력과 칼로리 증가 검증을 추가한다.
   - cardio catalog/image/static asset tests에 `my-mountain`을 추가한다.

### 제외

- GPS 러닝 세션, Wear OS bridge, Health Connect, 유산소 사용자 커스텀 CRUD는 변경하지 않는다.
- `www/` Capacitor build artifact는 직접 수정하지 않는다.
- 개인 체중/심박 기반 정밀 칼로리 모델은 이번 slice에 포함하지 않는다. 이번 계산은 입력 편의를 위한 deterministic 추정값이다.

### 검증

1. 정적 검증
   - `node --check utils/build-info.js workout/exercises.js render-calendar.js sw.js`
   - `git diff --check`

2. 테스트
   - `node --test tests/pwa-update-auto-reload.test.js tests/workout-picker-cardio-sheet-behavior.test.js tests/workout-picker-cardio-hierarchy.test.js tests/running-entry.test.js`
   - `node --test tests/*.test.js`
   - `npm.cmd run verify:assets`

3. 브라우저/시각 QA
   - 모바일 폭에서 헤더 새로고침 버튼이 알림 오른쪽에 하나만 보이는지 확인한다.
   - `유산소 -> 마이마운틴` sheet에서 각도 입력, 자동 칼로리 증가, 저장 카드 표시를 확인한다.
   - `유산소 -> 스텝머신` sheet에서 단계 입력, 자동 칼로리 증가, 저장 카드 표시를 확인한다.

4. 운영 검증
   - `npm.cmd run deploy:production`
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
   - production Pages URL에서 cache marker, asset HTTP 200, 헤더 새로고침 단일 UI, 유산소 sheet flow를 확인한다.

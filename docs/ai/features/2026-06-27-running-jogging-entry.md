# 런닝/조깅 분류 진입점 및 기록 연동 계획

## 상태

- 단계: planning
- 요청: 운동 종목 picker의 3행 3열에 `런닝/조깅`을 추가하고, 클릭 시 단순 UI가 아니라 러닝 기록 수집/저장 흐름으로 연결한다.
- 결론: Nike Run Club 직접 API를 1차 구현 대상으로 삼지 않는다. 1차는 앱 자체 GPS/수동 기록 복원, 2차는 한국 지도/장소명 요약, 3차는 Android Health Connect 가져오기, 4차는 양쪽을 합친 하이브리드로 확장한다.

## 그릴 결과

### 핵심 질문 1. Nike Run Club 운동 결과를 직접 받아오는 공개 API가 있는가?

- 답변: 공식적으로 확인 가능한 안정적 공개 API는 발견하지 못했다.
- 근거:
  - Nike 공식 도움말은 NRC/NTC를 `Partners` 메뉴에서 Strava, Garmin 같은 파트너 앱/기기와 연결하는 흐름을 안내한다.
  - Nike 공식 도움말은 iOS에서 NRC/NTC 데이터를 Apple Health로 공유하는 흐름을 안내한다.
  - 검색 결과상 Nike 공식 개발자 문서에서 NRC 운동 기록을 제3자 앱이 직접 읽는 공개 REST/OAuth API 문서는 확인되지 않았다.
- 결정: NRC 직접 API 또는 비공식 API wrapper는 제품 기능의 기본 경로로 쓰지 않는다. 계정 로그인, 약관, 차단, 데이터 스키마 변경 리스크가 크다.

### 핵심 질문 2. Galaxy Watch 앱 정보는 받을 수 있는가?

- 답변: 직접 watch 앱에서 받기보다 `Galaxy Watch -> Samsung Health phone app -> Health Connect -> Tomato Farm` 경로가 현실적이다.
- 근거:
  - Samsung 공식 FAQ는 Galaxy Watch 건강 데이터가 스마트폰의 Samsung Health 앱으로 전달되고, Samsung Health가 Health Connect와 동기화될 수 있다고 설명한다.
  - Android Health Connect는 운동 세션, 경로, 심박, 속도, 거리 같은 workout data read/write를 지원한다.
- 결정: Android 네이티브/Capacitor 레이어가 준비되면 Health Connect import를 2차 슬라이스로 구현한다.

### 핵심 질문 3. 버튼 클릭 후 자체 GPS 추적은 가능한가?

- 답변: 가능하다. 웹/PWA에서는 `navigator.geolocation.watchPosition()`으로 위치 변경을 받을 수 있고, Capacitor 앱에서는 `@capacitor/geolocation`을 통해 GPS, heading, speed 정보를 받을 수 있다.
- 제약:
  - HTTPS/권한 prompt가 필요하다.
  - 웹뷰/브라우저만으로 안정적인 장시간 background tracking은 제한적이다.
  - Capacitor 공식 Geolocation plugin은 background geolocation을 직접 지원하지 않는다고 문서화되어 있다.
- 결정: 1차는 foreground GPS tracker로 구현한다. 백그라운드 장거리 추적은 별도 네이티브 플러그인/권한/배터리 정책 검토 후 확장한다.

### 핵심 질문 4. 하이브리드가 가능한가?

- 답변: 가능하다. 단, 한 번에 만들면 권한, 데이터 중복, 저장 스키마, 배포 검증 범위가 커진다.
- 결정: UX는 처음부터 하이브리드를 염두에 두되, 구현은 슬라이스로 나눈다.

### 핵심 질문 5. Nike Run Club처럼 한국 지도 위에 동네/공원명을 보여줄 수 있는가?

- 답변: 가능하다. 다만 위경도만으로는 불가능하고 지도 SDK + 역지오코딩 + 주변 장소 검색이 필요하다.
- 권장 provider: Kakao Maps/Local API.
  - 이유: 한국 주소/행정동/POI 정확도가 높고, Kakao Maps Web API에 `Polyline`, `LatLngBounds`, `services.Geocoder`, `services.Places`가 있다.
  - Kakao Local API는 좌표를 행정동/법정동으로 변환하는 `coord2regioncode`와, 현재 위치/반경 기반 키워드/카테고리 장소 검색을 제공한다.
- 구현 방식:
  - 경로 지도: GPS route point를 `Polyline`으로 지도에 표시한다.
  - 동네명: 시작점/중간점/종료점 또는 route centroid를 `coord2regioncode`로 변환해 `서초구 반포동`, `마포구 상암동` 같은 라벨을 만든다.
  - 공원명/장소명: route bbox 또는 주요 샘플 지점 주변에서 `공원`, `산책로`, `한강공원`, `운동장` 키워드 검색을 수행하고 route와 가까운 결과를 대표 장소로 고른다.
  - fallback: Kakao key가 없거나 API 실패 시 지도 대신 자체 SVG route 미리보기와 `장소 확인 불가` 상태를 표시한다.
- 결정: 구현은 `Kakao key optional` 구조로 시작한다. 키가 있으면 실제 한국 지도/장소명, 없으면 기능이 깨지지 않는 fallback을 제공한다.

## 코드베이스 확인

- 이미 `running` 도메인 필드는 존재한다.
  - `workout/state.js`: `running`, `runData`
  - `workout/save.js`: `runDistance`, `runDurationMin`, `runDurationSec`, `runMemo`
  - `workout/activity-forms.js`: 기존 런닝 폼 렌더/페이스 계산/저장 이벤트
  - `calc.js`: 런닝 MET 기반 소모칼로리 계산
  - `data.js`: `running`을 운동 기록/근육 id 집계에 포함
- 현재 화면 구조에서는 운동 타입 탭이 `헬스`만 노출되어 있고, 첨부 화면의 분류 picker는 `workout/exercises.js` `_renderPickerCategory()`가 부위 타일만 렌더한다.
- 프로젝트에는 현재 Kakao/Naver 지도 키나 geocoding 설정이 없다.
- `workout/exercises.js`, `index.html`, `style.css`, `workout/activity-forms.js`는 `sw.js` `STATIC_ASSETS`에 포함되어 있으므로 수정 시 `CACHE_VERSION` bump가 필수다.

## 권장 UX

첨부 화면 기준 3행 3열에 `런닝/조깅` 타일을 추가한다.

- 타일 위치: `삼두`, `복부` 다음 빈 위치.
- 타일 클릭 시:
  1. picker modal을 닫는다.
  2. 운동 탭의 `런닝/조깅` 기록 sheet/section을 연다.
  3. 상단에 세 가지 액션을 둔다.
     - `시작`: GPS 기반 foreground 기록 시작
     - `직접 입력`: 거리/시간/메모 수동 입력
     - `가져오기`: Health Connect 준비 전에는 disabled 또는 안내 상태
  4. 기록 완료 후 지도 카드에 다음을 표시한다.
     - 경로 polyline 또는 fallback route preview
     - `반포동 · 반포한강공원 주변` 같은 장소 요약
     - 거리, 시간, 페이스, 소모칼로리
- 저장 데이터:
  - 기존 필드 유지: `running`, `runDistance`, `runDurationMin`, `runDurationSec`, `runMemo`
  - GPS 확장 필드 추가 후보: `runSource`, `runStartedAt`, `runEndedAt`, `runRoute`, `runAvgPaceSecPerKm`, `runGpsAccuracySummary`
  - 지도/장소 확장 필드 추가 후보: `runPlaceLabel`, `runRegionLabel`, `runMapProvider`, `runMapSnapshotMeta`
  - route 원본은 Firestore 문서 크기 방지를 위해 downsample/polyline 저장을 우선 검토한다.

## 구현 슬라이스

### Slice 1. 분류 타일 + 기존 런닝 기록 화면 복원

- 상태: completed
- 목표: 3행 3열 `런닝/조깅` 타일 클릭이 기존 런닝 기록 UI로 연결된다.
- 예상 변경:
  - `workout/exercises.js`: 부위 타일과 별도 activity tile 렌더, click handler 추가
  - `index.html`: 런닝 detail section 복원 또는 lazy section mount 지점 추가
  - `workout-ui.js`: `running` section을 `_WT_TYPE_SECTIONS`에 등록
  - `workout/activity-forms.js`: 기존 런닝 폼이 현재 DOM과 맞게 동작하는지 보정
  - `style.css`: picker activity tile 및 런닝 section 스타일
  - `sw.js`: `CACHE_VERSION` bump
- 제외:
  - Nike API 연동
  - Health Connect 네이티브 연동
  - background GPS tracking
- 검증:
  - `node --check workout/exercises.js workout/activity-forms.js workout-ui.js sw.js`
  - 관련 회귀 테스트 추가 또는 기존 테스트 실행
  - Dashboard3 Pages 배포 후 `운동 탭 -> + -> 분류 -> 런닝/조깅 -> 런닝 기록 화면` UI flow 확인
- 구현:
  - `index.html`: `wt-chip-running`, `wt-running-section`, `wt-run-*` 입력 DOM 복원.
  - `workout-ui.js`: `running -> wt-running-section` 타입 전환 등록.
  - `workout/exercises.js`: picker 분류 그리드에 `data-picker-activity="running"` 타일 추가, 클릭 시 picker를 닫고 런닝 section으로 이동.
  - `style.css`: 런닝/조깅 activity tile과 런닝 입력 form 스타일 추가.
  - `tests/running-entry.test.js`: 타일, section, type switcher, style, cache marker 회귀 테스트 추가.
  - `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260627z15-running-entry`로 bump.
- 실행 검증:
  - PASS: `node --check workout/exercises.js; node --check workout/activity-forms.js; node --check workout-ui.js; node --check sw.js`
  - PASS: `node --test tests/running-entry.test.js tests/ex-picker-selection-flow.test.js tests/workout-picker-gym-rail.test.js tests/stats-picker-ui-polish.test.js` — 17 tests passed.
  - PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 558 tests passed.
  - PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`.
  - PASS: `git diff --check`.
  - not verified yet: Dashboard3 Pages 배포와 인증 계정 실제 UI flow 확인은 아직 수행하지 않았다.

### Slice 2. Foreground GPS 러닝 트래커

- 목표: 사용자가 앱 화면을 켜 둔 상태에서 시작/일시정지/종료로 거리와 시간을 자동 기록하고, 키 없이도 route preview를 볼 수 있다.
- 예상 변경:
  - `workout/running-tracker.js` 신규
  - `workout/activity-forms.js`: 시작/일시정지/종료 UI event binding
  - `workout/save.js`, `workout/save-schema.js`: GPS 확장 필드 추가
  - `calc.js`: GPS 거리/시간 기반 pace/calorie 보정
  - `workout/running-map.js` 신규: SDK 없는 fallback route preview, route downsample, bbox/centroid 계산
  - `sw.js`: `CACHE_VERSION` bump
- 제외:
  - 앱 종료/백그라운드 추적 보장
  - 외부 앱 import
- 검증:
  - 위치 권한 거부/허용/중단 상태 테스트
  - mock coordinate 기반 거리 계산 단위 테스트
  - Dashboard3 Pages 또는 Capacitor 실기기에서 시작/종료 저장 flow 확인

### Slice 3. 한국 지도/동네/공원명 요약

- 목표: Kakao key가 설정된 환경에서 러닝 경로를 한국 지도 위에 그리고, 동네/공원명 요약을 저장/표시한다.
- 예상 변경:
  - `workout/running-map.js`: Kakao Maps SDK lazy loader, `Polyline`, bounds fit
  - `workout/running-place.js` 신규: Kakao Local/Maps services 기반 region/place resolver
  - `config.js` 또는 별도 runtime config: public Kakao JavaScript key 설정 지점
  - `workout/save.js`, `workout/save-schema.js`: `runPlaceLabel`, `runRegionLabel`, `runMapProvider`, `runMapSnapshotMeta`
  - `style.css`: 지도 카드, 장소 badge, API 설정 필요 fallback 상태
  - `sw.js`: `CACHE_VERSION` bump
- 장소명 정책:
  - 대표 라벨 우선순위: 공원/하천/산책로 POI > 행정동 > 구/시 단위.
  - route 전체가 여러 동네를 지나면 `출발동 -> 도착동` 또는 `대표공원 주변`으로 축약한다.
  - API 실패/키 없음/해외 위치는 `장소 확인 불가`로 저장하지 않고 UI fallback만 보여준다.
- 제외:
  - 서버 proxy/API key vault
  - Health Connect import
  - background GPS tracking
- 검증:
  - Kakao key 없음: UI가 깨지지 않고 fallback route preview 표시
  - Kakao key 있음: 지도 타일, route polyline, 행정동/장소명 표시
  - 장소 resolver 순수 로직 단위 테스트

### Slice 4. Android Health Connect 가져오기

- 목표: Android/Capacitor 앱에서 Health Connect 권한을 받고 최근 running exercise session을 Tomato Farm workout으로 가져온다.
- 예상 변경:
  - Android native bridge 또는 Capacitor plugin 추가
  - `data.js` 경유 저장 API 추가
  - 가져오기 modal/sheet
  - 중복 방지 key: source app + start/end time + Health Connect record id 후보
  - 개인정보/권한 안내 화면
- 제외:
  - Nike 직접 API
  - Samsung partner-only SDK
- 검증:
  - Health Connect 권한 없음/권한 허용/데이터 없음/데이터 있음 상태
  - Samsung Health 동기화 데이터 import
  - Google Play Health Connect data type declaration 필요 여부 확인

### Slice 5. 하이브리드 통합

- 목표: 직접 기록, Health Connect import, 수동 입력을 하나의 러닝 히스토리로 합친다.
- 예상 변경:
  - import 후보 목록
  - 중복 병합 UI
  - source badge: `직접 기록`, `Health Connect`, `수동 입력`
  - 캘린더/통계/홈 카드 표시 정리
- 제외:
  - 비공식 NRC scraping/API

## 권한/정책 메모

- Health Connect 사용 시 Android manifest 권한, 권한 rationale/privacy policy activity, Play Console Health apps declaration이 필요할 수 있다.
- 위치/GPS 사용 시 Android location permission과 사용자가 이해할 수 있는 권한 설명이 필요하다.
- 장시간 background tracking은 배터리/OS 제한과 스토어 정책 검토가 필요하므로 MVP 범위 밖이다.

## 외부 확인 링크

- Nike NRC partner apps/devices: https://www.nike.com/help/a/connect-nrc-partner-apps-devices
- Nike NRC Apple Health sharing: https://www.nike.com/help/a/connect-nrc-health-app
- Samsung Health Connect FAQ: https://developer.samsung.com/health/health-connect-faq.html
- Android Health Connect workout guide: https://developer.android.com/health-and-fitness/health-connect/experiences/workouts
- Android Health Connect exercise routes: https://developer.android.com/health-and-fitness/health-connect/features/exercise-routes
- Kakao Maps Web API: https://apis.map.kakao.com/web/documentation/
- Kakao Local API: https://developers.kakao.com/docs/latest/ko/local/dev-guide
- MDN Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- Capacitor Geolocation plugin: https://capacitorjs.com/docs/apis/geolocation
- Google Play Health Connect publishing declaration: https://developer.android.com/health-and-fitness/health-connect/publish

## 다음 세션 시작 기준

Slice 1 실행이 완료되었으므로 다음 세션은 리뷰 세션으로 시작한다. 리뷰 통과 후 Slice 2 `Foreground GPS 러닝 트래커`를 진행한다. 한국 지도/동네/공원명은 Slice 3에서 구현하며, Kakao key가 없는 현재 환경에서는 Slice 3의 실제 지도/장소명 검증이 제한된다.

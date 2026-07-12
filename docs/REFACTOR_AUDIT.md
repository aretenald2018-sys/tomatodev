# 리팩토링 재감사와 완료 계획

기준일: 2026-07-13
코드 기준: `90b05db` (배포 대상, `https://aretenald2018-sys.github.io/tomatofarm/`)

## 판정

이 저장소의 기존 Phase 2~6 완료 표시는 전체 리팩토링 완료 판정으로 사용할 수 없다. 구조 금지 규칙과 자동 회귀는 상당 부분 통과했지만, 대형 혼합 책임 파일과 사용자 행동을 소스 문자열로만 확인하는 테스트가 남아 있다. 이 문서는 완료를 선언하는 문서가 아니라, 남은 작업과 검증 근거를 고정하는 감사 기록이다.

## 2026-07-13 확인 결과

| 기준 | 상태 | 근거 |
| --- | --- | --- |
| UI 모듈의 Firebase 직접 접근 | 통과 | `firebase-firestore` import는 `data/data-core.js` 한 곳만 확인 |
| 비즈니스 인라인 이벤트 | 통과 | runtime HTML/JS에서 `onclick` 등 인라인 이벤트 0건 |
| 비즈니스 `window.*` 노출 | 통과 | 구조 테스트 allowlist만 남음 |
| `data.js` facade | 통과 | `data/data-api.js` re-export만 수행 |
| PWA/runtime import graph | 통과 | literal import 존재·precache·named export와 tab registry lazy 경로를 모두 검증; 누락 10개를 `59258cd`에서 보완 |
| CSS WebView 진입점 | 통과 | `style.css`를 44개 owner source에서 하나의 WebView-safe bundle로 생성; `fac2a35` 배포본의 360px 하단 탭 설정 sheet와 `4cda585`의 운동 상세 sheet에서 CSS 적용·가로 넘침 없음 확인 |
| 자동 회귀 | 통과 | 전체 `npm.cmd test`와 핵심 데이터 계약 105/105 통과 |
| Android/Wear 빌드 | 통과 | `:app:assembleDebug :wear:assembleDebug` 성공 |
| 실제 Pages 테스트 계정 흐름 | 부분 통과 | 계정 생성·세션 복원·식단 목표 저장/재로드, PWA 배너, 하단 탭, 운동/캘린더/통계/요리 lazy 탭, 더보기/계정 전환/편지 진입을 확인했다. 테스트 계정에서 운동 종목 추가 → 20kg × 10회 세트 입력 → 종목 완료 → 완전 새로고침 → 기록·완료 상태 복원도 `79b565`에서 확인했다. `fac2a35`에서는 같은 기록의 운동·캘린더·통계 200kg 표기와 홈/식단/운동/캘린더/더보기 전환, 360·393·430px 가로 넘침 없음, 하단 탭 설정 sheet의 정상 CSS 렌더를 재확인했다. `4cda585`에서는 360px 운동 상세 sheet의 모든 가시 버튼이 최소 44px이고 가로 넘침이 없음을 확인했다. `7d216b0`에서는 동기화된 두 Pages 탭을 동시에 열어도 Firestore IndexedDB 경고/오류가 발생하지 않음을 확인했다. `1a14178`에서는 식단 아코디언 → `+ 음식 추가` → 최근 음식/직접 입력/사진 등록 검색 sheet를 360px에서 실제로 열고 콘솔 오류가 없음을 확인했으며, 식사 스킵 action도 켠 뒤 원상복구했다. 같은 360px Pages에서 저장된 운동 기록의 상세·세트 편집, 캘린더 종합/운동 tab 전환, 더보기 → 탭 설정 sheet 열기와 변경 없는 저장까지 다시 실행했고 콘솔 오류·가로 넘침은 없었다. |
| 관리자 서버 권한 | 미검증 | `firebase.json`에는 Functions만 선언돼 있고 Firestore rules source/배포 검증이 저장소에 없음 |
| 대형 파일 단일 책임 | 미완료 | `render-calendar.js` 4,806줄, `workout/exercises.js` 4,136줄, `workout/expert.js` 3,286줄, `workout/expert/max.js` 4,068줄 |
| 사용자 행동 테스트 | 미완료 | 소스 파일을 읽는 테스트가 70개라, 많은 UI 회귀가 구현 문자열에 묶여 있음 |

## 이미 수정한 실제 결함

- CSS 분리 후 WebView에서 `@import`가 적용되지 않는 경로를 제거했다. root `style.css`는 빌드 시 owner CSS를 단일 bundle로 만들며, source owner 분리는 유지한다.
- runtime asset manifest가 lazy import의 하위 모듈 10개를 누락해 오프라인/PWA 부분 로드가 실패할 수 있던 문제를 수정했다. `scripts/check-runtime-syntax.mjs`가 앞으로 모든 literal static/dynamic relative import의 존재와 precache 포함 여부를 확인한다.
- 새 runtime 코드가 과거 `render-home.js`·`render-workout.js` shim을 import하던 경로를 owner public API(`home/index.js`, `workout/index.js`)로 옮겼다. shim은 설치된 이전 WebView의 짧은 업데이트 창 동안만 남긴다.
- PWA 설치 배너가 하단 탭을 덮어 식단/운동 탭을 누를 수 없던 문제를 수정했다. 이후 운동 하단 sheet의 열기 버튼과 다시 충돌한 것을 실제 Pages에서 찾아, 다른 탭으로 이동할 때 배너를 즉시 닫도록 보완했다. 운동 sheet 열기와 종목 picker 진입까지 재확인했다.
- `app/tab-registry.js`의 경로가 `app/lazy-loader.js` 기준으로 해석돼 calendar/stats/cooking/admin lazy tab이 `app/render-*.js`를 요청하던 문제를 수정했다. registry 경로·파일 존재·precache를 검사하고 실제 Pages에서 운동, 캘린더, 통계, 요리 진입을 확인했다.
- 더보기 메뉴가 제거된 `window.toggleMoreMenu`를 호출해 열리지 않던 문제를 수정했다. 계정 전환과 개발자 편지도 직접 module API로 연결해 실제 Pages에서 modal 진입을 확인했다.
- 운동 회차·월간·상세·통계·내보내기 화면이 중량 볼륨을 `톤` 또는 `vol`로 제각각 표기하던 문제를 수정했다. 모든 표면에서 200kg은 `200kg`, 1,000kg 이상만 `t`로 표기하며 회귀 테스트를 추가했다.
- `render-calendar.js`의 볼륨/강도 트랙 판정·추세·단위 계산 114줄을 `workout/track-metrics.js`로 분리했다. DOM과 Firebase 상태 없이 직접 테스트하고, runtime manifest에도 명시해 PWA lazy 경로에서 누락되지 않게 했다.
- 같은 파일의 운동 완료 시각 선택·휴식 경과 시간 계산을 `workout/completion-metrics.js`로 분리했다. 완료되지 않은 세트를 제외하고 raw/fallback set 상세를 다루는 계산은 직접 단위 테스트로 고정했으며, 화면에는 타이머 갱신만 남겼다.
- 운동 종목의 완료 marker, 유효 세트 판정, 완료 조건과 marker 변경을 `workout/exercise-completion.js`로 분리했다. 종목 완료/해제의 동일한 입력·출력 규칙을 직접 테스트로 고정했고, 390px 세트 편집 DOM 행동 테스트도 새 공개 경계를 통해 통과한다.
- 러닝 카드의 거리·페이스·시각·출처·GPS 중단/위치·요약 지표를 `workout/running-presentation.js`로 분리했다. 값 형식과 개인정보 보호용 위치 fallback은 직접 테스트로 고정했으며, 375px 카드에서 240→620개 GPS 경로 hydration, 가로 넘침·잘림·블록 겹침 없음도 브라우저 DOM으로 다시 확인한다.
- 수기 유산소의 legacy record 판별, 표시용 데이터 정규화, 카드/내보내기 요약을 `workout/cardio-model.js`의 공개 모델로 통합했다. 빈 초안을 기록으로 오인하지 않고, 기존 kcal·거리·속도·기기별 각도/단계·반복값을 보존하는 직접 테스트와 모바일 입력 sheet DOM 테스트를 통과했다.
- 세트 중량/횟수·RIR·볼륨 표시, 세트 유형 라벨/class, 최상위 세트와 이전 기록 요약을 `workout/set-presentation.js`로 분리했다. 390px 터치 DOM에서 키패드 입력·좌우 필드 이동·세트 유형 변경·우→좌 스와이프 삭제를 수행하는 기존 행동 테스트가 새 모듈 경계를 포함해 통과한다.
- 360px 실제 sheet 감사에서 세트 체크·유형·삭제·확장과 하단 회차 탭이 24~38px이라 발견했다. `calendar-home.css`와 `workout-day-sheet.css`에서 각 조작 영역을 최소 44px으로 확장하고, 좁은 행 grid는 44px 터치를 유지하면서 넘치지 않도록 재배치했다.
- Firestore의 deprecated 단일 탭 `enableIndexedDbPersistence()`를 다중 탭 `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` 초기화로 교체했다. 지원하지 않는 WebView는 memory cache로 안전하게 복귀하며, factory는 독립 단위 테스트로 성공·실패·미지원 경로를 검증한다.
- 실제 Pages 식단 감사에서 `+ 음식 추가`의 상위 아코디언이 열리지 않는 것을 발견했다. `.diet-grid`의 legacy 위임 핸들러가 namespaced `data-action`까지 전파 차단한 것이 원인이며, 자체 `addFood`/추천/legacy 사진 action만 처리하고 나머지는 전역 action router로 보내도록 고쳤다. 이제 아코디언·스킵·사진 action도 같은 경로를 사용한다.

## 남은 리팩토링 순서

1. **캘린더/운동 홈 분리** — `render-calendar.js`에서 calendar model·월 grid, workout-home sheet, set editor/keyboard controller, running route detail을 owner module로 나눈다. 각 slice마다 같은 입력·저장 fixture와 DOM interaction test를 먼저 만든다.
2. **운동 종목 편집 분리** — `workout/exercises.js`를 catalog/picker, entry mutation, set editor, renderer, event controller로 나눈다. 종목 선택, 세트 수정, 삭제, swipe, rest timer의 행동 테스트를 모듈 경계에 둔다.
3. **Expert/Max 흐름 분리** — recommendation/계산, wizard state, modal render/bind, external-share adapter를 분리한다. 순수 계산부터 fixture로 고정하고 UI controller를 마지막에 이동한다.
4. **행동 테스트 전환** — source-string 검사는 architecture, asset manifest, generated bundle 같은 금지/생성 규칙에 한정한다. 로그인, 식단, 운동, 러닝, 캘린더, social, stats의 화면 동작은 DOM 또는 integration harness로 전환한다.
5. **CSS·접근성 재검증** — 360~430px 폭에서 홈·식단·운동·캘린더·더보기와 모든 sheet/modal의 visual snapshot, tab/escape focus, 44px 터치 영역을 확인한다. bundle만 수정하지 말고 owner source를 수정한다.
6. **실계정 production QA** — 테스트 계정으로 로그인/세션 복구, 식단 목표 저장·재로드, 핵심 lazy tab/더보기, 운동 종목 추가·세트 입력·완료·재접속 복구까지 확인했다. 사진 필드 보존, 러닝 GPS, 일반/관리자 권한 거부, PWA 업데이트와 Android back/Wear 연결은 계속 실행한다. 실제 사용자 데이터에는 쓰지 않는다.
7. **Firestore rules를 저장소에서 관리** — 현재 배포 rules를 export하거나 versioned `firestore.rules`를 복원하고, 일반 계정이 admin/social 전체 조회·수정에 실패하는 emulator 또는 production test를 추가한다.

## 완료 선언 조건

`APP_REFACTOR_PLAN.md`의 완료 기준을 모두 충족하고, 위 1~6의 각 흐름을 배포된 Pages와 Android에서 재현 가능한 증거로 확인한 뒤에만 Phase 8을 완료로 바꾼다. 자동 테스트 통과, 빌드 성공, 또는 문서 체크만으로는 완료라고 쓰지 않는다.

# 리팩토링 재감사와 완료 계획

기준일: 2026-07-12
배포 기준: `d156172` (`https://aretenald2018-sys.github.io/tomatofarm/`)

## 판정

이 저장소의 기존 Phase 2~6 완료 표시는 전체 리팩토링 완료 판정으로 사용할 수 없다. 구조 금지 규칙과 자동 회귀는 상당 부분 통과했지만, 대형 혼합 책임 파일과 사용자 행동을 소스 문자열로만 확인하는 테스트가 남아 있다. 이 문서는 완료를 선언하는 문서가 아니라, 남은 작업과 검증 근거를 고정하는 감사 기록이다.

## 2026-07-12 확인 결과

| 기준 | 상태 | 근거 |
| --- | --- | --- |
| UI 모듈의 Firebase 직접 접근 | 통과 | `firebase-firestore` import는 `data/data-core.js` 한 곳만 확인 |
| 비즈니스 인라인 이벤트 | 통과 | runtime HTML/JS에서 `onclick` 등 인라인 이벤트 0건 |
| 비즈니스 `window.*` 노출 | 통과 | 구조 테스트 allowlist만 남음 |
| `data.js` facade | 통과 | `data/data-api.js` re-export만 수행 |
| PWA runtime import graph | 통과 | 정적 literal import가 runtime asset manifest에 모두 포함; 누락 10개를 `59258cd`에서 보완 |
| CSS WebView 진입점 | 통과 | `style.css`를 44개 owner source에서 하나의 WebView-safe bundle로 생성; 배포 화면에서 CSS 적용 확인 |
| 자동 회귀 | 통과 | 전체 `npm.cmd test`: 909/909, 핵심 데이터 계약: 105/105 |
| Android/Wear 빌드 | 통과 | `:app:assembleDebug :wear:assembleDebug` 성공 |
| 실제 Pages 비파괴 흐름 | 부분 통과 | CSS 적용, 빈 로그인 검증, 가입 화면 전환 확인; 브라우저 환경이 오프라인이라 실제 계정 저장은 실행하지 않음 |
| 관리자 서버 권한 | 미검증 | `firebase.json`에는 Functions만 선언돼 있고 Firestore rules source/배포 검증이 저장소에 없음 |
| 대형 파일 단일 책임 | 미완료 | `render-calendar.js` 5,009줄, `workout/exercises.js` 4,136줄, `workout/expert.js` 3,286줄, `workout/expert/max.js` 4,068줄 |
| 사용자 행동 테스트 | 미완료 | 소스 파일을 읽는 테스트가 70개라, 많은 UI 회귀가 구현 문자열에 묶여 있음 |

## 이미 수정한 실제 결함

- CSS 분리 후 WebView에서 `@import`가 적용되지 않는 경로를 제거했다. root `style.css`는 빌드 시 owner CSS를 단일 bundle로 만들며, source owner 분리는 유지한다.
- runtime asset manifest가 lazy import의 하위 모듈 10개를 누락해 오프라인/PWA 부분 로드가 실패할 수 있던 문제를 수정했다. `scripts/check-runtime-syntax.mjs`가 앞으로 모든 literal static/dynamic relative import의 존재와 precache 포함 여부를 확인한다.
- 새 runtime 코드가 과거 `render-home.js`·`render-workout.js` shim을 import하던 경로를 owner public API(`home/index.js`, `workout/index.js`)로 옮겼다. shim은 설치된 이전 WebView의 짧은 업데이트 창 동안만 남긴다.

## 남은 리팩토링 순서

1. **캘린더/운동 홈 분리** — `render-calendar.js`에서 calendar model·월 grid, workout-home sheet, set editor/keyboard controller, running route detail을 owner module로 나눈다. 각 slice마다 같은 입력·저장 fixture와 DOM interaction test를 먼저 만든다.
2. **운동 종목 편집 분리** — `workout/exercises.js`를 catalog/picker, entry mutation, set editor, renderer, event controller로 나눈다. 종목 선택, 세트 수정, 삭제, swipe, rest timer의 행동 테스트를 모듈 경계에 둔다.
3. **Expert/Max 흐름 분리** — recommendation/계산, wizard state, modal render/bind, external-share adapter를 분리한다. 순수 계산부터 fixture로 고정하고 UI controller를 마지막에 이동한다.
4. **행동 테스트 전환** — source-string 검사는 architecture, asset manifest, generated bundle 같은 금지/생성 규칙에 한정한다. 로그인, 식단, 운동, 러닝, 캘린더, social, stats의 화면 동작은 DOM 또는 integration harness로 전환한다.
5. **CSS·접근성 재검증** — 360~430px 폭에서 홈·식단·운동·캘린더·더보기와 모든 sheet/modal의 visual snapshot, tab/escape focus, 44px 터치 영역을 확인한다. bundle만 수정하지 말고 owner source를 수정한다.
6. **실계정 production QA** — 별도 테스트 계정으로 로그인/세션 복구, 저장·재로드, 사진 필드 보존, 일반/관리자 권한 거부, PWA 업데이트와 Android back/Wear 연결을 실행한다. 실제 사용자 데이터에는 쓰지 않는다.
7. **Firestore rules를 저장소에서 관리** — 현재 배포 rules를 export하거나 versioned `firestore.rules`를 복원하고, 일반 계정이 admin/social 전체 조회·수정에 실패하는 emulator 또는 production test를 추가한다.

## 완료 선언 조건

`APP_REFACTOR_PLAN.md`의 완료 기준을 모두 충족하고, 위 1~6의 각 흐름을 배포된 Pages와 Android에서 재현 가능한 증거로 확인한 뒤에만 Phase 8을 완료로 바꾼다. 자동 테스트 통과, 빌드 성공, 또는 문서 체크만으로는 완료라고 쓰지 않는다.

# Tomato Farm 앱 전체 리팩토링 계획

- 작성일: 2026-07-12
- 기준 브랜치/커밋: `main` / `c29d0bf3d950e49c2234410b4279555ecc9233ae`
- 범위: 웹 SPA, PWA/Service Worker, Firebase 데이터 계층과 Functions, Capacitor Android, Wear OS, 테스트·배포·문서
- 제약: Vanilla JavaScript와 현재 정적 배포 구조 유지, `www/` 직접 수정 금지, 데이터 호환성과 무중단 배포 우선

> 상태 주의: 아래 `2. 현재 기준선`의 수치는 2026-07-12 작성 당시의 시작점 기록이다. 현재 완료 여부나 파일 크기 판단에는 사용하지 않는다. 현재 감사 근거와 미완료 범위는 [`docs/REFACTOR_AUDIT.md`](docs/REFACTOR_AUDIT.md)를 단일 기준으로 사용한다.

## 0. 현재 실행 순서 (2026-07-13 감사 후)

Phase 2~6의 일부 구조 작업이 이미 반영됐더라도 전체 리팩토링 완료를 뜻하지 않는다. 새 작업은 아래 순서와 각 게이트를 따른다.

1. **배포 안정성 — 완료, 계속 감시**: PWA precache가 HTTP cache의 이전 CSS/모듈을 재사용하지 않게 하고, 공개 Android APK도 같은 `CACHE_VERSION`으로 재빌드한다. 매 정적 자산 변경에는 source·Pages·APK 버전 일치를 검사한다.
2. **행동 테스트 전환 — 최우선 미완료**: source-string 검사를 architecture/asset 계약으로 한정하고, 식단 저장·운동 세트·캘린더 sheet·Max 모달의 실제 클릭/저장/재로드 DOM 테스트를 먼저 고정한다. 파일 이동은 이 게이트를 통과한 흐름만 수행한다.
3. **캘린더/운동 홈 분리 — 미완료**: `render-calendar.js`에서 월 grid/read model, day-sheet controller, set keyboard/editor, running detail 순서로 작은 slice를 분리한다. 과거 날짜 편집·active draft·set save 후 carousel/scroll 복구를 각각 배포본에서 확인한다.
4. **운동 종목과 Expert/Max 분리 — 미완료**: `workout/exercises.js`는 catalog/picker → entry mutation → renderer/controller 순서로, `workout/expert.js`와 `workout/expert/max.js`는 순수 계산 → modal draft → scoped binding 순서로 분리한다. 저장 schema와 program migration은 같은 배포에 섞지 않는다.
5. **모바일 최종 게이트 — 미완료**: 360~430px CSS/44px 터치 영역, PWA 업데이트 후 식단 스킵 저장, Android APK 설치 후 재시작, Phone/Wear·Firebase rules 권한을 실제 대상에서 검증한다.

전체 완료 선언은 위 2~5와 이 문서의 Phase 8 게이트를 모두 만족하기 전까지 금지한다.

## 1. 목표

이번 리팩토링의 목적은 화면을 다시 만드는 것이 아니라 다음 변경을 안전하고 빠르게 할 수 있는 구조를 만드는 것이다.

1. 운동·식단·홈·통계 등 각 도메인의 상태, 계산, 저장, UI 책임을 분리한다.
2. Firestore 접근과 저장 스키마를 한 경계로 모아 데이터 유실 가능성을 낮춘다.
3. 인라인 이벤트와 `window.*` 의존을 제거해 모듈 로딩 순서와 전역 이름 충돌을 없앤다.
4. 대형 JS/CSS 파일을 기능 단위로 분리하고 공통 UI 계약을 통일한다.
5. 웹·PWA·Android·Wear 간 데이터 계약을 테스트 가능한 형태로 고정한다.
6. 모든 단계가 독립적으로 배포 가능하고, 문제가 생기면 해당 단계만 되돌릴 수 있게 한다.

## 2. 현재 기준선

### 2.1 확인된 상태

| 항목 | 현재 상태 | 의미 |
|---|---:|---|
| 자동 테스트 | 864/864 통과, 약 18초 | 좋은 출발점이지만 구조 변경 내성은 별도 보강 필요 |
| 테스트 파일 | 89개 | 운동·러닝 쪽 비중이 높음 |
| 소스 문자열 검사 테스트 | 58개 파일 | 파일 이동이나 함수 분리만으로 깨질 수 있음 |
| `style.css` | 16,418줄, 섹션 주석 262개 | 기능별 스타일과 후속 override가 한 파일에 누적 |
| `expert-mode.css` | 5,145줄 | 운동 전문가/성장판 UI가 별도 대형 모놀리스 |
| `render-calendar.js` | 5,127줄 | 월간 UI, 일자 시트, 운동 홈 책임이 혼재 |
| `workout/exercises.js` | 4,361줄 | 모델·CRUD·피커·렌더·DOM 이벤트가 혼재 |
| `workout/expert/max.js` | 4,222줄 | 프로그램 계산과 UI 흐름이 강하게 결합 |
| `data.js` | 1,132줄, 71개 파일에서 참조 | 배럴을 넘어 일부 도메인 로직과 설정 API까지 소유 |
| 인라인 이벤트 속성 | 343개 | 모듈 함수의 전역 노출을 강제 |
| `window.*` 대입 | 501개 | 로딩 순서·충돌·테스트 격리 위험 |
| 직접 Firestore 접근 | `render-admin.js`, `home/notifications.js` 등에 잔존 | `data.js` 경계 규칙과 실제 코드가 불일치 |
| Service Worker | 동일 파일의 여러 쿼리 버전을 정적 자산에 중복 등록 | 캐시 목록과 HTML import 버전이 수동 동기화됨 |

### 2.2 문서 드리프트

- `ARCHITECTURE.md`는 캘린더를 삭제된 탭으로 설명하지만 실제 앱은 운동 홈과 캘린더 모듈을 계속 사용한다.
- 저장 경로는 merge 보호가 도입됐지만 일부 문서는 과거 전체 덮어쓰기 구조를 기준으로 한다.
- 기존 `plan.md`의 localhost 검증 절차와 모듈·테스트 수치는 현재 production-only 검증 규칙과 맞지 않는다.

문서는 리팩토링의 입력값이 아니라 코드·테스트·실행 결과로 확인한 계약을 반영하는 산출물로 갱신한다.

## 3. 완료 기준

아래 조건을 모두 충족하면 전체 리팩토링 완료로 본다.

- 도메인 UI/기능 모듈의 직접 Firestore 호출 0건. 모든 접근은 `data/`의 공개 API를 통한다.
- 비즈니스 동작을 위한 인라인 이벤트 0건. 이벤트는 기능 루트에 범위가 제한된 action handler로 연결한다.
- 비즈니스 기능의 `window.*` 노출 0건. Capacitor·PWA·디버그 호환용 허용 목록만 남긴다.
- `data.js`는 호환 facade/re-export 역할만 수행하고 도메인 구현은 `data/` 하위에 둔다.
- `style.css`는 전역 reset·앱 shell·임시 호환 레이어만 남기고 기능 스타일은 소유 기능으로 이동한다.
- 대형 파일은 계산, 상태, 저장, 렌더, 이벤트 책임 중 하나를 주로 소유한다. 1,200줄을 넘는 파일은 예외 사유를 기록한다.
- 저장 payload, 러닝 경로, Wear payload, 영양 canonical model의 하위 호환 fixture가 유지된다.
- source-text 테스트는 아키텍처 금지 규칙 검사에만 사용하고, 사용자 동작은 순수 함수·DOM·통합 테스트로 검증한다.
- 전체 자동 테스트, 정적 자산 검증, Android/Wear 관련 테스트가 통과한다.
- `origin/main` 배포 후 production Pages에서 핵심 사용자 흐름을 직접 실행하고 배포 커밋을 확인한다.

## 4. 목표 구조

번들러나 프레임워크를 추가하지 않고 현재 ES module 구조 안에서 아래 방향으로 이동한다.

```text
app/
  bootstrap.js          앱 초기화와 세션 시작
  tab-router.js         탭 전환, lazy module registry, 뒤로가기
  lifecycle.js          refresh/update/visibility/native lifecycle
  action-router.js      앱 shell 전용 action 연결

features/
  workout/              state, domain, repository facade, views, actions
  diet/
  home/
  social/
  calendar/
  stats/
  cooking/
  admin/

data/
  core/                 Firebase 초기화, 사용자/소유자 context
  repositories/         도메인별 Firestore read/write
  schemas/              저장 payload 정규화와 legacy adapter
  migrations/           명시적이고 재실행 가능한 데이터 변환
  data.js facade        기존 import를 위한 한시적 호환층

ui/
  tokens/
  primitives/           button, field, list-row, chip, badge
  overlays/             modal, sheet, toast, focus/back-stack
  states/               loading, empty, error, offline

platform/
  pwa/                  SW 등록, 업데이트, 설치
  capacitor/            폰 브리지
  wear/                 Wear payload/route 경계
```

실제 이동은 한 번에 하지 않는다. 기존 public export와 shim을 유지한 채 소비자를 하나씩 바꾸고, 마지막 정리 단계에서 shim을 제거한다.

## 5. 실행 원칙

1. **동작 고정 후 이동**: 현재 사용자 동작과 저장 payload를 characterization test로 먼저 고정한다.
2. **도메인 세로 절단**: 여러 도메인의 파일명만 한꺼번에 바꾸지 않고, 한 사용자 흐름을 저장까지 완결해서 옮긴다.
3. **호환 facade 사용**: 기존 import와 저장 데이터는 즉시 제거하지 않고 deprecation 기간을 둔다.
4. **데이터 마이그레이션과 코드 이동 분리**: 같은 배포에서 저장 스키마 변경과 대형 UI 이동을 함께 하지 않는다.
5. **배포 가능한 작은 단계**: 각 단계는 테스트 통과, SW 캐시 갱신, production 검증까지 독립적으로 끝낸다.
6. **생성물 분리**: 루트가 source of truth이고 `www/`는 `scripts/copy-www.js` 결과물로만 만든다.
7. **CSS도 기능과 함께 이동**: CSS만 대규모 재배열하지 않고 해당 DOM과 테스트를 옮길 때 함께 분리한다.

## 6. 단계별 계획

### Phase 0 — 기준선과 회귀 안전망 고정

예상: 2~3일

작업:

- `package.json`에 공식 `test`, 구조 검사, 핵심 smoke test 명령을 정의한다.
- 현재 864개 테스트를 도메인별 suite로 분류하고 실행 시간과 실패 위치를 보기 쉽게 만든다.
- 운동/식단 day payload, 사진 필드, 세션 집계, 러닝 route, Wear payload, 영양 item의 golden fixture를 만든다.
- 앱 시작, 로그인, 탭 전환, 모달/시트 뒤로가기, 저장/재로드에 대한 최소 통합 테스트를 추가한다.
- 직접 Firestore import, 신규 인라인 이벤트, 무허가 `window.*`, `STATIC_ASSETS` 캐시 범프 누락을 막는 architecture test를 추가한다.
- 현재 실행 구조를 기준으로 `ARCHITECTURE.md`를 갱신하되 목표 구조와 혼합하지 않는다.

완료 게이트:

- 기존 864개와 신규 기준선 테스트 전부 통과.
- production 핵심 흐름 체크리스트와 테스트 fixture가 커밋됨.
- 이후 단계에서 어떤 계약이 깨졌는지 자동으로 식별 가능.

### Phase 1 — 데이터 경계와 저장 스키마 정리

예상: 1~1.5주

작업:

- `data.js` API를 계정, 운동, 식단, 소셜, 설정, 통계 도메인으로 목록화한다.
- `render-admin.js`와 `home/notifications.js`의 직접 Firestore 접근부터 repository로 이동한다.
- workout/diet/shared 저장 키와 legacy adapter를 `data/schemas/`의 단일 계약으로 만든다.
- merge가 기본이고 전체 replace는 명시적 opt-in인 현재 보호 장치를 repository 수준에서 강제한다.
- 사진, 러닝 경로 참조, 세트 메타, 영양 canonical/legacy 필드의 round-trip 테스트를 보강한다.
- 복수 문서 변경은 transaction/batch 필요 여부를 구분하고 부분 성공 시 UI 상태를 정의한다.
- `data.js` 안의 계산·화면용 helper를 각 도메인 또는 `calc/`의 순수 함수로 이동한다.

완료 게이트:

- UI/feature 모듈의 Firestore 직접 호출 0건.
- 기존 사용자 문서를 읽고 같은 의미로 다시 저장하는 fixture round-trip 통과.
- `data.js`는 공개 facade로 축소되며 각 API의 소유 repository가 명확함.

### Phase 2 — 앱 shell, 전역 함수, 이벤트 구조 정리

예상: 1주

작업:

- `app.js`를 bootstrap, session, tab router, lifecycle, overlay/back handling으로 분리한다.
- 탭 정의를 하나의 registry로 모아 DOM id, lazy import, 권한, 초기 render를 중복 선언하지 않게 한다.
- 이미 도입된 `utils/action-router.js` 패턴을 앱 shell과 기능 root별 scoped action router로 확장한다.
- `index.html`의 인라인 이벤트부터 `data-app-action` 계약으로 전환한다.
- lazy-loaded 기능의 버튼은 기능 초기화 시 직접 바인딩하며 전역 함수 존재를 전제로 하지 않는다.
- `window.*`는 기존 소비자를 옮기는 동안 호환 bridge에서만 노출하고 사용처가 0이 되면 제거한다.
- modal registry를 lazy injection으로 바꾸고 focus trap, ESC/native back, scroll lock을 공통 overlay controller로 통합한다.

완료 게이트:

- `app.js`가 조정자 역할만 담당하고 도메인 동작을 소유하지 않음.
- `index.html` 인라인 이벤트 0건.
- 탭 전환, lazy module 첫 클릭, modal/sheet 내부 버튼, Android back flow 통합 테스트 통과.

### Phase 3 — 운동·러닝·성장 프로그램 분해

예상: 2~3주

가장 크고 데이터 위험도가 높은 영역이므로 작은 slice로 나눈다.

#### 3A. 운동 세션과 저장

- `S.workout / S.diet / S.shared` namespace 계약을 유지하며 mutation API를 명시한다.
- session aggregate, active draft, timeline, save payload를 DOM 없는 도메인 서비스로 분리한다.
- 일반 운동, 캘린더 day sheet, Wear 저장이 같은 session/save API를 사용하게 한다.

#### 3B. 운동 종목 편집

- `workout/exercises.js`를 catalog/picker, entry actions, set editor, render, interaction controller로 나눈다.
- 종목 선택·세트 수정·완료·삭제가 명령형 DOM 검색 대신 명시적 action payload를 사용하게 한다.
- 캐러셀 위치, 키보드 포커스, swipe, rest timer 계약을 각각 테스트한다.

#### 3C. Expert/Max/Test-v2

- 순수 처방·사이클 계산과 화면 렌더를 분리한다.
- v1 legacy adapter, Max, test-v2의 공통 exercise/program 모델을 정의하되 저장 키는 즉시 합치지 않는다.
- 기존 기록 migration은 별도 단계와 fixture로 검증한다.

#### 3D. 러닝과 Wear

- running session lifecycle, live accumulator, route storage, map renderer, analytics 경계를 고정한다.
- route point를 정렬·축약·손실시키지 않는 현재 계약과 privacy redaction 계약을 유지한다.
- 폰 입력과 Wear 입력이 동일한 normalized running session을 생성하게 한다.

완료 게이트:

- 운동 추가 → 세트 입력 → 완료 → 저장 → 재로드 흐름 통과.
- 캘린더 과거 날짜 수정과 활성 draft 복구 흐름 통과.
- 폰 러닝과 Wear 러닝 저장·지도·통계 흐름 통과.
- `workout/exercises.js`, `workout/expert.js`, `workout/expert/max.js`의 혼합 책임 해소.

### Phase 4 — 식단·영양·AI 파이프라인 분해

예상: 1~1.5주

작업:

- 식사 카드 상태, food chip, 검색, 중량/단위 선택, 자동 저장을 하나의 diet feature API로 묶는다.
- 사진 추정 → artifact filter → 음식 정규화 → 사용자 보정 → 저장 단계를 pipeline으로 명시한다.
- canonical NutritionItem과 legacy 저장 adapter를 분리하고 UI는 canonical 모델만 소비하게 한다.
- `feature-nutrition.js`, workout 식단 렌더, nutrition modal 사이의 순환·전역 호출을 제거한다.
- AI/API 실패, 낮은 confidence, 검색 결과 없음, 오프라인 상태를 공통 상태 UI로 처리한다.

완료 게이트:

- 음식 검색/빠른 추가/사진 추정/수정/삭제/재로드 round-trip 통과.
- g, ml, 1회 제공량, legacy item fixture가 동일 결과를 유지.
- 운동 저장이 식단·사진을, 식단 자동 저장이 운동·러닝을 변경하지 않음.

### Phase 5 — 홈·소셜·통계·캘린더·관리자 정리

예상: 2주

순서:

1. 홈 read model과 life-zone 렌더 분리.
2. 친구 feed/profile, guild, notification action을 social service로 통합.
3. 캘린더의 월 grid, day score, workout home, day sheet를 별도 모듈로 분리.
4. 통계 계산을 순수 selector로 옮기고 Chart.js 렌더와 export를 분리.
5. cooking과 admin을 같은 데이터·action 계약으로 이동.

핵심 작업:

- `render-calendar.js`를 calendar model/view, workout-calendar view, day-sheet controller로 분리한다.
- `render-stats.js`의 집계/코칭 계산과 Chart.js DOM 코드를 분리한다.
- social render scheduler를 유지하며 optimistic action과 서버 실패 rollback을 표준화한다.
- admin 권한 판정은 router와 data service 양쪽에서 방어하고 UI 강제 탭 전환과 데이터 권한을 혼동하지 않는다.

완료 게이트:

- 홈, life-zone, 친구 반응/댓글/알림, 캘린더 날짜 수정, 통계 기간 변경/export, admin 조회 핵심 흐름 통과.
- 화면 렌더 모듈에서 저장 구현과 Firebase SDK import가 사라짐.

### Phase 6 — 디자인 시스템·CSS·접근성 정리

예상: 1.5~2주, Phase 2~5의 각 도메인 slice와 병행

작업:

- `styles/tokens.css`를 색상, 간격, radius, typography, elevation, motion의 SSOT로 확정한다.
- button, icon button, field, list row, chip, segmented, badge, card, modal, sheet의 primitive를 만든다.
- `style.css`와 `expert-mode.css`에서 해당 기능 스타일을 소유 기능 파일로 이동한다.
- selector specificity와 override 순서를 문서화하고 신규 `!important`를 architecture test로 막는다.
- 44px touch target, label 연결, focus visible, dialog focus restore, reduced motion, 색 대비를 점검한다.
- loading/empty/error/offline/undo 피드백을 공통 UI로 통일한다.

완료 게이트:

- 핵심 화면의 mobile viewport visual snapshot 또는 구조 검증 통과.
- 키보드/스크린리더 기본 흐름과 Android 터치 흐름 확인.
- `style.css`는 shell/compatibility 역할로 축소되고 기능별 ownership이 명확함.

### Phase 7 — PWA·정적 자산·Android·Wear·Functions 경계 정리

예상: 1주

작업:

- 정적 runtime asset 목록을 하나의 manifest로 만들고 SW precache와 `copy-www.js`가 이를 공유하게 한다.
- 동일 파일의 과거 query-string 캐시 항목을 제거하고 cache version 생성/검증 방식을 단순화한다.
- PWA update, FCM SW, Capacitor refresh bridge의 책임과 이벤트 이름을 분리한다.
- 폰↔Wear payload validation과 버전 필드를 공통 계약으로 만들고 양쪽 fixture를 공유한다.
- Android app/Wear 단위 테스트와 debug build 검증 명령을 문서화한다.
- `functions/index.js`를 trigger, validation, service, notification provider로 분리하고 입력 검증·idempotency를 테스트한다.

완료 게이트:

- `npm.cmd run build` 결과의 정적 자산 누락 0건.
- PWA 업데이트 후 새 커밋 로드, 오프라인 shell, FCM 등록 회귀 없음.
- Android/Wear 테스트와 bridge payload fixture 통과.
- Functions emulator 또는 순수 service 테스트 통과.

### Phase 8 — 호환층 제거와 문서 확정

예상: 3~5일

작업:

- 사용처가 0인 `window.*`, shim export, legacy selector, dead CSS, 오래된 query cache entry를 삭제한다.
- source-text 테스트를 행위 테스트로 전환하고 아키텍처 금지 규칙만 정적 검사로 유지한다.
- `ARCHITECTURE.md`, `README.md`, `QUICKSTART.md`, `plan.md`를 현재 구조와 production 배포 규칙에 맞춘다.
- 기능별 owner, public API, 데이터 schema, migration/rollback 절차를 기록한다.
- 전체 저장소 dead-code/import 감사와 production 최종 회귀를 수행한다.

완료 게이트:

- 완료 기준의 모든 정량 조건 충족.
- 임시 compatibility layer와 deprecation 목록 0건 또는 잔존 사유/제거일 명시.
- production Pages에서 최종 전체 flow 검증 완료.

## 7. 단계별 검증 규칙

각 slice는 아래 순서를 모두 통과해야 다음 단계로 넘어간다.

1. 변경 전 실패 재현 또는 characterization test 추가.
2. 관련 순수 함수·DOM·integration test 실행.
3. 전체 `node --test` 실행.
4. 변경 JS의 syntax/import 검사와 정적 자산 계약 검사.
5. `STATIC_ASSETS` 대상 변경 시 같은 변경에서 `CACHE_VERSION` 갱신.
6. 정상 터미널에서 build/Capacitor/Gradle 등 해당 플랫폼 검증.
7. 작은 단위로 `main`에 커밋·push.
8. `https://aretenald2018-sys.github.io/tomatofarm/` 배포 후 다음 명령으로 커밋 확인.

```powershell
npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>
```

9. 해당 slice의 실제 UI 흐름을 production 페이지 또는 대상 네이티브 앱에서 실행.

자동 테스트 통과만으로 사용자 흐름이 검증됐다고 간주하지 않는다.

## 8. 핵심 회귀 시나리오

### 계정·앱 shell

- 로그인/로그아웃/세션 복구, 일반·관리자 권한, 탭 lazy load, 앱 업데이트, native back.

### 운동

- 운동 추가, 세트 편집·스와이프·완료, 휴식 타이머, 프로그램 처방, 저장·재로드, 과거 날짜 수정, active draft 복구.

### 러닝/Wear

- 폰 러닝 시작·일시정지·종료, GPS gap, route 저장/지도, Wear 전송·중복 방지·오프라인 queue.

### 식단

- 검색, 최근/자주 먹는 음식, 사진 추정, 중량/단위 변경, 자동 저장, 사진 유지, legacy item 재로드.

### 홈·소셜

- 오늘 요약, life-zone, 목표/퀘스트, 친구 feed/profile, 반응·댓글, 길드, 알림.

### 캘린더·통계·관리자

- 월 이동, 날짜 선택/시트 편집, 점수 계산, 통계 기간/그래프/export, 관리자 조회·권한 거부.

### PWA·네이티브

- 새 배포 감지, cache 갱신, 오프라인 shell, APK/앱 refresh, Phone↔Wear payload 호환.

## 9. 주요 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 운동/식단 같은 문서의 필드 유실 | payload fixture, 도메인 key partition, merge 기본, replace 명시 승인 |
| 소스 문자열 테스트가 안전한 이동을 방해 | 먼저 사용자 행위 테스트를 추가한 뒤 문자열 테스트를 축소 |
| lazy module 버튼이 로드 전에 클릭됨 | 기능 root init에서 직접 바인딩하고 첫 클릭 integration test 추가 |
| modal 내부 `stopPropagation()`으로 action 유실 | overlay 위임이 아닌 modal body scoped handler 사용 |
| CSS 분할 후 cascade 회귀 | DOM과 CSS를 같은 slice에서 이동, visual/구조 테스트, compatibility layer 한시 유지 |
| SW 구 캐시가 새 코드를 가림 | 자산 manifest SSOT, 캐시 버전 자동 검사, production commit 검증 |
| 러닝 경로 손실·개인정보 노출 | lossless fixture, 크기 제한, persistent queue redaction 계약 유지 |
| Phone/Wear 버전 불일치 | payload version + 양방향 backward compatibility fixture |
| 대형 일괄 변경의 rollback 어려움 | facade/adapter를 둔 작은 커밋과 단계별 production 배포 |

## 10. 권장 착수 순서

첫 네 번의 실행 단위는 다음과 같이 고정한다.

1. **R0 — 기준선**: 공식 test script, 핵심 fixture, architecture guard, 문서 드리프트 수정.
2. **R1 — 데이터 안전**: admin/notification 직접 Firestore 제거, 저장 schema facade 확정.
3. **R2 — 앱 shell**: tab registry와 bootstrap 분리, `index.html` 인라인 action 제거.
4. **R3 — 운동 세션**: session/save/draft 경계를 먼저 분리하고 UI 파일 분해는 그 다음 진행.

이 순서가 끝나기 전에는 `style.css` 전체 재배열, 디렉터리 전면 rename, workout UI 대규모 재설계를 시작하지 않는다.

## 11. 예상 일정

1인 기준으로 기능 개발을 병행하지 않을 때 약 10~14주를 예상한다. 가장 큰 변수는 운동/성장판 UI의 production 실사용 회귀와 Android/Wear 빌드 검증이다. 일정 단축이 필요하면 Phase 3을 최우선으로 유지하고, 디자인 시스템의 비핵심 화면과 Functions 내부 분해를 후속 릴리스로 분리한다.

# Tomato Farm 기술 아키텍처

## 1. 시스템 개요

건강/생산성 추적 PWA. 번들러 없는 Vanilla JS + Firebase 아키텍처이며, 단일 `index.html` SPA를 Capacitor Android와 Wear OS가 확장한다. shell → domain → data facade → Firebase adapter 방향을 유지한다.

```
index.html
  ├── app.js + app/                 — shell, tab registry, lazy load, overlay/action routing
  ├── render-*.js                   — 탭 조립과 DOM rendering
  ├── workout/                      — 운동/러닝/Wear/프로그램 domain과 session state
  ├── diet/                         — canonical meal model, editor, photo estimate pipeline
  ├── home/                         — home read model, life-zone, social action/rendering
  ├── calendar/ + stats/            — 순수 read model과 selector
  ├── data.js → data/data-api.js    — UI가 사용하는 유일한 data facade
  │             └── data/*          — auth, workout, social, admin repository와 Firebase adapter
  ├── styles/                       — tokens → components → primitives → accessibility
  ├── runtime-assets.js → sw.js     — 단일 precache manifest와 service worker
  ├── functions/                    — Firebase trigger + validation/service modules
  └── android/                      — Capacitor phone app + Wear OS app
```

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| 언어 | JavaScript ES6 modules (빌드 없음) |
| DB | Firebase Firestore |
| 호스팅 | GitHub Pages production (`origin/main`), Vercel 설정은 호환 목적으로 보존 |
| 모바일 | Capacitor 8.x (Android) |
| 함수 | Firebase Cloud Functions (`functions/`) |
| API 서버 | Node/Express (`tools/api-server.js`) — 식품DB 프록시 |
| 테스트 | `node:test` 회귀/계약/DOM 통합 테스트 (`npm.cmd test`, `npm.cmd run test:contracts`) |
| 디자인 | **TDS Mobile** (tossmini-docs.toss.im/tds-mobile) — 컬러 스케일만 커스텀 |

## 3. 핵심 아키텍처 결정 (코드에서 읽기 어려운 것들)

### 왜 빌드 스텝이 없는가
1인 개발 + 빠른 배포가 우선. ES6 modules로 직접 import. 번들러 도입 시 Capacitor 빌드 파이프라인과 충돌 가능성. `scripts/copy-www.js`가 빌드 아닌 "정적 파일 복사" 역할.

### 왜 data.js(data/ 디렉토리)를 통해서만 데이터 접근하는가
- `_cache` 인메모리 캐시와 Firebase가 항상 동기화되어야 함
- 직접 Firestore 호출하면 캐시가 stale → 다른 탭에서 구 데이터 표시
- `saveDay()`는 계정·날짜별 복구 저널과 `_cache`를 첫 await 전에 함께 갱신한 뒤 Firestore에 merge하고, `sheet:saved`가 화면 갱신을 잇는다. 서버 실패 시 저널은 시작·online·foreground에서 재전송된다.
- **data.js는 호환 facade**이고 실제 공개 API는 `data/data-api.js`가 조립한다. UI/feature는 Firebase SDK나 `data-core.js`를 직접 import하지 않는다.
- Firebase adapter, repository, facade, UI 순으로 의존하며 `saveDay()`는 merge가 기본이다. 전체 replace는 명시적 opt-in 없이는 거부된다.

### 왜 saveWorkoutDay()와 _autoSaveDiet()가 분리되어 있는가
- `saveWorkoutDay()` — 명시적 저장 (운동 상태 변경, 세트 체크 등)
- `_autoSaveDiet()` — 음식 추가/삭제 시 자동 저장
- 운동은 `WORKOUT_PAYLOAD_KEYS`, 식단은 `DIET_PAYLOAD_KEYS`, 공통 필드는 `SHARED_PAYLOAD_KEYS` 계약으로 분리한다.
- 사진·러닝 route·타 도메인 필드를 삭제하지 않도록 repository merge와 fixture 테스트가 저장 경계를 지킨다.

### action과 전역 경계 원칙
- UI는 `data-*` action + scoped handler 또는 직접 event binding을 사용한다. inline handler와 비즈니스 `window.*` 노출은 금지한다.
- 기능 간 조정은 ES module import 또는 이름이 명시된 `CustomEvent` 계약을 사용한다. `app:render-requested`, `app:start-user-session`, `app:switch-tab`이 shell 경계 이벤트다.
- `window.*`는 Capacitor/PWA/native bridge와 `__` 접두사의 개발 진단 표면만 허용하며 `tests/architecture-boundaries.test.js`가 allowlist를 강제한다.

### 탭 로딩 전략 (app.js `switchTab`)
- **즉시 로드**: `home`, `workout`, `diet` (import 문으로 직접; workout과 diet는 같은 `workouts` 도큐먼트를 공유 → `loadWorkoutDate` 동일 호출)
- **레이지 로드**: `stats`, `cooking`, `admin` (app.js `_lazy*()` 함수로 동적 import)
- **Admin 강제**: admin 유저면 `switchTab('home')` 같은 호출도 `admin`으로 강제 치환됨
- **캘린더**: 하단 탭과 운동 홈 양쪽에서 `render-calendar.js`를 레이지 로드
- **삭제된 탭**: finance, wine, movie, dev — UI 모듈은 제거하고 컬렉션 데이터만 보존

### 앱 entry와 설치 앱 호환

- 현재 runtime 코드는 `home/index.js`와 `workout/index.js`를 직접 import한다.
- `render-home.js`와 `render-workout.js`는 이미 설치된 이전 WebView가 잠시 요청할 수 있는 얇은 re-export entry만 유지한다. 새 runtime 코드는 이 파일을 import하지 않는다.

## 4. 등록된 탭

| 탭 | 로딩 | 진입 동작 |
|----|------|-----------|
| `home` | 즉시 | `renderHome()` (home/index.js) |
| `workout` | 즉시 | `loadWorkoutDate(today)` + `wtRecoverTimers()` + `renderExpertTopArea()` |
| `diet` | 즉시 | `loadWorkoutDate(today)` (workout과 동일 도큐먼트) |
| `calendar` | 레이지 | `_lazyRenderCalendar()` → render-calendar.js |
| `stats` | 레이지 | `_lazyRenderStats()` → render-stats.js |
| `cooking` | 레이지 | `_lazyRenderCooking()` → render-cooking.js |
| `admin` | 레이지 | `_lazyRenderAdmin()` → render-admin.js (admin 유저면 타 탭 → 강제 치환) |

## 5. Firebase 컬렉션

| 컬렉션 | 키 | 비고 |
|--------|-----|------|
| `workouts` | dateKey "2026-04-17" | 운동+식단 통합 도큐먼트. runtime 저장은 domain payload + `setDoc({merge:true})`; replace는 명시적 opt-in만 허용 |
| `users` | userId | 프로필, 설정, 식단 플랜, 권한 |
| `goals` | goalId | 목표 정의 |
| `quests` | questId | 일일 퀘스트 |
| `_settings` | 설정 키 (tomato_state, expert_preset 등) | 유저별 상태/플래그 |
| `_analytics` | dateKey | 이벤트 일별 집계 (`data-analytics.js`) |
| `users/{uid}/gyms` | gymId | Expert mode 체육관 등록 |
| `users/{uid}/routine_templates` | id | Expert mode 루틴 템플릿 |
| `stocks` | 심볼 | 주식 포트폴리오 (UI 삭제, 데이터 보존) |
| `wines` | wineId | 와인 기록 (UI 삭제, 데이터 보존) |
| `movies` | 월별 키 | 영화 목록 (UI 삭제, 데이터 보존) |

## 6. 워크아웃 데이터 구조 (workouts 컬렉션)

```javascript
{
  // 운동
  exercises: [{ muscleId, exerciseId, sets: [{kg, reps, setType, done}] }],
  cf: boolean, cf_skip: boolean, cf_health: boolean,
  gym_skip: boolean, gym_health: boolean,
  stretching: boolean, swimming: boolean, running: boolean,
  runDistance: number, runDurationMin: number, runDurationSec: number, runMemo: string,
  workoutDuration: number,       // 운동 총 시간 (초)
  wine_free: boolean,
  memo: string,

  // 식단
  breakfast: string, lunch: string, dinner: string, snack: string,
  bKcal: number, lKcal: number, dKcal: number, sKcal: number,
  bFoods: Array, lFoods: Array, dFoods: Array, sFoods: Array,
  bProtein/bCarbs/bFat: number, (l/d/s 동일)
  bOk/lOk/dOk/sOk: boolean,
  breakfast_skipped: boolean, lunch_skipped: boolean, dinner_skipped: boolean,

  // 사진 (base64) — 누락하면 setDoc 덮어쓰기로 삭제됨!
  bPhoto: string, lPhoto: string, dPhoto: string, sPhoto: string, workoutPhoto: string,
}
```

## 7. workout/ 대표 모듈 구조

| 파일 | 역할 |
|------|------|
| `index.js` | 오케스트레이터: 서브모듈의 공개 API re-export |
| `state.js` | 공유 상태 객체 `S` (운동/식단 모든 필드) |
| `load.js` | `loadWorkoutDate()` — Firestore → `S` 복원 + UI 갱신 |
| `save.js` | `saveWorkoutDay()`, `_autoSaveDiet()`, 공통 `_buildSavePayload()` |
| `status.js` | 운동/식단 토글 상태 (cf, gym, swimming, running, meal_skip, wine_free) |
| `render.js` | 칼로리 트래커, 식사 사진, 식단 UI 렌더링 |
| `exercises.js` | 세트 CRUD, 종목 피커/에디터, 운동 리스트 렌더링 |
| `timers.js` | 운동 타이머 + 세트 간 휴식 타이머 (프리셋 시트 포함) |
| `activity-forms.js` | 런닝/크로스핏/스트레칭/수영 상세 폼 이벤트 |
| `ai-estimate.js` | 사진 1-pass AI 음식 추정 (Bayesian prior 보정) |
| `expert.js` | Expert mode 8-scene 위자드 (gym/equipment/루틴) |
| `sessions.js`, `session-policy.js` | 날짜별 복수 운동 세션 정규화·집계·슬롯 정책 |
| `running-session.js`, `running-model.js` | 러닝 세션 lifecycle과 canonical 저장 모델 |
| `running-route-*.js` | GPS route 저장·정책·lazy hydration |
| `wear-bridge.js` | Wear payload 검증과 웹 운동 세션 저장 경계 |
| `expert/`, `test-v2/` | 성장 프로그램 계산·설정·보드 UI |

## 8. home/ 대표 모듈 구조

| 파일 | 역할 |
|------|------|
| `index.js` | `renderHome()` 오케스트레이터 |
| `tomato.js` | 토마토 사이클 정산, 수확 모달 (`settleTomatoCycleIfNeeded`) |
| `unit-goal.js` | 사이클 일수/날짜 범위 카드 |
| `hero.js` | 히어로 카드, 스트릭 대시보드, 리더보드, 마일스톤 |
| `today-summary.js` | 오늘 식단/운동 요약, 식단 목표 카드 |
| `goals-quests.js` | 목표/퀘스트, 미니 메모 체크리스트 |
| `friend-feed.js` | 친구 피드, 반응 토글 |
| `friend-profile.js` | 친구 프로필, 방명록, 댓글, 선물 |
| `guild-card.js` | 길드 리더보드 (페이지네이션 7/page) |
| `notifications.js` | 통합 알림 센터 (친구/길드/댓글) |
| `cheers-card.js` | 공개 응원 카드 (세션 캐시, 2-토마토 보호) |
| `cheer-card.js` | 미확인 응원 카드 렌더링, dedup |
| `personalize.js` | 홈 카드 순서/숨김 (`window.homeCardPersonalize`) |
| `streak-warning.js` | 스트릭 경고 배너 (저녁 9시 이후, 미확인 시) |
| `weekly-streak.js` | 주간 스트릭 미니 캘린더 (7일) |
| `welcome-back.js` | 복귀 환영 메시지 (로그인 간격/미확인/길드 순위 기반) |
| `admin-onboarding.js` | 관리자 모드 원타임 온보딩 배너 |
| `utils.js` | 홈 공통 유틸 (날짜, 월요일, 분기 경계) |

## 9. 데이터 흐름

```
사용자 입력
  → workout/*.js 또는 home/*.js (상태 변수 변경)
  → data.js facade → data/data-api.js → domain repository → Firebase adapter
  → document.dispatchEvent('sheet:saved')
  → app.js renderAll() (홈/통계/쿠킹 갱신)
```
- `sheet.js`(과거 날짜 편집) → `sheet:saved`
- `render-cooking.js` 저장 → `cooking:saved`
- 이벤트 트래킹: `data/data-analytics.js` → `_analytics/{dateKey}` 일별 집계

## 10. Streak 판정 로직

- **운동**: `getMuscles().length > 0 || getCF() || running || swimming` → 연속일 카운트
- **식단**: `dietDayOk()` = 3끼 모두 (굶었음 OR kcal > 0)
- **스트레칭/와인프리**: 각각 boolean 연속일 카운트
- 오늘부터 역순으로 조건 만족할 때까지 카운트 (`calc.js calcStreaks`)

## 11. 토마토 사이클 (게임화)

- `calc.js calcTomatoCycle()` — 사이클 일수/진행도 계산
- `calc.js evaluateCycleResult()` — 성공/실패 판정
- `home/tomato.js settleTomatoCycleIfNeeded()` — 정산 루프, 마이그레이션, 수확 모달
- 상태는 Firestore `_settings/tomato_state`에 저장 (localStorage 금지 — 기기 단위라 멀티 유저 안 됨)
- 정산 호출 위치는 `home/index.js renderHome()` — admin/비관리자 공통 경로에서 실행

## 12. Expert Mode

- 엔트리: `workout/expert.js` — 8-scene 위자드
- 상태: `_settings/expert_preset` — `{goal, daysPerWeek, sessionMinutes, preferMuscles, avoidMuscles, forbiddenMovements, preferredRpe, draftGymId}`
- 저장소: `data/data-workout-equipment.js` — `users/{uid}/gyms`, `users/{uid}/routine_templates`
- 모달: expert-onboarding, gym-equipment, routine-suggest, routine-candidates, insights
- 스타일: `styles/workout/expert-mode.css`

## 13. AI 식단 파이프라인

- 입력: 사진 → `workout/ai-estimate.js` (Gemini Vision 1-pass)
- 정규화: `data/korean-food-normalize.js` — 한국어 음식명 + kcal/100g prior
- 개인화: `data/ai-food-profile.js` — 유저 히스토리 기반 Bayesian prior (Phase 1: 메모리 전용, Firestore 미영속)
- 모달: `nutrition-search-modal.js`, `nutrition-item-modal.js`, `nutrition-weight-modal.js`, `ai-estimate-banner-modal.js`

## 14. 모달 시스템

1. `modals/*-modal.js` → `export const MODAL_HTML` (HTML 문자열)
2. `modal-manager.js` → 필요한 모달을 지연 주입하고 중복 주입을 막음
3. `app/overlay-stack.js` → modal/sheet의 열기·닫기·ESC/native back 순서를 소유
4. 모달 내부 동작은 해당 body/sheet에 직접 바인딩하고 backdrop 위임에 의존하지 않음

## 15. Service Worker

- `runtime-assets.js`가 웹 runtime asset의 단일 manifest이며 `sw.js`와 `scripts/copy-www.js`가 공유한다.
- `sw.js` `CACHE_VERSION` 변수 범프 → 신규 자산 페치. manifest 자산 수정 시 같은 변경에서 필수 범프한다.
- runtime import URL에는 파일별 `?v=`를 붙이지 않고 cache namespace만 교체한다.
- `firebase-messaging-sw.js`는 FCM 푸시 전용 (별도 SW)
- 실제 버전은 `sw.js`의 `CACHE_VERSION`을 단일 기준으로 확인하며 문서에 버전 문자열을 복제하지 않는다.

## 16. 에이전트 (`.claude/agents/`)

5개 전문 에이전트. 메인 세션이 코디네이터로 병렬 실행.

| 에이전트 | 모델 | 권한 | 용도 |
|----------|------|------|------|
| `feature-dev` | sonnet | 전체 | "go" 워크플로우, 기능 구현 |
| `data-guardian` | sonnet | read | setDoc 감사, dual-save desync |
| `tds-reviewer` | haiku | read | TDS Mobile 스펙 준수 |
| `test-writer` | sonnet | 전체 | calc.js 단위 테스트 |
| `refactor-architect` | opus | 전체 | 대형 파일 분할 설계 |

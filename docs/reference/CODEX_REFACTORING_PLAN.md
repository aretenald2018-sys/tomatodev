# Codex 리팩토링 실행 계획 (TomatoDev)

> **문서 성격**: Codex 자율 실행용 한시 작업 지시서. 이 리팩토링이 끝나고 main에 통합하기 전에 이 파일은 삭제한다(AGENTS.md의 "작업 계획은 소스 트리 밖" 원칙). 실행 중에는 이 문서가 유일한 작업 지시서이며, 기존 저장소 규칙(`AGENTS.md`, `ARCHITECTURE.md`)과 충돌하면 **저장소 규칙이 우선**한다.
>
> **작성 근거**: 2026-07-26 기준 커밋 `8f351b4`에서 코드베이스 전체(약 111,448 JS LOC)를 6개 영역으로 나눠 정밀 분석한 결과다. 본문에 나오는 모든 파일:라인 번호는 그 시점 기준이므로, 실행 시점에 라인이 밀렸으면 **함수명/심볼명으로 재탐색**한다.

---

## 0. 목표, 절대 제약, 성공 기준

### 0.1 목표

1. ARCHITECTURE.md가 스스로 인정한 부채 해소: 루트 평면(flat) 거대 모듈을 도메인 디렉터리로 분해한다.
   - `render-calendar.js` 5,256줄 → 컨트롤러 + `calendar/` 9개 모듈
   - `render-stats.js` 2,391줄 → 컨트롤러 + `stats/` 8개 모듈
   - `calc.js` 2,205줄 → 배럴 + `calc/` 5개 모듈
   - `feature-login.js` 1,663줄 → 부트스트랩 + `auth/`·`social/` 등 7개 모듈
   - `app.js` 1,023줄 → 셸 + `app/` 4개 모듈
   - `config.js` 356줄 → 앱 설정 + `config/movements.js`
2. 중복 제거: HTML 이스케이프 14곳, 숫자 강제 15곳, 일일 합계 16곳, 통계 집계 120줄 중복 등.
3. 죽은 코드 전면 삭제(사용자 승인 완료): `sheet.js` 452줄, `utils/format.js`, `utils/form-guard.js`, `api/food-search.js`(하드코딩 키 포함), 도달 불가 설정/내보내기 모달 등.
4. 발견된 런타임 버그 수정(사용자 승인 완료): 미정의 함수 호출 1건, 이중 포커스 트랩, 스크롤 락 충돌 등.
5. CSS 부채 정리: 비토큰 팔레트, 죽은 선택자, JS 안의 CSS 철거.

### 0.2 절대 제약 — "토마토팜(운영)에 영향 금지"의 구체적 의미

TomatoDev는 운영 앱(Tomato Farm)과 **동일한 Firebase 프로젝트(`exercise-management`)와 브라우저 origin을 공유**한다. 또한 `functions/sync/firestore-mirror.js`에 양방향 미러가 준비되어 있다(현재 비활성). 따라서:

- **동작 보존(behavior-preserving)이 원칙**이다. 이 계획의 모든 작업은 코드 구조 변경이며, 사용자 눈에 보이는 동작 변화는 P0 버그 수정과 명시된 삭제 항목뿐이어야 한다.
- **Firestore에 저장되는 데이터의 형태는 1바이트도 바꾸지 않는다** (§1.1).
- **TomatoDev 격리 오버레이는 1글자도 바꾸지 않는다** (§1.2).
- **`functions/` 디렉터리는 전체 수정 금지**다 (§1.3).
- **배포·푸시 경계**: 이 저장소는 `origin`(aretenald2018-sys/tomatodev)에만 푸시한다. `main` 직접 푸시 금지, 원격 추가 금지, force-push 금지, `firebase deploy` 계열 명령 금지, `npm run deploy:dev` 실행 금지(배포는 사용자 판단).

### 0.3 성공 기준

- 각 작업 패키지(WP) 완료 시 해당 테스트 스위트 통과, 각 Phase 완료 시 `npm test` 전체 통과(거버넌스 + 문법 + node:test 143파일).
- `npm run verify:assets` 통과(생성 CSS 무변경 검증 + 런타임 자산 그래프 검증).
- `node scripts/dev-start.mjs` 브라우저 검증 체크리스트(§13.4) 통과.
- Firestore 관련 코드의 최종 diff에 경로 문자열·직렬화 필드·문서 ID 공식 변화가 없음.

---

# Part A — 가드레일 (모든 WP 공통 계약)

## 1.1 Firestore 계약 불변 목록

아래는 운영 앱과 공유되는 저장 계약이다. 리팩토링으로 코드를 옮기더라도 **이 형태를 만들어내는 로직의 결과물은 동일해야 한다.**

| 계약 | 위치 | 내용 |
|---|---|---|
| settings 봉투 | `data/data-core.js:387-411` `_saveSetting`, `data/season-store.js:93-95` | `users/{owner}/settings/{key}` 문서는 항상 `{ value: ... }` 봉투. 변경 시 운영 설정이 조용히 고아가 된다. |
| day 문서 merge | `data/data-save.js:177, 292` | `users/{owner}/workouts/{YYYY-MM-DD}`는 merge가 기본. `setDoc` replace는 명시적 `allowReplace` 경로만. 사진 필드 `bPhoto/lPhoto/dPhoto/sPhoto/workoutPhoto` 보존. |
| content-derived 문서 ID | `data/data-social-guild.js`, `data-social-interact.js` | `_guilds` 문서 ID = 길드명, `_hero_messages` = `{userId}_{dateKey}`, `_likes` = `{myId}_{friendId}_{dk}_cheer`. ID 공식 변경 = 데이터 포크. |
| owner alias 리터럴 | `data/account-unification.js:4-5` | `김_태우` / `김_태우(guest)` 리터럴은 양쪽 프로젝트에서 load-bearing. |
| settings 키 23종 | `data/data-api.js` 등 | `quest_order, section_titles, mini_memo_items, weekly_memos, tab_order, visible_tabs, diet_plan, home_streak_days, unit_goal_start, tomato_state, milestone_shown, streak_freezes, expert_preset, max_cycle, max_cycle_history, exercise_catalog_seed, diet_premium_report_inbox, diet_premium_report_seen, cheer_last_seen, haptics_enabled, home_card_order, home_card_hidden, streak_warning_ack_date, ui_admin_onboarding_ack` + `season_registry`, `test_board_v2`, `season_{id}_*`. 키 이름 변경 금지. |
| 중첩 서브컬렉션 | `functions/sync/firestore-mirror.js:70-74` | 미러는 depth 4/6만 지원(`running_routes/{id}/chunks/{n}`가 유일한 중첩). **새 중첩 서브컬렉션 추가 금지.** |
| 도메인 직렬화 | `workout/save-schema.js`, `diet/nutrition-item.js`, `data/nutrition-normalize.js` | 저장 payload 빌더의 출력 필드 집합·이름·타입 불변. 라운드트립 테스트가 지키고 있으니 절대 우회하지 않는다. |

## 1.2 TomatoDev 격리 오버레이 — 수정 금지 리터럴

아래 파일:라인의 **리터럴과 동작을 그대로 유지**한다. 코드를 다른 파일로 옮길 때도(P6에서 일부 이동함) 문자열·함수명·주석을 그대로 가져간다.

- `data/data-core.js:29` — `initializeApp(CONFIG.FIREBASE, 'tomatodev')` 명명 앱
- `data/data-core.js:65-70` — `TOMATODEV_AUTH_STORAGE_KEYS` 4개 키, `:72` IDB 이름 `tomatodev_session_v1`, `:135-143` kim 모드 guest 강제
- `data/data-functions.js` 전체 — 콜러블 fail-closed 차단(`TOMATODEV_PRODUCTION_CALLABLE_BLOCKED`), import-free 설계
- `data/data-analytics.js:12,15`, `data/data-social-log.js:12-16` — 빈 스텁(쓰기 금지 가드)
- `data/data-load.js:122-124, 242-243, 301-304` — write-free 부트스트랩, `active_timer` 비수화
- `feature-login.js:52-56` `_runDeferredLoginMaintenance`(no-op), `:58` `_needsPassword`, "김태우 잠금 화면" 주석 블록 — **함수명·한국어 주석까지 소스 슬라이스 테스트가 고정**하고 있다(`tests/tomatodev-auth-boundary.test.js`)
- `pwa-fcm.js:10-22` FCM 비활성 결과, `data/data-social-interact.js:633-645` FCM 토큰 no-op, `firebase-messaging-sw.js` 전체(inert), `index.html:2`의 `data-environment="tomatodev" data-web-fcm="disabled"`, `pwa-register.js:13`
- `sw.js:4-6` — `CACHE_PREFIX`/`CACHE_VERSION`/`RUNTIME_CACHE` 3상수의 `tomatodev-` 접두, `:13-20` `matchOwnedCache`
- `scripts/repository-boundary.mjs`, `scripts/generate-build-info.mjs:31`, `build-info.json`의 `app: 'tomatodev'`
- `tomatodev_` 접두 브라우저 키 전부: `workout/running-session.js:46,52-53`, `workout/timers.js:95-97`, `workout/wear-bridge.js:18`, `config.js:9-16`, `pwa-register.js:16-17`, `data/pending-day-writes.js:3`, `feature-login.js:90-99`

## 1.3 functions/ 및 운영 네임스페이스

- `functions/` 이하 **모든 파일 수정 금지**. `functions/package.json`의 `tomatofarm-functions` 명칭, `functions/lib/notification-provider.js`의 운영 아이콘 경로는 **의도된 운영 parity 산출물**이다. "고치지" 말 것. 클라이언트 `calc.js`와 `functions/dashboard/aggregate.js`의 BMR/TDEE 이중 구현도 이번에는 손대지 않는다(§14.2 기록만).
- `render-stats.js:226`의 `tomatofarm.trainerStats.v1`, `:471`의 `tomatofarm.rawDailyStats.v1`, `home/hero.js:180`의 `tomatofarm.home.leaderboard.period` 등 **`tomatofarm.` 접두 스키마/스토리지 문자열은 운영 호환 네임스페이스이므로 변경 금지.** admin CSV 파일명의 tomatofarm 접두도 동일.

## 1.4 스코프 아웃 (이번 리팩토링에서 건드리지 않는 것)

| 영역 | 이유 |
|---|---|
| 생활존 일체 (`home/life-zone.js`, `home/life-zone-state.js`, `assets/home/life-zone/`, `styles/features/home-life-zone.css`) | `docs/LIFE_ZONE_ASSETS.md`의 단일 scene-contract 게이트가 선행돼야 함. `app.js:218-260`의 NPC 이벤트 브리지도 제자리 유지(테스트가 인접성 고정). |
| `render-home.js`, `render-workout.js`, 루트 `expert-mode.css` | `docs/COMPATIBILITY.md`가 은퇴일 2026-10-31을 못박은 설치-WebView 호환 심. 그 전 삭제 금지. |
| `data.js` 파사드 | 영구 공개 API(COMPATIBILITY.md). 7줄 배럴 그대로. |
| `config.js:42` FOOD_DB_KEY 클라이언트 노출 | 키 로테이션/프록시 전환은 별도 과제(§14.2). 이번에는 죽은 사본 제거만(P1.3). |
| Android/Wear 네이티브(`android/`) | 이번 계획은 웹 소스만. `www/`는 생성물이므로 애초에 편집 금지. |
| 레거시 데이터 리더(구 운동/영양/러닝 경로 판독기) | 데이터 보존 목적. COMPATIBILITY.md가 운영 read-back 감사 선행을 요구. |

## 1.5 신규 파일 체크리스트 (매번 필수)

**신규 JS 모듈을 만들 때마다** (이 계획은 약 35개 신규 모듈을 만든다):

1. `runtime-assets.js`의 `TOMATO_STATIC_ASSETS` 배열에 `'./새/경로.js'` 추가. 누락하면 `npm test` 2단계(`check-runtime-syntax.mjs`)가 `not precached`로 실패하고, 통과하더라도 오프라인/Capacitor 아티팩트에서 **조용히 빠진다**.
2. `git add` (안 하면 `verify-runtime-assets.mjs`가 "not tracked by git" 실패).
3. `node scripts/bump-cache.js` — `sw.js:5`의 `CACHE_VERSION` 범프. 형식은 `tomatodev-v{날짜8자리}z{n}-{슬러그}`이며 같은 날은 z가 증가한다. **런타임 자산이 변한 커밋에는 반드시 포함**(34개 테스트가 형식을 검사한다).
4. `node scripts/generate-build-info.mjs` — `build-info.json` 동기화.
5. `npm run verify:assets`로 확인.

**파일을 삭제/이동할 때는 역방향**: manifest에 남은 죽은 항목은 SW 설치 전체를 죽인다(`sw.js:35-49`가 프리캐시 1건 실패에 throw). manifest 항목 제거를 같은 커밋에서 한다.

**신규 CSS 파일**은 추가로: `scripts/generate-style-entry.mjs`의 `STYLE_ENTRY_SOURCES`(순서 = 캐스케이드!) + `tests/helpers/css-source.js`의 `APP_STYLE_FILES`(수동 중복 목록) + `node scripts/generate-style-entry.mjs`로 `style.css` 재생성 + 커밋 포함.

## 1.6 아키텍처 게이트 (테스트가 강제)

- Firestore 접근은 `data.js` + `data/`만 (`tests/architecture-boundaries.test.js:42-50`이 경로 하드코딩 — **데이터 계층을 다른 디렉터리로 옮기지 말 것**).
- 신규 `window.X =` 금지(26개 allowlist), 인라인 `onclick=` 등 금지, `?v=` 쿼리 버전 금지.
- CSS `!important` 총합 ≤ 40 (**현재 39, 여유 1**) — P8에서 절대 늘리지 말 것.
- 저작 CSS 파일 ≤ 1,200줄(allowlist 3개 제외). 신규 CSS도 적용된다.
- 루트에 새 디렉터리를 만들면(`calendar/`는 기존, `auth/`·`social/`·`config/`는 신규) `architecture-boundaries.test.js`의 walk가 **자동으로 스캔**한다 — 위 규칙이 즉시 적용되므로 문제없게 작성하면 된다.
- **테스트 파일명 변경 금지**: `scripts/run-test-suite.mjs`가 파일명 정규식으로 스위트를 라우팅한다. 이름을 바꾸면 소속 스위트가 조용히 바뀐다.
- 새 Markdown은 `docs/adr/`, `docs/contracts/`, `docs/reference/` 밖에 만들 수 없다(거버넌스). **이 계획 실행 중 새 .md를 만들지 말 것.**

---

# Part B — 작업 패키지

실행 순서는 P0 → P9. 각 WP는 독립 커밋(들)이다. WP 안의 "검증"은 커밋 전에 실행한다.

## P0 — 버그 수정 (5 WP)

리팩토링과 분리된 선행 수정. 커밋 접두는 `fix(...)`.

### WP0.1 미정의 함수 `_takeWorkoutTargetSessionIndex` 복원

- **증상**: `app.js:605`와 `:772`가 `_takeWorkoutTargetSessionIndex(0)`를 호출하지만 이 함수는 저장소 어디에도 정의/수입되지 않는다. 홈 위클리 스트릭 → `open-workout-date` 액션(`app.js:371-373`) → `openWorkoutTab()` 경로가 ReferenceError로 죽는다. `tests/workout-navigation-stack.test.js:119`는 텍스트 정규식 매치라 이 버그를 잡지 못한다.
- **작업**:
  1. `git log -S '_takeWorkoutTargetSessionIndex' --oneline`으로 정의가 사라진 커밋을 찾아 원래 의도를 확인한다.
  2. 원래 정의가 있었다면 그 구현을 app.js 모듈 스코프에 복원한다. 없었다면 최소 구현을 추가한다:
     - 모듈 상태 `let _workoutTargetSessionIndex = null;`
     - `function _takeWorkoutTargetSessionIndex(fallback = 0)` — 현재 값을 반환하고 null로 리셋, 값이 정수가 아니면 fallback 반환.
     - 세터가 어디에도 없다면(현재 상태) 딥링크/위젯 경로(`app.js:709-766`)에서 세션 인덱스를 전달해야 하는 곳이 있는지 확인하고, 없으면 세터 없이 위 게터만 둔다(항상 fallback 반환 = 첫 세션).
- **검증**: `node scripts/run-test-suite.mjs workout` + 브라우저에서 홈 탭 위클리 스트릭의 날짜 셀 클릭 → 운동 탭이 콘솔 에러 없이 열리는지 확인.
- **커밋**: `fix(app): restore missing _takeWorkoutTargetSessionIndex helper`

### WP0.2 이중 포커스 트랩 단일화

- **증상**: Tab 키 포커스 트랩이 2벌 모두 전역 keydown에 바인딩되어 활성이다 — `app/overlay-stack.js:88-111`(스택 인지형)과 `utils/ux-polish.js:53-79`(DOM 쿼리형). 각각 포커스 가능 요소 선택자와 필터가 달라(`aria-hidden` vs `offsetParent`) 동작이 미묘하게 충돌할 수 있다.
- **작업**: `utils/ux-polish.js`의 `initModalFocusTrap`을 삭제하고 `initUxPolish`(`:84` 부근)에서 호출을 제거한다. overlay-stack 쪽이 canonical. `initModalFocusTrap` export를 참조하는 곳이 없는지 `grep -rn "initModalFocusTrap"` 확인.
- **검증**: 브라우저에서 아무 모달(체크인 모달 등)을 열고 Tab/Shift+Tab 순환, Esc 닫힘 확인. `node scripts/run-test-suite.mjs ui`.
- **커밋**: `fix(ui): remove duplicate modal focus trap, keep the stack-aware one`

### WP0.3 body 스크롤 락 소유 단일화

- **증상**: 스크롤 락 소유자가 3곳 — `app/overlay-stack.js:34`(스택 카운트), `utils/confirm-modal.js:57,71`(자체 `_openCount`), `feature-diet-premium-report.js:421,449-451`(자체 저장/복원). 오버레이 위에서 confirm 모달이 닫히면 아직 열린 오버레이의 락이 풀릴 수 있다.
- **작업**: `app/overlay-stack.js`에 참조 카운트 기반 `acquireBodyScrollLock()` / `releaseBodyScrollLock()`을 export로 추가하고, 기존 내부 락 로직과 `utils/confirm-modal.js`, `feature-diet-premium-report.js`가 모두 이것을 쓰게 한다. 각 모듈의 자체 카운터/저장 로직은 제거.
- **검증**: 브라우저에서 (1) 모달 위에 confirm 띄우고 confirm만 닫기 → 배경 스크롤이 여전히 잠겨 있는지, (2) 모두 닫으면 풀리는지. `npm run test:ui`.
- **커밋**: `fix(ui): centralize body scroll lock in overlay-stack`

### WP0.4 window 브리지 자기 호출 제거

- **증상**: `app.js:352-353`이 `window.__requestTomatoAppRefresh`를 경유해 호출하지만 `app.js:33`이 이미 같은 모듈(`utils/build-info.js`)에서 import 중이다.
- **작업**: `utils/build-info.js`의 `requestTomatoAppRefresh`를 직접 import해 호출. window 브리지 할당(`utils/build-info.js:465`)은 클래식 스크립트 `pwa-register.js`가 쓰므로 유지.
- **검증**: `npm run test:ui`(app-shell 계열), 브라우저에서 더보기 메뉴의 새로고침 동작 확인.
- **커밋**: `fix(app): call requestTomatoAppRefresh via import, not window bridge`

### WP0.5 feature-nutrition의 window 브래킷 누수 제거 + 게이트 강화

- **증상**: `feature-nutrition.js:97`이 검색 결과 행마다 `window[itemDataKey] = canonical`로 전역을 만들고 지우지 않는다(`:417`에서 읽음). `tests/architecture-boundaries.test.js:71`의 정규식은 점표기(`window.X =`)만 잡아서 이 브래킷 표기는 게이트를 회피한다.
- **작업**:
  1. `feature-nutrition.js`에 모듈 스코프 `const _searchItemCache = new Map()`을 두고 쓰기/읽기를 교체한다. 새 검색 결과 렌더 시(`renderNutritionSearchResults`) Map을 clear.
  2. `tests/architecture-boundaries.test.js`의 window 할당 검사에 브래킷 표기 패턴(`window[` 로 시작하는 할당)을 추가해 재발을 막는다. 기존 allowlist(26개 이름)는 그대로.
- **검증**: `npm run test:contracts` + 브라우저에서 식단 탭 영양 검색 → 항목 선택이 정상 동작하는지.
- **커밋**: `fix(diet): replace per-row window globals with a module cache; harden the gate`

## P1 — 죽은 코드 전면 삭제 (8 WP)

커밋 접두 `chore(dead-code):` 또는 `refactor(...)`. **삭제 전 반드시 `grep -rn "<심볼>" --include="*.js" --include="*.html" .` (node_modules, www 제외)로 참조 0을 재확인**한다. 아래 목록은 분석 시점 기준이다.

### WP1.1 `sheet.js` 삭제 (452줄)

- 21개 export 전부 런타임 참조 0. 프리캐시(`runtime-assets.js:225`)와 소스 문자열 테스트만 붙잡고 있다.
- **작업**: 파일 삭제 + `runtime-assets.js:225` 항목 제거 + 테스트 갱신:
  - `tests/workout-volume-unit.test.js:6` — sheet.js 소스를 읽는 부분 제거(테스트의 나머지 검증 대상 확인 후 유지/축소).
  - `tests/workout-save-mode-guard.test.js:47-56` — 하드코딩 파일 목록에서 `'sheet.js'` 제거.
- §1.5 체크리스트(범프 포함) 수행.
- **검증**: `npm test` 전체(sheet.js는 어느 스위트에도 행동 테스트가 없으므로 전량 확인이 안전).

### WP1.2 `utils/format.js`(127줄) + `utils/form-guard.js`(135줄) 삭제

- 두 파일 모두 importer 0. `runtime-assets.js`에서 해당 항목 제거, §1.5 수행.
- `utils/format.js`의 `KR_DAYS`는 `config.js`의 `DAYS`와 동일 리터럴이었다 — 이후 요일 배열은 `config.js` `DAYS`가 유일본이 된다(P3.6).

### WP1.3 `api/food-search.js` 삭제 + `tools/dev-watcher.js` 설정 중복 제거

- `api/food-search.js:4`에 API 키가 하드코딩되어 있으나 **죽은 코드**다(아무도 import하지 않고 `/api/food-search`를 fetch하는 곳도 없다; 실검색은 `fatsecret-api.js`가 직접 외부 API 호출).
- **작업**: `api/` 디렉터리 자체가 이 파일뿐이면 디렉터리째 삭제. `vercel.json`(루트, 202바이트)이 `api/`를 라우팅하면 해당 설정도 정리. 
- `tools/dev-watcher.js:11-27` — 저장소에서 유일하게 `data/` 밖에서 Firebase SDK를 직접 import하고 `config.js:46-52`와 동일한 Firebase 설정을 중복 하드코딩한 Node 도구다. `../config.js`에서 `CONFIG`를 import해 중복 리터럴을 제거한다(런타임 자산 아님 — manifest 무관).
- **검증**: `npm test`. 키 자체의 로테이션은 범위 외(§14.2).

### WP1.4 도달 불가 설정/내보내기 모달 제거

- `feature-misc.js:62` `openExportModal`, `:73` `openSettingsModal`, `:115` `saveSettings`는 **호출자가 0**이다(액션 등록은 close/run만 존재: `app/static-actions.js:129-133`). 모달 템플릿은 주입·프리캐시되지만 열 방법이 없다.
- **작업**(연쇄 포함 일괄 삭제):
  1. `feature-misc.js`의 세 함수 + 관련 헬퍼 제거.
  2. `modals/settings-modal.js`, `modals/export-modal.js` 파일 삭제 + `modal-manager.js:6-40` 레지스트리 항목 제거.
  3. `app/static-actions.js:129-133`의 관련 액션 등록 제거.
  4. **연쇄**: `render-stats.js:1604` `exportCSV`는 내보내기 모달 경유로만 도달했다 — `feature-misc.js:67-68`의 동적 import와 함께 제거한다. (운동 기록 내보내기 dock은 별개 기능으로 유지된다 — `render-calendar.js:2274` 계열은 건드리지 않는다.)
  5. **연쇄**: `TOMATODEV_LOCAL_SETTING_KEYS.ANTHROPIC`의 유일한 소비자가 삭제된 함수(`feature-misc.js:74,117`)라면 키 항목도 정리하되, `config.js:9-16`의 키 오브젝트 자체는 다른 키가 쓰므로 유지. `grep -rn "TOMATODEV_LOCAL_SETTING_KEYS"`로 확인.
  6. `runtime-assets.js`에서 삭제 파일 항목 제거, §1.5 수행.
- **주의**: 이 WP는 "CSV 내보내기 기능이 실제로 사라지는" 유일한 삭제다(어차피 UI에서 도달 불가였음). 커밋 메시지에 명시한다.
- **검증**: `npm test` 전체 + 브라우저에서 더보기 메뉴/설정 영역이 깨진 참조 없이 동작.

### WP1.5 `config.js` 죽은 상수 제거

- 참조 0 확인 후 제거: `EQUIPMENT_CATEGORIES`(:315-329), `MONTHS`(:355), `CONFIG.TICKERS`(:54-60), `CONFIG.STOCK_CACHE_HOURS`(:62), `CONFIG.DIET_KCAL_LIMIT`(:63), `CONFIG.CLAUDE_MODEL`(:64), `CONFIG.GEMINI_MODEL`(:65).
- `CONFIG.ANTHROPIC_KEY`/`CONFIG.ALPHAVANTAGE_KEY`(:29-30)는 `tests/tomatodev-runtime-boundary.test.js:149-150`만 참조한다. **먼저 그 테스트를 읽고 의도를 파악**할 것 — 격리 검증(키가 비어있음을 assert)이라면 키 제거에 맞춰 테스트를 "존재하지 않음" assert로 갱신한다.
- **검증**: `npm run test:contracts && npm run test:ui`.

### WP1.6 `utils/dom.js` 정리

- 17개 export 중 12개 죽음. 살아있는 것은 `openModal`/`closeModal`뿐이며 이는 `app/overlay-stack.js`로의 순수 패스스루다(유일 소비자 `render-calendar.js:32`).
- **작업**: `render-calendar.js:32`의 import를 `app/overlay-stack.js` 직접 import로 바꾸고 `utils/dom.js` 파일 삭제 + manifest 제거 + §1.5.
- **검증**: `npm run test:workout`(캘린더 계열) + 브라우저 캘린더 데이 모달 열기/닫기.

### WP1.7 소규모 죽은 문장·죽은 export 일괄 정리

한 커밋으로 묶는다. 각각 참조 0 재확인 필수.

- `pwa-register.js:262-271` — `deferredPrompt`를 저장만 하고 읽지 않는 죽은 `beforeinstallprompt` 캡처 제거(살아있는 쪽은 `pwa-fcm.js:98-112`).
- `utils/confirm-modal.js:169-171` — 빈 `if` 블록 + 낡은 주석 제거.
- `app.js:441-443` — `_renderWorkoutRoute` 순수 패스스루를 인라인화.
- `navigation.js:238-247` — 같은 마크업을 DOM/문자열로 두 번 만드는 `createTabIcon`/`tabIconHtml` 중 한쪽으로 통일.
- 죽은 export의 `export` 키워드 제거(함수는 유지): `modal-manager.js`의 `MODALS`·`areModalsLoaded`, `app/lazy-loader.js`의 `clearLazyModuleForTest`, `app/overlay-stack.js`의 `getFocusableElements`·`prepareModalAccessibility`·`closeTopModal`·`getOpenModalStack`, `utils/action-router.js`의 `registerAction`, `utils/ux-polish.js`의 `initOfflineBanner`·`autoFillAriaLabels`. **예외**: `app/tab-registry.js`의 `TAB_REGISTRY`/`TAB_IDS`는 `tests/app-shell-refactor.test.js:17`이 import하므로 유지.
- `render-stats.js:489` `buildStatsRawExportText` — importer 0. 내부 사용 여부 확인 후 함수째 제거(WP1.4에서 exportCSV가 사라지면 raw export 계열 전체의 도달성도 재확인: `_bindStatsRawExportControls`가 stats 탭 버튼에 바인딩되어 있으면 산다).
- **검증**: `npm test` 전체.

### WP1.8 `utils/haptics.js` 표면 정리

- 모듈은 side-effect로만 import된다(`app.js:42`). 죽은 export(`setHapticsEnabled` 외 5개)의 문서 주석(:9)이 아무도 안 쓰는 패턴을 광고 중.
- **작업**: export 유지 여부를 `grep`으로 확인해 실제 미사용이면 export 키워드 제거, 헤더 주석을 현실에 맞게 수정. `window.haptic` 브리지(:91)는 allowlist 항목이므로 유지.

## P2 — `calc.js` 도메인 분할 (1 WP, 커밋 2~3개)

### WP2.1 calc.js → 배럴 + calc/ 5모듈

`calc.js`(2,205줄)는 **100% 순수 계산**이다(DOM/window/storage/데이터 접근 0, 유일한 import는 `calc/volume.js` 배럴 재수출). 소비자가 상태를 인자로 주입하므로 분할이 기계적이다. **선례**: `calc/volume.js`(현행 배럴 :5-27)와 `ai.js`(1,530줄 → `ai/` 8파일 분할 완료된 40줄 배럴).

- **새 파일과 이동 라인**(현재 calc.js 기준):

| 새 파일 | 라인 | 내용 |
|---|---|---|
| `calc/shared.js` | :1643-1645 부근 | `_safeNum`, `_isWorkSet`, `_totalKcal` 등 파일 내 공용 사설 헬퍼 → export로 공개(`totalDayKcal`로 개명한 `_totalKcal`은 P3.3에서 전 코드베이스가 쓴다) |
| `calc/diet.js` | :29-401, :465-480, :1904-2205 | `DEFAULT_DIET_PLAN`, 러닝 칼로리 신뢰 게이트, `_calcBMR`, `calcDietMetrics`, 일일 판정(`isDietDaySuccess` 등), `calcStreaks`, `streakToCharacterMood`, `getQuarterKey`, MET/`calcBurnedKcal`, day score 일체, 영양 단위 변환(`convertNutrition` 등) |
| `calc/cycle.js` | :402-463 | `calcTomatoCycle`, `evaluateCycleResult` |
| `calc/workout.js` | :481-1632 | 1RM/RPE, track metrics/PR(`detectPRs` 등), muscle comparison, max-mode 전체(:1110-1632) |
| `calc/social.js` | :1634-1902 | celebration detector 9종 + `CELEBRATION_DETECTORS` + `runAllCelebrations` (`dietDayHasAllMeals` 포함 — diet 의존이면 `calc/diet.js`에서 import) |

- `calc.js`는 **기존 export 이름을 전부 그대로 재수출하는 배럴**이 된다(현행 :5-27 volume 패턴 확장). 3개 그룹 간 상호참조는 없고, `estimateSet1RM`은 `data/season-selectors.js`가 쓰므로 export 유지.
- §1.5 체크리스트(신규 5파일 manifest 등록 + 범프).
- **테스트 영향: 0** — `calc.js`를 named import하는 테스트 11개(`tests/calc.*.test.js` 8개, `workout-fixture.test.js` 등)와 Puppeteer importmap(`workout-picker-cardio-sheet-behavior.test.js:127`의 `calc.js` 키)은 배럴 유지로 전부 무변경 통과해야 한다. 실패하면 배럴 재수출 누락이다.
- **후속 커밋 — 소비 규칙 정리**: `data/data-api.js:34-49`가 calc 심볼 15개를 커리해 재수출하므로 `calcDietMetrics` 등이 `calc.js`와 `data.js` 양쪽에서 도달된다. `home/tomato.js:5,13`은 실제로 양쪽을 섞어 쓴다 — **규칙: 상태(cache/exList) 주입이 필요한 호출은 `data.js` 커리판, 인자를 직접 주는 순수 호출은 `calc.js`**로 정리하고 tomato.js의 이중 import를 한쪽으로 통일한다.
- **검증**: `npm run test:data && npm run test:workout` → `npm test`.
- **커밋**: `refactor(calc): split into calc/{shared,diet,cycle,workout,social}.js behind the existing barrel`

## P3 — 공유 유틸 통합 (7 WP)

**공통 주의**: 이 Phase는 소스 문자열 테스트가 읽는 파일들을 건드린다. 각 WP마다 대상 파일을 `grep -ln "<파일명>" tests/*.test.js`로 역추적해 영향 테스트를 먼저 파악하라. 특히 **테스트가 함수를 소스에서 추출해 vm에서 실행**하는 경우(`tests/workout-record-export.test.js` 등), 추출된 함수가 새 import 심볼을 참조하면 vm 샌드박스에 그 심볼을 주입하도록 테스트를 갱신해야 한다. 가장 안전한 패턴은 `import { escapeHtml as _esc } from ...`처럼 **기존 지역 이름으로 alias import**해 호출부를 바꾸지 않는 것이다.

### WP3.1 `utils/escape-html.js` 신설 — HTML 이스케이프 통일

- 신규 `utils/escape-html.js`: `export function escapeHtml(value) { ... }` (5-replace 체인, 기존 `home/utils.js:31` 구현 채택).
- 교체 대상(지역 정의 제거 → alias import): `render-calendar.js:168`, `render-stats.js:545`, `workout/expert.js:95`, `workout/expert/onboarding.js:88`, `workout/expert/max.js:87`, `workout/expert/max-same-day-advice.js:16`, `workout/season-manager.js:48`, `feature-diet-premium-report.js:137`, `modals/ai-estimate-banner.js:41`, `utils/build-info.js:83`, `utils/confirm-modal.js:163`, `feature-nutrition.js:83`.
- `home/utils.js:31`과 `admin/admin-utils.js:47`의 `escapeHtml`은 새 모듈 재수출로 바꿔 소비자 무변경 유지. `workout/expert/max-cycle-core.js:10`은 이미 export하므로 내부 소비자 정리만. **예외**: `admin/admin-export.js:3`은 CSV 이스케이프(다른 의미) — 두지 않는다.
- §1.5 수행. **검증**: `npm test` 전체(광범위 접촉).

### WP3.2 `utils/number.js` 신설 — 유한수 강제 통일

- `export function toFiniteNumber(value, fallback = 0)`. **동일 의미(비유한 → 0)인 정의만 교체**: `render-calendar.js:178`, `render-stats.js:888`, `data/season-selectors.js:22`, `workout/track-metrics.js:7`, `workout/timeline.js:9`, `workout/sessions.js:25`, `workout/running-analytics.js:11`, `workout/wear-bridge.js:31`, `calendar/activity-model.js:1`, `modals/trainer-running-stats.js:11`, `calc/shared.js`(P2에서 이동한 `_safeNum`), `diet/meal-model.js:31`, `fatsecret-api.js:346`, `data/season-widget-snapshot.js:67`, `data/season-overview.js:18`.
- fallback 의미가 다른 변종(`workout/running-model.js:8` 등 fallback 파라미터형, `admin/admin-export.js:18` null 반환형)은 `toFiniteNumber(v, fallback)` 형태로 흡수 가능한 것만 교체하고 아니면 유지.
- alias import(`toFiniteNumber as _num`)로 호출부 보존. §1.5. **검증**: `npm test`.

### WP3.3 일일 kcal 합계 공용화

- `bKcal+lKcal+dKcal+sKcal` 인라인 합산 16+곳을 P2에서 공개한 `calc/shared.js`(또는 `calc/diet.js`)의 `totalDayKcal(day)`로 교체: `render-stats.js:556,1622,1626`, `home/tomato.js:55,72,395,569,718,740,833`, `home/today-summary.js:109`, `home/unit-goal.js:53`, `home/friend-feed.js:296`, `ai/diet-rec.js:26`, `data/season-widget-snapshot.js:74,85`, `data/data-pure.js:287`, `data/data-social-guild.js:87`, `data/data-save.js:369`.
- `data/` 모듈이 `calc/`를 import하는 방향은 기존(`data-api.js` → `calc.js`)과 동일하므로 허용.
- **검증**: `npm run test:data && npm run test:ui` + 홈/통계 화면 kcal 표기 브라우저 확인.

### WP3.4 영양 필드 리스트 SSOT

- `data/nutrition-normalize.js:361-367`의 7필드 목록을 `export const NUTRITION_FIELDS`로 공개하고, `calc.js`(분할 후 `calc/diet.js`의 `_NUTRITION_FIELDS` :2137 상당)와 `diet/nutrition-item.js:58`이 그것을 import한다. `diet/meal-model.js:38`(5필드), `workout/render.js:114`(4필드)는 부분집합이 의도인지 확인 후 의도적이면 유지.
- **검증**: `npm run test:data`(diet-domain-boundaries, nutrition 계열).

### WP3.5 소형 중복 제거 묶음

- `feature-nutrition.js:322-335` `_calcPerServing` 삭제 → `render-cooking.js:390` `calcPerServing`(이미 export) import.
- `fatsecret-api.js:73-75` `_estimateServingSize` 패스스루 삭제 → 3개 호출부(:120,:321,:428)가 `estimateDefaultServingSize` 직접 사용.
- `feature-diet-plan.js` — `:124-140`과 `:162-187`이 같은 15필드 plan 객체를 두 번 조립한다. `_readPlanFromForm()` 공용 함수로 통합(±40줄 절감). `|| 0` vs `|| null` 기본값 차이는 옵션 인자로 처리해 **저장 payload가 바이트 동일**하게 유지.
- `render-calendar.js:246` `_formatDurationShort` — `workout/running-presentation.js:12`와 byte-identical → import로 교체(이미 :51-59에서 7개 포매터를 import 중).
- `render-calendar.js:1226` `_durationFromMinSec` — `calendar/activity-model.js:6`과 동일 → import.
- `render-stats.js:1198,1207` 러닝 duration/pace 포매터 — `workout/running-presentation.js`의 대응 함수와 **출력 형식이 동일한지 먼저 비교**(H:MM:SS vs M'SS'' 표기) 후 동일한 것만 교체, 다르면 유지하고 주석으로 사유 기록.
- **검증**: `npm run test:workout && npm run test:data` + 요리 탭 1인분 계산, 러닝 기록 표기 브라우저 확인.

### WP3.6 요일 배열 통일

- 유일본은 `config.js:356` `DAYS`. 인라인 `['일','월',...]` 사본 교체: `render-calendar.js:2013`, `:2947-2951`, `:3048-3051`. (`utils/format.js`의 `KR_DAYS`는 WP1.2에서 이미 삭제됨.)
- **검증**: 캘린더 날짜 타이틀 표기 확인.

### WP3.7 feature-diet-premium-report 모달 스택 편입

- `feature-diet-premium-report.js:439-461`이 overlay-stack을 우회해 `document.body.appendChild` + 수동 `body.style.overflow`로 모달을 만든다(WP0.3에서 스크롤 락은 통일됨). `app/overlay-stack.js`의 `openModal`/`closeModal` 경로로 편입한다. CSS-in-JS 철거는 P8(WP8.5)에서.
- **검증**: localhost에서 `__showDietPremiumReportPreview` 디버그 브리지(:476)로 리포트 열림/닫힘/인쇄 확인.

## P4 — `render-stats.js` 분할 (3 WP)

**패턴**: 순수 파생 로직 → `stats/` 모듈로 이동(export), `render-stats.js`는 orchestration + DOM + `data.js` 호출만 유지. 선례는 `stats/selectors.js`(39줄, `render-stats.js:17`이 소비)와 `workout/test-v2`의 core/render 쌍.

**선행 파악**: `grep -ln "render-stats" tests/*.test.js`로 소스 문자열 테스트를 확정한다(분석 시점: `stats-overall-compact-summary`, `trainer-quest-modal`(:9), `presentation-domain-boundaries`(:80-83), `stats-exercise-performance` 등 8파일). 각 모듈 이동 후 해당 테스트의 읽기 경로/assert를 갱신하고, 가능하면 **소스 슬라이스를 신규 모듈의 named import 행동 테스트로 전환**한다.

### WP4.1 순수 모듈 7개 추출

| 새 파일 | 이동 라인(현재) | 주요 심볼 |
|---|---|---|
| `stats/format.js` | :545-559, :650-653, :888-943, :1198-1212 | `_esc`(→WP3.1 결과 재사용), `_clamp`, `_keyOffset`, `_dayKcal/Protein/Carbs/Fat`, `_fmtDateShort`, `_num`(→WP3.2), `_fmt`, `_formatVolumeMass/Delta`, `_fmtSigned`, `_dateFromKey`, `_keyFromDate`, `_dateRange`, 러닝 포매터(WP3.5 결과) |
| `stats/day-aggregates.js` | :950-1023 | `_foodItems`…`_avgDayMetric`, `FOOD_KEYS`/`MEAL_PREFIXES`/`SKELETAL_KEYS`/`BODY_FAT_MASS_KEYS` 상수 |
| `stats/fatigue-model.js` | :600-697, :698-783, :818-842 | `_setsBand`…`_fatigueExerciseEntries`, `_buildMuscleFatigue`, `_fatigueInsight` (렌더 `_renderMuscleFatigue`·HTML 헬퍼는 잔류) |
| `stats/analysis-range.js` | :1249-1376 | `_linearSlope`, `_analysisPeriodConfig`, `_statsAnalysisRange/CompareRange`, `_entryPlanStats`, `_analyzeTrainerWindow`, `_workoutAnalysisLiftAnalyses` |
| `stats/weekly-series.js` | :1915-1999 | `_weekStartDateForStats`, `_weeklyDateBuckets`, `_buildWeeklyKcalWeightSeries` |
| `stats/health-series.js` | :2184-2298 | `_sampleHealthKeys`…`_formatHealthValue` (Chart 파괴 `_destroyHealthChart`는 잔류) |
| `stats/raw-export.js` | :364-492 | `_jsonSafeClone`…`buildStatsRawExport(Text)` — WP1.4/1.7의 도달성 결론에 따라 잔존분만 |
- `getCache()` 등 데이터 접근이 함수 상단에 붙은 경우(`buildStatsRawExport:450`, `_dateEntries:944`) **데이터를 인자로 주입**하도록 시그니처를 바꾸고 호출부(render-stats.js)가 주입한다 — `calc.js` 소비 방식과 동일.
- §1.5(신규 7파일). **검증**: 각 파일 이동마다 `npm run test:ui`(stats 계열은 ui 스위트), 완료 후 `npm test`.

### WP4.2 통계 요약 이중 구현 통합 (`stats/summary-model.js`)

- **최대 단일 중복**: `buildTrainerQuestStatsExport`(:114-339, 226줄)와 `_renderOverallSummary`(:1044-1197)가 `foodsByName` 맵, top 음식/운동일, 매크로 합, 당/나트륨, 기록일/운동일/성공일 카운트, 체중 fallback 체인(`_weightOnOrBefore(...) ?? plan?.weight ?? 70`)까지 ~120줄을 독립 중복.
- **작업**: `stats/summary-model.js`에 `buildPeriodSummary({cache, plan, checkins, range})` 하나로 집계를 통합하고, 두 소비자는 그 결과를 각자 포맷(내보내기 텍스트 / KPI HTML)만 한다. **두 소비자의 최종 출력이 바이트 동일해야 한다** — 통합 전 대표 기간 1개의 출력 텍스트를 임시 파일(저장소 밖, 예: 시스템 임시 디렉터리)로 떠서 전후 diff 비교.
- **검증**: `tests/trainer-quest-modal.test.js` + 통계 탭·트레이너 퀘스트 모달 브라우저 확인.

### WP4.3 마무리 — 죽은 export·게이트 확장

- `presentation-domain-boundaries.test.js`에 신규 `stats/` 모듈 각각의 참조 assert를 추가(기존 :80-83 패턴).
- render-stats.js에 남은 잔류물 재점검: 이 시점에 render-stats.js는 ~1,000줄 이하의 컨트롤러여야 한다.

## P5 — `render-calendar.js` 분할 (선행 1 + 모듈 9 WP)

**가장 큰 Phase.** 규칙: **한 번에 한 모듈**, 이동 → 테스트 갱신 → `npm run test:workout` → 커밋. 순서도 아래 명시된 대로(쉬운 것부터).

### WP5.0 선행 — 테스트 헬퍼 통합

- `extractFunctionSource`가 4개 테스트에 인라인 중복(`tests/workout-record-export.test.js:7-20`, `workout-calendar-bottom-sheet.test.js`, `workout-set-minimal-dom.test.js:19`, `running-route-lazy-hydration.test.js`)이고 `sliceBetween`류도 산재한다. `tests/helpers/source-utils.js`를 신설해 통합한다(테스트 헬퍼는 `.test.js`가 아니므로 스위트에 안 잡힘 — 기존 `tests/helpers/css-source.js` 선례).
- **동시에**, 아래 "고정 테스트 지도"의 각 테스트가 소스 경로를 상수로 갖게 정리해 이후 WP에서 경로만 바꾸면 되게 한다.
- **고정 테스트 지도**(분석 시점 — render-calendar를 소스로 읽는 테스트):
  - 함수 경계 슬라이스: `workout-empty-picker-density`(:18-21,:46-49,:77-80), `workout-calendar-bottom-sheet`(:195-198 — `renderWorkoutCalendarHome`→`_renderWorkoutHomeDetail` **인접성** 요구), `workout-rest-counter`(:59-68 3개 슬라이스), `workout-timer-summary-only`(:32,:38,:84), `workout-record-export`(:45-46,:108-109 추출 후 실행), `workout-set-minimal-dom`(:9,:115), `running-route-lazy-hydration`(:168,:239-251 — 12개 함수 추출)
  - 텍스트 매치: `running-gps-native-fallback`(:153-156), `running-entry`(:21,:32-34,:195-196), `season-integration`(:8,:21,:26), `workout-navigation-stack`(:83,:125-128), `presentation-domain-boundaries`(:76,:80), `workout-save-mode-guard`(:47-56 — saveDay 호출 파일 목록)
- **갱신 원칙**: 이동한 함수가 export되면 테스트는 **소스 추출 대신 named import로 전환**(더 견고). 슬라이스가 꼭 필요하면 읽기 경로를 새 모듈로 바꾼다. `workout-save-mode-guard`의 파일 목록엔 **saveDay를 호출하게 된 새 파일을 반드시 추가**(조용한 커버리지 구멍 방지).

### WP5.1 ~ WP5.9 모듈 추출 (권장 순서)

| # | 새 파일 | 이동 라인(현재) | 내용 / 주의 |
|---|---|---|---|
| 5.1 | `calendar/format.js` | :168-264, :347-366, :525-540, :1226-1229 | 순수 포매터·파서 13종(`_esc`/`_num`은 WP3 결과 재사용). 검증 있는 `_parseDateKey`가 여기의 유일본이 된다. |
| 5.2 | `calendar/gesture-policy.js` | :4192-4230 | 휠/터치 체이닝 순수 술어 4종. |
| 5.3 | `calendar/export-text.js` | :4944-4973, :5056-5063, :5171-5221 | `_formatWorkoutExportText`, `_weekKeysFor`, `_clearWorkoutActivityFields` — **순수만**. `_buildWorkoutRecordsExport`/`_exportWorkoutRecords`(:5064,:5099)는 데이터 접근이라 잔류. `workout-record-export.test.js`는 순수 함수를 import로 검증하게 전환. |
| 5.4 | `calendar/day-metrics.js` | :1250-1367 | `_sortedCheckins`, `_weightAt`, `_maxWeakMetrics`, `_dayMetrics`(69줄, calc 호출), `_activityRows`. `getExList()` 의존은 인자 주입으로. |
| 5.5 | `calendar/workout-read-model.js` | :1394-1637 (244줄) | `_buildWorkoutLookup`…`_workoutMetrics`. `getExList/getMuscleParts/getCache` 의존을 인자 주입으로 전환. `workout-timer-summary-only`가 `_workoutMetrics`를 슬라이스하므로 갱신. |
| 5.6 | `calendar/detail-template.js` | :2189-2939 (751줄) | **최대 수확** — 디테일 카드·세트 행·스파크라인·빈 상태 등 ~95% 순수 문자열 빌더. `_renderWorkoutHomeDetailHtml`의 `getCache` 접근만 인자화. `workout-empty-picker-density`(주석 배너 `// ═`까지 고정!)·`workout-set-minimal-dom`·`running-route-lazy-hydration`·`workout-calendar-bottom-sheet` 대량 갱신이 이 단계에 몰린다. |
| 5.7 | `calendar/session-state.js` | :1034-1177 | `_clonePlain`, `_workoutSessionSavePayload`, `_applyWorkoutHomeSessionToActiveState`, `_syncWorkoutHomeSavedSessionState`, `_mealOkPatchForWorkoutHomeDay` — 순수 상태 변환. **저장 payload를 만드는 함수이므로 §1.1 준수 최우선(출력 필드 불변).** |
| 5.8 | `calendar/sheet-state.js` | :541-884 (344줄) | 스크롤/캐러셀/입력 포커스 복원 DOM 컨트롤러 — 통째 이동(순수화 시도 금지). `workout-rest-counter`의 슬라이스 대상(:944 `_syncWorkoutRestAfterSheetSet`)은 **잔류 구간**이므로 그 테스트는 대체로 무사 — 확인만. |
| 5.9 | `calendar/set-keyboard.js` | :3633-4053 (421줄) | 커스텀 숫자 키패드 자립 서브시스템 — 통째 이동. |
- 각 WP마다 §1.5 수행(총 9파일). render-calendar.js는 **루트에 그대로 남는다** — `app/tab-registry.js:5`의 `'../render-calendar.js'` 리터럴과 `tests/tab-registry-lazy-modules.test.js:15`("render 모듈은 app/ 아래 금지")가 위치를 고정한다.
- **완료 기준**: render-calendar.js ≈ 2,700줄 이하의 컨트롤러(오케스트레이션 + 이벤트 바인딩 + data.js 호출 + 모듈 조립).
- **검증**: 매 WP `npm run test:workout`, Phase 완료 시 `npm test` + 브라우저 집중 검증(운동 탭: 월 그리드, 데이 시트 열기/닫기, 세트 입력·키패드·스와이프 삭제, 러닝 기록, 내보내기 dock, 캘린더 탭: 모드 전환·데이 모달).

## P6 — `feature-login.js` 분할 (2 WP)

### WP6.1 모듈 추출 7개

`feature-login.js`(1,663줄)는 정적 import 4개뿐이고 데이터 접근은 전부 `await import('./data.js')`(57곳)라 그래프 수준에서 이미 분리돼 있다.

| 새 파일 | 이동 라인(현재) | 내용 |
|---|---|---|
| `auth/login-screen.js` | :16-388, :756-868 | 세션 복원·자동로그인·`initLoginScreen`·계정 확인·비번 모달·`createAccountAndLogin`·`logoutAccount`·`confirmLogout`·`switchKimMode`. **격리 오버레이 최다 보유 구간 — `_runDeferredLoginMaintenance`/`_needsPassword` 함수명과 "김태우 잠금 화면" 주석을 그대로 이동.** |
| `auth/login-actions.js` | :389-556 | 33-case 액션 브리지 + 바인딩. 각 핸들러를 신규 모듈들에서 import하는 허브. |
| `auth/signup.js` | :567-677 중 가입 부분(:581-652, :654-677) | 가입 뷰 전환·계정 생성·토글. |
| `social/guild-picker.js` | :678-755 | `_allGuildsCache`/`_selectedGuilds` 상태 + 검색/칩 — 가입·온보딩·길드 모달 공용. |
| `social/guild-modal.js` | :882-1437 (~555줄) | 길드 모달 전체(멤버 관리·리더 위임·아이콘/사진·생성/가입/저장). |
| `feature-letters.js` | :1438-1527 + :1634(`sendLetter` — diet 블록에 잘못 위치) | 개발자 편지. |
| `feature-diet-setup.js` | :1528-1633 | 식단 초기 설정 — 원래부터 잘못된 파일에 있던 도메인. |
- `feature-login.js` 잔류: 정적 import, 모듈 상태 최소, `DOMContentLoaded` 부트(:1654-1663), 그리고 **공개 심볼 5개 재수출**(`logoutAccount`, `switchKimMode`, `openGuildModal`, `openLetterModal`, `submitDietSetup`) — 소비자(`admin/admin-actions.js:15`, `modals/guild-info-modal.js:2`, `app.js:50`, `app/static-actions.js:28`, `home/guild-card.js:41`)와 `index.html:930` 스크립트 태그 무변경.
- §1.5(신규 7파일 + 신규 루트 디렉터리 `auth/`, `social/` — architecture-boundaries walk에 자동 편입되므로 규칙 준수 확인).

### WP6.2 고정 테스트 갱신

- `tests/tomatodev-guest-entry.test.js:31-33` — `switchKimMode`→`openNicknameEdit` 인접 슬라이스: 두 함수가 다른 모듈로 갈라지면 **각각 named import 행동 검증으로 전환**하거나 읽기 경로를 `auth/login-screen.js`로 변경.
- `tests/tomatodev-auth-boundary.test.js` — 읽기 경로를 `auth/login-screen.js`로 변경(리터럴 assert 대상 문자열은 §1.2에 따라 그대로 이동됐으므로 경로만 바꾸면 통과해야 정상).
- `tests/auth-lifecycle-race.test.js`, `tests/login-action-bridge.test.js`(액션 브리지 → `auth/login-actions.js`), `tests/tomatodev-telemetry-boundary.test.js` — 동일 요령.
- **검증**: `npm run test:ui`(tomatodev-* 계열) → `npm test` + 브라우저: 게스트 진입, 로그인/로그아웃, 길드 모달 열기·멤버 토글, 편지 모달.

## P7 — 앱 셸 정리 (5 WP)

### WP7.1 app.js 안전 블록 4개 추출 (~330줄)

| 새 파일 | 이동 라인(현재) | 내용 |
|---|---|---|
| `app/owner-blocked-overlay.js` | :79-152 | 공유 owner 미해결 차단 오버레이(순수 자립). |
| `app/shell-actions.js` | :318-411 | `APP_SHELL_ACTION_SCOPE`, 16-case 셸 액션 + 바인딩(더보기 메뉴 등). |
| `app/workout-gestures.js` | :475-574 | 오버레이-백, 풀백 제스처, PWA 히스토리, Capacitor 시스템 백. |
| `app/deep-link-entry.js` | :709-766 | 대시보드/위젯 딥링크 진입(`openDashboardDestination` 등). |
- **이동 금지**: `_bindLifeZoneNpcQuestEvent`(:218-260)는 생활존 스코프 아웃 + `tests/pwa-meal-action-bootstrap.test.js:19-20`이 `initializeApp()` 종료 직후 `let _lifeZoneNpcQuestEventBound` 선언의 **인접성을 리터럴로 고정**하므로 제자리 유지. 이벤트 와이어링 블록(:665-708)도 `tests/data-consistency-wiring.test.js:181-204`가 순서를 고정하므로 잔류.
- `:184`의 파일 중간 import 문을 파일 상단으로 이동.
- 갱신 테스트: `tests/app-shell-refactor.test.js`(:22-23이 import 지정자 텍스트 고정 — import 라인이 변하면 assert 갱신), `tests/account-owner-wiring.test.js`(owner 오버레이 이동 시 읽기 경로), `tests/running-entry.test.js:278-280`(app.js 내 순서 assert — 이동 함수 포함 여부 확인).
- §1.5(신규 4파일). **검증**: `npm run test:ui && npm run test:smoke`.

### WP7.2 탭 순서/가시성 SSOT + date-key 정리

- 탭 순서 인코딩 3곳(`app.js:889-911`, `navigation.js:216-228`, `:231-236`)을 `navigation.js`로 통합 — app.js `_initializeAppSession`의 가시성 해석 블록을 `navigation.js`의 export 함수 호출로 대체.
- `app.js:413-425`의 `_dateKeyFromParts`/`_parseWorkoutDateKey`를 `data.js`의 `dateKey`(`data/data-date.js`)와 `calendar/format.js`(WP5.1)의 검증 파서로 대체. 의미 차이(롤오버 검증)가 있으므로 대체 전 두 구현의 입출력을 비교.
- **검증**: 탭 표시/순서/스와이프 브라우저 확인 + `npm run test:ui`.

### WP7.3 `config.js` 분할

- 신규 `config/movements.js`: `MOVEMENTS`(85종), `MOVEMENT_MUSCLES_MAP`, `BROAD_EQUIPMENT_MUSCLES_MAP`, `MOVEMENT_PATTERNS`, `MAX_PREFERRED_CATEGORIES`, `MUSCLES` (:98-354).
- `config.js`는 앱 설정(:1-96, `CONFIG`/`TOMATODEV_LOCAL_SETTING_KEYS`/`DAYS`)을 유지하고 **movements를 재수출**해 29개 importer 무변경.
- §1.5. **검증**: `npm run test:workout && npm run test:contracts`.

### WP7.4 `utils/build-info.js` 3분할

- `utils/build-info.js`(468줄) → 유지(빌드 정보·업데이트 배너) + `utils/wear-refresh.js`(:299-352 Wear 브리지) + `utils/apk-install.js`(:353-415 APK 다운로드). window 브리지 할당(`__requestTomatoApkInstall` 등 allowlist 이름)은 각자 모듈에서 수행 — **이름 불변**.
- 중복 드래프트 프로브(`pwa-register.js:50-56` vs `utils/build-info.js:149-156` byte-identical)는 모듈 쪽을 export하고 클래식 스크립트(`pwa-register.js`)는 자기 사본 유지(import 불가) + 주석으로 쌍둥이 관계 명시.
- 갱신 테스트: `tests/wear-app-refresh-update.test.js`, `tests/tomatodev-fcm-apk-boundary.test.js`(빌드/APK 텍스트 참조 여부 확인).
- §1.5. **검증**: `npm run test:ui` + 빌드 정보 패널 브라우저 확인.

### WP7.5 셸 소형 통일

- `showToast` 이중 경로: `app.js:45`, `navigation.js:6`, `feature-misc.js:8`이 `home/index.js` 경유로 import → `ui/toast.js` 직접 import로 통일(home/ 내부 소비자는 유지).
- 백드롭 클로즈 체크 4변종(D8): `app/overlay-stack.js:56-62` `isModalCloseGesture`를 `navigation.js:293`, `app.js:406` 인라인 로직에 적용.
- 타임아웃 래퍼 3곳(D10): `app.js:65-77` `_withTimeout`을 `utils/`로 공개하는 대신 **app 내부 공용으로만** 정리(과도한 공용화 금지).
- **검증**: `npm run test:ui && npm run test:smoke`.

## P8 — CSS 정리 (7 WP)

**공통 절차(모든 CSS WP)**: 소스 편집 → `node scripts/generate-style-entry.mjs`(style.css 재생성) → 필요 시 `tests/helpers/css-source.js` 갱신 → `npm run verify:assets` → 커밋에 style.css 포함 → §1.5(런타임 자산 변경이므로 범프).
**예산**: `!important` 총 39/40 — **추가 금지**. 파일당 1,200줄 상한 — `stats-core.css`(1,156)·`workout-core.css`(1,137)가 임계 근접이므로 이 두 파일에 대량 추가 금지.

### WP8.1 죽은 CSS 제거 1 — 확정 사망 선택자

- `test-mode-v2.css:28-48` `.tm2-entry-*` 블록(~21줄) — `workout/test-v2/entry.js:38-45`가 진입 카드를 비우므로 확정 사망.
- `styles/compatibility.css`의 확정 죽은 선택자 17종(`.act-btn`, `.sheet-btn`, `.quest-period-badge`, `.diet-meal-label`, `.section-category-title`, `.memo-item-label`, `.goal-ai-label`, `.goal-ai-summary`, `.ws-stepper-val`, `.rest-preset-btn`, `.dash-stat-val`, `.day-num`, `.quest-time-pct`, `.quest-dday-badge`, `.monthly-stat-val`, `.skip-disabled`, `.health-issue`) — 각각 `grep -rn "클래스명" --include="*.js" --include="*.html"`로 미사용 재확인 후 제거.
- **주의**: 템플릿 조립 클래스(`cal-cell-band-${grade}`, `cal-workout-activity-${type}` 등)가 있으므로 **grep은 접두 부분 문자열로도** 확인. 확신 없는 선택자는 남긴다.
- **검증**: `npm run test:ui`(CSS 게이트) + 브라우저 홈/캘린더/운동 화면 회귀 확인.

### WP8.2 seasons.css 토큰화

- `styles/features/seasons.css`(471줄)는 hex 272개/var() 0개로 최악의 비토큰 파일이며 Tailwind 계열 팔레트로 작성돼 디자인 시스템과 미조정 상태다.
- **작업**: 매핑 표를 만들어 교체 — 근사 레드(`#ff3d38` 등) → `var(--primary)` 계열, 슬레이트 텍스트(`#1e293b`, `#677182`) → 기존 텍스트 토큰, 표면/보더 → 기존 표면 토큰. `styles/tokens.css`에 **새 토큰을 추가하지 않는 것**을 기본으로 하고, 도저히 대응이 없으면 원색 유지.
- **이것은 의도된 시각 정규화**다(±근소한 색 변화 허용). 커밋 메시지에 매핑 표 요약을 남긴다.
- **검증**: 브라우저 시즌 위저드/시즌 캘린더를 라이트·다크 모두 확인.

### WP8.3 프리미티브 소유권 중복 해소

- `.tds-toast`: `styles/components.css:398` vs `styles/features/shared-feedback.css:38+` 이중 정의 → 병합해 **components.css 단일 소유**(변형 규칙 포함), shared-feedback 쪽 제거. 캐스케이드 순서상 현재 이기던 쪽(나중 로드 = shared-feedback)의 **계산 결과를 보존**하는 방향으로 병합.
- `.tds-sr-only`: `components.css:304` vs `accessibility.css:12` → accessibility.css 단일 소유(현재 승자), components 사본 제거.
- 기능 경계 누수 목록(`.wt-max-trend .ex-max-track-graph*` 6종: workout-core vs workout-day-sheet, `.trainer-*` 5종: stats-core vs stats-insights, `.wt-step-label` 등 5종: expert-card/gym-carousel/expert-conditions, `.wt-gym-slide`: gym-carousel vs expert-mode, `.wt-activity-copy-btn`, `.trainer-quest-type-cursor`)은 **각 선택자를 한 파일로 몰되 계산 결과 보존** — 시각 diff가 나면 중단하고 유지.
- **검증**: 토스트, 통계 트레이너 블록, expert 카드 브라우저 확인.

### WP8.4 nutrition-item-modal의 90줄 `<style>` 철거

- `modals/nutrition-item-modal.js:120` 내부 `<style>` 블록(스피너 keyframes, `.ni-tabs` 계열, 미디어 쿼리)을 신규 `styles/features/nutrition-item-modal.css`로 이전(토큰을 이미 쓰므로 이관만 하면 됨). JS에서 블록 제거.
- 신규 CSS 등록 3종 세트: `generate-style-entry.mjs`(diet 계열 근처 순서) + `tests/helpers/css-source.js` + `runtime-assets.js`. §1.5.
- **검증**: 영양 항목 모달(직접 추가/사진 추가 탭) 브라우저 확인.

### WP8.5 diet-premium-report의 190줄 CSS-in-JS 철거

- `feature-diet-premium-report.js:146-337` `_ensureStyles`의 CSS를 신규 `styles/features/diet-premium-report.css`로 이전, `_ensureStyles` 삭제. 클래스명 불변. WP8.4와 동일한 3종 등록.
- **검증**: localhost 디버그 브리지로 리포트 렌더·인쇄 확인.

### WP8.6 pwa-fcm 설치 배너 정리

- `pwa-fcm.js:49`의 `<style>@keyframes slideUp` 주입을 `styles/features/app-status.css`(빌드/상태 계열)로 이전.
- 인라인 fallback `var(--primary,#22c55e)`의 **초록 fallback을 브랜드 레드 `#fa342c`로 교정**(tokens.css:29의 `--primary`와 일치).
- **검증**: PWA 설치 배너 노출 조건(모바일 뷰포트 에뮬레이션) 확인.

### WP8.7 캐스케이드 순서 정합 — test-mode-v2 위치

- `docs/DESIGN_SYSTEM.md`는 "accessibility가 최종 레이어"라 선언하지만 실제로는 `test-mode-v2.css`가 그 뒤에 온다(`generate-style-entry.mjs:69`). `tm2-` 네임스페이스는 자립적이므로 **`STYLE_ENTRY_SOURCES`에서 test-mode-v2.css를 accessibility.css 앞으로 이동**해 선언과 현실을 일치시킨다.
- style.css 재생성 + `tests/design-system-accessibility.test.js` 통과 확인(현행 assert는 accessibility > expert-mode만 검사).
- **검증**: 성장 보드(테스트모드 v2) 브라우저 확인 + reduced-motion 동작.

## P9 — 문서·게이트 정합 + 최종 검증 (3 WP)

### WP9.1 문서 현행화

- `ARCHITECTURE.md` — "Substantial feature and render logic still lives in flat root modules" 문단을 분할 후 현실로 갱신(calendar/·stats/·auth/·social/·config/ 반영). 디렉터리 다이어그램 갱신.
- `docs/DESIGN_SYSTEM.md` — `admin/admin-hig.css`·`test-mode-v2.css`를 소유권 표에 등재, 최종 레이어 서술을 WP8.7 이후 현실과 일치시킴.
- `docs/COMPATIBILITY.md` — `styles/compatibility.css`를 호환 레이어 인벤토리에 등재(잔존 선택자 목록과 은퇴 조건 명시 — WP8.1 이후 남은 것 기준).
- `test-mode-v2.css:4`의 헤더 주석이 존재하지 않는 문서 경로를 참조 중 — 해당 라인을 실재 문서(예: `docs/DESIGN_SYSTEM.md`) 참조로 교체.
- **주의**: 문서 수정 후 `node scripts/check-project-governance.mjs`(링크 무결성·금지 문자열·AGENTS/CLAUDE 줄 수 상한) 통과 확인.

### WP9.2 게이트·드리프트 마감

- `runtime-assets.js`에 `styles/features/seasons.css` 누락(기존 드리프트) — 다른 44개 소스 CSS와 일관되게 추가.
- `workout-save-mode-guard.test.js:47-56` 파일 목록 최종 점검: P5/P6 이후 `saveDay(`를 호출하는 **모든** 파일이 목록에 있는지 `grep -rln "saveDay(" --include="*.js"`로 대조.
- `tests/presentation-domain-boundaries.test.js`에 신규 calendar/·stats/ 모듈 참조 assert가 전부 들어갔는지 확인.
- P0.5에서 강화한 window 게이트가 `npm run test:contracts`에서 그대로 동작하는지 재확인.

### WP9.3 최종 통합 검증 + 이 문서 처리

1. `npm run check:repository` (경계: origin 단일 원격).
2. `npm test` 전체 (거버넌스 → 문법 → node:test 전체 + functions/test 8파일).
3. `npm run verify:assets`.
4. `npm run build` 후 `git status`로 생성물 차분 확인(`style.css`, `build-info.json`, `www/`는 생성 규칙대로만 변해야 함 — `www/`는 커밋하지 않는 기존 관행 유지 확인).
5. §13.4 브라우저 체크리스트 전부.
6. **이 문서(`docs/reference/CODEX_REFACTORING_PLAN.md`)는 리팩토링 브랜치가 main에 통합되기 전에 삭제 커밋**한다(사용자가 결과를 검수한 뒤).

---

# Part C — Codex 실행 가이드

## 13.1 순서와 커밋

- 실행 순서는 **P0 → P9 엄수**. Phase 내 WP도 명시 순서대로(특히 P5는 5.0 → 5.1 → … → 5.9).
- 1 WP = 1 커밋이 기본(문서에 "커밋 2~3개"라 한 WP는 논리 단위로 쪼갬). 커밋 메시지: `fix(scope): …` / `refactor(scope): …` / `chore(scope): …` — 본문에 이동 심볼 요약과 갱신한 테스트 목록.
- 작업 브랜치는 **사용자가 지정한 브랜치 하나**에서만. `main` 커밋/푸시 금지, 원격 추가 금지, force-push 금지, `npm run deploy:dev`·`firebase` 계열 명령 실행 금지.

## 13.2 검증 주기

- 매 WP: 명시된 스위트(`node scripts/run-test-suite.mjs contracts|smoke|workout|data|ui`).
- 매 Phase 종료: `npm test` 전체 + `npm run verify:assets`.
- UI가 변한 WP: `node scripts/dev-start.mjs`로 브라우저 검증 후 서버 종료. **`python -m http.server`와 광역 프로세스 킬 금지**(AGENTS.md).
- 테스트·검증 산출물(스크린샷, 로그, 스냅샷 diff)은 **저장소 밖 임시 디렉터리**에만 둔다.

## 13.3 중단·재개·롤백

- 재개 시 `git log --oneline -20`으로 마지막 완료 WP를 식별하고 다음 WP부터 진행.
- WP 도중 테스트가 원인 불명으로 깨지면: 그 WP만 `git restore`/`git revert`로 되돌리고, 실패 내용을 커밋 메시지 대신 최종 보고에 기록 후 다음 WP로 진행(단, P0·P2처럼 후속이 의존하는 WP는 해결 없이 건너뛰지 않는다 — P3 이후의 WP는 상호 독립성이 높다).
- 어떤 경우에도 §1.1~§1.3 가드레일을 "테스트를 통과시키기 위해" 완화하지 않는다. 가드 테스트(tomatodev-*)가 깨지면 그건 **작업이 격리 오버레이를 건드렸다는 신호**다 — 작업을 고쳐라, 테스트를 고치지 말고(단, 파일 경로 이동에 따른 읽기 경로 갱신은 P6에서 명시된 대로 허용).

## 13.4 브라우저 최종 체크리스트

`node scripts/dev-start.mjs` URL에서:

1. 게스트 진입 → 홈 렌더(캐릭터/스트릭/카드), 콘솔 에러 0.
2. 위클리 스트릭 날짜 클릭 → 운동 탭 열림(WP0.1 회귀).
3. 운동 탭: 월 그리드 → 데이 시트 열기 → 세트 추가/수정(커스텀 키패드) → 완료 토글 → 시트 닫기.
4. 식단 탭: 영양 검색 → 항목 추가(WP0.5 회귀) → 끼니 합계 표시.
5. 캘린더 탭: 모드 전환, 데이 모달 열기/닫기.
6. 통계 탭: 요약 KPI·차트·피로도·볼륨 섹션 렌더, 기간 전환.
7. 요리 탭: 목록·모달 열기, 1인분 계산(WP3.5 회귀).
8. 모달 위 confirm 열고 닫기 → 스크롤 락 정상(WP0.3 회귀), Tab 트랩 정상(WP0.2 회귀).
9. 라이트/다크 전환 후 시즌 화면(WP8.2 회귀).
10. 더보기 메뉴·빌드 정보 패널·업데이트 배너 표시(WP7.4 회귀).

---

# Part D — 부록

## 14.1 이 계획이 수정하는 발견 사항 요약

| # | 발견 | 처리 WP |
|---|---|---|
| 1 | `_takeWorkoutTargetSessionIndex` 미정의 ReferenceError | WP0.1 |
| 2 | 포커스 트랩 2중 활성 | WP0.2 |
| 3 | body 스크롤 락 소유자 3곳 충돌 가능 | WP0.3 |
| 4 | window 브리지 자기 호출 | WP0.4 |
| 5 | `window[key]` 무한 전역 누수 + 게이트 회피 | WP0.5 |
| 6 | 죽은 모듈 sheet.js/format.js/form-guard.js/api 디렉터리(키 포함) | WP1.1-1.3 |
| 7 | 도달 불가 설정/내보내기 모달 | WP1.4 |
| 8 | 통계 요약 ~120줄 이중 구현 | WP4.2 |
| 9 | feature-diet-plan 15필드 이중 조립 | WP3.5 |
| 10 | CSS-in-JS 2곳(90줄+190줄), 설치 배너 초록 fallback | WP8.4-8.6 |
| 11 | 캐스케이드 선언/현실 불일치, 소유권 미선언 2파일 | WP8.7, WP9.1 |
| 12 | seasons.css 비토큰 팔레트 | WP8.2 |
| 13 | runtime-assets의 seasons.css 드리프트 | WP9.2 |

## 14.2 기록만 하고 이번에 손대지 않는 것 (후속 과제 후보)

- **BMR/TDEE 클라·서버 이중 구현**: `calc.js`(분할 후 `calc/diet.js`)와 `functions/dashboard/aggregate.js:108,120`이 같은 공식을 독립 구현. `functions/` 수정 금지 원칙 때문에 유지 — 식단 지표 공식을 바꾸는 미래 작업은 반드시 양쪽을 함께 검토해야 한다.
- **`fatsecret-api.js` 이름 오해**: FatSecret 연동이 없다(CSV + 식약처 공공 API + OpenFoodFacts). 파일명 교체는 4개 importer + manifest + 테스트 연쇄가 있어 이번 범위에서 제외.
- **식품 API 키의 클라이언트 노출**(`config.js:42`): 서버 프록시 전환(Functions)이 정석이나 Functions 배포가 금지된 환경 — 전용 개발 프로젝트 ID가 생기는 시점의 과제.
- **소스 CSS 프리캐시 이중화**: `runtime-assets.js`가 `style.css`와 44개 소스 CSS를 모두 프리캐시(약 750KB 중복). WebView 스테일 캐시 대비책일 가능성이 있어 제거는 별도 검증 필요.
- **인라인 style 속성 ~1,000곳**(home/ 356, admin/ 272, modals/ 230…): 토큰은 쓰고 있어 테마는 깨지지 않으나 소유권 계약 밖. 게이트(증가 방지 테스트) 신설을 포함해 별도 과제.
- **tm2 토큰 이중 스케일**: `test-mode-v2.css:12-21`이 `--tm2-*`로 앱 토큰을 복제. 통합은 성장 보드 전체 회귀가 필요해 제외.
- **죽은 선택자 상한 ~607개**: WP8.1의 확정분 외 나머지는 템플릿 조립 클래스 위험 때문에 자동 삭제 불가 — 수동 감사 과제.
- **CI에 테스트 없음**: `deploy.yml`은 거버넌스/자산 검증만 실행하고 `npm test`를 돌리지 않는다(로컬 전용). CI 강화는 별도 결정 사항.
- **CDN 의존(Chart.js, Sortable)**: 오프라인에서 통계 차트/드래그가 죽는 구조적 이슈 — 별도 과제.

## 14.3 이 계획으로 늘어나는 파일 (manifest 등록 대상 총람)

- `calc/`: shared, diet, cycle, workout, social (5)
- `stats/`: format, day-aggregates, fatigue-model, analysis-range, weekly-series, health-series, raw-export, summary-model (8)
- `calendar/`: format, gesture-policy, export-text, day-metrics, workout-read-model, detail-template, session-state, sheet-state, set-keyboard (9)
- `auth/`: login-screen, login-actions, signup (3) · `social/`: guild-picker, guild-modal (2) · 루트: feature-letters, feature-diet-setup (2)
- `app/`: owner-blocked-overlay, shell-actions, workout-gestures, deep-link-entry (4)
- `config/`: movements (1) · `utils/`: escape-html, number, wear-refresh, apk-install (4)
- `styles/features/`: nutrition-item-modal.css, diet-premium-report.css (2)
- 테스트 헬퍼: `tests/helpers/source-utils.js` (manifest 불요)

삭제되는 파일: sheet.js, utils/format.js, utils/form-guard.js, utils/dom.js, api/food-search.js, modals/settings-modal.js, modals/export-modal.js.

# 운영 운동기록 복원 및 overwrite 재발 방지 계획

## 상태

- Status: Execution in progress
- 요청: 운영계에 입력한 운동기록이 개발계 테스트 중 여러 번 덮어써져 일부 유실된 것으로 보여, 복원 가능성을 확인하고 데이터 분기 없이 재발 방지한다.
- 원칙: 활성 데이터는 기존 `users/{uid}/workouts/{date}` 단일 경로를 유지한다. 별도 개발 DB/운영 DB 분기는 만들지 않는다.

## 진단 요약

- Firebase 설정은 단일 프로젝트 `exercise-management`를 사용한다. 개발 체크아웃에서 운영 계정으로 로그인하면 같은 운영 Firestore에 쓴다.
- `data/data-core.js`의 `_doc(name, id)`는 `users/{getDataOwnerId()}/{name}/{id}`에 쓴다. `김_태우(guest)`는 `getDataOwnerId()`에서 `김_태우`로 매핑된다.
- 현재 주요 운동 저장 경로 `workout/save.js`는 `saveDay(ctxKey, payload, { mode: 'merge' })`를 사용해 운동/식단 필드 간 overwrite 위험을 줄여 둔 상태다.
- 아직 위험한 레거시 호출이 남아 있다.
  - `sheet.js`: `saveDay(dateKey(y,m,d), {...})`를 기본 `replace` 모드로 호출한다.
  - `render-cooking.js`: 레시피 소급 업데이트에서 `saveDay(dateKey, updatedDay)`를 기본 `replace` 모드로 호출한다.
- `data/data-save.js`의 기본값은 `mode = 'replace'`라서 위 호출은 `workouts/{date}` 문서 전체를 덮어쓴다. payload에 없는 `workoutSessions`, `workoutDuration`, `workoutTimeline`, `workoutPhoto`, snack/photo 세부 필드, 최신 운동 메타가 삭제될 수 있다.
- `render-calendar.js`와 `workout/expert/max.js`의 현재 호출은 `mode: 'merge'`라서 같은 유형의 전체 덮어쓰기 후보는 아니다.

## 복원 가능성

복원은 조건부 가능하다. Firestore는 일반 클라이언트 코드만으로 과거 문서 버전을 자동 조회할 수 없으므로, 유실 전 원본을 찾을 수 있어야 완전 복원이 가능하다.

우선 확인할 후보:

1. 현재 `users/{ownerId}/workouts` 문서와 `users/{ownerId}(guest)/workouts` 문서의 field-level 비교.
2. 과거 root `workouts` 레거시 컬렉션에 남은 문서.
3. 기존 `exports/` CSV 또는 사용자가 따로 보관한 export/백업.
4. overwrite 전 브라우저 오프라인 캐시가 남아 있는 기기. 이 경우 앱을 열어 동기화하지 말고 먼저 별도 추출이 필요하다.
5. Firebase 콘솔/Google Cloud의 Firestore export 또는 PITR 백업이 켜져 있다면 해당 백업.

복원 실행 전에는 현재 운영 문서를 먼저 append-only 백업으로 저장하거나 JSON 파일로 export한다. 실제 복원 write는 사용자가 대상 계정과 날짜 범위, 사용할 원본 후보를 승인한 뒤에만 한다.

## 실행 슬라이스

### Slice 1: read-only 복원 감사 도구

- Status: Planned
- Scope:
  - 계정 id, 날짜 범위, optional guest/root 후보를 입력받아 `workouts` 문서를 read-only로 비교한다.
  - 날짜별로 운동 필드가 비어졌는지, 식단/사진/운동 세션이 어느 후보에 남아 있는지 보고서를 만든다.
  - write는 하지 않는다.
- Likely files:
  - `scripts/audit-workout-restore-candidates.mjs`
  - `docs/ai/features/2026-06-26-workout-data-restore-write-guard.md`
- Verification:
  - `node --check scripts/audit-workout-restore-candidates.mjs`
  - 감사 명령 실행 후 JSON/CSV 보고서가 생성되고 Firestore write 호출이 없는지 source check.

### Slice 2: workouts 전체 replace 차단

- Status: Completed on 2026-06-26
- Scope:
  - `sheet.js`의 저장을 `mode: 'merge'` 또는 현재 운동 저장 API로 전환한다.
  - `render-cooking.js` 소급 업데이트는 변경된 식단 필드만 patch로 만들어 `mode: 'merge'` 저장한다.
  - `data/data-save.js`에 `workouts` 저장 기본 replace 사용을 제한하는 guard를 추가한다. 전체 replace가 정말 필요한 경우는 명시 옵션을 요구한다.
  - bare `saveDay(...)` 호출이 새로 들어오면 실패하는 정적 테스트를 추가한다.
  - `sw.js`의 `CACHE_VERSION`을 bump한다.
- Likely files:
  - `data/data-save.js`
  - `sheet.js`
  - `render-cooking.js`
  - `tests/workout-save-mode-guard.test.js`
  - `sw.js`
- Verification:
  - `node --check data/data-save.js sheet.js render-cooking.js sw.js`
  - `node --test tests/workout-save-mode-guard.test.js`
  - `node --test .\tests\*.test.js`
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
  - Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

#### 실행 결과

- `data/data-save.js`의 `saveDay()` 기본값을 `merge`로 바꾸고, `replace`는 `allowReplace:true` 없이는 차단하도록 했다.
- `sheet.js`의 레거시 저장을 `{ mode: 'merge', rethrow: true }`로 명시했다.
- `render-cooking.js` 레시피 소급 업데이트는 전체 day 객체가 아니라 식단 field patch만 merge 저장하도록 바꿨다.
- `tests/workout-save-mode-guard.test.js`를 추가해 runtime `saveDay()` 호출이 merge mode를 명시하는지 검사한다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260626z13-workout-save-merge-guard`로 bump했고 캐시 버전 참조 테스트를 갱신했다.

#### 로컬 검증

- PASS: `node --check data/data-save.js; node --check sheet.js; node --check render-cooking.js; node --check sw.js; node --check tests/workout-save-mode-guard.test.js`
- PASS: `node --test tests/workout-save-mode-guard.test.js tests/workout-save.test.js tests/workout-sessions.test.js` — 11 tests passed.
- PASS: `node --test .\tests\*.test.js` — 549 tests passed.
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`.
- PASS: `git diff --check`.

### Slice 3: 단일 데이터 경로 보호 메타/백업

- Status: Planned
- Scope:
  - 활성 데이터는 계속 `users/{uid}/workouts/{date}` 하나만 사용한다.
  - 저장 직전 기존 문서의 최소 snapshot을 append-only 백업 컬렉션이나 로컬 export에 남기는 옵션을 추가한다.
  - 저장 payload에 `lastWriteMeta` 같은 출처 정보를 남겨 운영 URL/개발 URL/빌드 버전/저장 모드를 추적한다.
  - 개발 체크아웃이 운영 계정에 쓰려 할 때 명시 확인 또는 read-only 전환을 검토한다. 단, 데이터 경로 자체는 분기하지 않는다.
- Likely files:
  - `data/data-save.js`
  - `utils/build-info.js`
  - `tests/workout-save-mode-guard.test.js`
  - `sw.js`
- Verification:
  - 저장 메타가 merge로만 추가되고 기존 운동/식단 필드를 삭제하지 않는 순수 테스트.
  - 배포 URL에서 write source marker가 현재 빌드와 일치하는지 확인.

### Slice 4: 승인된 날짜만 field-level 복원

- Status: Blocked by user data
- Required input:
  - 복원 대상 계정 id.
  - 의심 날짜 범위.
  - 사용할 원본 후보: guest/root/export/PITR/브라우저 캐시 중 무엇인지.
- Scope:
  - Slice 1 보고서를 바탕으로 날짜별 patch를 만든다.
  - 현재 운영 문서를 먼저 백업한다.
  - 삭제된 운동 필드만 merge 복원한다. 확실하지 않은 필드는 덮어쓰지 않고 보고서에 남긴다.
- Verification:
  - 복원 전/후 날짜별 운동 세션 수, 세트 수, duration, 주요 메타 diff.
  - 배포 URL에서 대상 날짜 UI flow 확인.

## 지금 필요한 사용자 확인

복원 조사를 시작하려면 대상 계정 id와 날짜 범위가 필요하다. 예: `김_태우`, `2026-06-20..2026-06-26`.

## 2026-06-26 read-only 조사: 이번 주 운동기록 계정

- 기준: KST 월요일 시작 주간 `2026-06-22`부터 `2026-06-28`.
- 방법: Firestore REST API로 `_accounts`, `users/{ownerId}/workouts/{date}`, `_weekly_ranking/current`를 read-only 조회했다. write 없음.
- 현재 날짜별 문서 기준 실제 운동 활동 owner:
  - `김_태우` / 문정토마토: `2026-06-23`, `2026-06-24`, `2026-06-25` 총 3일.
    - `2026-06-23`: exercises 5, sessions 1, sets 30, duration 7200초.
    - `2026-06-24`: exercises 4, sessions 2, sets 32, duration 6684초.
    - `2026-06-25`: exercises 2, sessions 3, sets 5, duration 8초.
  - `최_준수` / 줍스: `2026-06-23`, `2026-06-24` 총 2일.
    - `2026-06-23`: exercises 5, sets 22, duration 6557초.
    - `2026-06-24`: exercises 5, sets 20, duration 444초.
- `김_태우(guest)` owner 경로에는 이번 주 workout 문서가 없었다. 다만 앱/랭킹 후보 로직은 guest 계정을 `김_태우` owner와 연결하므로 화면/랭킹에서는 같은 사람으로 보일 수 있다.
- `_weekly_ranking/current` 캐시 기준:
  - `weekStart`: `2026-06-22`
  - `updatedAt`: `2026-06-26T07:05:26.834Z` / KST `2026-06-26 16:05:26`
  - `김_태우`: 5일
  - `최_준수`: 4일
- 해석:
  - 랭킹 캐시는 현재 문서 직접 조회보다 활동일 수가 많다.
  - 이는 `2026-06-22` 또는 `2026-06-26` 주변 문서가 랭킹 집계 시점에는 active였고 이후 replace 저장 등으로 운동 필드가 비워졌을 가능성을 시사한다.
  - 랭킹 캐시는 세트/종목 원문을 담지 않으므로 완전 복원 소스는 아니지만, 유실 의심 날짜를 좁히는 단서로 쓸 수 있다.

## 2026-06-26 PITR 상세 복원 조사

- Firestore REST `readTime` read-only 조회로 `users/김_태우/workouts/2026-06-26`의 과거 버전을 확인했다.
- `readTime=2026-06-26T07:00:00Z` / KST `2026-06-26 16:00:00`:
  - active workout source 있음.
  - top-level `exercises` 5개, `workoutSessions` 1개, 총 set 31개.
  - 주요 종목: `케이블`, `케이블 크런치`, `행잉 레그 레이즈`, `바벨 벤치프레스`, `인클라인 스미스 벤치프레스`, session 안 `스모데드`.
- `readTime=2026-06-26T07:04:00Z`부터 현재와 같은 빈 운동 상태가 확인됐다.
- 시간대별 PITR 스캔 결과:
  - `김_태우 / 2026-06-26`: 상세 복원 가능.
  - `김_태우 / 2026-06-22`: active workout source 없음.
  - `최_준수 / 2026-06-22`, `2026-06-25`, `2026-06-26`: active workout source 없음.
- 해석:
  - 확실히 상세 복원 가능한 손상 문서는 `김_태우 / 2026-06-26` 하나다.
  - 랭킹 캐시의 추가 활동일은 식단까지 active로 세는 서버 함수 때문에 운동일로 보정하면 안 된다.

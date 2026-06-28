# 홈 트레이너 NPC 퀘스트 모달 계획

## 상태

- 단계: implemented
- 요청: 홈 화면 라이프존의 트레이너 NPC 전구 버튼을 누르면 메이플스토리 NPC 퀘스트 창을 참고한 모달을 띄운다. UI는 복제하지 않고 TDS 디자인 시스템과 토마토 컬러톤을 따른다.
- 결정: 이번 변경은 `Slice 1. 트레이너 NPC 퀘스트 모달과 통계 보기`만 실행한다.

## 그릴 결과

### 핵심 질문 1. 모달은 어떤 흐름을 가져야 하는가?

- 코드 확인:
  - `home/life-zone.js`는 이미 전구 버튼에서 `life-zone:npc-quest` 이벤트를 발생시키고 `detail: { npc: 'trainer' }`를 전달한다.
  - 현재는 이 이벤트를 받아 모달을 여는 전역 연결이 없다.
- 결정:
  - 기존 전구 버튼과 커스텀 이벤트는 유지한다.
  - `app.js` 또는 홈 초기화 경로에서 `life-zone:npc-quest`를 받아 `openTrainerQuestModal()`을 호출한다.
  - 모달 첫 화면에는 트레이너가 `무엇을 도와드릴까요?`라고 묻고, `완료가능한 퀘스트`와 `기타` 섹션을 분리한다.
  - `완료가능한 퀘스트`는 비활성 행으로 `업데이트 예정` 상태를 보여준다.
  - `기타`의 `내 운동 통계 살펴보기`는 클릭 가능하며, 클릭 시 같은 모달 안에서 통계 내용을 보여준다.

### 핵심 질문 2. 통계 탭 정보를 모달에 어떻게 넣을 것인가?

- 코드 확인:
  - `render-stats.js`는 현재 `document.getElementById(...)`와 `document.querySelectorAll(...)` 기준으로 통계 탭의 DOM에 직접 렌더한다.
  - 같은 `id`를 모달 안에 그대로 복제하면 숨겨진 통계 탭 DOM과 충돌할 수 있다.
- 결정:
  - 통계 DOM을 단순 복제하지 않는다.
  - `render-stats.js`에 root-scoped 렌더링 진입점을 추가해, 기존 통계 탭과 모달 전용 root를 분리한다.
  - 모달 통계 화면은 통계 탭의 정보성 영역을 재사용한다: 전체 요약, 건강 지표 차트, 운동 활성 부위, 종목별 볼륨, 심층/트레이너 분석.
  - CSV 내보내기 같은 탭 전용 액션은 이번 모달 정보 화면에 넣지 않는다.
  - Chart.js instance는 canvas 단위로 관리해 통계 탭 차트와 모달 차트가 서로 destroy하지 않게 한다.

### 핵심 질문 3. 모달 UI는 어디에 두고 어떻게 바인딩할 것인가?

- 답변: 기존 모달 주입 시스템을 사용하되, 내부 버튼은 직접 바인딩한다.
- 결정:
  - `modals/trainer-quest-modal.js`를 추가하고 `modal-manager.js`의 `MODALS`에 등록한다.
  - 모달 sheet 내부는 `event.stopPropagation()`을 쓰더라도 버튼이 동작하도록 inline `onclick`에 기대지 않고 module 함수에서 직접 바인딩한다.
  - TDS/Tomato 톤의 카드형 섹션, 작은 NPC rail, 비활성 quest row, 클릭 가능한 기타 row를 `style.css`에 추가한다.
  - `style.css`, `app.js`, `modal-manager.js`, `render-stats.js`는 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 반드시 bump한다.
  - 새 `modals/trainer-quest-modal.js`도 `sw.js` `STATIC_ASSETS`에 추가한다.

## 구현 슬라이스

### Slice 1. 트레이너 NPC 퀘스트 모달과 통계 보기

- 상태: implemented
- 목표: 홈 라이프존 트레이너 전구 버튼 클릭 시 TDS/Tomato 퀘스트 모달을 열고, `내 운동 통계 살펴보기` 클릭 후 통계 탭의 주요 정보를 같은 모달 안에 렌더한다.
- 예상 변경:
  - `modals/trainer-quest-modal.js`: 모달 HTML, 열기/닫기, 첫 화면/통계 화면 전환, 내부 버튼 직접 바인딩
  - `modal-manager.js`: trainer quest modal 등록
  - `app.js`: `life-zone:npc-quest` 이벤트 수신 및 modal open 연결
  - `render-stats.js`: root-scoped 통계 렌더링 진입점과 DOM 조회 helper, modal용 통계 markup 생성
  - `style.css`: trainer quest modal, quest rows, modal stats layout 스타일
  - `sw.js`: `CACHE_VERSION` bump 및 새 modal asset 등록
  - `tests/*`: NPC event-to-modal, modal markup/action, scoped stats render, cache marker 회귀 테스트
- 범위 제외:
  - 트레이너 NPC 이미지/스프라이트 신규 제작
  - 완료 가능한 실제 퀘스트 데이터 연결
  - 통계 탭 자체의 정보 구조 재디자인
  - CSV 내보내기 버튼을 모달로 이동
  - `www/` 직접 수정
- 검증:
  - `node --check app.js render-stats.js modal-manager.js modals/trainer-quest-modal.js sw.js`
  - `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js`
  - 전체 테스트 가능 시 `node --test @tests`
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
  - Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
  - 배포 URL에서 홈 탭 -> 트레이너 전구 -> `내 운동 통계 살펴보기` -> 모달 내부 통계 정보 표시 flow 확인. 인증 세션이 없어 막히면 `not verified yet`과 blocker를 기록한다.

## 다음 세션 시작 기준

Slice 1 구현과 리뷰는 완료했다. 배포 URL에서 인증 세션 없이 홈 UI 클릭 flow가 막히면 `not verified yet`으로 남기고, 인증 계정에서 홈 탭 -> 트레이너 전구 -> `내 운동 통계 살펴보기` -> 모달 내부 통계 표시를 확인한다.

## 실행 결과

- `modals/trainer-quest-modal.js`: 트레이너 NPC 퀘스트 모달을 추가했다. 첫 화면은 `무엇을 도와드릴까요?`, `완료가능한 퀘스트` 업데이트 예정, `기타`의 `내 운동 통계 살펴보기` 액션으로 구성했다.
- `app.js`: 기존 `life-zone:npc-quest` 이벤트를 받아 trainer 모달을 열도록 연결했다. 전역 모달 open/close 시 `aria-hidden`도 동기화한다.
- `render-stats.js`: 통계 탭 렌더러를 root-scoped 조회로 확장하고 `renderTrainerQuestStats(root)`를 추가해 모달 내부에서 전체 요약, 건강 지표 차트, 운동 활성 부위, 볼륨 추이, 트레이너 분석을 재사용한다.
- `modal-manager.js`: trainer quest modal을 동적 주입 목록에 등록했다.
- `style.css`: TDS/Tomato 톤의 trainer quest sheet, row, stats container 스타일을 추가했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z8-trainer-quest-modal`로 bump하고 새 modal asset을 `STATIC_ASSETS`에 추가했다.
- `tests/trainer-quest-modal.test.js`: 모달 구조, 홈 이벤트 연결, scoped stats render, SW asset 등록 회귀 테스트를 추가했다.
- 기존 SW cache marker 테스트들을 새 cache version으로 갱신했다.

## 실행 검증

- PASS: `node --check app.js; node --check render-stats.js; node --check modal-manager.js; node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js` — 16 tests passed
- PASS: `node --test @tests` — 580 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=848`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 및 인증 계정 실제 UI 클릭 flow 확인은 커밋/푸시 후 수행한다.

## 리뷰 결과

- 리뷰 문서: `docs/ai/reviews/2026-06-28-home-trainer-npc-quest-modal-review.md`
- 결과: 발견된 차단 이슈 없음.

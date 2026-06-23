# 운동탭 캘린더 홈 개편 계획

## 요청 원문 요약

- 운동탭 진입 시 `일반/프로/테스트/성장 보드` 선택 카드를 더 이상 첫 진입점으로 쓰지 않는다.
- 일반/프로/테스트 모드는 다음 슬라이스 개편 때 통합할 예정이며, 이번 작업에서는 방향성만 반영한다.
- 운동탭 첫 화면은 기존 캘린더 탭 안의 `운동` 캘린더를 바로 보여준다.
- 캘린더 색상과 셀 구조는 두 번째 참고 이미지처럼 얇은 월간 그리드, 좌측 주차 레일, 시간/세트/부위 라벨 중심으로 바꾼다.
- 특정 날짜를 누르면 기록이 있는 날은 세 번째 참고 이미지처럼 운동 기록 화면을, 기록이 없는 날은 네 번째 참고 이미지처럼 빈 상태를 보여준다.
- 기록 카드는 현재 테스트모드에서 구현된 접기/펼치기 카드 형식을 우선 재사용한다.
- 참고 이미지 중 아직 백엔드적으로 구현되지 않은 것은 먼저 리스트업하고 사용자 확인 후 구현한다.

## 이해한 내용

- 목표:
  - 운동탭을 “모드 선택 → 기록” 구조에서 “월간 운동 캘린더 → 날짜별 기록/추가” 구조로 전환한다.
  - 현재 캘린더 탭의 운동 세그먼트를 운동탭 내부의 기본 진입 화면으로 옮긴다.
  - 기존 운동 기록 저장 구조와 테스트모드 카드 자산을 최대한 재사용하되, 회차별 기록은 새 데이터 계약이 필요하다.
- 비목표:
  - 일반/프로/테스트 모드의 완전 통합은 이번 계획의 첫 실행 범위가 아니다.
  - 캘린더 탭의 `종합` 화면과 운동탭 캘린더를 합치는 작업은 이번 범위가 아니다.
  - `www/` 산출물 직접 수정, 배포/푸시는 하지 않는다.
- 사용자 흐름:
  1. 하단 `운동` 탭 클릭
  2. 운동 월간 캘린더가 즉시 표시됨
  3. 날짜 선택
  4. 기록 있음: 날짜 상세 화면에서 운동 시간, 총 세트, 총 볼륨, 운동 카드, 회차 탭, `+` 추가 버튼 노출
  5. 기록 없음: 같은 상세 화면에서 빈 상태와 회차 탭, `+` 추가 버튼 노출
- 데이터 가정:
  - 기존 `workouts/{YYYY-MM-DD}` 문서는 날짜 단위 단일 운동 필드(`exercises`, `workoutDuration`, `maxMeta`, `workoutPhoto` 등)를 가진다.
  - 현재 `workoutSessions` 또는 회차별 canonical 배열은 없다.
  - 기존 날짜 문서는 새 구조 도입 시 `1회차`로 해석해야 한다.
- 열려 있는 질문:
  - 해결됨. 이후 회차 저장 슬라이스에서 `workoutSessions` 도입 방향으로 진행한다.

## 그릴 결과

- 적용 트리거: `/grill-me`
- 핵심 질문: 사진 3/4의 `1회차/2회차/3회차`를 이번 개편에서 실제 데이터 모델로 분리 저장할까요?
- 추천 답변: 예. 같은 `workouts/{date}` 문서 안에 `workoutSessions` 배열을 추가하고, 기존 top-level 운동 필드는 호환용 집계/레거시 필드로 유지한다.
- 사용자 답변: 승인. 결정해야 하는 사항은 제안안으로 진행.
- 확정된 결정:
  - 운동탭의 기존 모드 선택 카드 첫 진입은 deprecated 방향으로 처리한다.
  - 운동탭 기본 화면은 운동 캘린더다.
  - 기존 캘린더 운동 계산 로직은 재사용하거나 공용 모듈로 추출한다.
- 남은 가정:
  - Slice 1~3은 기존 날짜 단위 기록을 `1회차`로 표시하는 호환 UI로 먼저 진행하고, Slice 4에서 실제 `workoutSessions` 저장 모델을 도입한다.

## 현재 코드 탐색 결과

- 이미 있는 것:
  - `render-calendar.js`에 `summary/workout` 모드가 있고, `_renderWorkoutCalendar()`가 월간 운동 시간/세트/볼륨/소모 kcal/부위 라벨을 표시한다.
  - `render-calendar.js`의 `_openWorkoutDay()`가 운동 기록 상세 모달을 표시한다.
  - `workout/test-v2/board-render.js`에 테스트모드 운동 카드와 접기/펼치기, 세트 입력, 저장 흐름이 있다.
  - `workout/save.js`는 `saveDay(..., { mode: 'merge' })`로 운동 필드만 저장하고 식단 사진 필드를 보존하는 구조다.
- 이번 작업에서 바꿔야 할 것:
  - `workout/expert.js`의 `_renderWorkoutModeEntry()`가 운동탭 첫 화면을 차지하므로 첫 진입에서는 숨기거나 보조 액션으로 낮춰야 한다.
  - `index.html`의 `#tab-workout`은 현재 날짜 네비게이션과 직접 기록 폼이 바로 노출되는 구조라, 캘린더 홈/날짜 상세/기록 편집 상태가 필요하다.
  - `render-calendar.js`의 운동 캘린더 로직은 캘린더 탭에 묶여 있어 운동탭에서도 쓰려면 공용 모듈화가 필요하다.
  - `style.css`의 `.cal-workout-*` 디자인은 첫 번째 이미지에 가까우며, 두 번째 이미지의 얇은 그리드/좌측 주차 레일/하단 선택 패널과는 다르다.

## 백엔드 구현 또는 사용자 확인 필요 목록

1. 회차별 운동 기록
   - 현재 없음.
   - 제안: `workouts/{date}.workoutSessions[]` 추가.
   - 기존 top-level `exercises`, `workoutDuration`, `running/cf/swimming/stretching`, `memo`, `workoutPhoto`, `maxMeta`는 구버전 소비자를 위해 집계 또는 `1회차` mirror로 유지한다.
   - 확인 필요: top-level 필드를 “전체 회차 집계”로 둘지, “현재 선택 회차 mirror”로 둘지 결정해야 한다.

2. 회차별 삭제
   - 현재 날짜 전체 운동 필드를 지우는 전용 UI/계약이 없다.
   - 제안: 선택 회차만 삭제하고, 식단/체중/사진 필드는 보존한다. 마지막 회차 삭제 시 top-level 운동 필드는 빈 상태로 merge 업데이트한다.
   - 확인 필요: `삭제` 버튼이 선택 회차만 삭제인지, 그 날짜의 모든 운동 기록 삭제인지.

3. 회차별 내보내기
   - 현재 운동 상세 화면 전용 내보내기 계약이 없다. 통계 CSV 내보내기와 별개다.
   - 제안: 우선 선택 회차 텍스트 공유/클립보드 복사로 구현하고, CSV/이미지 내보내기는 후속으로 둔다.
   - 확인 필요: 사용자가 원하는 `내보내기` 형식.

4. `15번째 기록`, `93일 전` 같은 헤더 메타
   - 별도 백엔드는 필요 없고 `getCache()`에서 운동 기록 날짜를 계산하면 된다.
   - 회차 모델이 생기면 “n번째 기록” 기준을 날짜 기준으로 할지 회차 기준으로 할지 확인이 필요하다.

5. `루틴` 버튼
   - 프로모드 루틴 템플릿/성장 보드 기능은 이미 일부 존재한다.
   - 확인 필요: 새 상세 화면의 `루틴`은 기존 프로 루틴 템플릿으로 갈지, 성장 보드로 갈지, 단순히 기존 운동 추가 피커를 열지.

6. 운동 카드 썸네일
   - 기존 운동 라이브러리/테스트모드 카드가 가진 이미지가 있으면 재사용 가능하다.
   - 없는 종목의 이미지 생성/저장은 별도 백엔드가 아니라 자산/메타 보강 문제로 후속 처리한다.

## 결정 기록

- 결정: 새 운동탭 홈은 `render-calendar.js`의 기존 운동 캘린더를 복붙 확장하지 않고, 공용 렌더러로 추출하거나 얇은 wrapper로 공유한다.
- 이유: 캘린더 탭과 운동탭의 월간 운동 요약이 서로 다른 계산을 하게 되면 부위/세트/소모 kcal가 틀어질 수 있다.
- 되돌릴 수 있는가: 예. 공용 모듈을 다시 `render-calendar.js` 내부로 되돌릴 수 있지만, 중복을 줄이는 쪽이 유지보수에 낫다.

## 실행 슬라이스

### 슬라이스 1: 운동탭 캘린더 홈 진입

- 목표:
  - 운동탭 진입 시 기존 모드 선택 카드 대신 운동 캘린더를 첫 화면으로 보여준다.
- 범위:
  - 기존 `render-calendar.js` 운동 캘린더 계산/렌더를 공용 함수로 분리하거나 운동탭에서 호출할 수 있게 한다.
  - `#tab-workout`에 캘린더 홈 컨테이너를 추가한다.
  - `switchTab('workout')`에서 운동 캘린더 홈을 렌더한다.
  - 기존 일반/프로/테스트/성장보드 카드는 첫 진입 화면에서 숨기고, 기능 자체는 제거하지 않는다.
- 예상 수정 파일:
  - `index.html`
  - `app.js`
  - `render-calendar.js`
  - 신규 후보: `workout/calendar-home.js`
  - `workout/expert.js`
  - `style.css`
  - `sw.js`
- 수정하지 말 것:
  - 회차별 저장 구조
  - 일반/프로/테스트 완전 통합
  - 캘린더 `종합` 탭
- 구현 메모:
  - `STATIC_ASSETS` 대상인 `index.html`, `app.js`, `render-calendar.js`, `style.css`를 수정하면 `sw.js` `CACHE_VERSION`을 반드시 bump한다.
  - 기존 모드 진입 함수는 삭제하지 않고 deprecated 보조 진입으로 남긴다.
- 검증 방법:
  - `node --check app.js`
  - `node --check render-calendar.js`
  - 신규 JS가 있으면 `node --check <file>`
  - `node --check sw.js`
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
  - `npm.cmd run dev` 후 실제 URL HTTP 200
  - 하단 `운동` 탭 클릭 시 운동 캘린더가 첫 화면으로 보이고 기존 모드 카드가 먼저 보이지 않는지 확인
- 완료 증거:
  - 운동탭 첫 화면 스크린샷/DOM에서 월간 운동 캘린더 존재
  - 일반/프로/테스트/성장보드 카드가 첫 진입점으로 노출되지 않음
- 다음 세션 시작 프롬프트:
  - `docs/ai/features/2026-06-23-workout-tab-calendar-home.md`의 슬라이스 1을 실행한다. 앱 코드를 수정하고, 완료 후 `NEXT_ACTION.md`를 review 상태로 갱신한다.

### 슬라이스 2: 캘린더 디자인 재작업

- 목표:
  - 운동 캘린더를 두 번째 참고 이미지 스타일에 가깝게 만든다.
- 범위:
  - 얇은 월간 그리드, 좌측 주차 레일, 주별 시간/세트 요약, 연한 배경, 세로 구분선, 작은 바 라벨 적용.
  - 선택 날짜 하단 패널을 추가한다.
  - 첫 번째 이미지의 월 요약 카드는 유지하되, 새 그리드와 충돌하지 않게 조정한다.
- 예상 수정 파일:
  - `workout/calendar-home.js` 또는 공용 캘린더 모듈
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
- 수정하지 말 것:
  - 날짜 상세 화면의 카드 구조
  - 회차별 저장 구조
- 구현 메모:
  - 모바일 폭에서 날짜 숫자, 시간/세트/부위 라벨이 셀 밖으로 넘치지 않게 고정 높이/overflow를 둔다.
  - 일요일/토요일 색상은 참고 이미지처럼 약하게 유지한다.
- 검증 방법:
  - 360px와 768px 뷰포트에서 캘린더 텍스트 겹침 없음
  - 월 이동과 오늘 이동 동작 확인
  - 운동 기록 없는 날짜에도 셀 높이/그리드가 안정적인지 확인
- 완료 증거:
  - 두 번째 이미지와 같은 구조의 얇은 운동 캘린더가 운동탭에 표시됨

### 슬라이스 3: 날짜 상세 화면

- 목표:
  - 날짜 클릭 시 기록 있음/없음 상세 화면을 세 번째/네 번째 이미지처럼 보여준다.
- 범위:
  - 선택 날짜 상세 view state 추가.
  - 기록 있음: 운동 시간, 총 세트, 총 볼륨, 운동 카드 리스트, 접기/펼치기, 삭제/내보내기 placeholder 또는 승인된 동작 연결.
  - 기록 없음: 빈 상태 아이콘/문구, 회차 탭, `+` 추가 버튼.
  - 기존 top-level 날짜 기록은 `1회차`로 표시한다.
- 예상 수정 파일:
  - `index.html`
  - `app.js`
  - `workout/calendar-home.js`
  - `workout/exercises.js` 또는 신규 read-only card helper
  - `style.css`
  - `sw.js`
- 수정하지 말 것:
  - 아직 승인되지 않은 회차별 저장
- 구현 메모:
  - 테스트모드 카드 렌더러가 현재 `S.workout.exercises`에 강하게 묶여 있으면 read-only 카드 helper를 작게 분리한다.
  - 날짜 상세에서 `+`는 기존 운동 기록 편집 흐름으로 들어가게 하되, 회차 모델 전에는 `1회차`만 지원한다.
- 검증 방법:
  - 기록 있는 날짜 클릭: 카드 리스트 표시, 접기/펼치기 동작
  - 기록 없는 날짜 클릭: 빈 상태 표시, `+`로 기존 추가 흐름 진입
  - 뒤로/캘린더 복귀 동작
- 완료 증거:
  - 사진 3/4의 핵심 UI 상태가 운동탭에서 재현됨

### 슬라이스 4: 회차별 저장 모델

- 목표:
  - 하루 여러 회차 운동을 실제 데이터로 분리 저장한다.
- 범위:
  - `workoutSessions` 데이터 모델 추가.
  - 기존 날짜 기록을 `1회차` synthetic session으로 읽는 fallback.
  - 회차 추가/선택/저장/삭제.
  - top-level 운동 필드 호환 유지.
  - `WORKOUT_PAYLOAD_KEYS`와 저장 테스트 업데이트.
- 예상 수정 파일:
  - `workout/state.js`
  - `workout/load.js`
  - `workout/save.js`
  - `workout/save-schema.js`
  - `data.js` 또는 `data/data-save.js` 필요 시
  - `workout/calendar-home.js`
  - `tests/save-schema.test.js`
  - 신규 테스트 후보: `tests/workout-sessions.test.js`
  - `sw.js`
- 수정하지 말 것:
  - 식단 저장 구조
  - Firestore 직접 호출
- 구현 메모:
  - `setDoc` 전체 덮어쓰기 위험을 피하기 위해 반드시 `saveDay(..., { mode: 'merge' })` 경로를 쓴다.
  - 사진 필드 `bPhoto`, `lPhoto`, `dPhoto`, `sPhoto`, `workoutPhoto` 보존을 검증한다.
  - 기존 top-level 소비자(`calcStreaks`, calendar, growth board recent map)가 깨지지 않게 fallback/aggregate를 둔다.
- 검증 방법:
  - 회차 추가 후 reload해 `1회차/2회차` 유지
  - 2회차 삭제 시 1회차와 식단 필드 보존
  - 기존 단일 날짜 기록이 `1회차`로 보임
  - `node --test tests/save-schema.test.js`
  - 신규 회차 테스트 통과
- 완료 증거:
  - 실제 저장된 day cache에 `workoutSessions`가 있고 UI 회차 탭과 동기화됨

### 슬라이스 5: 내보내기/루틴 액션 정리

- 목표:
  - 날짜 상세의 `내보내기`, `루틴`, `삭제`, `+` 액션을 확정된 의미에 맞게 연결한다.
- 범위:
  - 선택 회차 텍스트 내보내기 또는 사용자 승인 형식 구현.
  - `루틴` 버튼을 승인된 기존 루틴/성장보드/운동 추가 흐름으로 연결.
  - `+` FAB를 선택 날짜/선택 회차 기준으로 안정화.
- 예상 수정 파일:
  - `workout/calendar-home.js`
  - `workout/expert.js`
  - `workout/test-v2/entry.js` 필요 시
  - `style.css`
  - `sw.js`
- 수정하지 말 것:
  - 새 리포트/CSV 대규모 기능
- 구현 메모:
  - 액션 버튼은 inline `onclick`보다 `data-action` 위임을 우선한다.
- 검증 방법:
  - 내보내기 결과 확인
  - 루틴 버튼 클릭 대상 확인
  - 삭제 후 캘린더/상세/저장 데이터 동기화 확인
- 완료 증거:
  - 사진 3의 상단 액션들이 실제 동작 또는 명시적 disabled 상태를 가진다.

### 슬라이스 6: 날짜 상세 운동 카드 형태 교체

- 목표:
  - 날짜 상세 운동 카드에서 기존 썸네일/하단 체크형 카드(참고 이미지 1)를 제거한다.
  - 접힌 상태는 테스트모드 요약 카드 형태(참고 이미지 2), 펼친 상태는 세트 행 카드 형태(참고 이미지 3)에 가깝게 표시한다.
- 범위:
  - `render-calendar.js`의 운동 카드 read-only 마크업 변경.
  - `style.css`의 `.wt-day-ex-card` 계열 스타일 교체.
  - 접기/펼치기 상태별 표시 분기 유지.
  - 활동 카드에는 기존 단순 구조를 유지하되 운동 카드의 1번 형태는 사용하지 않는다.
- 수정하지 말 것:
  - 실제 세트 편집 저장 로직.
  - 테스트모드 보드 내부 카드 로직.
- 검증 방법:
  - 기록 있는 운동 카드 collapsed 상태에 썸네일/하단 체크형 UI가 없는지 확인.
  - collapsed 상태는 요약/성과/세트 다시 보기 버튼 중심으로 표시되는지 확인.
  - expanded 상태는 KG/REP/RIR/ROM 세트 행 중심으로 표시되는지 확인.
  - `node --check render-calendar.js`
  - `git diff --check`

## 리뷰 세션 프롬프트

이 계획 문서와 직전 실행 세션의 변경 파일을 읽고 버그, 회귀, 누락된 테스트,
오래된 캐시/서비스워커 이슈, UX 깨짐을 우선 리뷰한다. 리뷰 중에는 새 기능을
구현하지 않는다. 특히 `STATIC_ASSETS` 수정 시 `CACHE_VERSION` bump, 식단/사진 필드
보존, 회차 모델 도입 시 기존 top-level 운동 소비자 호환성을 확인한다.

## 실행 결과

### Slice 1: 운동탭 캘린더 홈 진입

- 상태: 구현 완료, 정적 문법 검증 완료. 브라우저 UI 검증은 not verified yet.
- 변경:
  1. `index.html`: `#tab-workout` 최상단에 `#workout-calendar-root`를 추가하고 기본 상태를 `wt-calendar-home-mode`로 지정했다.
  2. `app.js`: 운동탭 surface를 `home/edit`으로 분리했다. 일반 운동탭 클릭은 캘린더 홈을 렌더하고, `openWorkoutTab(y,m,d)` 같은 날짜 지정 진입은 기존 편집 화면을 유지한다.
  3. `render-calendar.js`: 기존 운동 캘린더 렌더러를 운동탭 홈에서도 호출할 수 있게 `renderWorkoutCalendarHome()`과 전용 window 핸들러(`_wtCal*`)를 추가했다.
  4. `style.css`: 운동탭 홈 모드에서는 기존 날짜 네비/기록 폼/모드 진입 영역을 숨기고 캘린더 홈만 노출하도록 했다.
  5. `sw.js`: `STATIC_ASSETS` 대상 변경 반영을 위해 `CACHE_VERSION`을 `tomatofarm-v20260623-workout-calendar-home`으로 bump했다.
- 검증:
  1. PASS: `node --check app.js`
  2. PASS: `node --check render-calendar.js`
  3. PASS: `node --check sw.js`
  4. PASS: `git diff --check`
  5. BLOCKED: `node scripts/verify-runtime-assets.mjs` — 기존 untracked runtime assets(`home/life-zone*.js`, `assets/nav-icons/*.svg`, `assets/home/life-zone/**`)가 `sw.js`에 참조되어 실패했다. 이번 슬라이스의 새 파일 누락은 없다.
  6. not verified yet: 이 세션 지침상 장기 dev server를 sandbox에서 시작하지 않았으므로 HTTP 200/UI 클릭 플로우는 로컬 일반 터미널에서 확인 필요.

### Slice 2: 캘린더 디자인 재작업

- 상태: 구현 완료, 정적 문법 검증 완료. 브라우저 UI 검증은 not verified yet.
- 변경:
  1. `render-calendar.js`: 운동탭 홈 surface 전용으로 월간 운동 캘린더를 주 단위 행 구조로 렌더하도록 변경했다.
  2. `render-calendar.js`: 좌측 주차 레일에 ISO 주차, 주간 운동 시간, 주간 세트 수를 표시한다.
  3. `render-calendar.js`: 선택 날짜 상태와 하단 선택 바를 추가했다. 날짜 클릭 시 선택 상태를 갱신한 뒤 기존 운동 요약 모달을 연다.
  4. `render-calendar.js`: `루틴` 버튼은 후속 액션 연결 전까지 전용 placeholder handler로 분리했다.
  5. `style.css`: 운동탭 홈 전용 캘린더를 두 번째 참고 이미지처럼 연한 배경, 얇은 세로/가로 라인, 작은 라벨 막대, 좌측 주차 레일, 하단 선택 바 스타일로 조정했다.
  6. `sw.js`: `STATIC_ASSETS` 대상 변경 반영을 위해 `CACHE_VERSION`을 `tomatofarm-v20260623-workout-calendar-design`으로 bump했다.
- 검증:
  1. PASS: `node --check render-calendar.js`
  2. PASS: `node --check sw.js`
  3. PASS: `git diff --check`
  4. BLOCKED: `node scripts/verify-runtime-assets.mjs` — 기존 untracked runtime assets가 `sw.js`에 참조되어 실패했다. 이번 슬라이스의 새 파일 누락은 없다.
  5. PASS: `npm.cmd run dev`가 기존 healthy 서버 `http://localhost:5500`을 재사용했고 `GET /index.html`이 HTTP 200을 반환했다.
  6. not verified yet: 실제 모바일/데스크톱 캘린더 UI 확인은 브라우저 자동화 도구 부재로 미확인.

### Slice 3: 날짜 상세 화면

- 상태: 구현 완료, 정적 문법 검증 완료. 브라우저 UI 검증은 not verified yet.
- 변경:
  1. `render-calendar.js`: 운동탭 홈에서 날짜 클릭 시 월간 캘린더 모달 대신 날짜 상세 화면으로 전환되게 했다.
  2. `render-calendar.js`: 기존 top-level 날짜 운동 기록을 `1회차`로 읽고, 기록 있음/없음 화면을 분기한다.
  3. `render-calendar.js`: 기록 있는 날에는 운동 시간, 총 세트, 총 볼륨, 운동/활동 카드, 접기/펼치기, 상단 액션 버튼을 표시한다.
  4. `render-calendar.js`: 기록 없는 날에는 빈 상태 아이콘/문구, 회차 탭, `+` 추가 버튼을 표시한다.
  5. `style.css`: 세 번째/네 번째 참고 이미지에 맞춘 날짜 상세 헤더, 카드, 빈 상태, 하단 회차 바, FAB 스타일을 추가했다.
  6. `sw.js`: `CACHE_VERSION`을 날짜 상세 슬라이스 기준으로 bump했다.
- 검증:
  1. PASS: `node --check render-calendar.js`
  2. PASS: `node --check workout/sessions.js`
  3. PASS: `node --check sw.js`
  4. PASS: `git diff --check`
  5. BLOCKED: `node scripts/verify-runtime-assets.mjs` — 기존 untracked runtime assets와 신규 `workout/sessions.js`가 커밋 전 상태라 실패했다.
  6. not verified yet: 브라우저 클릭/시각 UI 플로우는 자동화 도구 부재로 미확인.

### Slice 4: 회차별 저장 모델

- 상태: 구현 완료, 정적/단위 테스트 통과. 브라우저 UI 검증은 not verified yet.
- 변경:
  1. `workout/sessions.js`: `workoutSessions` 호환 레이어를 추가했다. 기존 top-level 기록은 synthetic `1회차`로 읽고, 회차별 upsert/delete와 top-level 집계를 제공한다.
  2. `workout/state.js`: 현재 편집 중인 `sessionIndex/sessionId` 상태를 추가했다.
  3. `workout/load.js`: `window.__wtTargetSessionIndex`를 통해 선택 회차를 로드하고, 회차별 운동/활동/사진/메모/루틴 메타를 복원한다.
  4. `workout/save.js`: 저장 시 선택 회차만 갱신하고, top-level 운동 필드는 전체 회차 집계로 유지한다.
  5. `workout/save-schema.js`, `tests/save-schema.test.js`: `workoutSessions`를 운동 도메인 저장 키로 추가했다.
  6. `tests/workout-sessions.test.js`: legacy fallback, 회차 upsert, 회차 delete, 빈 집계 테스트를 추가했다.
  7. `sw.js`: `workout/sessions.js`를 `STATIC_ASSETS`에 추가하고 `CACHE_VERSION`을 bump했다.
- 검증:
  1. PASS: `node --check workout/load.js`
  2. PASS: `node --check workout/save.js`
  3. PASS: `node --check workout/save-schema.js`
  4. PASS: `node --check workout/state.js`
  5. PASS: `node --check workout/sessions.js`
  6. PASS: `node --test tests/save-schema.test.js tests/workout-sessions.test.js`
  7. not verified yet: 실제 저장 후 reload UI 플로우는 브라우저 자동화 도구 부재로 미확인.

### Slice 5: 내보내기/루틴 액션 정리

- 상태: 구현 완료, 정적/단위 테스트 통과. 브라우저 UI 검증은 not verified yet.
- 변경:
  1. `render-calendar.js`: 날짜 상세의 `내보내기`를 선택 회차 텍스트 공유/클립보드 복사로 연결했다.
  2. `render-calendar.js`: 선택 회차 삭제, 운동 카드 삭제, 활동 카드 삭제를 실제 `workoutSessions` 업데이트와 `saveDay(..., { mode: 'merge' })` 저장으로 연결했다.
  3. `render-calendar.js`: `+` 버튼은 첫 빈 회차를 우선 편집하고, 빈 회차가 없으면 다음 회차를 생성하도록 수정했다.
  4. `render-calendar.js`: `루틴` 버튼은 선택 날짜/회차를 편집 상태로 로드한 뒤 기존 `openRoutineSuggestWithRecent`/`openRoutineSuggest` 흐름을 연다.
  5. `style.css`: 편집 화면에서도 기존 일반/프로/테스트/성장보드 진입 카드를 기본 숨김 처리했다.
  6. `data/data-load.js`: 트윈 계정 운동 병합 필드에 `workoutSessions`를 포함했다.
  7. `data/data-pure.js`, `tests/data.load-save.test.js`: `workoutSessions` 내부 운동 기록도 활성 날짜로 판정하도록 보강했다.
  8. `render-calendar.js`: 상세 삭제 저장 시 기존 운동 저장 경로와 같이 `bOk/lOk/dOk/sOk`를 재계산하도록 보강했다.
  9. `workout/save.js`: 회차 저장 시 날짜 파싱을 명시적으로 정리했다.
  10. `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260623-workout-calendar-actions`로 bump했다.
- 검증:
  1. PASS: `node --check app.js`
  2. PASS: `node --check render-calendar.js`
  3. PASS: `node --check workout/load.js`
  4. PASS: `node --check workout/save.js`
  5. PASS: `node --check workout/save-schema.js`
  6. PASS: `node --check workout/state.js`
  7. PASS: `node --check workout/sessions.js`
  8. PASS: `node --check data/data-load.js`
  9. PASS: `node --check data/data-pure.js`
  10. PASS: `node --check sw.js`
  11. PASS: `node --test tests/save-schema.test.js tests/workout-sessions.test.js tests/data.load-save.test.js`
  12. PASS: `git diff --check`
  13. BLOCKED: `node scripts/verify-runtime-assets.mjs` — 기존 untracked runtime assets와 신규 `workout/sessions.js`가 커밋 전 상태라 실패했다.
  14. PASS: `npm.cmd run dev`가 기존 healthy 서버 `http://localhost:5500`을 재사용했고 `GET /index.html`이 HTTP 200을 반환했다.
  15. PASS: 브라우저에서 하단 `운동` 탭 클릭 시 운동 캘린더 홈, 월간 그리드, 주차 레일, 하단 선택 날짜 바가 표시됨을 확인했다.
  16. PASS: 기록 없는 날짜 상세에서 빈 상태, 회차 탭, `+` 버튼 표시를 확인했다.
  17. PASS: `+` 클릭 시 편집 화면으로 전환되고 기존 모드 선택 진입 카드가 숨김 처리됨을 확인했다.
  18. not verified yet: 현재 로그인 데이터에 최근 6개월 운동 기록이 없어 기록 있음 상세 카드/삭제/내보내기 실클릭은 미확인.

### Slice 6: 날짜 상세 운동 카드 형태 교체

- 상태: 구현 완료, 정적 문법 검증 완료. 기록 있는 날짜 실데이터 UI 검증은 not verified yet.
- 변경:
  1. `render-calendar.js`: 운동 상세 카드에서 기존 썸네일/하단 체크형 마크업을 제거했다.
  2. `render-calendar.js`: 운동 카드 collapsed 상태는 성공 기준, 트랙, 볼륨 요약, 오늘 기록, 접힘 안내, `세트 다시 보기` 중심으로 렌더한다.
  3. `render-calendar.js`: 운동 카드 expanded 상태는 KG/REP/RIR/ROM 세트 행 중심으로 렌더한다.
  4. `render-calendar.js`: 그래프를 CSS 가짜 곡선에서 실제 세트 볼륨 기반 SVG sparkline으로 교체했다.
  5. `style.css`: `.wt-max-read-card` 계열 스타일을 추가해 참고 이미지 2/3 형태에 맞춘 카드, 요약 박스, 트렌드 박스, 세트 행, 액션 버튼을 적용했다.
  6. `style.css`: 펼친 카드의 세트 행을 2줄에서 1줄 구조로 압축하고 폰트/패딩/버튼/그래프 높이를 축소했다.
  7. `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260623-workout-card-shape`로 bump했다.
- 검증:
  1. PASS: `node --check render-calendar.js`
  2. PASS: `node --check sw.js`
  3. PASS: `git diff --check`
  4. not verified yet: 현재 로그인 데이터에 최근 6개월 운동 기록이 없어 기록 있음 카드의 실제 브라우저 시각 검증은 미확인.

## NEXT_ACTION.md 업데이트

- 계획 상태: `complete`
- 다음 자동 상태: `complete`
- 다음 액션:
  - 없음. 운동탭 캘린더 홈 개편의 마지막 슬라이스까지 구현/리뷰 완료.
- 남은 검증:
  - 로컬 브라우저에서 하단 `운동` 탭 → 날짜 클릭 → 기록 있음/없음 상세 → 내보내기/루틴/삭제/+ 버튼을 직접 확인한다.

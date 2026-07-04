# 운동 세트 복사 추가와 우측 펼침 편집

## 요청

- 현재 운동 카드 세트 입력 UI는 4번 참고 이미지처럼 `+` 행으로 새 세트를 추가하지만, 추가된 세트가 빈 입력 행으로만 보인다.
- 1~3번 참고 이미지 방향처럼 `세트 추가` 시 직전 세트 값을 복사하고, 평소에는 요약 행으로 두되 사용자가 우측 버튼을 누르면 해당 세트를 수정할 수 있게 한다.

## 적용 워크플로우

- 적용 트리거: `/grill-me`
- `omo:frontend`: 사용자 제공 스크린샷을 UX 계약으로 보고 기존 `DESIGN.md`/TDS Mobile 토큰을 따른다.
- `omo:ulw-plan`: 코드 탐색으로 결정 가능한 항목은 사용자에게 묻지 않고, 다음 실행자가 추가 인터뷰 없이 구현할 수 있게 결정 완료 계획으로 작성한다.
- 이번 세션은 계획 세션이므로 앱 코드는 수정하지 않는다.

## 그릴 결과

1. 질문: `우측 버튼`은 어떤 버튼인가?
   - 탐색/이미지 판단: 1~3번 이미지의 각 세트 행 오른쪽 chevron/펼침 버튼으로 해석한다.
   - 결정: 행 전체를 입력 상태로 항상 노출하지 않고, 우측 펼침 버튼을 눌렀을 때만 수정 패널을 연다.
2. 질문: 추가 세트가 복사해야 하는 값 범위는 어디까지인가?
   - 코드 판단: 현재 `_defaultWorkoutSheetSet(prev)`는 `prev`를 받지만 `kg`/`reps`를 일부러 빈 값으로 만든다.
   - 결정: 직전 세트의 사용자 입력값인 `kg`, `reps`, `rir`, `romPct`, `setType`을 복사한다. `done`, `completedAt`, `exerciseCompletedAt` 같은 완료/시간 marker는 복사하지 않는다. `wendlerRole`, `wendlerPct`, `supplementalKind`, `amrap` 같은 프로그램 처방 메타는 새 수동 추가 세트에 중복 복사하지 않는다.
3. 질문: 1~3번 이미지의 휴식 타이머/광고/상단 지표까지 구현할 것인가?
   - 결정: 아니다. 이번 범위는 기존 Tomato Farm 운동 카드 내부 세트 행 UX만 바꾼다.
4. 질문: 새 세트 추가 직후 자동으로 편집 패널을 열 것인가?
   - 결정: 아니다. 참고 이미지 2처럼 복사된 세트는 먼저 요약 행으로 추가되고, 사용자가 우측 버튼을 눌렀을 때 참고 이미지 3처럼 수정 영역이 열린다.

## 현재 코드 근거

- `render-calendar.js`
  - `_renderWorkoutSetRows()`가 현재 편집 상태에서 모든 세트 행에 `KG/REP/RIR/ROM` 입력을 바로 렌더한다.
  - `_renderWorkoutSetAddRow()`는 `data-wt-sheet-card-action="add-exercise-set"`를 사용한다.
  - `_runWorkoutHomeSheetCardAction()`과 `_bindWorkoutHomeSheetActions()`가 하단 시트 내부 capture handler로 카드 action을 처리한다.
  - `_defaultWorkoutSheetSet(prev)`가 `kg: ''`, `reps: ''`로 새 세트를 빈 값으로 만든다.
  - `_addWorkoutExerciseSetFromSheet()`가 `sets.push(_defaultWorkoutSheetSet(sets[sets.length - 1]))`를 호출한다.
- `style.css`
  - `.wt-max-set-main`은 입력이 항상 보이는 compact grid로 설계되어 있다.
  - `.wt-max-set-check`, `.wt-max-set-remove`, `.wt-max-set-add-row`의 터치 타깃과 모바일 밀도 규칙이 이미 있다.
- `tests/workout-calendar-bottom-sheet.test.js`
  - 현재 `day sheet added workout sets start with blank kg and reps inputs` 테스트가 빈 `kg`/`reps` 동작을 고정하고 있으므로 새 요구에 맞게 교체해야 한다.
  - 세트 체크/삭제 direct binding, 완료 도장 marker 분리, wendler role 표시 보존 테스트가 있으므로 회귀를 유지해야 한다.
- `sw.js`
  - `style.css`와 `render-calendar.js`가 `STATIC_ASSETS`에 등록되어 있으므로 둘 중 하나라도 수정하면 `CACHE_VERSION`을 bump해야 한다.

## 실행 슬라이스

### Slice 1: 세트 복사 추가와 우측 펼침 편집

#### 목표

- `+` 행을 누르면 새 세트가 직전 세트의 사용자 입력값을 복사해 추가된다.
- 세트 행은 기본적으로 요약형으로 렌더되어 현재 값만 빠르게 스캔된다.
- 각 세트 행 우측 버튼을 누르면 그 행만 펼쳐져 기존 필드(`KG`, `REP`, `RIR`, `ROM`)를 수정할 수 있다.
- 체크, 삭제, 종목완료, 완료 도장 marker는 기존 의미를 유지한다.

#### 예상 수정 파일

- `render-calendar.js`
- `style.css`
- `tests/workout-calendar-bottom-sheet.test.js`
- `tests/*` cache marker assertion 파일 중 현재 `CACHE_VERSION`을 고정한 파일
- `sw.js`
- `docs/ai/NEXT_ACTION.md`
- 리뷰 문서: `docs/ai/reviews/2026-07-04-workout-set-copy-expand-edit-review.md`

#### 구현 지시

1. `_defaultWorkoutSheetSet(prev)`를 새 요구에 맞게 바꾼다.
   - 복사: `kg`, `reps`, `rir`, `romPct`, `setType`
   - 초기화: `done: false`, `completedAt` 없음, `exerciseCompletedAt` 없음
   - 프로그램 메타(`wendlerRole`, `wendlerPct`, `supplementalKind`, `amrap`)는 기본적으로 복사하지 않는다.
2. 세트 펼침 상태를 로컬 UI 상태로 관리한다.
   - 예: `_workoutExpandedSetEditors` `Set` 또는 동등한 구조.
   - 키는 `dateKey`, `sessionIndex`, `exerciseIndex`, `setIndex`를 포함해 카드/세트별로 충돌하지 않게 한다.
   - 저장/재렌더 후에도 사용자가 연 행은 가능한 한 유지한다.
3. `_renderWorkoutSetRows()`를 요약 행 + 선택적 확장 패널 구조로 바꾼다.
   - 기본 행: 세트 타입, 세트 번호 또는 타입 chip, `kg`, `reps`, `RIR`, `ROM` 요약, 체크, 삭제, 우측 펼침 버튼.
   - 우측 버튼: `data-wt-sheet-card-action="toggle-set-editor"` 또는 별도 `data-wt-set-editor-toggle`로 sheet 내부 capture handler에서 처리한다.
   - 펼친 행: 기존 `_renderWorkoutSetInput()` 기반 입력을 렌더해 현재 저장 로직과 키보드 포커스 보존 로직을 최대한 재사용한다.
   - 펼침 버튼은 `aria-expanded`와 명확한 `aria-label`을 가진다.
4. `_runWorkoutHomeSheetCardAction()` 또는 `_bindWorkoutHomeSheetActions()`에 새 toggle action을 추가한다.
   - Modal/Button Event Rule에 맞게 `.cal-workout-day-sheet` 내부 capture handler에서 처리한다.
   - 체크/삭제 handler보다 우선순위를 깨지 않게 현재 처리 순서를 유지한다.
5. `style.css`를 TDS/Seed 규칙에 맞게 조정한다.
   - 새 raw color를 늘리지 말고 기존 변수 또는 인접 `.wt-max-*` 토큰을 재사용한다.
   - 요약 행은 모바일 360px 폭에서 텍스트가 잘리지 않게 안정적인 grid/flex 구조와 최소 터치 타깃을 가진다.
   - 펼침 패널은 카드 안의 또 다른 card처럼 보이지 않게, 같은 행의 하위 편집 영역으로 보이게 한다.
6. `tests/workout-calendar-bottom-sheet.test.js`를 요구에 맞게 갱신한다.
   - 기존 빈 값 추가 테스트를 제거/대체하고, 직전 세트 `kg`/`reps` 복사를 검증한다.
   - `done`/`completedAt`/완료 marker가 복사되지 않음을 검증한다.
   - 우측 펼침 action과 `aria-expanded`/입력 렌더 조건을 검증한다.
   - 세트 체크/삭제 direct binding, wendler label 보존, 종목완료 marker 테스트가 계속 통과해야 한다.
7. `render-calendar.js` 또는 `style.css`를 수정하면 `sw.js` `CACHE_VERSION`을 bump한다.

#### 제외

- `www/` 직접 수정
- Firestore 직접 호출 추가
- 데이터 schema 전면 개편
- 휴식 타이머 UI, 광고 영역, 상단 운동 지표 재구현
- 러닝 카드/식단/홈/소셜 화면 변경
- 운동 picker나 종목 추천 알고리즘 변경
- 새 프레임워크, 번들러, 외부 UI 라이브러리 도입

#### 검증 방법

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node --test tests/workout-calendar-bottom-sheet.test.js`
4. 필요 시 관련 CSS/cache marker 테스트:
   - `node --test tests/workout-card-layout-css.test.js`
   - 현재 cache marker를 고정한 테스트 파일
5. `node scripts/verify-runtime-assets.mjs`
6. `git diff --check`
7. 전체 회귀가 필요하면 `node --test tests/*.test.js`
8. 배포:
   - `npm.cmd run deploy:production`
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
   - `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::<new-cache-version> render-calendar.js::<new-marker> style.css::<new-marker> tests/workout-calendar-bottom-sheet.test.js::<new-marker>`
9. 운영 URL UI flow:
   - `https://aretenald2018-sys.github.io/tomatofarm/`
   - `운동 탭 -> 오늘 하단 시트 -> 헬스 종목 카드 -> + 행 클릭 -> 새 세트가 직전 세트 값으로 추가됨 -> 새 세트 우측 버튼 클릭 -> 해당 행의 수정 필드가 펼쳐짐 -> KG/REP 수정 -> 저장/재렌더 후 값 유지`

#### 완료 증거

- 새 테스트가 `+` 추가 세트의 `kg`/`reps` 복사를 확인한다.
- 새 테스트가 완료 상태와 완료 marker 미복사를 확인한다.
- 새 테스트가 우측 펼침 버튼과 확장 편집 UI 조건을 확인한다.
- `sw.js` cache version marker가 운영 배포 URL에서 확인된다.
- 운영 Pages URL에서 위 UI flow를 실제로 수행했거나, 인증 세션 부재로 못 했으면 `not verified yet`과 정확한 blocker를 리뷰에 남긴다.

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-07-04-workout-set-copy-expand-edit.md`의 Slice 1만 실행한다. 앱 코드는 `render-calendar.js`, `style.css`, 관련 테스트, `sw.js` 범위로 제한하고, `+` 행은 직전 세트 값을 복사하며 우측 버튼으로 해당 세트만 펼쳐 수정하게 만든다. 구현 후 Tomato Farm 운영 Pages 배포와 marker 검증까지 진행한다.

## 상태

- 상태: `complete`
- 차단 질문: 없음
- 실행 결과: Slice 1 구현 완료.
- 리뷰 문서: `docs/ai/reviews/2026-07-04-workout-set-copy-expand-edit-review.md`
- 검증 요약:
  1. PASS: `node --check render-calendar.js && node --check sw.js && node --check tests/workout-calendar-bottom-sheet.test.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 31 pass
  3. PASS: `node --test tests/workout-card-layout-css.test.js tests/workout-calendar-bottom-sheet.test.js` - 37 pass
  4. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=879`
  5. PASS: `git diff --check`
  6. PASS: `node --test tests/*.test.js` - 693 pass

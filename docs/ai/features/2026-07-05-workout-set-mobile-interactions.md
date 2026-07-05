# 운동 세트 모바일 상호작용 보정

## 요청

- 세트 행의 `kg`/`횟수` 값은 모바일에서 더블탭하거나 클릭했을 때 바로 숫자 수정 상태로 들어가야 한다.
- 숫자 입력칸을 클릭하면 기존 숫자가 한 번에 초기화되어, 사용자가 직접 지우고 다시 입력하지 않아도 되어야 한다.
- 세트 삭제 `×` 버튼은 파란 펼침 토글과 너무 붙지 않게 더 왼쪽으로 분리하고, 터치 영역은 더 키워야 한다.
- 새 종목을 추가하면 화면/캐러셀이 최초 추가 종목으로 고정되는 회귀를 없애고, 방금 추가한 종목으로 유지되어야 한다.
- 세트 행을 손가락으로 스와이프하면 해당 세트를 삭제할 수 있어야 한다.
- 위 항목은 에뮬레이터 또는 모바일 브라우저 에뮬레이션 E2E에서 직접 검증해야 한다.

## 적용 워크플로우

- 적용 트리거: `$omo:ulw-loop`, `/diagnose`, 모바일 UI/UX 버그 수정.
- 사용 스킬:
  - `omo:ulw-loop`: 증거 기반 기준과 수동 QA 증거를 남긴다. 단, 현재 환경에서는 `omo` CLI가 발견되지 않아 `.omo/ulw-loop/bootstrap-notepad.md`와 `.debug-journal.md`에 대체 증거를 남긴다.
  - `omo:debugging`: 3개 이상 가설, RED→GREEN, 원래 사용자 시나리오 재실행.
  - `omo:frontend`: 기존 `DESIGN.md`의 TDS Mobile/Seed 규칙을 따른다.
  - `omo:visual-qa`: 모바일 캡처와 독립 리뷰로 터치/레이아웃/CJK 상태를 확인한다.
  - `omo:git-master`: 이력 확인과 최종 커밋이 필요한 경우 사용한다.
- 이번 계획은 하나의 실행 슬라이스로 제한한다.

## 현재 코드 근거

1. `render-calendar.js`
   - `_renderWorkoutSetRows()`는 접힌 행의 `kg/reps`를 `.wt-max-set-value` span으로 렌더해 직접 편집 action이 없다.
   - `_renderWorkoutSetInput()`은 `change` 저장만 있고 focus 시 숫자를 비우는 경로가 없다.
   - `_bindWorkoutHomeSheetActions()`는 클릭 삭제와 card action만 처리하며, 세트 행 horizontal swipe 삭제는 없다.
   - `_restoreWorkoutSheetCarouselToSlide()`와 picker `afterSelect` 경로가 새 종목 추가 후 캐러셀 위치 보정 지점이다.
2. `style.css`
   - `.wt-max-set-main`의 삭제/펼침 열이 데스크톱 `24px/28px`, 모바일 `22px/26px`로 좁다.
   - `.wt-max-set-row`에는 swipe affordance/transform 상태가 없다.
3. `workout/exercises.js`
   - 운동 탭 자체 캐러셀은 `_activeWorkoutEntryIdx`와 `wtSelectWorkoutEntryCard()`를 사용한다.
   - day sheet picker는 `render-calendar.js`의 `afterSelect`와 day-sheet carousel restore가 핵심이다.
4. `sw.js`
   - `render-calendar.js`, `style.css`, `workout/exercises.js`가 `STATIC_ASSETS`에 포함되어 있어 수정 시 `CACHE_VERSION`을 bump해야 한다.

## 실행 슬라이스

### Slice 1: 모바일 세트 행 편집/삭제/포커스 보정

#### 목표

1. 접힌 세트 행의 `kg`와 `횟수` 값은 click/double-click/touch로 해당 필드 편집 패널을 열고 input에 focus해야 한다.
2. 펼친 `kg/reps/rir/romPct` input은 focus 또는 값 셀 편집 진입 시 현재 값을 한 번 비우고, 다음 입력값을 저장해야 한다.
3. 삭제 `×` 버튼은 34px 이상 터치 타깃을 갖고 파란 펼침 버튼과 시각적으로 분리되어야 한다.
4. 세트 행은 왼쪽 swipe threshold를 넘기면 같은 `_removeWorkoutExerciseSetFromSheet()` 경로로 삭제되어야 한다. 세로 스크롤, 값 편집, 체크/타입/펼침 버튼은 방해하지 않는다.
5. 새 운동 추가 후 day sheet carousel은 방금 추가한 운동 카드 index로 이동하고 그 위치를 유지해야 한다. 이미 있던 첫 운동으로 되돌아가면 실패다.

#### 예상 수정 파일

- `render-calendar.js`
- `style.css`
- `tests/workout-calendar-bottom-sheet.test.js`
- `tests/workout-set-minimal-dom.test.js`
- `sw.js`
- 필요 시 `docs/ai/reviews/2026-07-05-workout-set-mobile-interactions-review.md`
- `docs/ai/NEXT_ACTION.md`

#### 구현 지시

1. collapsed 값 표시를 action 가능한 button 또는 button 역할 요소로 바꾼다.
   - `data-wt-sheet-card-action="edit-set-field"` 또는 전용 `data-wt-set-edit-field`를 사용한다.
   - `aria-label`은 `무게 수정`, `횟수 수정`처럼 명확해야 한다.
   - 기존 `kg/reps` 텍스트 정보와 단위는 유지한다.
2. edit-set-field action은 해당 set editor를 열고 대상 input을 focus한다.
   - 같은 함수가 click/dblclick/touch 시나리오에서 재사용되어야 한다.
   - focus 후 현재 값을 선택/초기화할 수 있게 한다.
3. input clear-on-focus는 사용자가 필드에 들어온 첫 focus에만 실행한다.
   - field 값이 이미 빈 문자열이면 유지한다.
   - clear만으로 저장하지 않고, `change`에서 기존 저장 경로가 실행되게 한다.
4. swipe 삭제는 sheet 내부 직접 바인딩으로 구현한다.
   - `.wt-max-set-row`에 data 속성으로 key/session/exercise/set index를 둔다.
   - horizontal left swipe가 충분히 크고 vertical movement보다 우세할 때만 삭제한다.
   - 삭제 기준 미달이면 row transform을 원복한다.
5. 삭제 버튼/토글 스타일은 TDS Mobile 터치 타깃을 우선한다.
   - raw color를 새로 늘리지 않고 기존 파란 affordance 또는 `DESIGN.md`에 이미 있는 값을 사용한다.
6. 새 종목 추가 후 carousel 위치는 picker `afterSelect` detail 또는 새 session exercise 수를 기준으로 명시적으로 새 index를 기억/복원한다.
7. `sw.js` `CACHE_VERSION`을 새 marker로 bump한다.

#### 제외

- `www/` 직접 수정
- Firestore 직접 호출 추가
- 운동 추천/처방 알고리즘 전면 변경
- Max plan sheet, benchmark editor, Dashboard3 별도 배포 대상 변경
- 새 프레임워크/번들러/외부 UI 라이브러리 도입

## RED/검증 계획

### Failing-first

1. `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js`
   - collapsed 값에 edit action이 없어 실패해야 한다.
   - input focus clear 계약이 없어 실패해야 한다.
   - swipe 삭제 data/binding/style 계약이 없어 실패해야 한다.
   - 삭제 버튼 34px 이상 터치 타깃 계약이 없어 실패해야 한다.
2. 새 종목 carousel 포커스 계약 테스트
   - `_refreshWorkoutHomeAfterPickerSelect()` 또는 관련 helper가 새 exercise index를 명시적으로 기억/복원하지 않으면 실패해야 한다.

### GREEN

1. `node --check render-calendar.js sw.js`
2. `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js`
3. `node --test tests/*.test.js`
4. `npm.cmd run verify:assets`
5. `git diff --check`

### Real-surface QA

1. Mobile browser/Puppeteer E2E evidence under `.omo/evidence/workout-set-mobile-interactions/`
   - 390px viewport에서 day sheet set row를 렌더한다.
   - `kg` 값 더블클릭 또는 더블탭 equivalent action 후 editor가 열리고 `kg` input이 focus된다.
   - input focus 후 값이 빈 문자열이 되고 새 값 입력/change가 반영된다.
   - 삭제 `×` hit target이 34px 이상이며 파란 expand와 분리되어 있다.
   - 세트 row left swipe 후 set count가 감소하고 toast/action path가 삭제 경로를 탔다.
   - 새 종목 추가 시 carousel active slide/index가 새 종목을 가리키며 첫 종목으로 되돌아가지 않는다.
   - 스크린샷: `.omo/evidence/workout-set-mobile-interactions/mobile-set-row-after.png`
   - 액션 로그: `.omo/evidence/workout-set-mobile-interactions/mobile-set-row-e2e.json`
2. 운영 Pages 배포 검증
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
   - marker 검증: 새 `CACHE_VERSION`, `edit-set-field`, swipe handler marker, carousel new-slide restore marker.

## 완료 증거

- RED 실패와 GREEN 통과 로그가 있다.
- 모바일 E2E 액션 로그와 스크린샷이 있다.
- 새 종목 추가 후 첫 종목 고정 회귀가 같은 E2E에서 부정된다.
- `sw.js` cache marker가 갱신되어 있다.

## 실행 결과

1. 접힌 세트 행의 `kg`/`횟수` 값을 `data-wt-set-edit-field` button으로 바꾸고, 탭/클릭 시 `edit-set-field` action이 해당 세트 editor를 열어 대상 input에 focus하도록 했다.
2. `data-wt-set-clear-on-focus`와 `_clearWorkoutSetInputOnFocus()`를 추가해 `kg/reps/rir/romPct` input이 첫 focus에서 기존 값을 비운다. 값 비우기만으로는 저장하지 않고 기존 `change` 저장 경로를 유지한다.
3. 삭제 `×` 버튼을 파란 펼침 토글 왼쪽에 둔 채 hit target을 38px × 34px로 키웠고, 펼침 버튼과 4px 이상 분리했다.
4. 세트 행에 `data-wt-set-swipe-row`를 추가하고, 좌측 horizontal swipe가 threshold를 넘으면 `_removeWorkoutExerciseSetFromSheet()`로 삭제한다. 입력 필드와 열린 유형 메뉴에서는 swipe 삭제를 시작하지 않는다.
5. 새 종목 추가 후 캐러셀은 기존 `_refreshWorkoutHomeAfterPickerSelect()`/`_restoreWorkoutSheetCarouselToSlide()` 경로를 유지하며, 회귀 테스트가 방금 추가한 slide 복원을 검증한다.
6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260705z1-workout-set-entry-followup-z2-workout-set-mobile-interactions`로 bump했다.

## 검증 결과

1. PASS: RED targeted tests 실패 확인.
2. PASS: `node --check render-calendar.js && node --check tests/workout-set-minimal-dom.test.js`
3. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js` - 37 pass.
4. PASS: `node --test tests/workout-set-minimal-dom.test.js` - 4 pass.
5. PASS: `node --test tests/*.test.js` - 704 pass.
6. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=880`.
7. PASS: `git diff --check`.
8. PASS: 모바일 브라우저 에뮬레이션 E2E - `kg/reps` tap focus clear, 값 변경, 삭제 hit target `38x34`, 삭제/펼침 gap `4`, 좌측 swipe 삭제 후 set count `1`, toast `세트를 삭제했어요`.
9. PASS: 운영 Pages 배포 검증 - `npm.cmd run deploy:production`, deployed commit `147f25da88e9`, cache `tomatofarm-v20260705z1-workout-set-entry-followup-z2-workout-set-mobile-interactions`.
10. PASS: 운영 Pages feature marker 검증 - `render-calendar.js::data-wt-set-edit-field`, `_bindWorkoutSetSwipeDelete`, `sheet:set-field-editor`, `style.css::is-swipe-delete-ready`.
11. PASS: 운영 앱 모바일 smoke - 배포 URL에서 테스트 사용자/날짜 캐시로 day sheet를 열고 실제 터치가 `70kg` 버튼을 hit, `kg` input focus, value `''`, editor open, 삭제 hit target `36x34`, gap `3`.
12. PASS: 운영 배포 source 모바일 swipe harness - 배포된 `render-calendar.js`/`style.css`를 사용해 `55kg / 15회` 변경 후 좌측 swipe 삭제, set count `1`, toast `세트를 삭제했어요`.
13. PASS: 시각 확인 - `.omo/evidence/workout-set-mobile-interactions/mobile-set-row-after.png`, `.omo/evidence/workout-set-mobile-interactions/production-app-mobile-focus.png`, `.omo/evidence/workout-set-mobile-interactions/production-source-mobile-swipe.png`.

## 상태

- 상태: `complete`
- 차단 질문: 없음
- 리뷰: `docs/ai/reviews/2026-07-05-workout-set-mobile-interactions-review.md`
- 다음 액션: 없음

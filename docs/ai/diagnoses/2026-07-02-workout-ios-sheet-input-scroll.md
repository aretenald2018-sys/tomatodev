# 운동 시트 iOS 숫자 입력 자동 스크롤 진단

- 날짜: 2026-07-02
- 대상: 운동 탭 날짜 상세 시트의 운동 세트 숫자 입력
- 증상: iPhone PWA에서 운동종목 추가 후 무게/반복 입력 또는 수정 시 화면이 위로 자동 스크롤되는 것으로 제보됨.

## 재현 루프

1. 운동 탭에서 날짜 상세 시트를 `full` 상태로 연다.
2. 운동종목을 추가하고 카드의 `편집하기` 상태에서 KG/REP input을 터치한다.
3. 값을 입력하거나 수정해 `onchange` 저장을 발생시킨다.
4. iOS PWA 키보드가 열린 상태에서 시트 또는 페이지 스크롤 위치가 위로 튀는지 확인한다.

## 가설

1. 숫자 input `onchange`가 `saveDay()` 이후 `renderWorkoutCalendarHome()` 전체 재렌더를 호출해 포커스된 input DOM을 교체한다. iOS WebKit은 키보드가 열린 동안 포커스 요소가 사라지면 새 기준점으로 자동 스크롤 보정을 수행한다.
2. 실제 운동 입력 카드의 `wtUpdateSet()`도 change 저장 후 `_renderSets()` 또는 `_renderExerciseList()`를 호출해 숫자 input DOM을 교체할 수 있다.
3. 새 세트 기본값이 `kg: 0`, `reps: 10` 또는 이전 세트 값으로 생성되고, 빈 값도 `_num()`/parse fallback을 통해 `0`으로 정규화되어 사용자가 input의 기존 숫자를 지워야 한다.
4. 저장 후 `.wt-day-sheet-scroll` 또는 운동 탭 document scrollTop이 유지되지 않아 재렌더 직후 위치가 초기화된다.
5. `focus()` 복원이 있더라도 `preventScroll`을 쓰지 않으면 iOS가 포커스 위치로 다시 스크롤할 수 있다.

## 확인한 원인

- `_updateWorkoutExerciseSetFromSheet()`는 `KG`, `REP`, `RIR`, `ROM` input의 `onchange`에서 호출된다.
- 이 함수는 `_mutateWorkoutExerciseFromSheet()`를 거쳐 `_saveWorkoutHomeSessionResult()`를 호출하고, `_saveWorkoutHomeSessionResult()`는 저장 직후 항상 `renderWorkoutCalendarHome()`를 실행한다.
- 현재 input에는 저장 전후 동일 요소를 찾을 안정적인 `data-*` 식별자가 없고, 재렌더 후 포커스/선택 범위/시트 스크롤을 복원하지 않는다.
- `_defaultWorkoutSheetSet()`은 `kg: 0`, `reps: 10`을 기본값으로 만들고, `rawSetDetails`는 `kg`와 `reps`를 `_num()`으로 읽어 빈 값을 `0`처럼 표시하게 만든다.
- 실제 운동 입력 카드의 `wtAddSet()`은 새 세트에 이전 `kg`/`reps` 또는 `0`을 넣고, `wtUpdateSet()`은 빈 KG/REP 입력을 `0`으로 저장한다.

## 결정

- 숫자 input에 세션/운동/세트/필드 식별자를 부여한다.
- 숫자 input 저장 전 active input, selection, `.wt-day-sheet-scroll` scrollTop, 운동 캘린더 루트 scrollTop을 캡처한다.
- 저장 후 전체 렌더는 유지하되, 다음 frame에서 동일 input을 `focus({ preventScroll: true })`로 복원하고 캡처한 스크롤 위치를 되돌린다.
- 실제 운동 입력 카드의 저장 재렌더에는 포커스를 강제로 되돌리지 않고 document scrollTop만 복원한다.
- 새 세트의 KG/REP 기본값은 빈 문자열로 만들고, KG/REP 입력을 사용자가 비운 경우 빈 값으로 보존한다.
- `render-calendar.js`와 `workout/exercises.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

## 남은 가정

- 인증 계정이 필요한 실제 iPhone PWA UI flow는 로컬 자동 테스트만으로 완전 재현할 수 없다. 배포 후 marker와 정적 검증을 통과시키고, 실제 인증 UI 확인은 별도 수동 확인 대상으로 남긴다.

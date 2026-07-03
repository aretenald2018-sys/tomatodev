# 운동 카드 캐러셀 위치 보존

## 요청 원문

`캐러셀에서 두번째 종목 입력하고 체크하는데 강제로 첫번때 종목으로 옮겨감`

## 이해한 내용

- 목표: 하단시트 운동 종목 캐러셀에서 두 번째 이후 카드의 세트 입력/체크/추가/삭제를 해도 같은 카드 위치에 남아 있게 한다.
- 비목표: 캐러셀 디자인, 카드 크기, 세트 저장 schema, `종목완료` 도장 조건, 운동 picker 플로우는 변경하지 않는다.
- 사용자 흐름: 운동 탭 하단시트 full 상태 -> 두 번째 종목 카드로 스와이프 -> KG/REP 입력 또는 체크 -> 저장/재렌더 후에도 두 번째 종목 카드가 보여야 한다.
- 데이터 가정: 문제는 저장 데이터가 아니라 재렌더 후 DOM 스크롤 위치가 초기화되는 UI 상태 회귀다.
- 열려 있는 질문: 없음.

## 진단 결과

- 적용 트리거: `/diagnose`
- 빠른 재현 루프: `render-calendar.js`의 하단시트 저장/복원 경로와 `tests/workout-calendar-bottom-sheet.test.js` 소스 회귀 테스트.
- 사용자 증상과 같은 실패: `_saveWorkoutHomeSessionResult()`는 `renderWorkoutCalendarHome()` 전후에 `.wt-day-sheet-scroll`, root/window scroll, 입력 focus만 캡처/복원한다. `data-wt-day-exercise-carousel-track`의 `scrollLeft`나 활성 slide는 캡처하지 않아 새 DOM 렌더 후 첫 번째 slide로 돌아간다.
- 가설:
  1. 세트 체크가 sessionIndex/exerciseIndex를 잘못 넘긴다. 확인 결과 `data-exercise-index`와 `_toggleWorkoutExerciseSetDoneFromSheet()`는 해당 index를 전달한다.
  2. 저장 결과가 운동 배열 순서를 바꾼다. 현재 `upsertWorkoutSession()`은 같은 session payload를 normalize/clone하며 순서 변경 로직이 없다.
  3. 재렌더 후 캐러셀 horizontal scroll이 복원되지 않는다. 확인 결과 캐러셀 track scroll 상태를 저장/복원하는 코드가 없어 주원인이다.
  4. 하단시트 touch guard가 스와이프를 첫 카드로 강제한다. touch guard는 이벤트 전파 제어만 하며 저장 후 위치 초기화와 직접 관련이 없다.

## 결정 기록

- 결정: 기존 입력/시트 스크롤 복원 state에 캐러셀 `scrollLeft`와 활성 slide index를 함께 보존한다.
- 이유: 저장/재렌더 경로가 이미 모든 세트 입력과 체크 액션을 통과하는 공통 지점이므로, 여기서 복원하면 입력/체크/추가/삭제에 동일하게 적용된다.
- 되돌릴 수 있는가: 가능. 캐러셀 캡처/복원 helper와 테스트만 제거하면 기존 동작으로 돌아간다.

## 실행 슬라이스

### 슬라이스 1: 하단시트 캐러셀 위치 복원

- 목표: 세트 입력/체크/추가/삭제 저장 후 같은 운동 종목 캐러셀 slide를 유지한다.
- 범위:
  - `render-calendar.js`의 하단시트 scroll state에 캐러셀 위치 정보를 추가한다.
  - 복원 시 `data-wt-day-exercise-carousel-track`의 `scrollLeft`를 복원하고, 필요하면 slide index 기반으로 fallback scroll을 적용한다.
  - 회귀 테스트에 캐러셀 상태 캡처/복원과 기존 저장 경로 연결을 추가한다.
  - `render-calendar.js`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`과 cache marker 테스트를 갱신한다.
- 예상 수정 파일:
  - `render-calendar.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache marker 테스트들
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
- 수정하지 말 것:
  - `www/`
  - 저장 schema
  - 운동 카드 도장 로직
  - picker/running/home 화면
- 구현 메모:
  - 활성 slide index는 track의 slide bounding rect와 track left 차이가 가장 작은 slide로 계산한다.
  - `scrollLeft`가 유효하면 우선 복원하고, slide index가 있으면 해당 slide의 `offsetLeft`로 fallback한다.
  - 복원은 기존 input restore와 같이 `requestAnimationFrame`/timeout 재시도로 처리한다.
- 검증 방법:
  - `node --check render-calendar.js; node --check sw.js`
  - `node --test tests/workout-calendar-bottom-sheet.test.js`
  - `node --test tests/*.test.js`
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
- 완료 증거:
  - 테스트가 `_workoutSheetScrollState()`에 carousel state가 포함됨을 확인한다.
  - 테스트가 `_restoreWorkoutSheetScrollState()`가 carousel track을 복원함을 확인한다.
  - 테스트가 세트 입력/체크 저장 경로가 기존 state 복원 경로를 계속 통과함을 확인한다.
- 다음 세션 시작 프롬프트:
  - `docs/ai/features/2026-07-03-workout-carousel-position-preserve.md`의 슬라이스 1만 실행한다. 하단시트 운동 카드 캐러셀에서 두 번째 이후 종목 입력/체크 후 첫 번째 카드로 튀는 회귀를 막고 검증한다.

## 리뷰 세션 프롬프트

이 계획 문서와 직전 실행 세션의 변경 파일을 읽고 버그, 회귀, 누락된 테스트, 오래된 캐시/서비스워커 이슈, UX 깨짐을 우선 리뷰한다. 리뷰 중에는 새 기능을 구현하지 않는다.

## NEXT_ACTION.md 업데이트

- 계획 세션 종료 상태: 계획 완료
- 다음 자동 상태: `ready_for_execution`
- 다음 액션: 슬라이스 1 실행
- 차단 질문: 없음

# 운동 완료 도장 명시 액션 제한

## 요청 원문

`+버튼만 누르고 종목완료 안누르는데도 완료도장 찍힘`

## 이해한 내용

- 목표: 운동 카드의 붉은 `완료` 도장은 사용자가 `종목완료`를 누른 경우에만 표시한다.
- 비목표: 세트 체크 버튼의 의미, `+` 행 위치, 세트 저장 구조, 운동 삭제 우선순위, 러닝/식단 플로우는 변경하지 않는다.
- 사용자 흐름: 운동 탭 하단 시트에서 세트 행의 `+` 버튼을 눌러 빈 세트를 추가해도 카드 위에 `완료` 도장이 찍히면 안 된다. `종목완료`를 누르면 도장이 찍히고 재렌더 후에도 유지되어야 한다.
- 데이터 가정: 기존 `done === true` 세트는 세트 단위 완료 상태로 유지하되, 카드 도장 표시 여부는 종목 단위 완료 액션과 분리한다.
- 열려 있는 질문: 없음.

## 진단 결과

- 적용 트리거: `/diagnose`
- 빠른 재현 루프: `render-calendar.js` 소스 조건과 `tests/workout-calendar-bottom-sheet.test.js` 회귀 테스트로 `+` 행/도장 표시 조건을 검증한다.
- 사용자 증상과 같은 실패: 현재 `_isWorkoutExerciseComplete(row)`가 입력 가능한 세트가 모두 `done === true`이면 `종목완료` 클릭 여부와 무관하게 `_isWorkoutExerciseCompletionStamped()`에서 도장을 표시한다. `+` 버튼이 저장/재렌더를 유발하면 이 조건이 즉시 다시 평가되어 도장이 나타날 수 있다.
- 가설:
  1. `+` 버튼이 이전 세트의 `done` 값을 복사한다. 확인 결과 `_defaultWorkoutSheetSet()`은 `done: false`로 시작하므로 주원인이 아니다.
  2. 도장 표시 조건이 세트 체크 상태에만 묶여 있다. 확인 결과 `_isWorkoutExerciseComplete()`가 이 조건을 직접 사용하므로 주원인이다.
  3. 완료 도장 Map이 `+` 버튼 경로에서 잘못 세팅된다. 확인 결과 `_markWorkoutExerciseCompletionStamp(cardId)`는 `종목완료` 경로에만 있다.
  4. 저장 후 active draft가 오래된 완료 상태를 되살린다. 최근 삭제 우선순위 핫픽스에서 같은 세션 동기화가 들어갔고, 이번 증상의 직접 원인은 도장 렌더 조건이다.

## 결정 기록

- 결정: 카드 도장은 저장된 세트의 `done` 상태만으로 표시하지 않고, `종목완료` 액션에서 저장하는 명시적 종목 완료 marker를 기준으로 표시한다.
- 이유: 세트 체크는 세트 완료/시간 측정 의미가 있고, `종목완료`는 사용자에게 보이는 종목 단위 확정 액션이다. 두 상태를 분리해야 `+` 입력만으로 도장이 찍히지 않는다.
- 되돌릴 수 있는가: 가능. marker 필드와 렌더 조건만 되돌리면 기존 세트 상태 기반 도장으로 복귀할 수 있다.

## 실행 슬라이스

### 슬라이스 1: 완료 도장 marker 분리

- 목표: `+` 버튼 또는 세트 체크 저장만으로는 `완료` 도장이 표시되지 않게 하고, `종목완료` 후에는 재렌더/저장 후에도 도장이 유지되게 한다.
- 범위:
  - `render-calendar.js`에서 종목 완료 marker helper와 도장 렌더 조건을 추가/수정한다.
  - `_completeWorkoutExerciseFromSheet()`가 완료 가능한 세트를 `done: true`로 바꿀 때 종목 완료 marker도 저장한다.
  - `+` 추가와 세트 체크 토글 경로는 marker를 생성하지 않는다는 회귀 테스트를 추가한다.
  - `render-calendar.js`는 `sw.js` `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 bump하고 cache marker 테스트를 갱신한다.
- 예상 수정 파일:
  - `render-calendar.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `tests/*` cache marker assertions
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
- 수정하지 말 것:
  - `www/`
  - Firestore 직접 호출
  - workout session schema 전면 개편
  - 러닝/식단/홈 라이프존 렌더
- 구현 메모:
  - marker는 기존 운동 entry 객체에 가벼운 boolean/timestamp 형태로 저장한다.
  - 기존 기록에 `done === true` 세트가 있더라도 marker가 없으면 도장을 표시하지 않는다.
  - `종목완료`는 marker를 저장하므로 도장 유지 핫픽스의 의도는 보존한다.
- 검증 방법:
  - `node --check render-calendar.js sw.js`
  - `node --test tests/workout-calendar-bottom-sheet.test.js`
  - 관련 cache marker 테스트
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
- 완료 증거:
  - 테스트가 `+` 경로에서 `_markWorkoutExerciseCompletionStamp` 또는 marker 저장이 호출되지 않음을 확인한다.
  - 테스트가 `_isWorkoutExerciseCompletionStamped(cardId, row)`가 marker 기반임을 확인한다.
  - 테스트가 `종목완료` 경로에서 marker 저장 후 도장 렌더가 가능함을 확인한다.
- 다음 세션 시작 프롬프트:
  - `docs/ai/features/2026-07-03-workout-complete-stamp-explicit-action.md`의 슬라이스 1만 실행한다. + 버튼/세트 체크만으로 완료 도장이 찍히는 회귀를 막고, 종목완료 후 도장 유지와 캐시 버전 bump를 검증한다.

## 리뷰 세션 프롬프트

이 계획 문서와 직전 실행 세션의 변경 파일을 읽고 버그, 회귀, 누락된 테스트, 오래된 캐시/서비스워커 이슈, UX 깨짐을 우선 리뷰한다. 리뷰 중에는 새 기능을 구현하지 않는다.

## NEXT_ACTION.md 업데이트

- 계획 세션 종료 상태: 계획 완료
- 다음 자동 상태: `ready_for_execution`
- 다음 액션: 슬라이스 1 실행
- 차단 질문: 없음

# 2026-07-08 목표설정 프로그램 입력 라벨 보정 계획

## 요청

`종목 수정` 바텀시트의 `프로그램` 목표설정 입력 문구와 입력 순서를 바꾼다.

- `세트` -> `목표 세트`
- `볼륨 kg` -> `현재 n세트당 수행 kg`
- `볼륨 회` -> `현재 n세트당 수행 횟수`
- `증량` -> `3주 후 추가증량목표`
- `목표 세트` 입력을 첫 번째로 배치한다.
- `목표 세트`에 입력한 값을 뒤의 `n세트당` 라벨에 반영한다.

## 현재 코드 판단

- 대상 UI는 `workout/exercises.js`의 `종목 수정` 바텀시트 내부 `프로그램` 영역이다.
- 렌더 진입점은 `_renderExerciseProgramEditor(ex)`이고, 실제 HTML은 `_exerciseProgramEditorHtml(settings)` 계열에서 생성된다.
- 기존 `볼륨 kg`, `볼륨 회`, `세트`, `증량` 문구는 `tests/exercise-program-editor.test.js`에서 고정할 수 있다.
- `workout/exercises.js`는 `sw.js` `STATIC_ASSETS`에 포함되므로 수정 시 `CACHE_VERSION`을 함께 bump한다.

## 결정

1. `목표 세트` input을 프로그램 숫자 입력 그룹의 첫 번째 필드로 배치한다.
2. `현재 n세트당 수행 kg`, `현재 n세트당 수행 횟수`의 `n`은 `목표 세트` input 값에서 읽는다.
3. 값이 비어 있거나 유효하지 않으면 저장 기본값과 같은 fallback set count를 사용한다. 화면에는 `현재 4세트당 수행 kg`처럼 숫자가 들어간 라벨을 유지한다.
4. `목표 세트` input이 바뀌면 두 라벨의 `n`을 즉시 업데이트한다.
5. 저장 schema, 프로그램 산식, 저장 필드 이름은 바꾸지 않는다. 이번 변경은 표시 문구와 입력 순서만 다룬다.

## 실행 Slice 1

1. `tests/exercise-program-editor.test.js`에 RED 테스트를 추가한다.
   - 새 라벨 4개가 존재해야 한다.
   - 기존 `볼륨 kg`, `볼륨 회`, standalone `세트`, standalone `증량` 라벨은 남지 않아야 한다.
   - `목표 세트` input markup이 kg/reps/increment input보다 먼저 렌더되어야 한다.
   - `목표 세트` input change/input handler가 `n세트당` 라벨을 업데이트해야 한다.
2. `workout/exercises.js`에서 프로그램 editor HTML 라벨과 순서를 변경한다.
3. 같은 파일에 목표 세트 label sync helper와 input binding을 추가한다.
4. `sw.js` `CACHE_VERSION`을 bump하고 cache-version 고정 테스트 기대값을 갱신한다.

## 검증 계획

1. RED: `node --test tests/exercise-program-editor.test.js`.
2. PASS: `node --check workout/exercises.js && node --check sw.js`.
3. PASS: `node --test tests/exercise-program-editor.test.js`.
4. PASS: `node --test tests/*.test.js`.
5. PASS: `npm.cmd run verify:assets`.
6. PASS: production Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`.
7. UI 확인: `운동 -> 목표입력/종목 수정 -> 프로그램`에서 `목표 세트`가 첫 번째이고, 값을 바꾸면 `현재 n세트당 수행 kg/횟수` 라벨의 n이 바뀐다.

## 제외

- 목표설정 산식 변경.
- 성장판 저장 schema 변경.
- 운동 기록 세트 입력 화면 변경.
- 러닝/유산소 프로그램 UX 변경.

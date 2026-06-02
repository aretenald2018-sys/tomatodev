# 맥스 종목 선택 시트 운동종목/기구 CRUD

## 요청

Discord `devreq_discord_1511197839886123170`에서 첨부 화면의 `종목 선택` 바텀시트에서도 운동종목/기구 추가 및 CRUD가 가능하게 해달라는 요청이다.

## 그릴 결과

- 핵심 질문: 여기서 말하는 `운동종목(기구)`가 운동 카탈로그인지, 헬스장 기구 풀인지?
- 코드 확인 결과: 첨부 화면은 맥스 모드 운동추가 피커이며, 후보 노출은 `users/{uid}/exercises` 운동종목 카탈로그 기반이다. 별도 기구 풀 CRUD는 `workout/expert/max.js`의 `openMaxEquipmentPoolModal()`에 이미 일부 존재한다.
- 결정: 같은 시트에서 운동종목 카탈로그 편집과 기구 풀 관리 진입을 모두 제공한다. 기구 풀 모달은 누락된 `update`까지 보강해 CRUD로 맞춘다.
- 남은 가정: 새 종목을 추가하면 `saveExercise()`가 이름 기반 `movementId` 추론을 수행하므로 맥스 피커 후보에도 반영된다.

## 범위

### Slice 1: 맥스 종목 선택 시트 CRUD 진입 및 기구 수정 보강

수정 대상:

- `workout/exercises.js`
  - 맥스 벤치마크 피커에서도 상단에 `종목 추가`와 `기구 관리` 액션을 노출한다.
  - 맥스 후보 row에도 가능한 범위에서 `종목 수정`/`종목 삭제` 액션을 노출한다.
  - `기구 관리`는 lazy module 전역 호출 대신 클릭 핸들러에서 `workout/expert/max.js`를 동적 import한다.
- `workout/expert/max.js`
  - 기존 `공통/헬스장별 기구` 모달에서 헬스장 전용 기구의 이름/카테고리 수정 저장을 추가한다.
  - 삭제 시 기존 연결 벤치마크 정리 규칙을 유지한다.
- `style.css`, `expert-mode.css`
  - 새 버튼/inline edit 행이 모바일에서 줄바꿈과 터치 영역을 안정적으로 갖도록 스타일을 보강한다.
- `sw.js`
  - 위 정적 자산 변경에 맞춰 `CACHE_VERSION`을 bump한다.

하지 않을 것:

- `www/` 직접 수정.
- Firestore를 view/module에서 직접 호출.
- 운동 기록 과거 데이터 일괄 변경.
- 새 프레임워크/빌드 도입.

## 검증

- `node --check workout/exercises.js`
- `node --check workout/expert/max.js`
- `node --check sw.js`
- `node --test tests/calc.max.test.js`
- 사용자 로컬 터미널에서 `npm.cmd run dev` 실행 후 `운동 탭 -> 맥스 모드 -> 종목 추가` 시트에서:
  - 상단 `종목 추가`로 종목 저장 후 피커에 재노출되는지 확인.
  - 기존 종목의 수정/삭제 버튼이 선택 클릭과 분리되어 동작하는지 확인.
  - `기구 관리`에서 헬스장 전용 기구 추가/수정/삭제가 되는지 확인.

## 다음 실행

이 계획의 `Slice 2`를 실행한다.

### Slice 2: 맥스 피커 삭제/빈 데이터/수정 아이콘 후속 보정

Discord steering note `1511201425336696882`에서 같은 화면의 추가 피드백이 들어왔다.

수정 대상:

- `workout/exercises.js`
  - 맥스 피커 후보 중 벤치마크 데이터가 없는 항목은 `데이터 없음` 상태로 표시한다.
  - 맥스 피커 안에서는 모든 후보에 삭제 진입을 노출해 버튼 노출 불일치를 없앤다.
  - 수정 버튼은 이모지 대신 inline SVG icon button으로 교체한다.
  - 삭제 버튼은 기존 `wtOpenExerciseEditor()`의 삭제 버튼 의존 대신 피커에서 바로 삭제 확인 후 `deleteExercise()`를 호출한다.
- `style.css`
  - 새 icon button, `데이터 없음` 배지, 삭제 버튼의 모바일 터치 영역과 줄바꿈을 보강한다.
- `sw.js`
  - `STATIC_ASSETS` 변경에 맞춰 `CACHE_VERSION`을 bump한다.

하지 않을 것:

- `www/` 직접 수정.
- 운동 기록 과거 데이터 일괄 삭제.
- 기구 관리 모달의 추가 기능 확장.

검증:

- `git diff --check`
- `node --check workout/exercises.js`
- `node --check sw.js`
- `node --test tests/calc.max.test.js`
- 사용자 로컬 터미널에서 `npm.cmd run dev` 실행 후 `운동 탭 -> 맥스 모드 -> 종목 추가` 시트에서:
  - 벤치마크가 없는 후보가 `데이터 없음`으로 보이는지 확인.
  - 모든 후보에 삭제 버튼이 보이고, 삭제 확인 후 목록에서 사라지는지 확인.
  - 수정 버튼이 이모지 대신 선형 아이콘으로 보이는지 확인.

## 실행 결과

- Slice 1 완료.
- `workout/exercises.js`: 맥스 종목 선택 시트 상단에 `종목 추가`, `기구 관리`를 노출했고, 맥스 후보 row에서도 종목 수정/삭제 진입을 추가했다.
- `workout/expert/max.js`: 기구 관리 모달에서 헬스장 전용 기구의 이름/카테고리 수정 저장을 추가했고, 피커에서 연 모달은 현재 헬스장 컨텍스트를 유지하도록 했다.
- `style.css`, `expert-mode.css`: 새 액션/수정 row의 모바일 레이아웃을 보강했다.
- `sw.js`: `STATIC_ASSETS` 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260602-max-picker-crud`로 bump했다.

## Slice 2 실행 결과

- Slice 2 완료.
- `workout/exercises.js`: 맥스 피커에서 벤치마크가 없는 후보를 `데이터 없음`으로 표시하고, 모든 맥스 후보에 삭제 액션을 노출했다.
- `workout/exercises.js`: 수정 버튼을 이모지에서 inline SVG icon button으로 교체했고, 삭제는 피커에서 확인 후 `deleteExercise()`를 직접 호출하도록 분리했다.
- `style.css`: `데이터 없음` 배지, icon button, 삭제 버튼의 터치 영역과 모바일 줄바꿈을 보강했다.
- `sw.js`: `STATIC_ASSETS` 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260602-max-picker-crud-r2`로 bump했다.

## 실행 검증

- PASS: `git diff --check`
- PASS: `node --check workout/exercises.js`
- PASS: `node --check workout/expert/max.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/calc.max.test.js` (`54` tests)
- Slice 2 PASS: `git diff --check`
- Slice 2 PASS: `node --check workout/exercises.js`
- Slice 2 PASS: `node --check sw.js`
- Slice 2 PASS: `node --test tests/calc.max.test.js` (`54` tests)
- not verified yet: 실제 브라우저 UI 클릭 플로우는 프로젝트 규칙상 Codex 세션에서 장기 dev server를 시작하지 않아 수행하지 않았다.
- 참고: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 `mockups/poc/*`, `mockups/trio-renewal/shared.css` 미추적 참조 때문에 실패했다. 이번 변경 파일 누락과 직접 관련된 실패는 아니다.

# 운동 사이클 설정 시트 정리 및 클릭 닫힘 수정

## 배경

직전 변경으로 캘린더 좌측 cycle rail 클릭 시 성장 보드 grid 대신 종목 설정 sheet가 바로 열리게 되었다. 실제 화면에서는 웬들러 모드에서도 기본 계단용 `세트 수`, `6주 성공 시 증량` 행이 남아 있고, 보라색 웬들러 영역이 카드 안 카드처럼 보이며 설명 문구가 과하다. 또한 현재 사이클 영역을 클릭하면 sheet가 닫히는 버그가 보고되었다.

## 진단

### 재현/피드백 루프

- 가장 빠른 루프는 `workout/test-v2/board-render.js`와 `test-mode-v2.css`의 구조 계약 테스트다.
- `tests/workout-calendar-bottom-sheet.test.js`에 다음 회귀 조건을 추가한다.
  - 웬들러 모드 렌더 블록에 `세트 수`, `6주 성공 시 증량` 행이 없다.
  - 웬들러 설명 callout이 제거되고 nested card 스타일이 없다.
  - `현재 사이클`은 `wendler`, `volume`, `intensity` 행을 모두 만들 수 있다.
  - sheet 내부 클릭은 backdrop close로 처리되지 않도록 sheet body에서 전파를 막는다.

### 가설

1. `#tm2-sheets` backdrop의 `e.target === sh` close 조건이 sheet 내부 cycle rail의 빈/가상 요소 클릭에서 의도치 않게 만족될 수 있다.
2. sheet 본문 자체에 click propagation guard가 없어, data-action 없는 시각 요소 클릭이 backdrop close 정책과 분리되지 않는다.
3. 현재 cycle rail이 non-interactive span만 렌더해 모바일 hit target이 불안정하다.
4. 웬들러 모드와 기본 계단 모드의 입력 행 분기 조건이 부족해 불필요한 기본 계단 필드가 남는다.

### 결정

- sheet 내부 `.tm2-sheet`에 직접 click listener를 붙여 backdrop close와 명시적으로 분리한다.
- 현재 사이클 레일 자체는 저장/편집 액션을 만들지 않고, 클릭해도 닫히지 않는 안정적인 상태 표시 영역으로 둔다.

## 실행 Slice 1 — Settings sheet polish and cycle click guard

1. 웬들러 모드에서는 `세트 수`, `6주 성공 시 증량` 행을 숨긴다.
2. 보라색 `tm2-wbox`에서 설명 callout을 제거하고 nested card 느낌을 줄인다.
3. `자세 메모`, `헬스장별 기구` 입력 행을 제거한다. 저장 시 기존 값은 지우지 않고 보존한다.
4. `현재 사이클`은 현재 선택된 program만이 아니라 해당 종목에 저장된/설정 가능한 사이클 행을 모두 표시한다.
   - 웬들러 설정 가능 종목이면 `웬들러` 행 표시
   - 저장된 `tracks` 또는 `ctx.tracks` 기준으로 `볼륨`, `강도` 행 표시
5. cycle rail 클릭으로 sheet가 닫히지 않도록 `.tm2-sheet` 내부 click propagation guard를 추가한다.
6. `test-mode-v2.css`에서 nested card/과한 callout 스타일을 정리한다.
7. `workout/test-v2/board-render.js`, `test-mode-v2.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.
8. 관련 회귀 테스트를 추가/수정한다.

## 구현 금지

- 웬들러/기본 계단 처방 계산식 변경
- 저장 데이터 모델 변경
- 성장 보드 전체 grid 재설계
- 날짜별 운동 추가 sheet 변경
- `www/` 직접 수정

## 예상 변경 파일

- `workout/test-v2/board-render.js`
- `test-mode-v2.css`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- cache version 참조 테스트들
- `docs/ai/NEXT_ACTION.md`

## 검증

- `node --check workout/test-v2/board-render.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 배포 시 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 수동 확인 흐름

- Dashboard3 Pages에서 인증 계정으로 `운동 탭 -> 월간 캘린더 -> 좌측 cycle rail 목표 칩`을 누른다.
- 웬들러 선택 상태에서 `세트 수`, `6주 성공 시 증량`, 설명 callout, `자세 메모`, `헬스장별 기구`가 보이지 않아야 한다.
- `현재 사이클`에는 해당 종목의 `웬들러`, `볼륨`, `강도` 행이 함께 보여야 한다.
- `현재 사이클` 영역을 탭/스크롤해도 sheet가 닫히지 않아야 한다.

## 다음 실행

이 계획의 Slice 1을 실행한다. 변경 범위는 `workout/test-v2/board-render.js`, `test-mode-v2.css`, `sw.js`, 관련 테스트, 문서 갱신으로 제한한다.

## Slice 1 구현 결과

- 웬들러 모드에서 기본 계단 전용 `세트 수`, `6주 성공 시 증량` 행을 숨겼다.
- 웬들러 설정 영역의 설명 callout을 제거하고, `tm2-wbox`를 border/background 없는 단순 그룹으로 바꿨다.
- 설정 sheet에서 `자세 메모`, `헬스장별 기구` 입력 행을 제거했다. 저장 시 기존 `formNote`, `gymNote`는 입력이 없으면 보존한다.
- `현재 사이클`이 웬들러 행과 해당 종목의 볼륨/강도 기본 계단 행을 함께 렌더하도록 바꿨다.
- `.tm2-sheet` 내부 click handler가 action 처리 후 `stopPropagation()` 하도록 하여 cycle rail 클릭이 backdrop close로 흘러가지 않게 했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260626z11-cycle-settings-polish`로 bump했다.

## Slice 1 검증

- PASS: `node --check workout/test-v2/board-render.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js` — 53 tests passed
- PASS: `node --test .\tests\*.test.js` — 546 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- not verified yet: 아직 Dashboard3 Pages 배포 및 인증 계정 UI flow 확인 전이다.

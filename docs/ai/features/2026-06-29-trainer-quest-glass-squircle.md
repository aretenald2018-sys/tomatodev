# 트레이너 퀘스트 모달 글래스/스퀘어클 수정 계획

## 상태

- 상태: `executed`
- 작성일: `2026-06-29`
- 자동 트리거: `/diagnose`

## 요청 요약

트레이너가 걸터앉아 있는 퀘스트 모달이 여전히 TDS식 불투명 시트와 직사각 선택지처럼 보인다. 반투명 유리글라스 느낌으로 바꾸고, 말풍선 타자 속도를 늦추며, 선택지는 TDS 폰트 기반의 더 작은 둥근 스퀘어클 형태로 바꾼다. 선택지 박스 폭은 화면을 좌우로 나눴을 때 한쪽 50%를 넘지 않게 제한한다.

## /diagnose

### 재현 루프

- `tests/trainer-quest-modal.test.js`가 기존 스타일을 강제하는지 확인한다.
- `style.css`의 `.trainer-quest-sheet`, `.trainer-quest-game-menu`, `.trainer-quest-game-option`, `.trainer-quest-game-label` 계약을 확인한다.
- `modals/trainer-quest-modal.js`의 타자 속도 상수를 확인한다.

### 확인한 원인

1. 공통 `.modal-backdrop`은 어두운 60% 배경과 blur를 적용한다. 트레이너 전용 backdrop override가 없어 유리 시트가 있어도 배경이 무겁게 죽는다.
2. `.trainer-quest-sheet`는 `rgba(203, 208, 216, .84)` 계열의 회색조 반투명 값과 `blur(16px) saturate(.86)`을 사용해 유리보다 불투명한 TDS sheet처럼 보인다.
3. `.trainer-quest-game-menu`와 `.trainer-quest-game-option`은 하나의 어두운 직사각형 패널과 row 구분선 구조라 스퀘어클 형태가 아니다.
4. 테스트가 위 스타일을 명시적으로 assert하고 있어 변경이 제대로 유지되지 않을 수 있다.
5. 타자 속도는 `TRAINER_QUEST_TYPE_MS = 28`로 고정되어 빠르게 느껴질 수 있다.

## 실행 Slice 1

### 포함 범위

1. `modals/trainer-quest-modal.js`
   - 타자 속도 상수를 더 느린 값으로 변경한다.
2. `style.css`
   - `.trainer-quest-modal` 전용 backdrop을 더 밝고 투명한 glass용 overlay로 조정한다.
   - `.trainer-quest-sheet`를 반투명 glass panel로 변경하고 blur/saturate를 강화한다.
   - `.trainer-quest-game-menu`를 어두운 직사각 패널이 아니라 투명한 compact 선택지 stack으로 바꾼다.
   - `.trainer-quest-game-option`을 독립된 rounded squircle pill/card로 만들고, 폭을 `min(50vw, ...)` 이하로 제한한다.
   - 선택지 label은 TDS font token을 유지하되 현재보다 작은 size/weight로 낮춘다.
3. `tests/trainer-quest-modal.test.js`
   - 기존 불투명 회색/어두운 패널/빠른 타자 계약을 제거하고 새 glass/squircle/느린 타자 계약을 검증한다.
4. `sw.js`
   - `style.css`, `modals/trainer-quest-modal.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

### 제외 범위

- 트레이너 이미지 교체.
- 모달 기능/통계 화면 구조 변경.
- 다른 공통 모달의 전역 디자인 변경.

## 검증

1. `node --check modals/trainer-quest-modal.js; node --check sw.js`
2. `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests`
5. `git diff --check`
6. `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행 시작 프롬프트

`docs/ai/features/2026-06-29-trainer-quest-glass-squircle.md`의 Slice 1을 실행한다.

## Slice 1 실행 결과

- `modals/trainer-quest-modal.js`: 말풍선 타자 간격을 `28ms`에서 `56ms`로 늦췄다.
- `style.css`: 트레이너 모달 backdrop에 전용 glass overlay를 추가하고, 하단 sheet를 흰색 반투명 glass panel로 변경했다.
- `style.css`: 선택지 컨테이너를 어두운 직사각 패널에서 투명 stack으로 바꾸고, 각 선택지를 독립된 rounded squircle glass 버튼으로 변경했다.
- `style.css`: 선택지 폭을 `min(236px, calc(50vw - 12px))`로 제한해 화면 좌우 2분할 기준의 50%를 넘지 않도록 했다.
- `style.css`: 선택지 label을 TDS 작은 텍스트 토큰(`tds-st13`, `tds-w-semi`)으로 낮췄다.
- `tests/trainer-quest-modal.test.js`: 기존 회색 TDS sheet, 어두운 직사각 메뉴, 빠른 타자 속도를 강제하던 테스트 계약을 새 glass/squircle/느린 타자 계약으로 바꿨다.
- `sw.js`: `style.css`와 `modals/trainer-quest-modal.js`가 `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION`을 `tomatofarm-v20260629z6-trainer-glass-squircle`로 bump했다.

## Slice 1 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js` — 13 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=855`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 591 tests passed
- PASS: `git diff --check`

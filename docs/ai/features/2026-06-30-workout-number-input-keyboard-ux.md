# 운동 숫자 입력 키보드 UX 개선

## 요청

1. 운동 숫자 입력 시 모바일 키보드가 올라오면서 원래 UI 카드가 살짝 위로 이동하는 UX를 개선한다.
2. 숫자 입력 칸을 조금 확대해 손가락으로 더 넉넉하게 터치할 수 있게 한다.
3. 반영은 `dashboard3` Pages 배포에만 적용한다.

## 그릴 결과

- 핵심 질문: 숫자 입력 UX 개선이 운동 기록 전체 구조 재설계까지 포함하는가?
- 답변/결정: 아니다. 이번 변경은 세트 숫자 입력 포커스 안정화와 입력 hit area 확대만 포함한다.
- 남은 가정: 인증 세션 없이는 배포 페이지에서 실제 운동 기록 UI 조작까지는 직접 확인하지 못할 수 있다. 이 경우 배포 asset marker와 정적/회귀 테스트로 검증하고 `not verified yet`을 명시한다.

## 진단

증상: 운동 세트의 `kg`, `REP`, `RIR`, `ROM` 숫자 입력을 터치하면 모바일 브라우저가 포커스된 작은 입력칸을 가시 영역 중앙으로 맞추기 위해 자동 scroll 조정을 하면서 카드가 살짝 위로 밀려 보인다.

확인한 단서:

- `workout/exercises.js`의 Max V2 입력은 `.set-input`, `.set-rpe-input`, `.set-rom-input`을 한 줄에 렌더링한다.
- `style.css`의 `.ex-max-v2-field input`과 `.ex-max-v2-rom-field input` 높이가 `23px`라 모바일 터치 타깃이 작다.
- 일반 `.set-input`도 `56px`, `font-size: 13px`라 iOS/모바일 포커스 보정과 오탭 가능성이 있다.
- detail/record 화면은 운동 카드 내부 스크롤과 브라우저 focus scroll에 영향을 받을 수 있다.

반증 가능한 원인 가설:

1. 작은 입력 높이 때문에 브라우저가 입력칸을 더 적극적으로 중앙 정렬하며 카드가 이동한다.
2. 16px 미만 input font-size가 일부 모바일 브라우저의 포커스 확대/스크롤 보정을 유발한다.
3. 입력 포커스 때 기존 scroll 위치를 보존하는 guard가 없어 keyboard resize 직후 자동 scroll이 화면 상태로 남는다.
4. 일반 입력과 Max V2 입력의 `inputmode`/터치 타깃이 일관되지 않아 기기별 키보드 동작이 달라진다.

## Slice 1 — 숫자 입력 포커스 안정화와 hit area 확대

### 포함

- `workout/exercises.js`에 운동 숫자 입력 포커스 scroll guard를 추가한다.
- 일반 세트 입력에도 `inputmode`를 명시해 모바일 숫자 키보드 동작을 맞춘다.
- `style.css`에서 `.set-input`, `.set-rpe-input`, `.set-rom-input`, Max V2 field input의 높이/폰트/패딩을 소폭 키운다.
- `style.css`에서 운동 record/detail 화면의 포커스 입력 여유 공간을 추가해 키보드가 떠도 입력 행이 바닥에 붙지 않게 한다.
- `tests/workout-card-layout-css.test.js`에 입력 타깃과 focus guard 회귀 테스트를 추가한다.
- `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- 운동 카드 전체 레이아웃 재설계.
- 세트 저장 schema 변경.
- 캘린더 바텀시트 drag/snap 동작 변경.
- `www/` 직접 수정.
- `tomatofarm` remote 배포.

## 예상 변경 파일

- `workout/exercises.js`
- `style.css`
- `tests/workout-card-layout-css.test.js`
- `tests/*`의 `sw.js` cache marker 관련 기대값
- `sw.js`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/reviews/2026-06-30-workout-number-input-keyboard-ux-review.md`

## 검증 계획

- `node --check workout/exercises.js`
- `node --check sw.js`
- `node --test tests/workout-card-layout-css.test.js tests/workout-navigation-stack.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 커밋 후 `git push origin main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL asset marker 확인:
  - `workout/exercises.js`의 focus scroll guard
  - `style.css`의 확대된 input 크기
  - `sw.js`의 새 cache version

## 실행 결과

- `workout/exercises.js`에 `WORKOUT_NUMBER_INPUT_SELECTOR` 기반 focus scroll guard를 추가했다.
- 숫자 입력 터치 시 `focus({ preventScroll: true })`를 먼저 시도하고, 이미 충분히 화면 안에 보이는 입력에서만 작은 자동 scroll delta를 되돌리도록 제한했다.
- 일반 세트 `kg`/`회` input에도 `inputmode="decimal"`/`inputmode="numeric"`을 추가했다.
- `style.css`에서 일반 세트 input을 `64px`, `min-height: 36px`, `font-size: 16px`로 키웠다.
- Max V2 세트 input은 한 줄 레이아웃을 유지하며 input 높이를 `30px`, font-size를 `14px`로 키웠고, 360px 이하 grid 예산을 별도 조정했다.
- `scroll-margin-bottom`/`scroll-padding-bottom`을 추가해 키보드가 떠도 포커스 입력 주변 여유를 확보했다.
- `tests/workout-card-layout-css.test.js`에 input 확대, `inputmode`, focus guard 회귀 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z01-workout-number-input-ux`로 bump하고 cache marker 테스트 기대값을 갱신했다.

검증:

- PASS: `node --check workout/exercises.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-card-layout-css.test.js tests/workout-navigation-stack.test.js` — 10 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: Dashboard3 Pages 배포 검증 — `7456942e8edda43a052e05c918a77b2914561524`, `tomatofarm-v20260630z01-workout-number-input-ux`
- PASS: Dashboard3 Pages marker 검증 — `WORKOUT_NUMBER_INPUT_SELECTOR`, `input.focus({ preventScroll: true })`, `#tab-workout .set-input`, `scroll-margin-bottom`, Max V2 input CSS marker 확인
- not verified yet: Dashboard3 Pages 배포와 인증 계정 실제 `운동 탭 -> 운동 상세 -> 숫자 입력 -> 모바일 키보드` UI flow 확인이 남아 있다.

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-workout-number-input-keyboard-ux.md` Slice 1을 실행한다.

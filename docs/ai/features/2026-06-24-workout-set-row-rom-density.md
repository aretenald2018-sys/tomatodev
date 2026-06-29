# 운동 기록 set row ROM 입력칸 및 폰트 조정

## 요청

- 운동 기록 카드의 ROM 입력칸을 조금 늘린다.
- 운동 기록 row의 입력 폰트 사이즈를 조금 낮춘다.

## 그릴 결과

- 질문: "운동기록하는 폰트사이즈"가 카드 전체 제목인지, 세트 기록 입력 row인지가 핵심이다.
- 결정: 첨부 스크린샷에서 ROM `10/10` 입력칸이 좁고 KG/REP/RIR 숫자가 크게 보이므로 Max V2 세트 기록 row의 입력 폰트를 낮춘다.
- 가정: 이번 요청은 `랫풀다운` 카드 안의 KG/REP/RIR/ROM 한 줄 기록 UI만 대상으로 한다.

## 실행 슬라이스

### Slice 1: Max V2 set row ROM 입력칸 확장과 입력 폰트 축소

대상 파일:

- `style.css`
- `sw.js`
- `tests/workout-card-layout-css.test.js`
- `tests/workout-test-mode-unified.test.js`
- `docs/ai/features/2026-06-24-workout-set-row-rom-density.md`
- `docs/ai/reviews/2026-06-24-workout-set-row-rom-density-review.md`

구현:

- `.ex-max-v2-main-row`의 ROM 열 최소 폭을 늘려 `10/10` 표시가 덜 끼도록 한다.
- `.ex-max-v2-rom-field`의 숫자 입력 칸과 `/10` 보조 텍스트 열을 조금 넓힌다.
- KG/REP/RIR/ROM input font-size를 한 단계 낮춰 세트 기록 row가 덜 답답해 보이게 한다.
- 모바일 좁은 화면 media rule도 같은 방향으로 맞춘다.
- `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

범위 밖:

- 운동 기록 저장 로직 변경.
- ROM 10점 입력 방식을 퍼센트/슬라이더로 되돌리는 변경.
- 일반 모드 세트 row 재설계.
- `www/` 직접 수정.

검증 계획:

- `node --check sw.js`
- `node --test tests/workout-card-layout-css.test.js tests/workout-test-mode-unified.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 로그인 후 `운동 탭 -> 운동 기록 카드 -> 세트 row`에서 ROM 입력칸이 넓어지고 KG/REP/RIR/ROM 숫자 폰트가 작아졌는지 확인한다.

## 상태

- 계획 세션 완료.
- Slice 1 실행 완료.
- 구현 요약:
  - `.ex-max-v2-main-row`의 ROM 열 최소 폭을 기본 `52px`, 360px 이하 `50px`로 늘렸다.
  - KG/REP/RIR/버튼/드래그 핸들 열은 소폭 줄여 전체 row 한 줄 구조를 유지했다.
  - KG/REP/RIR/ROM input font-size를 `11px`로 낮췄다.
  - `.ex-max-v2-rom-field` 내부 input 최소 폭과 `/10` 열을 넓혔다.
  - `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z26-set-row-rom-density`로 bump했다.
  - TDS 리뷰의 모바일 overflow 지적을 반영해 360px 이하 전용 grid와 최소폭 budget 테스트를 추가했다.
- 실행 검증:
  - PASS: `node --check sw.js`
  - PASS: `node --test tests/workout-card-layout-css.test.js tests/workout-test-mode-unified.test.js`
  - PASS: `node scripts/verify-runtime-assets.mjs`
  - PASS: `git diff --check`
- 리뷰: `docs/ai/reviews/2026-06-24-workout-set-row-rom-density-review.md`
- 배포 검증:
  - PASS: `npm.cmd run deploy:dashboard3`
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
  - PASS: Dashboard3 Pages가 `tomatofarm-v20260624z26-set-row-rom-density` 캐시 버전을 서빙하는 것을 확인했다.
  - not verified yet: 배포 URL은 로그인 화면에 막혀 `운동 탭 -> 운동 기록 카드 -> 세트 row` UI 클릭 흐름을 인증 계정으로 끝까지 확인하지 못했다.

# ROM 10점 입력 전환 리뷰

## 대상

- 계획: `docs/ai/features/2026-06-24-rom-score-input.md`
- 구현 커밋: `f0f2be9bdf2ff66322beb8172af97aeb12e2b365`
- 배포 URL: `https://aretenald2018-sys.github.io/dashboard3/`

## 변경 파일

- `workout/exercises.js`
- `style.css`
- `sw.js`
- `tests/workout-card-layout-css.test.js`
- `tests/workout-test-mode-unified.test.js`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/features/2026-06-24-rom-score-input.md`

## 리뷰 결과

- 화면 ROM 입력은 `0~10` 스케일, `0.5` step으로 변경됐다.
- 기존 저장값 `romPct`는 계속 0~100 퍼센트로 유지된다.
- 렌더링 시 `romPct: 80`은 `8`, `romPct: 95`는 `9.5`, `romPct: 100`은 `10`으로 표시된다.
- 입력 저장 시 `8`은 `romPct: 80`, `9.5`는 `romPct: 95`로 변환된다.
- `%` suffix와 퍼센트 aria label은 제거했고, `/10` suffix와 10점 aria label로 바꿨다.
- `style.css` 변경에 대한 전용 `tds-reviewer` sub-agent는 현재 도구 정책상 사용자가 직접 sub-agent 위임을 요청하지 않아 실행하지 못했다. 대신 CSS/DOM 계약 테스트와 전체 테스트를 통과시켰다.

## 검증

- `node --check workout/exercises.js`
- `node --test tests/workout-card-layout-css.test.js tests/workout-test-mode-unified.test.js tests/calc.expert.test.js`
  - 39개 통과
- `node --test tests/*.test.js`
  - 468개 통과
- `npm.cmd run verify:assets`
  - `[runtime-assets] ok refs=814`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ f0f2be9bdf2ff66322beb8172af97aeb12e2b365`
  - `[deploy-verify] ok f0f2be9bdf2f tomatofarm-v20260624z22-rom-score-input static=210`
- 배포 파일 직접 확인
  - `sw.js` HTTP 200, `tomatofarm-v20260624z22-rom-score-input` 포함
  - `workout/exercises.js` HTTP 200, `_romScoreInputToPct`, `_romPctToScoreInput`, `aria-label="가동범위 10점 입력"`, `<em>/10</em>` 포함
  - `style.css` HTTP 200, `/10` suffix 폭 반영

## 잔여 리스크

- 실제 로그인 계정에서 ROM 입력칸에 `8`, `9.5`를 직접 입력하는 브라우저 상호작용은 인증 데이터가 필요해 진행하지 않았다. 배포 소스와 테스트 계약은 렌더/저장 변환 경로를 검증한다.

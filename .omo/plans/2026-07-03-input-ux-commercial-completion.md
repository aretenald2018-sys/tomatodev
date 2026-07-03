# 최종 계획: 입력 UX 상용앱 갭 완성

상태: approved_for_execution  
작성일: 2026-07-03  
ULW goal: `.omo/ulw-loop/goals.json` / `G001-write-the-final-plan-for-tomato-farm`

## 1. 목표

헬스 종목 입력, 식단 입력, 러닝 및 유산소 입력에서 비직관적인 경로를 줄이고, 이미 구현됐지만 숨겨진 입력 기능을 상용 앱 수준의 1차 입력 경로로 노출한다.

## 2. 이번 구현 범위

이번 실행은 하나의 통합 slice로 제한한다.

- 운동 탭의 활동 선택을 `헬스`, `런닝`, `유산소`, `크로스핏`, `스트레칭`, `수영` 1차 탭으로 노출한다.
- 기존 `workout/activity-forms.js`가 기대하는 CF/스트레칭/수영 DOM 폼을 실제 `index.html`에 추가한다.
- 기존 manual cardio sheet를 운동 탭에서 바로 열 수 있게 한다.
- 식단 `+ 음식 추가`는 바로 검색 모달로 점프하지 않고 meal quick-add sheet를 먼저 연다.
- quick-add sheet에서 검색/최근, 직접 입력, AI 사진 분석, 일반 사진 첨부, 끼니 스킵을 명확히 고를 수 있게 한다.
- 기존 저장 경로(`saveWorkoutDay`, `_autoSaveDiet`, `wtAddFoodItem`, `openNutritionWeightModal`)는 우회하지 않는다.

## 3. 명시적 제외

- 실제 barcode scanner/native scanner 연동.
- 음악 연동.
- shoe tagging.
- social challenge/leaderboard.
- 장기 running training plan/guided run 콘텐츠 시스템.
- full micronutrient dashboard.

이 항목들은 데이터 모델, 권한, 콘텐츠 운영 범위가 커서 별도 계획으로 분리한다.

## 4. 설계 결정

- 루트 `DESIGN.md`를 이번 UI 작업의 디자인 시스템 계약으로 사용한다.
- Tomato/TDS Mobile/Seed 스타일을 보존한다.
- vanilla JavaScript 유지, 새 framework 또는 bundler 도입 금지.
- 입력 UX 개선은 기존 기능을 앞단에 묶는 방식으로 한다. 저장 계층을 새로 만들지 않는다.
- `STATIC_ASSETS`에 있는 파일을 수정하므로 `sw.js` `CACHE_VERSION`을 반드시 bump한다.
- `www/`는 수정하지 않는다.

## 5. 수정 허용 파일

- `DESIGN.md`
- `.omo/plans/2026-07-03-input-ux-commercial-completion.md`
- `.omo/frontend-design/state.md`
- `docs/ai/features/2026-07-03-input-ux-commercial-completion.md`
- `index.html`
- `app.js`
- `workout-ui.js`
- `workout/exercises.js`
- `workout/index.js`
- `render-workout.js`
- `style.css`
- `sw.js`
- `tests/running-entry.test.js`
- `tests/diet-add-button-binding.test.js`
- 신규 테스트가 꼭 필요할 경우 `tests/input-ux-commercial-completion.test.js`

## 6. RED -> GREEN 증거 계획

### C001. 주요 happy path

Scenario: `node --test tests/running-entry.test.js tests/diet-add-button-binding.test.js tests/input-ux-commercial-completion.test.js`

PASS 조건:

- 운동 타입 탭에 수동 유산소, 크로스핏, 스트레칭, 수영 진입점이 존재한다.
- CF/스트레칭/수영 폼 DOM id가 `activity-forms.js` 기대와 일치한다.
- 수동 유산소는 운동 탭에서 직접 열 수 있는 global launcher가 있다.
- 식단 `addFood`는 quick-add sheet를 열고, sheet action이 기존 검색/직접입력/AI사진/사진첨부/스킵 경로로 라우팅된다.

Evidence:

- `.omo/evidence/input-ux-commercial-completion/red-green-tests.txt`

### C002. edge/regression path

Scenario: `node --test tests/workout-save.test.js tests/workout-save-mode-guard.test.js tests/running-tracker.test.js tests/calc.record.test.js tests/save-schema.test.js`

PASS 조건:

- diet photo fields와 non-AI food preservation 경로가 유지된다.
- 수동 유산소 저장 경로가 기존 헬스 draft를 저장 후 복원하는 계약을 유지한다.
- running tracker 수치 계산이 깨지지 않는다.

Evidence:

- `.omo/evidence/input-ux-commercial-completion/regression-tests.txt`

### C003. real surface path

Scenario:

- user local: `npm.cmd run dev`
- browser: `http://127.0.0.1:<printed-port>/`
- production: `npm.cmd run deploy:production`, then `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`

PASS 조건:

- local or production page returns HTTP 200.
- workout screen exposes the new activity tabs without console errors.
- diet screen opens quick-add sheet from `+ 음식 추가`.
- production Pages serves the expected commit and cache version.

Evidence:

- `.omo/evidence/input-ux-commercial-completion/browser-qa/`
- `.omo/evidence/input-ux-commercial-completion/deploy-verify.txt`

## 7. 구현 순서

1. RED 테스트 작성: 현재 숨은 activity tabs/forms와 diet quick-add sheet 부재를 실패로 캡처한다.
2. `DESIGN.md` 및 계획 문서 생성.
3. 운동 타입 탭/폼/수동 유산소 launcher 구현.
4. 식단 quick-add sheet 구현.
5. CSS를 TDS/Seed token 기준으로 추가.
6. `sw.js` cache version bump.
7. unit/regression/asset check.
8. browser visual QA.
9. production deploy verify.
10. review-work final gate.

## 8. Review 체크리스트

- 앱 코드가 계획 범위 밖으로 번지지 않았는가.
- `STATIC_ASSETS` 수정과 `CACHE_VERSION` bump가 같은 변경에 있는가.
- Firestore 저장이 새 branch를 만들지 않고 기존 merge 저장 경로를 사용했는가.
- 식단 사진 필드와 non-AI foods가 유지되는가.
- sheet 내부 버튼이 overlay delegated handler에만 의존하지 않는가.
- 모바일 360px/390px에서 CJK 텍스트가 겹치거나 잘리지 않는가.

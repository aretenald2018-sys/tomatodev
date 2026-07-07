# 헤더 새로고침 통합 및 유산소 강도 입력 리뷰

## 범위

- 계획: `docs/ai/features/2026-07-07-refresh-unification-cardio-intensity.md`
- Slice: Refresh Unification Cardio Intensity Slice 1
- 요청: 헤더 새로고침 버튼으로 중복 update/refresh UI를 통합하고, `마이마운틴` 유산소 종목과 각도/단계 기반 칼로리 계산을 추가한 뒤 캐시 버전 갱신 및 운영 배포까지 검증한다.

## 리뷰 결과

PASS. 기존 floating update indicator는 헤더 `#app-refresh-btn` 상태 표시로 통합됐고, active workout draft 보존 reload 경로는 유지된다. `마이마운틴` 각도와 `스텝머신` 단계 값은 자동 칼로리 계산, 저장 payload, 미리보기, 날짜 시트 metric까지 같은 필드로 전달된다.

## 확인한 변경

1. `utils/build-info.js`에서 legacy `#app-update-indicator` UI 생성을 제거하고 update-ready/loading 상태를 `#app-refresh-btn`에 반영했다.
2. `style.css`에서 floating update panel 스타일을 제거하고 헤더 refresh button update dot/loading 회전을 추가했다.
3. `workout/exercises.js`에 `마이마운틴` 카탈로그, `angleDeg` 입력, `step-machine` `level` 입력, 종목별 강도 multiplier를 추가했다.
4. `render-calendar.js`가 저장된 유산소 카드의 각도/단계를 summary와 metric grid에 표시한다.
5. `assets/workout/cardio/my-mountain.png`를 새로 생성해 `sw.js` `STATIC_ASSETS`에 추가했다.
6. `app.js`, `index.html`, `sw.js`, `build-info.json`, 관련 테스트의 cache/query marker를 `tomatofarm-v20260707z20-refresh-cardio-intensity` 기준으로 갱신했다.

## 검증

1. PASS: `git diff --check`.
2. PASS: `node --check app.js && node --check utils/build-info.js && node --check workout/exercises.js && node --check render-calendar.js && node --check sw.js`.
3. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=905`.
4. PASS: `node --test tests/*.test.js` - 741 tests, 741 pass.
5. PASS: local browser QA harness - header refresh button 1개, legacy update indicator 0개, `마이마운틴` 목록 1개, angle 12 -> 522 kcal, step level 10 -> 450 kcal, pageerror 없음.

## 남은 운영 확인

not verified yet. `origin/main` production Pages 배포와 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>` 검증이 남아 있다.

## 제한

`review-work`의 병렬 sub-agent 리뷰는 현재 도구 규칙상 사용자가 명시적으로 병렬 에이전트를 요청하지 않은 경우 spawn이 금지되어 실행하지 않았다. 대신 정적 검증, 전체 회귀 테스트, asset 검증, local browser QA로 대체했다.

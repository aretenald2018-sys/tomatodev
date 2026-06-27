# 나이키 스타일 러닝 세션 화면 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-27-running-session-nike-style.md`
- Slice: Slice 1 — 기존 inline 러닝 제거 + 전용 러닝 세션 UI
- 변경 파일:
  - `index.html`
  - `style.css`
  - `app.js`
  - `workout-ui.js`
  - `workout/activity-forms.js`
  - `workout/exercises.js`
  - `workout/index.js`
  - `workout/load.js`
  - `workout/save.js`
  - `workout/running-session.js`
  - `workout/running-tracker.js`
  - `sw.js`
  - `tests/running-entry.test.js`
  - `tests/running-tracker.test.js`
  - cache version 참조 테스트들

## Findings

- 발견된 차단 이슈 없음.

## 확인한 계약

- `런닝/조깅` 선택은 기존 `wt-running-section` inline form을 열지 않고 `wt-running-session-root`에 전용 전체 화면 flow를 렌더한다.
- 시작 전, 진행 중, 결과 요약 화면은 각각 독립적인 `data-running-screen` 상태로 전환된다.
- GPS watch는 러닝 세션 중 foreground에서만 시작하고 pause/finish/close 시 정리된다.
- 저장은 `data.js` 경유 기존 `saveWorkoutOnly` 경로를 사용하고, `S.workout.runData` 기반으로 `runDistance`, `runRoute`, `runRouteSummary`, `runPlaceSummary`를 보존한다.
- 동네/공원명은 provider 없이 임의 생성하지 않는다. 현재는 GPS route centroid 기반 fallback label만 저장한다.
- `workout/running-tracker.js` 삭제에 맞춰 service worker `STATIC_ASSETS`와 `CACHE_VERSION`을 함께 갱신했다.

## 검증

- PASS: `node --check workout/running-session.js`
- PASS: `node --test tests/running-tracker.test.js tests/running-entry.test.js` — 10 tests passed
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 568 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=842`
- PASS: `git diff --cached --check; git diff --check`

## 남은 범위

- Dashboard3 Pages 배포 검증은 commit/push 후 수행한다.
- 인증 계정과 위치 권한이 필요한 실제 UI flow는 배포 페이지에서 가능한 범위까지 확인하고, 막히면 명시적으로 `not verified yet`로 남긴다.

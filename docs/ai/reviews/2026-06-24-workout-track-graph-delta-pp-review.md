# 운동 카드 그래프 등락폭 pp 표기 Slice 8 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-06-24-workout-history-detail-ui-regression.md` 후속 Slice 8
- 변경 파일:
  - `workout/exercises.js`
  - `sw.js`
  - `tests/workout-track-graph-delta.test.js`
  - `tests/workout-test-mode-unified.test.js`
  - `tests/stats-muscle-fatigue-insight.test.js`

## 결과

- PASS: 트랙 그래프 등락폭은 더 이상 `((last - prev) / prev) * 100` raw 상대 변화율로 계산하지 않는다.
- PASS: 최근 6개 점 중 최고값을 100으로 두고 직전/현재 위치 차이를 `pp`로 표시한다.
- PASS: `0pp`, `+npp`, `-npp` 형태를 사용해 화면의 `-8%`/`-63%` 표기가 `-8pp`/`-63pp` 계열로 바뀐다.
- PASS: up/down/flat 색상 class는 기존 부호 기반 판정을 유지해 CSS 변경 없이 동작한다.
- PASS: 볼륨/강도 트랙 값 자체, 그래프 SVG, 저장 스키마는 변경하지 않았다.
- PASS: `workout/exercises.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z30-track-delta-pp`로 bump했다.

## 검증

- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/workout-track-graph-delta.test.js tests/workout-test-mode-unified.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run deploy:dashboard3`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 079212e`
- PASS: Dashboard3 Pages가 `tomatofarm-v20260624z30-track-delta-pp` 캐시 버전을 서빙하는 것을 확인했다.
- PASS: `https://aretenald2018-sys.github.io/dashboard3/` HTTP 200 확인.
- not verified yet: 배포 URL은 로그인 화면에 막혀 운동 탭 → 운동 카드 그래프의 `pp` 라벨 UI 클릭 흐름을 인증 계정으로 끝까지 확인하지 못했다.

## 잔여 리스크

- pp는 최근 6개 그래프 점의 최고값 대비 위치 변화다. 사용자가 절대 볼륨 차이(`+2.1t`)나 직전 대비 실제 값 차이를 원하면 별도 표기 정책이 필요하다.
- 배포 URL은 로그인 화면에 막힐 수 있어 실제 운동 카드의 작은 그래프 라벨 줄바꿈은 인증 계정으로 확인해야 한다.

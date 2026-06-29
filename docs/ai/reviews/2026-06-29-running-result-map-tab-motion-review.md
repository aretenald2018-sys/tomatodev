# 러닝 결과 지도/러닝 탭/홈 모션 수정 리뷰

## 결론

- 리뷰 결과: `pass`
- 계획 문서: `docs/ai/features/2026-06-29-running-result-map-tab-motion.md`
- 실행 Slice: `Slice 1`

## 확인한 변경

1. `render-calendar.js`
   - 운동 상세 하단 탭을 `1회차`, `2회차`, `러닝`으로 제한했다.
   - 러닝 탭은 `WORKOUT_RUNNING_SESSION_INDEX = 2`를 사용하고 헬스 세션 추가/타이머와 분리된다.
   - 러닝 상세 카드는 가짜 route grid와 중복 chip을 제거하고 `renderRunningMap` 기반 실제 지도 셸에 route를 표시한다.
   - 고도 상승, 평균 심박수, 케이던스는 값이 없을 때 `--`로 표시한다.

2. `workout/running-session.js`
   - 러닝 저장 session index를 `2`로 고정했다.
   - 저장 데이터의 memo 더미 문구를 제거했다.
   - VWorld reverse geocode로 동 단위 위치 라벨을 생성한다.
   - phone/watch bridge sensor snapshot hook으로 고도, 심박, 케이던스를 route point에 병합한다.

3. `style.css`
   - 홈 러닝 actor를 기존 홈 스프라이트 기반의 작은 제자리 러닝 애니메이션으로 조정했다.
   - 러닝 상세 지도와 위치 라벨, 러닝 전용 FAB/빈 상태 스타일을 추가했다.

## 발견 사항

- 중대/높음/중간 이슈: 없음.
- 낮은 리스크: VWorld reverse geocode 실패 시 `위치 확인 중`/`위치 정보 없음` 폴백만 표시된다. 지도 provider key 또는 네트워크 장애에서는 행정동 라벨이 즉시 확정되지 않을 수 있다.
- 낮은 리스크: 실제 watch SDK 연동은 이번 범위가 아니며, native/web bridge가 `window.__tomatoRunningSensors` 또는 `window.TomatoRunningSensors`로 값을 제공하는 계약만 열었다.

## 검증

1. PASS: `node --check workout/running-session.js; node --check render-calendar.js; node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
2. PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/home-life-zone-npc-quest.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js` — 42 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=857`
4. PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test $tests` — 594 tests passed
5. PASS: `git diff --check`
6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ cb7cf08ad4812bec572efdd304591db1d91caf8f` — `[deploy-verify] ok cb7cf08ad481 tomatofarm-v20260629z7-running-map-tab-motion static=226`
7. PASS: deployed markers — `sw.js` cache marker, `render-calendar.js` running tab/map markers, `workout/running-session.js` running index/place/sensor markers, `style.css` home motion/FAB markers

## 남은 검증

- not verified yet: 브라우저 탭 로딩이 60초 제한을 초과해 실제 `운동 탭 -> 러닝 탭 -> 러닝 시작/완료/저장 -> 상세 카드 지도` UI flow는 직접 확인하지 못했다.

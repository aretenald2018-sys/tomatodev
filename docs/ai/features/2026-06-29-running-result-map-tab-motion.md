# 러닝 결과 지도/러닝 탭/홈 모션 수정 계획

## 상태

- 상태: `complete`
- 작성일: `2026-06-29`
- 자동 트리거: `/diagnose`

## 요청 요약

홈탭 라이프존의 러닝 모션이 부자연스럽고, 러닝 완료/기록 화면의 지도와 정보 배치가 러닝 앱처럼 보이지 않는다. 운동 하단 `3회차` 탭은 제거하고 그 자리를 `러닝` 탭으로 바꿔 헬스 회차/운동 타이머와 러닝 측정 기록을 분리한다. 완료 지도와 저장 기록 지도는 실제 지도 위에 실제 GPS 점/선 궤적을 표시하고, 최소 동 단위 행정구역을 알 수 있게 한다. 고도 상승/평균 심박수/케이던스는 기기 데이터가 있으면 저장하고, 수집되지 않으면 `--`로 표시한다.

## /diagnose

### 확인한 원인

1. 홈 러닝 actor는 기존 이소메트릭 트랙 위에서 2프레임 측면 스프라이트를 크게 흔드는 방식이라 작은 화면에서 트랙과 맞지 않고 부자연스럽게 보인다.
2. 운동 상세 러닝 카드는 `wt-running-route-mini`가 CSS 격자와 가짜 선을 렌더한다. 실제 `workout/running-map.js` 지도 렌더러가 있는데 상세 카드에서 재사용하지 않는다.
3. 러닝 상세 카드에 `시간` 단독 카드, `오늘 러닝`, `경로 포인트`, `GPS 평균 정확도`, `대한민국 위치 기록`, `러닝 세션` 등 사용자가 X 표시한 중복/불필요 정보가 노출된다.
4. 러닝 완료 시 `placeSummary.label`이 `대한민국 위치 기록`으로 고정되어 동 단위 행정구역을 제공하지 않는다.
5. 하단 회차 탭은 `getWorkoutSessions(..., { minCount: 3 })`로 항상 `1회차/2회차/3회차`를 만든다. 러닝 저장도 현재 선택된 session index를 따라가 헬스 회차와 섞일 수 있다.
6. 고도는 GPS `coords.altitude`를 읽지만 값이 없을 때와 0m 상승을 구분하지 않는다. 심박/케이던스는 확장 센서 데이터 수용 경로가 없다.

## 실행 Slice 1

### 포함 범위

1. 홈 라이프존 러닝 actor
   - 스프라이트 크기/앵커/애니메이션을 트랙 위 제자리 러닝처럼 더 작고 안정적으로 보정한다.
   - 여러 명이 겹쳐 보이는 느낌을 줄이도록 프레임 전환과 body bounce를 약하게 조정한다.
2. 러닝 완료/저장 데이터
   - GPS altitude 데이터가 있으면 고도 상승을 계산하고, 없으면 `null`로 저장해 UI에서 `--`로 보이게 한다.
   - phone/watch/native bridge가 제공하는 심박/케이던스 값을 route point/summary에 수용한다.
   - VWorld reverse geocode로 centroid 기준 동 단위 행정구역 label을 `runPlaceSummary`에 저장한다. 실패 시 안전한 fallback을 둔다.
3. 운동 상세 러닝 카드
   - 가짜 격자 미니맵을 제거하고 `workout/running-map.js` 실제 지도 렌더러를 재사용한다.
   - 실제 route line/point를 지도 위에 표시한다.
   - 필요한 지표만 표출한다: 거리, 평균 페이스, 시간, 칼로리, 고도 상승, 평균 심박수, 케이던스, 행정구역.
   - X 표시된 중복 정보 칩/메모/가짜 요약을 제거한다.
4. 운동 하단 탭
   - `1회차`, `2회차`, `러닝` 탭으로 변경한다.
   - 러닝 탭은 내부 전용 session index에 저장하되 UI에서는 `3회차`를 노출하지 않는다.
   - 러닝 시작은 헬스 운동 타이머와 무관한 러닝 세션으로 열린다.
5. `STATIC_ASSETS` 변경에 맞춰 `sw.js` cache version을 bump한다.

### 제외 범위

- 러닝 통계 화면 재설계.
- 지도 provider 설정 UI 추가.
- 실제 watch SDK 연동 구현. 단, native/web bridge가 값을 주면 저장할 수 있는 hook은 만든다.
- 러닝 스프라이트 PNG 재생성. 이번 슬라이스는 기존 PNG를 사용하는 렌더링/애니메이션 보정으로 제한한다.

## 검증

1. PASS: `node --check workout/running-session.js; node --check render-calendar.js; node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
2. PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/home-life-zone-npc-quest.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js` — 42 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=857`
4. PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test $tests` — 594 tests passed
5. PASS: `git diff --check`
6. not verified yet: Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` 필요
7. not verified yet: 인증 계정 실제 `운동 탭 -> 러닝 탭 -> 러닝 시작/완료/저장 -> 상세 카드 지도` UI flow는 배포 URL에서 직접 확인 필요

## 실행 결과

1. 홈 라이프존 러닝 actor는 기존 홈탭 스프라이트 PNG를 유지하되 크기를 줄이고 트랙 위 제자리 러닝 프레임 애니메이션으로 변경했다.
2. 러닝 세션 저장은 항상 `WORKOUT_RUNNING_SESSION_INDEX = 2` 전용 트랙으로 저장되며, 하단 탭은 `1회차`, `2회차`, `러닝`으로 렌더링한다.
3. 저장된 러닝 상세 카드는 가짜 격자 미니맵과 중복 설명 칩을 제거하고 `renderRunningMap` 실제 지도 셸에 GPS route를 올린다.
4. VWorld reverse geocode로 동 단위 행정구역 라벨을 저장/표시하고, 실패 시에는 기록 내부 더미 문구 대신 `위치 확인 중` 또는 `위치 정보 없음`으로 폴백한다.
5. phone/watch bridge가 고도, 심박, 케이던스를 제공하면 route point에 저장하고, 수집되지 않으면 UI에서 `--`로 표시한다.
6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z7-running-map-tab-motion`으로 bump했다.

## 리뷰

`docs/ai/reviews/2026-06-29-running-result-map-tab-motion-review.md`

## 다음 실행 시작 프롬프트

`docs/ai/features/2026-06-29-running-result-map-tab-motion.md`의 Slice 1을 실행한다.

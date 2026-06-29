# 홈 라이프존 저장 러닝 상태 우선순위 수정 계획

## 상태

- 상태: `implemented`
- 요청: 문정토마토가 점심을 기록했는데도 홈 라이프존 하단 상태칩과 캐릭터가 계속 `러닝`으로 표시되는 문제를 수정한다.
- 분류: 버그/회귀 진단 후 수정.

## 진단

- 증상: 같은 날짜에 저장된 러닝 기록이 존재하면 이후 점심 기록이 저장되어도 홈 라이프존에서 `문정토마토 러닝`이 계속 표시된다.
- 원인: `home/life-zone-state.js`의 `resolveLifeZoneActivity()`가 `hasLifeZoneRunningActivity(dayData)`를 `lifeZoneLastActivity` 스냅샷보다 먼저 검사한다.
- 영향: `lifeZoneLastActivity: { state: 'diet', meal: 'lunch' }`가 정상 저장되어도, `running: true` 또는 저장된 `runRoute`가 있으면 `running`이 무조건 이긴다.
- 보존해야 할 동작: 실제 진행 중인 라이브 러닝(`runLiveActive`, `lifeZoneRunningLive`, `runStartedAt && !runEndedAt`)은 여전히 홈 트랙 러닝으로 표시되어야 한다.

## 실행 Slice 1

1. 라이브 러닝 판정과 저장된 러닝 기록 판정을 분리한다.
2. `resolveLifeZoneActivity()` 우선순위를 `라이브 러닝 -> 최신 lifeZoneLastActivity/lifeZone*Activity 스냅샷 -> 저장 러닝/운동 -> 식단 -> 업무`로 바꾼다.
3. `isValidLifeZoneSnapshotState()`에서 `running` 스냅샷은 저장된 러닝 기록도 유효하게 유지한다.
4. 러닝 저장 경로는 `lifeZoneWorkoutActivity`/`lifeZoneLastActivity`에 `running` 스냅샷을 남기도록 맞춘다.
5. 문정토마토 점심 기록이 저장 러닝보다 최신이면 `diet`와 `점심냠냠`으로 표시되는 회귀 테스트를 추가한다.
6. `home/life-zone-state.js`와 `workout/save.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` 캐시 버전을 갱신하고 관련 테스트 기대값을 맞춘다.

## 제외 범위

- 러닝 지도 렌더링, 러닝 스프라이트, 홈 좌표는 변경하지 않는다.
- 식단 저장 payload 구조는 변경하지 않는다.
- 완료된 러닝 기록 자체를 삭제하거나 숨기지 않는다.

## 검증

1. `node --check home/life-zone-state.js; node --check sw.js`
2. `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/save-schema.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `node --test tests/*.test.js`
5. `git diff --check`
6. `origin/main` 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 실행 결과

- `home/life-zone-state.js`에 `hasLifeZoneActiveRunning()`을 추가했다.
- 홈 상태 우선순위를 `라이브 러닝 -> 최신 활동 스냅샷 -> 저장 러닝 -> 운동 -> 식단 -> 업무`로 변경했다.
- `workout/save.js`에서 러닝 저장 시 `lifeZoneWorkoutActivity`와 `lifeZoneLastActivity`가 `state: 'running'`을 남기도록 변경했다.
- 문정토마토 점심 스냅샷이 저장 러닝 기록을 덮는 회귀 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z26-life-zone-running-priority`로 갱신했다.

## 로컬 검증

- PASS: `node --check home/life-zone-state.js; node --check workout/save.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/save-schema.test.js` — 95 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 608 tests passed
- PASS: `git diff --check`

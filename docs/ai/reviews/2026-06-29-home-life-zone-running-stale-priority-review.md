# 홈 라이프존 저장 러닝 상태 우선순위 수정 리뷰

## 결론

- 발견 사항: 없음.
- 저장된 러닝 기록이 최신 점심 기록을 무조건 이기던 원인을 제거했다.
- 진행 중인 라이브 러닝은 여전히 홈 트랙 러닝 상태를 최우선으로 유지한다.

## 확인한 변경

- `home/life-zone-state.js`
  - `hasLifeZoneActiveRunning()`으로 라이브/미종료 러닝만 분리 판정한다.
  - `resolveLifeZoneActivity()`가 최신 활동 스냅샷을 저장 러닝보다 먼저 보도록 변경했다.
- `workout/save.js`
  - 러닝 저장 시 `lifeZoneWorkoutActivity`와 `lifeZoneLastActivity`에 `state: 'running'`을 남긴다.
  - 이후 식단 저장이 들어오면 기존 merge 경로로 `lifeZoneLastActivity: diet`가 최신 상태가 된다.
- `tests/home-life-zone-state.test.js`
  - 문정토마토 점심 스냅샷이 저장 러닝 기록을 덮어 `diet`/`점심냠냠`으로 표시되는 회귀 테스트를 추가했다.
- `sw.js` 및 캐시 버전 테스트
  - `tomatofarm-v20260629z26-life-zone-running-priority`로 갱신했다.

## 검증

- PASS: `node --check home/life-zone-state.js; node --check workout/save.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/save-schema.test.js` — 95 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 608 tests passed
- PASS: `git diff --check`

## 남은 확인

- Dashboard3 Pages 배포 후 원격 자산에서 새 캐시 버전과 우선순위 변경 marker를 확인한다.

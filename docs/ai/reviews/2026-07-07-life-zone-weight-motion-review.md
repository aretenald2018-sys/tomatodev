# 2026-07-07 홈 라이프존 웨이트 모션 리뷰

## 범위

- 계획: `docs/ai/features/2026-07-07-life-zone-weight-motion.md`
- ULW: `.omo/ulw-loop/lifezone-weight-motion-20260707/goals.json`
- 변경 파일: `home/life-zone-state.js`, `tests/home-life-zone-state.test.js`, `sw.js`, 캐시 버전 assertion 테스트들, `docs/ai/NEXT_ACTION.md`

## 구현 확인

1. active running은 계속 `running` 상태와 트랙 슬롯을 유지한다.
2. saved running + 실제 웨이트 workout은 `workout` 상태로 전환한다.
3. saved running-only는 `running` 상태, `runningMap`, `running-track` sprite를 유지한다.
4. 웨이트 모션 선호도는 `chest -> bench`, `lower/glute -> squat`, `back -> lat`이다.
5. 근육 정보가 없는 default workout은 `lat` 고정이 아니라 `bench`부터 배정하고, 점유 시 다른 workout slot으로 fallback한다.
6. `home/life-zone-state.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 bump했다. 이후 같은 dirty worktree의 rest-counter slice가 현재 `CACHE_VERSION`을 `tomatofarm-v20260707z17-rest-counter`로 다시 올렸고, cache marker 테스트도 현재 `sw.js` 기준으로 동기화했다.

## 리뷰 중 발견 및 조치

1. 발견: `hasLifeZoneWorkoutActivity()`가 running/cardio 필드까지 workout으로 간주하므로 saved running-only가 `workout-lat`으로 오분류될 수 있었다.
   - 조치: running보다 우선할 수 있는 근거를 `hasLifeZoneWeightWorkoutActivity()`로 분리했다.
   - 회귀 테스트: `keeps saved running-only records on the running track`.
2. 발견: 근육 정보 없는 default workout이 여전히 `lat`으로 시작했다.
   - 조치: `DEFAULT_WORKOUT_SLOT_ID = 'bench'`를 추가하고, unknown/default workout actor의 첫 선호 슬롯을 `bench`로 바꿨다.
   - 회귀 테스트: `assigns separate slots for three actors in the same state`, `resolves activity priority and slot distribution from account days`.
3. 참고: `sw.js`에는 현재 작업 전부터 unrelated `./workout/wear-bridge.js` dirty change가 있어 diff에 함께 보인다. 이번 slice에서 의도한 `sw.js` 변경은 `CACHE_VERSION` bump다. 사용자 변경으로 간주해 되돌리지 않았다.

## Slop/Programming 리뷰 커버리지

1. Overfit 회귀 보강
   - 기존 happy-path 테스트만으로는 saved running-only 회귀를 놓쳤다.
   - `keeps saved running-only records on the running track`를 추가해 상태, 슬롯, sprite, `workoutSlotId`, `runningMap`까지 고정했다.
2. Predicate 분리
   - broad `hasLifeZoneWorkoutActivity()`를 러닝보다 우선하는 조건으로 재사용하지 않는다.
   - `hasLifeZoneWeightWorkoutActivity()`를 별도로 두어 실제 웨이트 근거만 running보다 우선할 수 있게 했다.
3. Default lat 제거
   - `DEFAULT_WORKOUT_SLOT_ID = 'bench'`로 default workout 시작 슬롯을 명시했다.
   - unknown/default actor 3명은 `bench -> lat -> squat`로 fallback하도록 테스트했다.
4. Scope hygiene
   - `www/`는 수정하지 않았다.
   - `data.js`/Firestore 경계는 건드리지 않았다.
   - `sw.js`의 unrelated `./workout/wear-bridge.js`는 현재 dirty worktree에 있던 별도 slice 변경으로, 이 작업에서 되돌리지 않았다.

## 검증

1. PASS: `node --test tests/home-life-zone-state.test.js` - 27 pass.
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` - 37 pass.
3. PASS: `node --check home/life-zone-state.js`, `node --check tests/home-life-zone-state.test.js`, `node --check sw.js`.
4. PASS: `npm.cmd run verify:assets` - current cache `tomatofarm-v20260707z17-rest-counter`, `[runtime-assets] ok refs=898`.
5. PASS: scoped `git diff --check -- home/life-zone-state.js tests/home-life-zone-state.test.js sw.js`.
6. PASS: Puppeteer DOM harness - `state=workout`, `slotId=bench`, `pose=workout-bench`, `sprite=jups-workout-bench.png`.

## 제한

- production Pages deploy/verify는 `not verified yet`이다. 현재 워크트리에 unrelated staged/unstaged 변경이 많아 이번 slice만 안전하게 commit/push할 수 없다.
- `npm.cmd run deploy:production` 시도 결과 `tracked working tree has uncommitted changes`로 중단됐다.
  - evidence: `.omo/evidence/lifezone-weight-motion-20260707/production-deploy-attempt.txt`
- broad `node --test tests/*.test.js`는 현재 별도 `workout-rest-counter` 테스트 실패가 있어 이 slice의 승인 근거로 쓰지 않았다.

## 게이트 결과

1. QA gate: PASS.
2. Code quality gate: PASS. 차단 이슈 없음. 참고: `home/life-zone-state.js`는 기존 oversized module이다.
3. Security/scope gate: PASS. 새 dependency, network, auth, Firestore write, storage, secret, HTML injection surface 없음.
4. Context/mined requirements gate: APPROVE.

## 결론

로컬 단위/정적/asset/DOM harness 및 리뷰 게이트 기준으로 요청 동작은 충족한다. production Pages 검증은 dirty worktree 정리 후 별도 수행이 필요하다.

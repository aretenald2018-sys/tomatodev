# 2026-07-07 홈 라이프존 웨이트 모션 우선순위 수정 계획

## 요청

홈 라이프존에서 달리기를 한 뒤 웨이트 기구 운동도 한 경우 캐릭터가 러닝이 아니라 웨이트 모션을 취해야 한다. 웨이트 모션 기본값은 랫풀다운 고정이 아니라 하체는 스쿼트, 가슴은 벤치프레스를 우선 배정하고, 해당 웨이트 위치가 다른 사용자에게 점유되어 렌더링할 수 없을 때만 다른 웨이트 모션으로 fallback한다.

## 진단 요약 (`/diagnose`)

1. `home/life-zone-state.js`의 `resolveLifeZoneActivity()`는 active running 이후에도 저장된 running 기록을 workout보다 먼저 선택한다.
2. `assignLifeZoneSlots()`는 workout actor를 `LIFE_ZONE_SLOTS.workout` 배열 순서대로 배정하므로 첫 workout actor의 기본 슬롯이 항상 `lat`이다.
3. `getLifeZoneWorkoutSpeech()`는 이미 `muscleId`, `muscleIds`, `movementId`로 가슴/등/하체 등 large muscle을 판별한다. 같은 판별축을 모션 선호도에도 재사용할 수 있다.
4. active running(`runLiveActive`, open `runStartedAt`)은 사용자가 현재 달리는 중인 상태라 기존처럼 러닝 트랙이 우선되어야 한다.

## 반증 가능한 가설

1. 저장된 러닝 기록이 웨이트보다 먼저 평가되어, 러닝 후 웨이트를 하면 상태가 `running`으로 남는다.
   - 증거: `resolveLifeZoneActivity()`가 `hasLifeZoneRunningActivity()`를 `hasLifeZoneWorkoutActivity()`보다 먼저 호출한다.
   - 수정: active running만 최우선으로 두고, snapshot이 없으면 workout을 saved running보다 먼저 평가한다.
2. 웨이트 모션 기본값이 랫풀다운인 이유는 슬롯 배정이 운동 부위를 보지 않고 workout slot counter만 쓰기 때문이다.
   - 증거: 첫 workout slot은 `lat`이고 actor dayData가 `assignLifeZoneSlots()`까지 전달되지 않는다.
   - 수정: actor state에 preferred workout slot ids를 담고, slot assigner가 선호 슬롯부터 비어 있는 웨이트 슬롯을 고른다.
3. 점유 fallback이 없으면 같은 가슴 운동 actor 2명이 모두 벤치에 겹치거나, 기존 counter 순서로 사용자의 의도와 무관한 슬롯이 먼저 선택된다.
   - 증거: 현재는 점유 set 없이 state별 counter만 사용한다.
   - 수정: workout slot id 점유를 추적해 preferred slot이 이미 쓰였으면 남은 workout slot으로 fallback한다.

## 실행 Slice 1

### 범위

1. `home/life-zone-state.js`
   - active running은 계속 러닝 우선으로 유지한다.
   - active running이 아닌 저장된 running과 workout이 함께 있으면 workout을 우선한다.
   - workout dayData에서 large muscle을 추출해 `chest -> bench`, `lower/glute -> squat`, `back -> lat`, `unknown/default -> bench` 선호 슬롯을 만든다.
   - workout slot 배정 시 선호 슬롯이 비어 있으면 사용하고, 이미 점유되어 있으면 다른 workout slot으로 fallback한다.
2. `tests/home-life-zone-state.test.js`
   - RED/GREEN으로 저장된 running+chest workout이 `workout-bench`를 렌더링하는지 고정한다.
   - lower workout은 `workout-squat`을 선호하고, 같은 preferred slot 점유 시 다른 workout slot으로 fallback하는지 고정한다.
   - active running은 workout 기록이 있어도 러닝 트랙을 유지하는 회귀 테스트를 유지/보강한다.
3. `sw.js`
   - `home/life-zone-state.js`가 `STATIC_ASSETS`에 포함되어 있으면 `CACHE_VERSION`을 bump한다.
4. `docs/ai/NEXT_ACTION.md`
   - 실행/리뷰 상태와 검증 결과를 갱신한다.

### 하지 않을 것

- 새 캐릭터 asset 생성.
- 기존 NPC/지도/러닝 버블 디자인 변경.
- 운동 저장 schema 또는 Firestore 저장 경계 변경.
- `www/` 직접 수정.

## 검증 계획

1. RED: `node --test tests/home-life-zone-state.test.js`가 새 요구 테스트에서 실패하는 것을 확인한다.
2. GREEN: `node --test tests/home-life-zone-state.test.js`.
3. 정적/회귀:
   - `node --check home/life-zone-state.js tests/home-life-zone-state.test.js sw.js`
   - `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js`
   - `npm.cmd run verify:assets`
   - `git diff --check`
4. 브라우저/시각 QA:
   - Puppeteer DOM harness로 375x812 홈 라이프존 actor가 `lz-actor--workout lz-actor--pose-workout-bench`와 `jups-workout-bench.png`를 렌더링하는지 캡처한다.
5. 운영 검증:
   - 현재 워크트리에 unrelated staged/unstaged 변경이 많아 `npm.cmd run deploy:production`은 깨끗한 tracked tree가 될 때만 가능하다.
   - 배포가 막히면 `not verified yet`으로 blocker를 명시하고, 로컬/정적 증거만 기록한다.

## 실행 결과

1. `resolveLifeZoneActivity()`는 active running을 최우선으로 유지하되, active running이 아닌 saved running + workout 동시 기록은 workout을 우선하도록 변경했다.
2. `resolveLifeZoneWorkoutSlotId()`를 추가해 실제 완료된 workout의 large muscle에서 preferred weight slot을 계산한다.
   - `chest -> bench`
   - `lower/glute -> squat`
   - `back/shoulder -> lat`
   - `unknown/default -> bench`
3. `assignLifeZoneSlots()`는 workout slot 점유를 추적하고, preferred slot이 이미 사용 중이면 같은 workout zone의 다른 slot으로 fallback한다.
4. `home/life-zone-state.js`가 `sw.js` `STATIC_ASSETS`에 포함되어 `CACHE_VERSION`을 bump했다. 이후 같은 dirty worktree의 rest-counter slice가 현재 `CACHE_VERSION`을 `tomatofarm-v20260707z17-rest-counter`로 다시 올렸고, cache marker 테스트도 현재 `sw.js` 기준으로 동기화했다.
5. 리뷰 중 발견된 saved running-only 회귀 가능성은 `hasLifeZoneWeightWorkoutActivity()`를 분리해 차단했다.

## 검증 결과

1. RED/GREEN: `node --test tests/home-life-zone-state.test.js`
   - RED: saved running + chest workout이 기존에는 `running`으로 남고, 첫 workout slot이 `lat`으로 배정되는 실패를 확인했다.
   - GREEN: 27 pass.
   - evidence: `.omo/evidence/lifezone-weight-motion-20260707/c001-red-green.txt`, `.omo/evidence/lifezone-weight-motion-20260707/c002-red-green.txt`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` - 37 pass.
3. PASS: `node --check home/life-zone-state.js`, `node --check tests/home-life-zone-state.test.js`, `node --check sw.js`.
4. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=895`.
5. PASS: scoped `git diff --check`.
6. PASS: 375x812 Puppeteer DOM harness에서 `lz-actor--workout lz-actor--pose-workout-bench`, `slotId=bench`, `sprite=jups-workout-bench.png`를 확인했다.
   - evidence: `.omo/evidence/lifezone-weight-motion-20260707/c001-browser.json`
   - screenshot: `.omo/evidence/lifezone-weight-motion-20260707/c001-browser-dom.png`
7. BROAD: `node --test tests/*.test.js`는 현재 별도 `tests/workout-rest-counter.test.js` 실패가 있어 이 slice의 승인 근거로 쓰지 않았다.
   - `tests/pwa-update-auto-reload.test.js`는 QA 재실행에서 단독 PASS로 확인됐다.
   - 이번 라이프존 모션 변경 파일과 직접 관련 없는 dirty worktree 실패다.
   - evidence: `.omo/evidence/lifezone-weight-motion-20260707/broad-node-test.txt`

## 운영 검증 상태

production Pages deploy/verify는 아직 `not verified yet`이다. 현재 워크트리에 unrelated staged/unstaged 변경이 많아 이번 slice만 안전하게 commit/push할 수 있는 상태가 아니므로, 로컬 정적/단위/DOM harness 증거만 남겼다.

## 다음 실행 프롬프트

`docs/ai/features/2026-07-07-life-zone-weight-motion.md` Slice 1을 실행한다. 변경 범위는 `home/life-zone-state.js`, `tests/home-life-zone-state.test.js`, `sw.js`, `docs/ai/NEXT_ACTION.md`, 리뷰 문서로 제한한다.

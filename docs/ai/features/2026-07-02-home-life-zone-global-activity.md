# 홈 라이프존 전역 최근 행동 반영 긴급 수정 계획

## 요청

- 다른 계정으로 로그인했을 때 상담실장 옆 소파에 현재 방문자가 보이지 않는다.
- 줍스 등 고정 라이프존 캐릭터가 식사 완료/운동/러닝 같은 최근 행동 대신 `다른 일 하는중`으로 보인다.
- 활성 캐릭터들의 최근 행동은 친구 관계나 현재 로그인 계정에 묶이지 않고 글로벌하게 반영되어야 한다.

## /diagnose

1. `home/life-zone.js`의 `_loadLifeZoneActorStates()`는 `self`와 `friend` actor만 오늘 workout 문서를 읽고, 친구가 아닌 고정 캐릭터는 `unreadable`로 남긴다.
2. `home/life-zone-state.js`의 `resolveLifeZoneActors()`는 `actor.canRead`가 false면 `dayByAccountId`를 무시하므로, 전역 캐릭터의 식단/운동 기록이 있어도 `office`로 떨어진다.
3. 상담 방문자 sprite는 신규/10일 복귀 현재 사용자에만 보이고, 현재 로그인 계정이 고정 라이프존 actor가 아닌 일반 계정이면 actor layer에도 visitor layer에도 표시되지 않는다.

## Slice 1

### 범위

- `home/life-zone-state.js`
- `home/life-zone.js`
- `tests/home-life-zone-state.test.js`
- `tests/home-life-zone-npc-quest.test.js`
- cache marker 테스트들
- `sw.js`
- `docs/ai/NEXT_ACTION.md`

### 구현

1. 고정 라이프존 roster에 매칭된 계정은 친구 여부와 무관하게 `global` source로 읽기 가능하게 처리한다.
2. `_loadLifeZoneActorStates()`에서 self를 제외한 모든 readable actor의 오늘 문서를 account id 후보로 읽는다.
3. 현재 로그인 계정이 고정 라이프존 actor가 아니면 상담실장 옆 visitor sprite를 표시한다.
4. `home/life-zone.js`와 `home/life-zone-state.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- Firestore schema 변경
- 라이프존 좌표/스프라이트 자산 변경
- 식단/운동 저장 payload 변경
- 친구/길드 UX 변경

### NPC_ASSET_WORKFLOW 체크

1. 홈 위치/좌표 변경: 없음. 기존 상담실장/visitor/actor 좌표를 유지한다.
2. 가구/트랙/캐릭터 겹침 변경: 없음. 렌더 여부와 상태 판정만 수정한다.
3. 신규 홈/모달 아트에셋: 없음.
4. NPC 전용 공간/소품 overlay: 변경 없음.
5. 시선/자세 변경: 없음.
6. 스프라이트 크기 변경: 없음.
7. 이름표/전구 DOM 구조: 변경 없음.
8. `home/life-zone.js`, `home/life-zone-state.js`는 `STATIC_ASSETS`에 포함된다.
9. `CACHE_VERSION` bump 필요.
10. 완료 증거: Dashboard3/운영계 Pages 배포 commit 확인, 배포 자산 marker 확인, 인증 계정 홈 라이프존에서 전역 actor 상태와 상담 visitor 확인.

### 검증

1. `node --check home/life-zone.js`
2. `node --check home/life-zone-state.js`
3. `node --check sw.js`
4. `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js`
5. `node scripts/verify-runtime-assets.mjs`
6. `node --test --test-reporter=dot tests/*.test.js`
7. `git diff --check`
8. 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
9. 운영계 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`

## 상태

- 상태: `ready_for_review`
- 현재 세션: Slice 1 구현 및 로컬 정적 검증 완료, 배포 검증 대기

## 실행 결과

1. `resolveLifeZoneRoster()`에서 계정이 매칭된 고정 actor를 `global` source로 분류하고 readable로 열었다.
2. 홈 라이프존 로더가 self를 제외한 모든 readable actor의 오늘 workout 문서를 읽도록 바꿨다.
3. 현재 로그인 계정이 고정 라이프존 actor가 아니면 상담실장 옆 visitor sprite가 표시되도록 `showCurrentUser` 판정을 추가했다.
4. `CACHE_VERSION`을 `tomatofarm-v20260702z16-life-zone-global-activity`로 bump하고 cache marker 테스트를 갱신했다.

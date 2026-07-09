# 2026-07-09 라이프존 식사 사진 말풍선

## 상태

- 상태: `ready_for_review_local_verified_production_not_verified`
- 요청: 식사 사진을 올린 경우 홈 라이프존 actor 말풍선에 `아침냠냠`/`점심냠냠` 같은 텍스트보다 해당 이미지를 작게 우선 표시한다.
- 범위: 홈 탭 `오늘의 라이프존` actor 말풍선만 변경한다. 식단 저장 schema, 사진 저장 방식, 식단 탭 사진 썸네일, 친구 피드 사진 렌더링은 바꾸지 않는다.

## 그릴 결과

- 핵심 질문: 사진이 있을 때 기존 `xx냠냠` 문구를 함께 보여야 하는가?
- 결정: 말풍선의 주 콘텐츠는 사진을 우선한다. `actor.speech` 텍스트는 fallback, title/aria, 테스트 호환용으로 유지한다.
- 핵심 질문: 어떤 식사 사진을 고를 것인가?
- 결정: 기존 `getLifeZoneDietSpeech()`가 고르는 식사와 같은 우선순위를 따른다. `lifeZoneLastActivity`/`lifeZoneDietActivity`의 meal이 유효하면 그 meal의 사진을 우선하고, snapshot이 없으면 기존처럼 기록된 끼니 역순 기준으로 선택한다.
- 남은 가정: 사진 업로드 저장 경로가 `bPhoto/lPhoto/dPhoto/sPhoto`와 `lifeZone*Activity.meal`을 기존 방식대로 보존한다.

## 코드베이스 확인

- `home/life-zone-state.js`
  - `MEALS`에 `photo` 필드가 이미 있다.
  - `hasLifeZoneDietActivity()`와 `mealHasRecord()`는 `bPhoto/lPhoto/dPhoto/sPhoto`만 있어도 식단 기록으로 판단한다.
  - `getLifeZoneDietSpeech()`는 snapshot meal 또는 기존 meal 역순으로 `아침냠냠`/`점심냠냠`/`저녁냠냠`/`간식냠냠`을 반환한다.
  - `resolveLifeZoneActors()`는 현재 `speech: getLifeZoneSpeech(dayData, state)`만 actor에 붙인다.
- `home/life-zone.js`
  - actor 렌더링 시 `actor.speech`가 있으면 `.lz-speech` div를 만들고 `textContent`로 문구만 넣는다.
  - running 상태는 별도 `lz-running-map-bubble`을 쓰므로 이번 변경에서 제외한다.
- `style.css`
  - `.lz-speech`는 92-132px 내 작은 텍스트 말풍선이며 `STATIC_ASSETS` 대상이다.
- `sw.js`
  - `home/life-zone.js`, `home/life-zone-state.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 이 셋 중 하나라도 바꾸면 `CACHE_VERSION`을 함께 bump한다.

## 실행 Slice 1

1. `tests/home-life-zone-state.test.js`에 RED 테스트를 추가한다.
   - `bPhoto/lPhoto/dPhoto/sPhoto`가 있는 식단 actor는 기존 `speech`를 유지하면서 새 사진 필드(예: `speechPhoto`)를 가진다.
   - snapshot meal이 `lunch`이고 `lPhoto`가 있으면 lunch 사진이 선택된다.
   - 사진이 없으면 새 사진 필드는 비어 있고 기존 `xx냠냠` fallback만 유지된다.
2. `tests/home-life-zone-npc-quest.test.js`에 RED 테스트를 추가한다.
   - `home/life-zone.js`가 `actor.speechPhoto`를 `actor.speech` 텍스트보다 먼저 렌더한다.
   - 말풍선 이미지에 안정적인 class, `alt`, `loading="lazy"`, `decoding="async"`가 있다.
   - `style.css`에 사진 말풍선/이미지의 고정 크기, `object-fit: cover`, border radius, overflow 방지가 있다.
3. `home/life-zone-state.js`에 사진 선택 helper를 추가한다.
   - 기존 meal 선택 로직과 같은 기준을 재사용해 diet actor에 `speechPhoto`를 붙인다.
   - 기존 `getLifeZoneDietSpeech()` 반환값과 기존 테스트 기대값은 유지한다.
4. `home/life-zone.js` 말풍선 렌더링을 사진 우선으로 바꾼다.
   - `actor.speechPhoto`가 있으면 `.lz-speech.lz-speech--photo` 안에 작은 `<img>`를 렌더한다.
   - 사진이 없으면 현재처럼 `actor.speech` 텍스트를 렌더한다.
   - actor title은 `displayName · actor.speech`를 유지해 텍스트 대체 정보를 잃지 않는다.
5. `style.css`에 `.lz-speech--photo`와 `.lz-speech-photo` 스타일을 추가한다.
   - 기존 TDS/Seed 표면감과 `.lz-speech` 위치 체계를 유지한다.
   - 모바일 360/390px에서 actor나 이름표와 과하게 겹치지 않도록 작고 안정적인 치수를 둔다.
6. `sw.js` `CACHE_VERSION`을 bump한다.

## 하지 않을 일

- 식단 저장 payload나 photo field 이름은 변경하지 않는다.
- 식단 탭의 사진 업로드 UI, AI 추정, lightbox, 삭제 동작은 변경하지 않는다.
- 러닝 지도 말풍선이나 NPC 전구 말풍선은 변경하지 않는다.
- 새 이미지 asset은 추가하지 않는다.

## 검증 계획

1. RED: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js`
2. PASS: `node --check home/life-zone-state.js && node --check home/life-zone.js && node --check sw.js`
3. PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js`
4. PASS: `npm.cmd run verify:assets`
5. PASS 목표: `node --test tests/*.test.js`
6. UI 검증: 홈 탭 `오늘의 라이프존`에서 식사 사진이 저장된 actor의 말풍선이 `xx냠냠` 텍스트 대신 작은 사진 썸네일을 표시하고, 사진 없는 식단 actor는 기존 텍스트를 유지한다.
7. 운영 배포 검증: 관련 변경만 안전하게 commit/push한 뒤 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`를 실행한다. 배포 URL에서 UI flow를 직접 확인하지 못하면 `not verified yet`으로 blocker를 남긴다.

## 실행 결과

1. `home/life-zone-state.js`
   - diet meal 선택을 `resolveDietMeal()`로 재사용하게 정리했다.
   - diet actor에 `speechPhoto`를 추가했다.
   - 기존 `speech` 텍스트는 fallback/alt/title 용도로 유지한다.
2. `home/life-zone.js`
   - `actor.speechPhoto`가 있으면 `.lz-speech--photo` 안에 `<img class="lz-speech-photo">`를 렌더한다.
   - 사진이 없으면 기존처럼 `actor.speech` 텍스트를 렌더한다.
3. `style.css`
   - 사진 말풍선을 작은 정사각 썸네일로 고정하고 `object-fit: cover`, `overflow: hidden`, 모바일 치수를 추가했다.
4. `sw.js`/`build-info.json`
   - 현재 checkout cache marker는 `tomatofarm-v20260709z6-life-zone-photo-like-flow`로 bump했다.

## 검증 결과

1. PASS RED: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js` 구현 전 신규 테스트 실패 확인.
2. PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/running-session-recovery-behavior.test.js` - 41 tests, 41 pass.
3. PASS: `node --test tests/*.test.js` - 760 tests, 760 pass.
4. PASS: `node --check home/life-zone-state.js; node --check home/life-zone.js; node --check sw.js; git diff --check; npm.cmd run verify:assets` - `runtime-assets ok refs=913`.
5. PASS rendered UI QA: `.omo/evidence/life-zone-meal-photo-bubble/mobile-390-rerun.png`, `wide-520-rerun.png`, `rerun-result.json`.
   - `bubbleText=""`, `imageAlt="점심냠냠"`, `objectFit="cover"`, console errors none.
6. not verified yet: production Pages commit/push/deploy verification was not run because this checkout has large pre-existing unrelated dirty changes and local `main` contains other ahead work.

## 다음 세션 시작점

리뷰 세션에서 이 slice 변경만 검토한다. 현재 worktree에는 이 요청 밖 변경이 많이 섞여 있고 local `main`도 upstream보다 앞서 있으므로 관련 변경만 안전하게 분리해 별도 commit/push한 뒤 production Pages에서 `홈 -> 오늘의 라이프존` 식사 사진 말풍선 flow를 확인한다.

# 2026-07-09 Life Zone Meal Photo Bubble

## 요청

식사 사진을 올린 경우 홈 `오늘의 라이프존` actor 말풍선에서 `아침냠냠`/`점심냠냠` 같은 텍스트보다 해당 이미지를 작게 우선 표시한다.

## 그릴 결과

- 핵심 질문: 사진 말풍선이 기존 diet speech meal 선택 기준을 따라야 하는가?
- 결정: 기존 `lifeZoneLastActivity`/`lifeZoneDietActivity` snapshot meal 우선순위와 fallback meal 순서를 그대로 따른다.
- 결정: 사진이 있으면 이미지가 우선 렌더되고, 기존 `speech` 텍스트는 fallback 및 alt text로 유지한다.
- 결정: 사진이 없으면 기존 `xx냠냠` 텍스트 말풍선을 그대로 유지한다.

## 실행 Slice 1

1. `home/life-zone-state.js`에서 diet speech meal 선택 로직을 helper로 분리하고, 선택된 meal의 `bPhoto`/`lPhoto`/`dPhoto`/`sPhoto`를 `speechPhoto`로 actor에 추가한다.
2. `home/life-zone.js`에서 `actor.speechPhoto`가 있으면 `.lz-speech--photo` 안에 `<img class="lz-speech-photo">`를 렌더한다.
3. `style.css`에 작은 사진 말풍선과 mobile 크기 규칙을 추가한다.
4. `tests/home-life-zone-state.test.js`, `tests/home-life-zone-npc-quest.test.js`에 사진 우선 렌더링과 텍스트 fallback 회귀 테스트를 추가한다.
5. `STATIC_ASSETS` 대상 파일 변경에 맞춰 `sw.js` `CACHE_VERSION`과 cache marker tests를 갱신한다.

## 범위 제외

- 식단 사진 업로드/저장 경로 변경.
- 라이프존 actor 배치 변경.
- 사진 확대 모달, 클릭 인터랙션, 새 data schema.

## 검증 계획

1. `node --check home/life-zone-state.js; node --check home/life-zone.js; node --check sw.js`
2. `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js`
3. `node --test tests/*.test.js`
4. `npm.cmd run verify:assets`
5. 렌더ed UI QA: 식사 사진이 있는 diet actor 말풍선은 텍스트 없이 작은 사진을 표시하고, 사진 없는 actor는 기존 텍스트를 표시한다.
6. Production Pages 검증: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`

## 상태

- 상태: `complete`
- 작업트리: `C:\Users\USER\Desktop\Tomato Project\tomatofarm-deploy-life-zone-meal-photo`

## 실행 결과

1. `resolveLifeZoneActors()`가 diet actor에 `speechPhoto`를 추가한다.
2. 사진 선택 기준은 기존 diet speech meal 선택 기준과 동일하다.
3. `home/life-zone.js`는 `actor.speechPhoto`가 있으면 사진 `<img>`를 렌더하고, 없을 때만 기존 `speech` 텍스트를 렌더한다.
4. 사진 말풍선은 mobile 34px, wider viewport 40px image box로 렌더되며 `object-fit: cover`를 적용한다.
5. `sw.js` cache version은 `tomatofarm-v20260709z5-life-zone-meal-photo`로 갱신했다.

## 검증 결과

1. PASS: `node --check home/life-zone-state.js; node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js` - 39 pass.
3. PASS: `npm.cmd run verify:assets` - `runtime-assets ok refs=903`.
4. PASS: `git diff --check`.
5. PASS: nonblocked broad tests - 696 pass.
6. PASS rendered UI QA: `.omo/evidence/life-zone-meal-photo-bubble/clean-render-result.json`
   - mobile 390: `photoBubbleCount=1`, `bubbleText=""`, `imageAlt="점심냠냠"`, `imageWidth=34`, `imageHeight=34`, `objectFit="cover"`.
   - wide 520: `photoBubbleCount=1`, `bubbleText=""`, `imageAlt="점심냠냠"`, `imageWidth=40`, `imageHeight=40`, `objectFit="cover"`.
7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 992e1981b1708366cafb119581491ff25ca54b84` - `[deploy-verify] ok 992e1981b170 tomatofarm-v20260709z5-life-zone-meal-photo static=260`.
8. PASS production rendered UI QA: `https://aretenald2018-sys.github.io/tomatofarm/life-zone-photo-qa.html` harness with deployed `home/life-zone.js`/`style.css` and mocked `data.js` rendered `photoBubbleCount=1`, `bubbleText=""`, `imageAlt="점심냠냠"`, `objectFit="cover"`, console messages none. Evidence: `.omo/evidence/life-zone-meal-photo-bubble/production-render-result.json`.
9. not verified yet: full `node --test tests/*.test.js`는 현재 `origin/main` 기준에서도 필요한 Wear Android 파일이 없고 별도 worktree에 `puppeteer`가 설치되지 않아 관련 테스트가 import/파일 접근 단계에서 실패한다.

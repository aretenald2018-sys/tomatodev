# 2026-07-09 라이프존 사진 확대 및 좋아요 플로우

## 상태

- 상태: `ready_for_review_local_verified_production_not_verified`
- 요청: 홈 `오늘의 라이프존`에서 식사 사진 말풍선을 누르면 사진을 크게 볼 수 있는 모달/바텀시트를 열고, 열린 사진을 더블클릭하면 인스타그램 좋아요처럼 하트가 표시되게 한다. 닫힌 상태에서도 말풍선의 좋아요를 누르면 말풍선에서 하트가 흐르는 모션을 보여준다.
- 범위: 홈 탭 `오늘의 라이프존`의 diet actor 사진 말풍선만 변경한다. 식단 저장 UI, 사진 저장 schema, 러닝 지도 말풍선, NPC 퀘스트 말풍선은 바꾸지 않는다.

## 그릴 결과

- 핵심 질문: 확대 UI는 모달과 바텀시트 중 무엇을 쓸 것인가?
- 결정: 기존 TDS Mobile 흐름에 맞춰 모바일은 하단 바텀시트형 lightbox, 넓은 화면은 중앙 modal처럼 보이는 같은 컴포넌트로 구현한다. 배경 탭, 닫기 버튼, `Escape` 닫기를 지원한다.
- 핵심 질문: `좋아요`는 실제 저장되는 소셜 리액션인가, 아니면 사진에서만 보이는 시각 효과인가?
- 사용자 결정: `저장형`.
- 결정: 기존 `_likes`/`toggleLike()` 리액션 저장소를 재사용해 실제 좋아요로 저장한다. 식사 사진 field는 기존 친구 프로필과 맞춰 `meal_breakfast`, `meal_lunch`, `meal_dinner`, `meal_snack`을 사용한다.
- 남은 가정: 기존 식사 사진 말풍선 slice의 `actor.speechPhoto`와 meal 선택 기준은 유지한다.

## 코드베이스 확인

- `docs/ai/features/2026-07-09-life-zone-meal-photo-bubble.md`
  - 현재 slice에서 `actor.speechPhoto`가 추가됐고, 사진이 있으면 `.lz-speech--photo` 안에 `.lz-speech-photo` 이미지를 렌더한다.
  - production Pages 검증은 아직 `not verified yet`이며, worktree에 이 요청 밖 변경이 섞여 있다.
- `home/life-zone-state.js`
  - `MEALS`의 `text` 값은 `breakfast/lunch/dinner/snack`이고, 친구 프로필의 식사 reaction field와 바로 연결 가능하다.
  - `resolveDietMeal()`은 현재 사진 말풍선이 어떤 끼니를 대표하는지 이미 결정한다.
- `home/life-zone.js`
  - 현재 사진 말풍선은 `div.lz-speech.lz-speech--photo`이며 `pointer-events: none` 상태라 클릭/좋아요를 받으려면 구조를 바꿔야 한다.
  - 이미 `TODAY`, `dateKey`, `getCurrentUser`, `getFriendWorkout`, `getMyFriends`, `getAccountList`를 `data.js`에서 가져온다. 저장형 좋아요를 쓰면 `toggleLike`/`getLikes` import가 추가된다.
- `home/friend-profile.js`
  - 식사 리액션 field는 `meal_${memo}` 형식이다. 예: `meal_lunch`.
  - 좋아요/리액션 count는 `getLikes(friendId, dateKey)` 결과에서 `field`로 필터링한다.
- `data/data-social-interact.js`
  - `toggleLike(targetUserId, dateKey, field, emoji)`는 `_likes`에 저장하고 다른 사용자 대상이면 알림을 보낸다.
  - 같은 user/date/field를 다시 누르면 삭제되고, emoji만 바뀌면 merge한다.
- `style.css`
  - `.lz-speech`는 현재 말풍선 스타일이고 `.lz-speech--photo`는 40px/34px 썸네일이다.
  - `style.css`, `home/life-zone.js`, `home/life-zone-state.js`는 `sw.js` `STATIC_ASSETS` 대상이므로 변경 시 `CACHE_VERSION`을 bump한다.

## 실행 Slice 1

1. 테스트를 먼저 추가한다.
   - `tests/home-life-zone-state.test.js`: diet actor가 `speechPhoto`와 함께 대표 meal/like field를 제공하는지 고정한다.
   - `tests/home-life-zone-npc-quest.test.js`: 사진 말풍선이 클릭 가능한 preview button과 독립적인 like button을 렌더하고, nested button이 없으며 inline `onclick=`을 쓰지 않는지 고정한다.
   - CSS 테스트: `.lz-photo-preview-sheet`, `.lz-photo-like-btn`, `.lz-heart-stream`, `@keyframes lzHeartFloat`, `prefers-reduced-motion` 처리를 고정한다.
2. `home/life-zone-state.js`에 사진 말풍선 meta를 추가한다.
   - 기존 `resolveDietMeal()` 기준을 재사용한다.
   - `speechPhotoMeal`과 `speechLikeField`를 actor에 붙인다.
   - 사진이 없으면 meta도 비워 기존 텍스트 fallback을 유지한다.
3. `home/life-zone.js` 사진 말풍선 구조를 클릭 가능하게 바꾼다.
   - 전체 말풍선을 button 안에 button이 들어가는 구조로 만들지 않는다.
   - 사진 preview button은 클릭 시 확대 sheet를 연다.
   - 별도 heart button은 닫힌 상태에서 좋아요/하트 플로우를 실행한다.
   - 사진 preview sheet는 닫기 버튼, backdrop 닫기, `Escape` 닫기, focus 가능한 기본 구조를 가진다.
4. 좋아요/하트 플로우를 구현한다.
   - 열린 preview image의 `dblclick`과 모바일 double-tap을 같은 handler로 연결한다.
   - 닫힌 말풍선의 heart button도 같은 하트 플로우를 말풍선 좌표에서 실행한다.
   - 애니메이션은 `transform`/`opacity`만 사용한다.
   - `prefers-reduced-motion: reduce`에서는 floating stream 대신 즉시 하트 상태만 표시한다.
5. 저장형 좋아요로 확정되면 기존 social API를 연결한다.
   - `toggleLike(actor.accountId, todayKey, actor.speechLikeField, reactionString)`를 사용하되, `reactionString`은 사용자 결정으로 확정된 값만 넣는다.
   - 좋아요 성공/해제 결과를 button `aria-pressed`와 sheet 상태에 반영한다.
   - 저장 실패 시 하트 모션은 되돌리지 않고 작은 error toast 또는 console-safe fallback만 둔다.
   - 사용자가 visual-only를 선택하면 이 단계는 제외하고 현재 렌더 내 상태만 유지한다.
6. `style.css`에 TDS Mobile/Tomato Farm 토큰 기반 스타일을 추가한다.
   - 썸네일은 현재 40px/34px 밀도를 유지하고 hit target만 안정화한다.
   - sheet는 기존 modal/sheet depth 규칙을 따른다.
   - heart icon은 emoji가 아니라 SVG/마스크 기반으로 렌더한다.
7. `sw.js` `CACHE_VERSION`과 cache marker 기대값을 bump한다.
   - 필요 시 `build-info.json`도 `scripts/generate-build-info.mjs` 기준으로 동기화한다.

## 하지 않을 일

- 식단 사진 저장 payload, AI 추정, 식단 탭 사진 UI는 변경하지 않는다.
- 사진 파일을 새로 생성하거나 업로드 경로를 바꾸지 않는다.
- 친구 프로필/피드의 리액션 picker 자체를 리디자인하지 않는다.
- 이번 slice에서 좋아요 수 상세 팝업이나 댓글 UI를 새로 만들지 않는다.
- `www/`는 직접 수정하지 않는다.

## 검증 계획

1. RED: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js`
2. PASS: `node --check home/life-zone-state.js && node --check home/life-zone.js && node --check sw.js`
3. PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js`
4. PASS: `npm.cmd run verify:assets`
5. PASS: `node --test tests/*.test.js`
6. UI 검증: 홈 탭 `오늘의 라이프존`에서 식사 사진 말풍선 클릭 -> 확대 sheet 표시 -> 열린 사진 더블클릭/더블탭 -> 하트 표시 -> 닫힌 말풍선 heart button -> 말풍선에서 하트 stream 표시.
7. 운영 배포 검증: 관련 변경만 안전하게 commit/push한 뒤 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`를 실행한다. 배포 URL에서 UI flow를 직접 확인하지 못하면 `not verified yet`으로 blocker를 남긴다.

## 다음 세션 시작점

리뷰 세션에서 이 slice 변경만 검토한다. production Pages 검증은 이 checkout에 다른 요청의 대량 dirty worktree가 섞여 있으므로 관련 변경만 안전하게 분리한 뒤 진행한다.

## 실행 결과

1. `resolveLifeZoneActors()` diet actor에 `speechPhotoMeal`과 `speechLikeField`를 추가했다. 사진이 없으면 기존 텍스트 fallback을 유지한다.
2. `home/life-zone.js` 사진 말풍선은 preview button과 별도 heart button을 렌더한다. nested button이나 inline `onclick=`은 쓰지 않는다.
3. preview button 클릭 시 `#life-zone-photo-preview-modal`이 열리고, sheet는 `role="dialog"`/`aria-modal="true"`와 닫기 버튼, backdrop 닫기, `Escape` 닫기를 지원한다.
4. 열린 사진 double-click/double-tap은 `toggleLike(actor.accountId, todayKey, actor.speechLikeField, '❤')` 저장형 좋아요를 실행하고, preview와 닫힌 말풍선 버튼 상태를 동기화한다.
5. 닫힌 말풍선 heart button도 같은 저장형 좋아요와 하트 stream 모션을 실행한다.
6. `style.css`에 preview sheet, heart button, `lzHeartFloat` stream, reduced-motion 대응을 추가했다.
7. `sw.js`/`build-info.json` cache version은 `tomatofarm-v20260709z6-life-zone-photo-like-flow`로 bump했고, cache marker tests를 같은 값으로 맞췄다.

## 검증

1. PASS RED: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js`가 구현 전 `speechPhotoMeal`/preview/like 계약 부재로 실패.
2. PASS: `node --check home/life-zone-state.js && node --check home/life-zone.js && node --check sw.js`.
3. PASS: `npm.cmd run verify:assets` - `runtime-assets ok refs=913`.
4. PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js` - 40 tests, 40 pass.
5. PASS browser UI QA: `node .omo/evidence/life-zone-photo-preview-like-flow/capture.mjs`.
   - `mobile-390`/`wide-520`에서 rest, preview-open, double-like-mid/settled, bubble-like-mid/settled를 캡처했다.
   - preview sheet: `modalOpen=true`, `role=dialog`, `aria-modal=true`.
   - double-like: `toggleLike` call `{ targetUserId: "u1", dateKey: "2026-07-09", field: "meal_lunch", emoji: "❤" }`, `heartParticleCount=6`.
   - 닫힌 말풍선 like: 같은 field로 저장 토글, `heartParticleCount=6`.
   - Evidence: `.omo/evidence/life-zone-photo-preview-like-flow/visual-qa-result.json`, `mobile-390-preview-open.png`, `mobile-390-double-like-mid.png`, `mobile-390-bubble-like-mid.png`, wide viewport screenshots.
6. PASS with CRLF warnings only: `git diff --check`.
7. not verified yet: `node --test tests/*.test.js`는 이 요청 밖 Wear 러닝 live pages 대기 slice의 `runMetricPager` 기대값 미구현으로 실패한다. 이 slice의 focused tests는 통과했다.
8. not verified yet: production Pages commit/push/deploy 검증은 이 checkout에 다른 요청의 대량 dirty worktree와 local ahead work가 섞여 있어 수행하지 않았다.

## 리뷰 피드백 Fix Slice

- 요청: 첨부 스크린샷 기준 닫힌 사진 말풍선의 하트 주변 원형을 제거하고, 말풍선 안 사진이 꽉 차게 하며, 밑동이 마름모가 아닌 말풍선 꼬리처럼 보이게 한다.
- 진단 가설:
  1. 하트 주변 원형은 `.lz-photo-like-btn`의 흰 배경, 테두리, shadow가 닫힌 말풍선에도 공통 적용되어 발생한다.
  2. 사진이 꽉 차지 않는 문제는 `.lz-speech-photo-btn`의 `padding: 2px` 때문에 썸네일 이미지가 안쪽으로 밀려 발생한다.
  3. 마름모 밑동은 `.lz-speech::after`가 8px 정사각형을 `rotate(45deg)`로 회전해 만든 형태라 발생한다.
- 실행 범위:
  1. `style.css`에서 닫힌 사진 말풍선의 하트 버튼만 투명 icon button으로 보이게 한다. preview sheet의 큰 좋아요 버튼은 유지한다.
  2. `style.css`에서 사진 버튼 padding을 제거해 이미지가 말풍선 내부를 채우게 한다.
  3. `style.css`에서 말풍선 꼬리를 회전 정사각형이 아닌 아래쪽 삼각형/곡선형 꼬리로 바꾼다.
  4. `tests/home-life-zone-npc-quest.test.js`에 세 CSS 계약을 고정한다.
  5. `sw.js` `CACHE_VERSION`과 cache marker 기대값을 bump한다.
- 하지 않을 일: 좋아요 저장 로직, preview modal 구조, 식단 사진 저장 schema, actor 배치는 바꾸지 않는다.
- 검증 계획:
  1. RED: `node --test tests/home-life-zone-npc-quest.test.js`
  2. PASS: `node --check home/life-zone.js && node --check sw.js`
  3. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js`
  4. PASS: `npm.cmd run verify:assets`
  5. UI 검증: `.omo/evidence/life-zone-photo-preview-like-flow/capture.mjs`로 `mobile-390`/`wide-520`에서 하트 버튼 배경/테두리/shadow 제거, 사진 버튼 padding 0, 말풍선 꼬리 rotate 없음, preview/like flow 유지 확인.

## 리뷰 피드백 Fix 실행 결과

1. `style.css`에서 `.lz-speech::after`의 회전 정사각형 꼬리를 `clip-path: polygon(...)` 기반 아래쪽 꼬리로 바꿨다.
2. `.lz-speech-photo-btn` padding을 `0`으로 바꿔 사진이 말풍선 내부를 채우게 했다.
3. 닫힌 사진 말풍선 안의 `.lz-photo-like-btn`만 투명 icon button으로 오버라이드해 하트 주변 원형 배경/테두리/shadow를 제거했다. preview sheet의 큰 좋아요 버튼은 유지했다.
4. 모바일 `@media (max-width: 420px)`에서 `.lz-speech` padding이 사진 말풍선에 재적용되지 않도록 `.lz-speech--photo`에 `max-width: none`과 `padding: 0`을 다시 고정했다.
5. `tests/home-life-zone-npc-quest.test.js`에 padding, heart surface, tail shape, mobile override 계약을 추가했다.
6. `sw.js`/`build-info.json` cache version과 cache marker tests는 `tomatofarm-v20260709z9-life-zone-photo-bubble-polish` 기준으로 동기화됐다.
7. `.omo/evidence/life-zone-photo-preview-like-flow/capture.mjs`에 bubble 자체 padding과 사진 버튼 padding, 하트 surface, tail shape를 computed style로 검증하는 assertion을 추가했다.

## 리뷰 피드백 Fix 검증

1. PASS RED: `node --test tests/home-life-zone-npc-quest.test.js`가 CSS 계약 추가 직후 기존 CSS에서 실패했다.
2. PASS: `node --check home/life-zone.js && node --check sw.js && node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js && npm.cmd run verify:assets` - 40 tests pass, `runtime-assets ok refs=913`.
3. PASS UI QA: `node .omo/evidence/life-zone-photo-preview-like-flow/capture.mjs`
   - `mobile-390`: rest bubble `36x36`, `bubblePaddingTop/Left=0px`, `speechPhotoButtonPaddingTop/Left=0px`, heart background transparent/border 0/shadow none, tail polygon + translate-only transform.
   - `wide-520`: rest bubble `42x42`, same padding/heart/tail metrics.
   - preview/double-like/bubble-like flow 유지: `role=dialog`, `aria-modal=true`, `field="meal_lunch"`, `heartParticleCount=6`, console/page errors none.
4. PASS: 독립 visual QA pass A/B 재리뷰 모두 PASS, blocking 없음.
5. PASS: `git diff --check && node --test tests/*.test.js` - 771 tests, 771 pass.
6. not verified yet: production Pages commit/push/deploy 검증은 이 checkout의 unrelated dirty worktree와 현재 `sw.js` cache version에 다른 변경(`direct-apk-download`)이 함께 반영된 상태라 이번 요청만 분리해 수행하지 않았다.

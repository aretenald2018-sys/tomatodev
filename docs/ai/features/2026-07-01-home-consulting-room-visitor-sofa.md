# 홈 라이프존 상담실 방문자 소파 연출

## 상태

- 상태: `complete`
- 요청일: 2026-07-01
- 실행 슬라이스: Slice 1 구현/리뷰/개발계 배포 완료

## 사용자 요청

현재 상담실장이 소파 앞에 서 있으므로, 해당 소파를 1인용 소파로 바꾸고 상담실장이 거기에 앉아 있게 한다. 맞은편에는 현재 놓여 있는 소파가 상담실장을 마주보는 형태로 배치되어야 하며, 10일 이상 미접속 유저 또는 신규유저가 방문하면 그 맞은편 소파에 앉아 있는 것처럼 보이는 스프라이트를 만든다. 미접속/신규 유저는 기존 라이프존 캐릭터와 같은 모습이지만 상의 색만 회색 계열로 처리한다.

## 이해한 내용

- 목표: 홈 라이프존 우측 하단 상담 코너를 `상담실장 1인용 소파`와 `방문자 맞은편 소파` 구도로 바꾸고, 조건을 만족한 현재 로그인 사용자를 회색 상의 방문자 스프라이트로 표시한다.
- 비목표: 상담실장 모달 내용 변경, 기존 트레이너/미란다/러닝/운동/식단 캐릭터 상태 판정 변경, Firestore schema 변경, `www/` 직접 수정, 운영계 `tomatofarm` remote 배포.
- 사용자 흐름: 신규 사용자가 홈에 들어오거나 10일 이상 미접속 후 돌아온 사용자가 홈에 들어온다 -> 라이프존 우측 하단 상담 코너에서 상담실장이 1인용 소파에 앉아 있고, 사용자는 회색 상의 방문자 스프라이트로 맞은편 소파에 앉아 보인다.
- 데이터 가정: 방문자는 전체 `_accounts` 중 임의 선정하지 않고 현재 로그인한 사용자를 기준으로 판정한다. 10일 복귀 판정은 `app.js`가 초기화 초기에 저장된 이전 `lastLoginAt` snapshot인 `previousLastLoginAt`을 라이프존에 전달해 사용한다.

## 그릴 결과

- 적용 트리거: `/grill-me`
- 핵심 질문: “10일 이상 미접속 유저 또는 신규유저”를 전체 계정 중 후보로 볼 것인가, 현재 방문한 사용자의 상태로 볼 것인가?
- 추천 답변: 현재 방문한 로그인 사용자의 상태로 본다. “방문시”라는 표현과 상담 코너 UX상 사용자가 상담실에 온 장면으로 읽는 것이 자연스럽고, 임의의 다른 계정을 홈에 노출하면 의도하지 않은 개인정보/사회적 맥락이 생긴다.
- 사용자 답변: 명시 답변 없음.
- 확정된 결정: 현재 사용자 기준으로 구현한다. `previousLastLoginAt` 기준 10일 이상 공백이면 `returning`, `createdAt` 기준 7일 이내이거나 이전 로그인 기록이 없는 첫 방문이면 `new`로 표시한다. 둘 다 아니면 방문자 스프라이트는 숨긴다.
- 남은 가정: 인증 세션이 없어 실제 홈 UI를 배포 URL에서 끝까지 클릭/시각 확인하지 못하면, 정적 검증과 Dashboard3 Pages 자산 검증을 완료한 뒤 `not verified yet`과 blocker를 기록한다.

## NPC 아트 워크플로 체크리스트

1. 홈 위치: 기존 `1672x1672` 라이프존 기준 우측 하단 상담 라운지 영역. 초기 후보는 상담 가구 overlay `left: 1138`, `top: 1310`, `width: 430`, 상담실장 seated sprite `left: 1370`, `top: 1360`, `width: 92`, 방문자 sprite `left: 1232`, `top: 1402`, `width: 116` 기준으로 잡는다.
2. 겹침: 기존 우측 하단 소파/테이블 위를 상담 코너 overlay로 덮어 자연스럽게 재배치한다. 러닝트랙, 미란다 코너, 트레이너 데스크, 일반 actor 슬롯과 겹치지 않는다.
3. 홈 배치용 스프라이트와 모달용 아트에셋: 홈용으로 상담 가구 overlay, 앉은 상담실장, 회색 상의 방문자 sprite를 만든다. 기존 상담실장 모달 PNG는 변경하지 않는다.
4. NPC 전용 공간/소품 overlay: 필요하다. 기존 베이스룸 전체를 다시 그리지 않고 `assets/home/life-zone/ui/consulting-room-sofas.png` 투명 overlay로 우측 하단 소파 구도만 덮는다.
5. 시선/자세: 상담실장은 1인용 소파에 앉아 맞은편 방문자를 바라본다. 방문자는 기존 actor와 같은 아이소메트릭 반픽셀/픽셀 화풍으로 맞은편 소파에 앉아 상담실장을 바라본다.
6. 스프라이트 크기 기준: 기존 상담실장 홈 PNG는 `96x256`이고 현재 CSS 기준 폭은 `56`. 새 seated 상담실장은 가로폭 기준 `80-100`, 방문자는 기존 actor seated office PNG `256x384` 표시 폭 `148-154`보다 작게 `110-125` 기준으로 잡아 소파 위에 앉아 보이게 한다.
7. 이름표와 전구: 상담실장 이름표는 기존 DOM `lz-nameplate--npc`를 유지한다. 방문자 sprite는 배경 연출용이므로 이름표와 전구를 만들지 않는다.
8. 새 PNG/JS/CSS의 `STATIC_ASSETS`: `home/life-zone.js`, `home/life-zone-state.js`, `app.js`, `style.css`, 새 PNG 3개가 캐시 영향권이다.
9. `CACHE_VERSION`: `sw.js` `STATIC_ASSETS`에 새 PNG를 등록하고, `home/life-zone.js`, `home/life-zone-state.js`, `app.js`, `style.css` 변경과 함께 반드시 bump한다.
10. 완료 증거: Dashboard3 Pages `https://aretenald2018-sys.github.io/dashboard3/`가 배포 commit과 새 cache version/assets를 반환하고, 신규 또는 10일 복귀 상태에서 홈 라이프존 우측 하단에 상담실장 seated + 회색 상의 방문자 seated 구도가 보인다.

## 결정 기록

- 결정: 베이스룸 PNG를 직접 다시 그리지 않고, 우측 하단 상담 코너를 별도 transparent overlay와 seated sprites로 덮는다.
- 이유: `base-room-expanded-alpha.png`는 큰 공용 자산이고 기존 운동/러닝/업무/미란다 배치의 기준이므로, 작은 상담 코너 변화에 전체 베이스룸을 교체하면 회귀 범위가 커진다.
- 결정: 방문자 조건은 현재 로그인 사용자 기준의 세션 연출로 구현한다.
- 이유: 기존 `app.js`에는 `previousLastLoginAt`이 이미 있고, welcome-back/tutorial 흐름과 같은 방문 맥락을 활용할 수 있다.
- 되돌릴 수 있는가: 가능. 새 PNG 3개, 라이프존 방문자 context/helper, DOM/CSS overlay, tests, `sw.js` 등록을 제거하면 된다.

## 실행 슬라이스

### Slice 1: 상담 코너 seated 구도와 방문자 표시

- 목표: 우측 하단 상담 코너를 1인용 소파에 앉은 상담실장과 맞은편 회색 상의 방문자 구도로 바꾼다.
- 범위:
  1. imagegen built-in 경로로 `consulting-room-sofas.png`, `consulting-chief-npc-seated-home.png`, `consulting-visitor-gray-shirt-home.png`를 만든다.
  2. 크로마키 제거 후 RGBA 투명 PNG로 `assets/home/life-zone/ui/`에 저장하고 PNG header를 테스트한다.
  3. `app.js`에서 `previousLastLoginAt`, `createdAt`, 현재 사용자 id를 라이프존 방문자 context로 전달한다.
  4. `home/life-zone-state.js`에 `resolveLifeZoneConsultingVisitor()` 순수 함수를 추가해 `new`/`returning`/hidden 판정을 테스트한다.
  5. `home/life-zone.js`에 상담 가구 overlay, seated 상담실장 이미지 경로, 방문자 layer 렌더링을 추가한다.
  6. `style.css`에서 우측 하단 상담 코너 좌표, z-index, 모바일 크기, 방문자 hidden/visible 상태를 조정한다.
  7. `sw.js` `STATIC_ASSETS`와 `CACHE_VERSION`을 갱신한다.
  8. 회귀 테스트에 DOM marker, CSS 좌표, 방문자 판정, PNG header, cache 등록을 추가한다.
- 예상 수정 파일:
  - `app.js`
  - `home/life-zone.js`
  - `home/life-zone-state.js`
  - `style.css`
  - `sw.js`
  - `assets/home/life-zone/ui/consulting-room-sofas.png`
  - `assets/home/life-zone/ui/consulting-chief-npc-seated-home.png`
  - `assets/home/life-zone/ui/consulting-visitor-gray-shirt-home.png`
  - `tests/home-life-zone-state.test.js`
  - `tests/home-life-zone-npc-quest.test.js`
  - cache version을 직접 assert하는 관련 테스트 파일
  - `docs/ai/NEXT_ACTION.md`
- 수정하지 말 것:
  - `www/`
  - `base-room-expanded-alpha.png` 등 베이스룸 원본
  - 기존 상담실장 모달 PNG와 모달 JS 내용
  - 기존 트레이너/미란다/NPC 이벤트 detail
  - 러닝/운동/식단 actor 슬롯과 상태 우선순위
  - Firestore 저장 schema
- 구현 메모:
  - imagegen 프롬프트는 기존 홈탭 아이소메트릭 픽셀아트/반픽셀아트 화풍, 투명화용 flat chroma-key 배경, 텍스트/로고/말풍선 금지를 포함한다.
  - 방문자 sprite는 기존 라이프존 actor와 같은 체형/머리/화풍으로 만들고 상의만 중립 회색으로 한다.
  - 상담실장 이름은 이미지에 넣지 않고 기존 DOM 이름표를 유지한다.
  - 방문자 스프라이트는 조건이 맞지 않으면 DOM은 있어도 `hidden` 또는 CSS 숨김 상태로 둔다.
  - Dashboard3 배포만 허용한다. `origin/main` push 후 `verify:deploy`를 사용하고, `tomatofarm` remote는 사용자가 명시하지 않는 한 사용하지 않는다.
- 검증 방법:
  1. `node --check app.js; node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
  2. `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js`
  3. `node scripts/verify-runtime-assets.mjs`
  4. `git diff --check`
  5. 가능하면 로컬 합성 미리보기 또는 브라우저 스크린샷으로 우측 하단 상담 코너의 겹침을 확인한다.
  6. 커밋/푸시 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 완료 증거:
  - 새 PNG 3개가 RGBA PNG이며 `sw.js`에 등록되어 있다.
  - `resolveLifeZoneConsultingVisitor()`가 신규/10일 복귀/일반 사용자 판정을 테스트로 보장한다.
  - Dashboard3 Pages에서 새 commit과 `CACHE_VERSION`이 확인된다.
  - 배포 URL 홈 라이프존 우측 하단에 seated 상담실장과 조건부 회색 상의 방문자 구도가 보인다.

## 리뷰 세션 프롬프트

이 계획 문서와 직전 실행 세션의 변경 파일을 읽고 버그, 회귀, 누락된 테스트, 오래된 캐시/서비스워커 이슈, UX 깨짐을 우선 리뷰한다. 리뷰 중에는 새 기능을 구현하지 않는다.

## Slice 1 실행 결과

- 새 자산:
  - `assets/home/life-zone/ui/consulting-room-sofas.png`
  - `assets/home/life-zone/ui/consulting-chief-npc-seated-home.png`
  - `assets/home/life-zone/ui/consulting-visitor-gray-shirt-home.png`
- 코드:
  - `app.js`에서 저장된 이전 `lastLoginAt` snapshot인 `previousLastLoginAt`과 현재 사용자 정보를 `setLifeZoneVisitContext()`로 전달한다.
  - `home/life-zone-state.js`에 `resolveLifeZoneConsultingVisitor()`를 추가해 신규/10일 복귀/일반/guest 표시 여부를 순수 함수로 판정한다.
  - `home/life-zone.js`는 상담 소파 overlay, 앉은 상담실장 PNG, 조건부 회색 상의 방문자 PNG를 렌더한다.
  - `style.css`는 우측 하단 상담 코너 좌표, z-index, 표시 크기, hidden/visible 상태를 조정한다.
  - `sw.js`는 `CACHE_VERSION`을 `tomatofarm-v20260701z3-consulting-room-visitor`로 bump하고 새 PNG 3개를 `STATIC_ASSETS`에 등록했다.
- 테스트:
  - `tests/home-life-zone-state.test.js`에 방문자 판정 테스트를 추가했다.
  - `tests/home-life-zone-npc-quest.test.js`에 DOM marker, CSS 좌표, PNG header, cache 등록 테스트를 추가했다.
  - cache marker를 직접 assert하는 테스트는 새 `CACHE_VERSION`에 맞게 갱신했다.

## Slice 1 실행 검증

- PASS: `node --check app.js; node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js`
- PASS: `node --test tests/*.test.js` - 624 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: 로컬 합성 미리보기 `C:\Users\USER\AppData\Local\Temp\tomato-consulting-room-preview-v2.png`에서 우측 하단 상담 코너 겹침을 확인했다.
- not verified yet: 이 실행 세션에서는 커밋/푸시/배포를 수행하지 않아 Dashboard3 Pages URL의 실제 홈 UI flow는 아직 확인하지 않았다.

## Slice 1 리뷰 결과

- 리뷰 문서: `docs/ai/reviews/2026-07-02-home-consulting-room-visitor-sofa-review.md`
- 결과: 문제 없음.
- 확인:
  - 상담 소파 overlay, seated 상담실장, 조건부 방문자 layer가 계획 범위 안에 있다.
  - 방문자 판정은 현재 로그인 사용자 기준으로 제한되어 있고 guest는 제외된다.
  - 새 PNG 3개는 `sw.js` `STATIC_ASSETS`에 등록되어 있으며 `CACHE_VERSION`이 bump됐다.
  - `www/`와 베이스룸 원본은 수정하지 않았다.
- 배포 확인: 커밋 `fa2ea34 fix: add consulting room visitor sofa`를 `origin/main`에 push했고 Dashboard3 Pages 검증이 통과했다.

## 개발계 배포 결과

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ fa2ea34` -> `[deploy-verify] ok fa2ea340195d tomatofarm-v20260701z3-consulting-room-visitor static=236`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260701z3-consulting-room-visitor" "home/life-zone.js::consulting-visitor-gray-shirt-home.png" "home/life-zone.js::setLifeZoneVisitContext" "style.css::.lz-consulting-visitor"`
- not verified yet: 인증 세션이 없어 실제 홈 탭에서 신규/10일 복귀 사용자 조건의 라이프존 UI flow는 직접 확인하지 못했다.

## NEXT_ACTION.md 업데이트

- 현재 상태: `complete`
- 다음 자동 상태: `complete`
- 다음 액션: 없음. 인증 세션이 필요한 실제 홈 탭 UI flow 확인만 남아 있다.
- 차단 질문: 없음

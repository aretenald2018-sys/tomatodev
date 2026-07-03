# 2026-07-03 Home Social Notification Decoupling

## 요청

`리팩토링 수행할 것. 특히 운동종목추가/운동카드추가 관련한 오류가, 무언가 수정할 때마다 다른게 고장나는 방식으로 너무 많이 나는데 UI와 벡엔드 상호의존성을 줄이고 무언가 추가했을 때 계속 꼬이거나 오류가 나지 않는 방향으로 코드 전체를 리팩토링할 것. 운동코드 관련 리팩토링 끝났다고 그만두지 말고 코드 전체를 조망해서 리팩토링 깔끔하게 해서 추가적인 오류가 나지 않게 하고, 버튼 클릭시 속도가 무겁게 느껴지지않도록 경량화도 신경쓸 것. 화면단에서 검증까지 완료한 후에 배포할 것.`

## 그릴 결과

- 질문: social feed/profile action bridge와 render scheduler 완료 후 다음 결합 표면은 어디인가?
- 코드 근거:
  1. `home/notifications.js`에는 `_renderFriendFeedFn()` 직접 호출이 5개 남아 있다.
  2. `home/friend-profile.js`에는 소개/길드 초대/토마토 선물 보조 모달의 `onclick=`이 남아 있다.
  3. `home/cheers-card.js`에는 cheers list/self modal 관련 `onclick=`이 남아 있다.
  4. 새로 추가한 `home/social-render-scheduler.js`가 이미 social feed/profile render 병합 계약을 제공한다.
- 결정: 다음 follow-up은 home social notification과 secondary modal action을 대상으로 한다. 첫 실행 slice는 `home/notifications.js`의 feed refresh scheduler 적용으로 제한한다.

## 진단 요약

1. 알림 처리 함수는 notification 저장/삭제 후 `_renderFriendFeedFn()`를 직접 호출한다. 여러 알림을 연속 처리하면 feed 전체 렌더가 반복될 수 있고, notification module이 feed render 구현을 지나치게 직접 알고 있다.
2. friend profile 보조 모달은 profile primary action bridge 밖에서 inline payload를 직접 조립한다. 소개/길드 초대/선물 흐름은 클릭 버튼 추가 때마다 escaping과 전역 함수 의존이 다시 생길 가능성이 높다.
3. cheers card도 inline action이 남아 있어 social surface가 `data-feed-action`, `data-social-action`, `onclick`으로 혼재한다.

## 목표

- notification 후속 feed refresh를 scheduler로 병합해 버튼 클릭 후 무거운 전체 렌더를 줄인다.
- friend profile 보조 모달 action을 scoped delegate로 이동해 UI markup과 저장/전역 함수 호출 결합을 낮춘다.
- cheers card action도 data-action bridge로 정리해 social surface의 action contract를 일관화한다.
- 각 slice마다 구조 테스트, cache bump, 운영 Pages deploy/marker/browser 검증을 수행한다.

## 비목표

- 알림 데이터 schema나 Firestore access 경로는 바꾸지 않는다.
- admin/outreach 영역 inline handler는 이번 계획 범위에서 제외한다.
- nutrition/login/guild 전체 inline handler는 별도 계획으로 남긴다.

## 실행 슬라이스

### Slice 1: notifications render scheduler

- 목표: `home/notifications.js`의 friend feed refresh를 `createSocialRenderScheduler()` 기반 scheduler로 병합한다.
- 범위:
  1. `home/notifications.js`에서 `_renderFriendFeedFn()` 직접 호출을 `_scheduleNotificationsFriendFeedRender(...)`로 바꾼다.
  2. notification center refresh는 기존 즉시 갱신을 유지한다.
  3. scheduler helper import, 구조 테스트, `sw.js` cache bump를 포함한다.
- 검증:
  1. `node --check home/notifications.js; node --check home/social-render-scheduler.js; node --check sw.js`
  2. 신규 구조 테스트: notification action path에 `_renderFriendFeedFn()` 직접 호출 없음, scheduler helper 존재
  3. social render/feed/profile focused tests
  4. `node --test tests/*.test.js`
  5. `node scripts/verify-runtime-assets.mjs`
  6. `git diff --check`
  7. 운영 Pages deploy + marker + browser 확인

### Slice 2: friend profile secondary modal action bridge

- 목표: `home/friend-profile.js`의 소개/길드 초대/토마토 선물 보조 모달 inline action을 scoped delegate로 전환한다.
- 범위:
  1. introduce modal list, close, confirm action을 `data-social-action` 또는 modal-local action bridge로 전환한다.
  2. guild invite modal list, close, confirm action을 같은 방식으로 전환한다.
  3. tomato gift modal close/send/backdrop action을 delegate로 전환한다.
- 제외:
  - guestbook/comment/reaction primary action은 이전 계획에서 완료했으므로 회귀 확인만 한다.
- 검증:
  1. 구조 테스트: 해당 modal slice에 `onclick=` 없음
  2. profile action tests, full tests, runtime assets, deployed marker
  3. 운영 URL browser 확인

### Slice 3: cheers card action bridge

- 목표: `home/cheers-card.js`의 cheers list/self action inline handler를 `data-cheers-action` bridge로 전환한다.
- 범위:
  1. friend open, self cheer modal, expand toggle action을 data-action으로 이동한다.
  2. 동적 modal button이 있으면 같은 root delegate 또는 modal-local delegate로 묶는다.
  3. 구조 테스트에서 `home/cheers-card.js` 주요 surface의 inline handler 재유입을 막는다.
- 검증:
  1. `node --check home/cheers-card.js; node --check sw.js`
  2. 신규 구조 테스트, social focused tests, full tests
  3. runtime assets, deployed marker, 운영 URL browser 확인

## 위험과 완화

1. 알림 처리 후 feed refresh를 한 frame 늦추면 알림 삭제/읽음 UI와 feed 상태가 순간적으로 어긋날 수 있다.
   - 완화: notification center refresh는 즉시 유지하고 feed 전체 refresh만 scheduler로 병합한다.
2. 보조 모달은 별도 id와 backdrop을 사용하므로 document-level delegate가 과하게 넓어질 수 있다.
   - 완화: modal root 또는 sheet-local delegate를 우선한다.
3. cheers action은 사용자 visible social card이므로 중복 click 실행이 체감될 수 있다.
   - 완화: idempotent binding marker와 구조 테스트로 inline/delegate 이중 실행을 차단한다.

## NEXT_ACTION.md 업데이트

- 계획 세션 종료 상태: `ready_for_execution`
- 다음 액션: Slice 1 `notifications render scheduler`를 실행한다.
- 차단 질문: 없음

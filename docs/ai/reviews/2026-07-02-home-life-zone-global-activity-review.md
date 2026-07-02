# 홈 라이프존 전역 활동 반영 리뷰

## 대상

- 계획: `docs/ai/features/2026-07-02-home-life-zone-global-activity.md`
- 변경 파일: `home/life-zone-state.js`, `home/life-zone.js`, `sw.js`, 관련 테스트와 cache marker 문서

## 리뷰 결과

- 문제 없음.

## 확인 내용

1. 고정 actor 계정은 친구가 아니어도 `global` source/readable로 분류되어 `dayByAccountId`의 오늘 활동을 사용한다.
2. 홈 로더는 self local day와 remote/global actor day를 분리해 읽으므로, 현재 사용자 기록과 전역 actor 기록이 섞이지 않는다.
3. 현재 로그인 계정이 고정 actor가 아니면 상담 visitor로 표시되고, 고정 actor 본인이면 기존 actor layer에 남는다.
4. 좌표, sprite, 상담실장/소파 자산, 식단/운동 저장 payload는 변경하지 않았다.

## 검증

1. PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js` - 31 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
4. PASS: `node --test --test-reporter=dot @testFiles`
5. PASS: `git diff --check`
6. not verified yet: Dashboard3/운영계 Pages 배포 후 marker와 인증 계정 홈 라이프존 UI 확인 필요

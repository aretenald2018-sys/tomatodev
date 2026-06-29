# 홈 러닝 지도 위치 문구 및 미란다 배치 보정 리뷰

## 리뷰 결과

- 발견된 차단 이슈: 없음
- 계획 범위 이탈: 없음
- 캐시 누락: 없음

## 확인한 내용

1. `home/life-zone-state.js`에서 route/centroid만 있다고 `placeLabel`을 `위치 확인 중`으로 강제하지 않게 했다.
2. `home/life-zone.js`에서 지도 상태가 `ready`일 때 `위치 확인 중`을 렌더 fallback으로 넣는 코드를 제거했다.
3. 실제 동/구 라벨이 있을 때만 `.lz-running-map-place`가 렌더된다.
4. 미란다 홈 NPC는 `left: 292`, `top: 1238`, `width: 78` 방 좌표 기준으로 줄여 러닝 캐릭터 높이에 맞췄다.
5. 미란다 홈 스프라이트에 `scaleX(-1)`을 적용해 방 내부 방향을 보게 했다.
6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z12-home-map-label-miranda`로 bump했다.

## 검증

1. PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js` — 26 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
4. PASS: `node --test tests/*.test.js` — 602 tests passed
5. PASS: `git diff --check`

## 남은 리스크

- 배포 정적 검증은 가능하지만, 인증 세션이 없으면 실제 홈탭에서 사용자 계정의 라이브 러닝 상태와 미란다 배치를 눈으로 확인하는 최종 UI 검증은 로그인 세션에서 해야 한다.

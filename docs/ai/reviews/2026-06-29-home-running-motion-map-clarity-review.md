# 홈 러닝 모션/지도 위치 인지 개선 리뷰

## 결론

- 리뷰 결과: `pass`
- 계획 문서: `docs/ai/features/2026-06-29-home-running-motion-map-clarity.md`
- 실행 Slice: `Slice 1`

## 확인한 변경

1. `assets/home/life-zone/sprites/*-running-track.png`
   - 기존 옆방향 러닝 스프라이트를 3/4 정면 제자리 조깅 2프레임 스프라이트로 교체했다.
   - 각 파일은 기존 소비 코드와 호환되는 `256x192` RGBA 시트다.

2. `style.css`
   - `.lz-actor--pose-running-track`에서 좌우 이동/회전 없이 발 접지점 기준의 미세한 vertical bob만 남겼다.
   - 홈 지도 말풍선 안에 지역 라벨 pill인 `.lz-running-map-place`를 추가했다.

3. `home/life-zone-state.js`, `home/life-zone.js`
   - 러닝 actor 슬롯을 기존 홈트랙 하단부로 내렸다.
   - `getLifeZoneRunningMapData()`가 `placeSummary`와 `placeLabel`을 반환하고, 홈 말풍선에 동/구 라벨을 렌더한다.

4. `workout/running-session.js`
   - 러닝 라이브 payload에 `placeSummary`를 포함한다.
   - 라이브 경로 중심점이 생기면 VWorld reverse geocode를 백그라운드로 한 번 수행하고 홈 라이브 이벤트를 다시 발행한다.

## 발견 사항

- 중대/높음/중간 이슈: 없음.
- 낮은 리스크: VWorld key가 없거나 reverse geocode가 실패하면 홈 지도 라벨은 `위치 확인 중` 또는 저장된 기존 `runPlaceSummary` 폴백에 머문다.
- 낮은 리스크: 실제 홈탭 렌더링은 인증/배포 UI 환경에서 최종 육안 확인이 필요하다. 정적 계약과 PNG 파일은 검증했다.

## 검증

1. PASS: `node --check home/life-zone.js`
2. PASS: `node --check home/life-zone-state.js`
3. PASS: `node --check workout/running-session.js`
4. PASS: `python -m py_compile scripts/process-life-zone-running-sprites.py`
5. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js` — 34 tests passed
6. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=857`
7. PASS: `node --test` — 594 tests passed
8. PASS: `git diff --check`

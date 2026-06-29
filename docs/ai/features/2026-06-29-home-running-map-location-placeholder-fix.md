# 홈 러닝 지도 위치 문구 및 미란다 배치 보정

## 상태

- 상태: `implemented`
- 요청일: 2026-06-29
- 실행 슬라이스: Slice 1 하나로 완료

## 사용자 요청

1. 홈탭 러닝 지도 말풍선에 `위치 확인 중`이라고 뜨는 문제를 고친다.
2. 미란다 NPC가 다른 캐릭터/NPC 대비 지나치게 크고, 방 밖 하단에 걸쳐 있으며, 공간 배치상 바깥쪽인 왼쪽을 바라보는 문제를 고친다.

## 진단

- `home/life-zone-state.js`의 `getLifeZoneRunningMapData()`가 실제 `placeLabel`이 없더라도 route 또는 centroid가 있으면 `위치 확인 중`을 강제로 반환한다.
- `home/life-zone.js`의 `_renderRunningMapBubble()`도 지도 상태가 `ready`인데 `placeLabel`이 없으면 다시 `위치 확인 중`을 fallback으로 넣는다.
- 그 결과 실제 VWorld 지도 타일과 현재 위치/경로가 있어도 말풍선 위에 `위치 확인 중` pill이 떠서 지도 식별성을 해친다.
- 미란다는 홈 전용 소형 스프라이트를 사용하고 있지만, 배치 좌표가 여전히 하단 상태칩 근처에 걸치고, 크기가 다른 홈 캐릭터보다 크며, 시선이 방 내부가 아니라 좌측 바깥을 향한다.

## Slice 1 범위

### 구현

1. 홈 러닝 지도 데이터에서 실제 동/구 라벨이 없으면 `placeLabel`을 빈 문자열로 둔다.
2. 렌더러에서 `map.state === 'ready'`일 때 `위치 확인 중` fallback을 넣지 않는다.
3. 회귀 테스트로 `위치 확인 중`이 홈 지도 렌더링 fallback에 다시 들어오지 못하게 막는다.
4. 미란다 홈 NPC를 더 작게 줄이고 방 내부 좌측 하단 공간으로 올려 배치한다.
5. 미란다 홈 스프라이트만 좌우 반전해 방 내부를 향하도록 한다.
6. `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- VWorld reverse geocode 로직 변경
- 러닝 지도 타일/경로 렌더링 방식 변경
- 러닝 기록 저장 구조 변경
- 미란다 모달용 큰 이미지 변경

## 검증

1. `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
2. `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `node --test tests/*.test.js`
5. `git diff --check`
6. Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행 프롬프트

`docs/ai/features/2026-06-29-home-running-map-location-placeholder-fix.md` Slice 1을 구현한다. 홈 러닝 지도 말풍선에서 `위치 확인 중` fallback을 제거하고, 미란다 홈 NPC의 크기/위치/시선을 방 내부에 맞게 보정한다.

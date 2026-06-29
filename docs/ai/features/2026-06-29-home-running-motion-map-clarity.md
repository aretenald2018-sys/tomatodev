# 홈 러닝 모션/지도 위치 인지 개선 계획

## 상태

- 상태: `complete`
- 작성일: `2026-06-29`
- 자동 트리거: `/diagnose`
- 관련 이전 계획: `docs/ai/features/2026-06-29-running-result-map-tab-motion.md`

## 요청 요약

홈탭 라이프존에서 러닝 캐릭터 모션이 계속 부자연스럽고, 러닝 중 머리 위 지도 말풍선도 어디인지 알 수 없다. 이전 수정은 CSS 제자리 흔들림과 지도 타일 표시 위주였기 때문에 근본 문제가 남았다.

## /diagnose

1. 현재 러닝 PNG 3종은 `256x192` 2프레임 스프라이트지만, 캐릭터가 등각 트랙 방향이 아니라 화면 오른쪽으로 달리는 일반 옆/뒷모습이다.
2. `.lz-actor--pose-running-track`는 기존 PNG를 `background-size: 200% 100%`로 프레임만 넘기고 있어, 자산의 방향/원근 문제가 그대로 노출된다.
3. 슬롯 좌표는 트랙 하단부를 겨냥하지만, 캐릭터 발 접지점 기준이 아니라 sprite top-left 기준으로 얹혀 있어 작은 화면에서 트랙 안쪽/잔디 쪽에 붙어 보일 수 있다.
4. 홈 지도 말풍선은 실제 VWorld 타일과 route/dot만 렌더링하고, 행정동/구/시 라벨을 별도로 표시하지 않는다. 작은 지도에서는 도로명/지역명을 읽기 어렵다.
5. 러닝 세션의 VWorld reverse geocode 결과는 완료/저장 쪽에는 연결되어 있지만, 홈 라이프존 live payload와 `getLifeZoneRunningMapData()`에는 위치 라벨이 충분히 전달되지 않는다.

## 목표

1. 러닝 actor는 “트랙 위에서 제자리 뛰는 사람”처럼 보여야 한다. 화면을 가로질러 이동하지 않고, 트랙 접지점에 고정되어야 한다.
2. 기존 홈탭 캐릭터 3명(`줍스`, `문정토마토`, `이재헌`)의 색상/정체성을 유지한다.
3. 새 러닝 sprite는 등각/상단 시점에 맞는 작은 pixel-art contact sheet로 교체한다. 기존 옆모습 PNG를 그대로 흔드는 방식은 폐기한다.
4. 홈 지도 말풍선에는 실제 지도 타일 외에 동 단위 위치 라벨을 오버레이한다. 예: `방이동 · 송파구`
5. live 중에도 위치가 확정되지 않았으면 `위치 확인 중`을 지도 말풍선 안에 명확히 표시한다.

## 실행 범위

### Slice 1

1. `imagegen` 기반으로 새 러닝 sprite source를 생성하고, project asset으로 후처리한다.
   - 크기: 기존 소비 코드와 호환되게 최종 sprite sheet는 캐릭터별 `256x192` RGBA 유지.
   - 프레임: 최소 2프레임. 필요하면 생성 이미지를 crop/resize해서 2프레임 sheet로 정규화한다.
   - 방향: 등각 홈트랙 하단부에 맞는 작은 캐릭터, 발 접지점이 아래 중앙에 오도록 구성.
2. `home/life-zone-state.js` 러닝 슬롯 좌표/폭/라벨 위치를 발 접지점 기준으로 조정한다.
3. `style.css` 러닝 actor scale/transform을 sprite top-left 흔들림이 아니라 발 접지점 중심의 미세한 vertical bob/frame swap으로 변경한다.
4. `workout/running-session.js` live payload에 `placeSummary`를 포함하고, 최소한 finish 이후 홈에도 저장된 `runPlaceSummary`를 노출한다.
5. `home/life-zone-state.js` `getLifeZoneRunningMapData()`가 `placeSummary`/`placeLabel`을 반환하도록 확장한다.
6. `home/life-zone.js` 지도 말풍선에 `.lz-running-map-place` 라벨을 추가한다.
7. `style.css` 지도 라벨을 작은 지도에서도 읽히는 반투명 pill로 추가한다.
8. `sw.js` `STATIC_ASSETS` 변경에 맞춰 `CACHE_VERSION`을 bump한다.
9. 관련 테스트를 새 계약으로 갱신한다.

## 제외 범위

- 러닝 상세 기록 카드 재설계.
- 지도 provider 설정 UI 추가.
- native watch SDK 직접 연동.

## 검증

1. `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check workout/running-session.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js`
3. PNG 3종이 `256x192` RGBA이고 투명 코너를 유지하는지 확인.
4. `node scripts/verify-runtime-assets.mjs`
5. `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test $tests`
6. `git diff --check`
7. `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 실행 결과

1. `imagegen`으로 3명 x 2프레임 제자리 조깅 원본을 다시 생성하고, `scripts/process-life-zone-running-sprites.py`로 캐릭터별 `256x192` RGBA 스프라이트를 재생성했다.
2. 러닝 actor CSS에서 좌우 이동/회전 없이 발 접지점 기준의 미세한 vertical bob과 2프레임 교차만 남겼다.
3. 러닝 슬롯을 기존 홈트랙 하단부로 내려 운동기구와의 겹침을 줄였다.
4. 러닝 라이브 payload가 `placeSummary`를 포함하고, 경로 중심점이 생기면 VWorld reverse geocode를 백그라운드로 수행해 홈 지도 말풍선 라벨을 갱신하도록 했다.
5. 홈 지도 말풍선에 `.lz-running-map-place`를 추가해 `방이동 · 송파구` 같은 동/구 라벨을 표시한다.
6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z8-home-running-motion-map-clarity`로 bump했다.

## 실행 검증

1. PASS: `node --check home/life-zone.js`
2. PASS: `node --check home/life-zone-state.js`
3. PASS: `node --check workout/running-session.js`
4. PASS: `python -m py_compile scripts/process-life-zone-running-sprites.py`
5. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js` — 34 tests passed
6. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=857`
7. PASS: `node --test` — 594 tests passed
8. PASS: `git diff --check`

## 다음 실행 시작 프롬프트

완료. 다음 실행 프롬프트 없음.

# 홈 라이프존 러닝 실제 지도/제자리 모션 수정 계획

## 상태

- 상태: `executed`
- 작성일: `2026-06-29`
- 자동 트리거: `/diagnose`

## 요청 요약

홈탭 라이프존에서 러닝 중인 캐릭터 연출을 수정한다. 지도 말풍선은 현재보다 50% 줄이고, CSS 가짜 지도가 아니라 실제 지도 타일 위에 실제 러닝 경로를 얹는다. 러너는 기존 홈탭 픽셀아트 러닝 스프라이트를 유지하되 트랙 위에서 제자리 뛰기만 하도록 바꾸고, 캐릭터가 이동하며 2~3개가 겹쳐 보이는 문제를 제거한다. 캐릭터 배치는 운동기구를 가리지 않도록 기존 트랙의 더 하단부로 옮긴다.

## /diagnose

### 재현 루프

- 정적 테스트로 홈 라이프존 렌더러가 가짜 지도 DOM/CSS를 쓰지 않는지 확인한다.
- `style.css`에서 러닝 트랙 모션이 좌우 이동 애니메이션이 아닌 제자리 프레임/상하 바운스인지 확인한다.
- 러닝 세션 라이브 상태가 실제 GPS route/summary를 홈 라이프존에 전달하는지 확인한다.
- `sw.js` 캐시 버전과 정적 자산 검증을 수행한다.

### 가설

1. 지도 말풍선은 `.lz-running-map-road`, `.lz-running-map-route` 등 CSS 장식만 렌더링해서 실제 기록과 무관한 가짜 지도로 보인다.
2. `.lz-actor--pose-running-track`이 `lz-running-track-lap`에서 `--lz-run-x0/y0/x1/y1` 이동값을 사용해 트랙 위를 이동하므로 렌더 타이밍에 캐릭터가 여러 개처럼 보일 수 있다.
3. 홈 라이프존 actor 데이터에 실제 route가 보존되지 않아 말풍선에서 실제 기록을 그릴 수 없다.
4. 현재 러닝 슬롯 일부가 트랙 상단/중앙에 있어 운동기구나 방 내부 요소를 가릴 수 있다.

## 실행 Slice 1

### 목표

홈 라이프존 러닝 actor를 기존 트랙 하단부에 놓고, 실제 route 기반 지도 말풍선과 제자리 러닝 모션만 사용하도록 수정한다.

### 포함 범위

1. 러닝 세션 라이브 상태에 downsample된 실제 route, route summary, preview point를 포함한다.
2. 홈 라이프존 actor state에 러닝 지도 데이터(`runningMap`)를 포함한다.
3. 홈 지도 말풍선은 실제 지도 타일 URL과 실제 route SVG polyline/current dot으로 렌더링한다.
4. 말풍선 크기를 기존 대비 약 50%로 축소한다.
5. 러닝 슬롯 좌표를 기존 트랙의 더 하단부로 옮겨 운동기구/중앙 기구를 가리지 않게 한다.
6. 러너 모션은 트랙 위 제자리 뛰기만 하도록 이동 애니메이션을 제거한다.
7. `STATIC_ASSETS` 변경에 맞춰 `CACHE_VERSION`을 범프한다.

### 제외 범위

- 새 캐릭터 생성 또는 새 트랙 생성.
- 지도 SDK 전체 로딩 UI 재설계.
- 러닝 완료 저장 화면/통계 화면 추가 변경.

## 검증

1. `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check workout/running-session.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js tests/running-tracker.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
6. 배포 URL에서 `style.css`, `home/life-zone.js`, `home/life-zone-state.js`, `workout/running-session.js`, `sw.js`의 marker가 새 커밋/캐시 버전과 일치하는지 확인한다.

## 다음 실행 시작 프롬프트

`docs/ai/features/2026-06-29-home-running-real-map-stationary.md`의 Slice 1을 실행한다.

## Slice 1 실행 결과

- `workout/running-session.js`: live state에 downsample route, route summary, preview point를 포함하고 위치 점 추가 시 홈 라이프존 이벤트를 다시 발행한다.
- `home/life-zone-state.js`: 러닝 actor의 `runningMap` 데이터를 생성하고, live 러닝 중에는 과거 저장 route를 섞지 않는다.
- `home/life-zone-state.js`: 러닝 슬롯을 기존 트랙 하단부 3개 좌표로 옮기고 이동용 `runX/runY` 값을 제거했다.
- `home/life-zone.js`: 가짜 지도 DOM을 제거하고 VWorld 실제 타일 + 실제 route SVG overlay + 현재 위치 점으로 지도 말풍선을 렌더링한다.
- `style.css`: 말풍선 폭을 기존 `344/1672` 기준에서 `172/1672` 기준으로 50% 축소하고, `lz-running-track-lap` 이동 애니메이션을 `lz-running-track-in-place` 제자리 모션으로 교체했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260629z5-home-running-real-map`으로 bump했다.

## Slice 1 검증

- PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check workout/running-session.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js tests/running-tracker.test.js` — 38 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=855`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 591 tests passed
- PASS: `git diff --check`

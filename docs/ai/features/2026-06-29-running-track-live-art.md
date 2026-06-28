# 홈탭 러닝 트랙 캐릭터 아트 계획

## 상태

- 상태: `reviewed`
- 작성일: `2026-06-29`
- 자동 트리거: `/grill-me`
- 정정 사유: 최초 구현이 러닝 세션 화면에 별도 트랙 stage를 붙이는 방향으로 잘못 진행되었다. 사용자가 명확히 정정한 범위는 홈탭 life-zone의 기존 런닝트랙과 기존 이용자 캐릭터다.

## 요청 요약

이용자가 러닝 기록을 시작하면 홈탭의 기존 픽셀아트 life-zone 씬에서 실제 이용자 캐릭터들이 이미 만들어져 있는 런닝트랙 위를 달리는 모션으로 바뀌어야 한다. 캐릭터 머리 위에는 지도 캡쳐처럼 보이는 말풍선을 띄우며, 크기는 기존 전구 말풍선의 약 2배 정도로 한다.

## 그릴 결과

- 핵심 질문: 러닝 모션을 러닝 세션 화면에 새로 만들 것인가, 홈탭 life-zone actor 상태로 만들 것인가?
- 결정: 홈탭 life-zone actor 상태에 `running`을 추가한다. 새 트랙 배경은 만들지 않고 `assets/home/life-zone/base-room-expanded-alpha.png` 안의 기존 트랙 좌표 위에 actor를 배치한다.
- 캐릭터 결정: `LIFE_ZONE_ACTORS`의 실제 홈 캐릭터 3명(`jups`, `moonjung-tomato`, `lee-jaeheon`)에 캐릭터별 러닝 스프라이트를 추가한다.
- 모션 결정: 스프라이트는 캐릭터별 2프레임 PNG sheet로 만들고, CSS `steps()` 배경 애니메이션과 트랙 위 짧은 왕복 이동으로 달리는 느낌을 낸다.
- 지도 말풍선 결정: 홈 actor layer 안에 `lz-running-map-bubble`을 렌더링한다. 실시간 지도 provider를 홈으로 끌어오지는 않고, 지도 캡쳐처럼 보이는 미니 맵 패턴과 route line을 말풍선 안에 그린다.

## 실행 Slice 1

### 목표

러닝 기록 시작 또는 오늘 러닝 기록 상태가 홈 life-zone에 반영되면 해당 이용자 캐릭터가 홈의 기존 런닝트랙 위에서 달리는 상태로 보이게 한다.

### 포함 범위

1. 잘못 들어간 러닝 세션 progress 화면 트랙 stage 제거
   - `workout/running-session.js`의 `wt-run-home-track-stage`, `progress-bubble`, 독립 runner overlay를 제거한다.
   - 러닝 세션은 live 상태만 `life-zone:running-live` 이벤트와 `window.__tomatoRunningLive`로 발행한다.
2. 홈 life-zone 상태 확장
   - `home/life-zone-state.js`에 `running` slot 3개를 추가한다.
   - 러닝 기록 또는 active live 러닝은 `running` 상태가 `workout`보다 우선한다.
   - `assignLifeZoneSlots()`는 `*-running-track.png` 스프라이트를 선택한다.
3. 홈 life-zone 렌더링 확장
   - `home/life-zone.js`에서 active live 러닝이 있으면 self actor dayData에 러닝 상태를 합성한다.
   - `running` actor에는 일반 텍스트 말풍선 대신 지도 캡쳐형 말풍선을 머리 위에 렌더링한다.
4. 캐릭터별 러닝 아트 에셋
   - `assets/home/life-zone/sprites/jups-running-track.png`
   - `assets/home/life-zone/sprites/moonjung-tomato-running-track.png`
   - `assets/home/life-zone/sprites/lee-jaeheon-running-track.png`
   - 새 캐릭터를 만들지 않고 기존 `*-office-center.png` 홈 캐릭터 스프라이트에서 머리/헤어 픽셀을 가져와 running pose sheet를 생성한다.
5. CSS
   - `.lz-actor--pose-running-track`은 2프레임 sprite sheet를 `steps()`로 전환한다.
   - `.lz-running-map-bubble`은 기존 전구 말풍선의 약 2배 크기로 보이게 하고, 홈 scene 위에서 겹침을 최소화한다.
   - `prefers-reduced-motion: reduce`에서는 러닝 애니메이션을 끈다.
6. `sw.js`
   - `home/life-zone.js`, `home/life-zone-state.js`, `style.css`, 새 sprite PNG가 `STATIC_ASSETS` 영향권이므로 `CACHE_VERSION`을 bump하고 새 sprite를 precache에 추가한다.
7. 테스트
   - home life-zone state 테스트에 `running` 우선순위와 slot/sprite 검증을 추가한다.
   - home life-zone 렌더/CSS 테스트에 지도 말풍선, running pose, PNG header 검증을 추가한다.
   - running-entry 테스트는 세션 화면에 더 이상 홈 트랙 stage가 없고 live event만 발행하는지 검증한다.

### 제외 범위

- 새 런닝트랙 배경 생성
- 러닝 세션 화면 내부에 홈 트랙 stage를 추가하는 변경
- 실제 지도 SDK를 홈탭에 추가하거나 지도 캡쳐 파일을 저장하는 기능
- 러닝 저장 schema 변경

## 검증 계획

- `node --check home/life-zone.js home/life-zone-state.js workout/running-session.js app.js sw.js`
- `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/running-tracker.test.js`
- `node scripts/verify-runtime-assets.mjs`
- 전체 테스트: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 marker: 새 cache version, `home/life-zone-state.js::running`, `home/life-zone.js::lz-running-map-bubble`, `style.css::.lz-actor--pose-running-track`, `sw.js::jups-running-track.png`

## 다음 실행 시작 프롬프트

`docs/ai/features/2026-06-29-running-track-live-art.md`의 Slice 1을 구현한다. 러닝 세션 화면의 잘못된 트랙 stage는 제거하고, 홈탭 life-zone 기존 트랙 위에서 실제 actor별 러닝 스프라이트와 지도 말풍선을 렌더링한다.

## 실행 결과

- `workout/running-session.js`: 잘못 추가됐던 progress 화면 `wt-run-home-track-stage`, `progress-bubble`, 독립 runner overlay를 제거했다. 대신 러닝 시작/일시정지/재개/종료/닫기 시 `window.__tomatoRunningLive`와 `life-zone:running-live` 이벤트를 발행한다.
- `app.js`: 홈탭이 열려 있을 때 `life-zone:running-live` 이벤트를 받으면 `renderHome()`으로 life-zone을 즉시 갱신한다.
- `home/life-zone-state.js`: `running` 상태와 기존 홈 트랙 좌표 3개를 추가하고, live/저장 러닝 기록이 일반 `workout`보다 우선하도록 했다.
- `home/life-zone.js`: self live 러닝을 오늘 dayData에 합성하고, `running` actor에는 일반 텍스트 말풍선 대신 지도 캡쳐형 `lz-running-map-bubble`을 렌더한다.
- `assets/home/life-zone/sprites/*-running-track.png`: 각 파일은 2프레임 sprite sheet이며, `scripts/make-life-zone-running-sprites.py`가 기존 `jups/moonjung-tomato/lee-jaeheon-office-center.png`를 source로 삼아 생성한다.
- `style.css`: `.lz-actor--pose-running-track`의 2프레임 `steps()` 애니메이션, 트랙 위 이동, 지도형 말풍선, reduced-motion fallback을 추가했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260629z2-home-running-track-actors`로 올리고 새 running sprite 3개를 `STATIC_ASSETS`에 추가했다.
- `assets/home/life-zone/manifest.json`, `scripts/validate-life-zone-assets.py`: `running` pose를 manifest와 asset validator 기준에 포함했다.
- 테스트: home life-zone state/render/source contract, running-entry contract, cache marker를 새 구현 기준으로 갱신했다.

## 로컬 검증

- PASS: `python -m py_compile scripts/make-life-zone-running-sprites.py scripts/validate-life-zone-assets.py`
- PASS: `python scripts/validate-life-zone-assets.py` — `validated base=1672x1672, sprites=30`
- PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check workout/running-session.js; node --check app.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/running-tracker.test.js` — 36 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=853`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 588 tests passed
- PASS: `git diff --check`

## 리뷰 결과

- 리뷰 문서: `docs/ai/reviews/2026-06-29-running-home-track-live-art-review.md`

# 홈 라이프존 트레이너 라벨/운동 애니메이션

## 요청

홈화면 라이프존 이미지 렌더링 범위에서만 아래를 조정한다.

1. `트레이너` 표기가 브루스/트레이너 얼굴을 가리지 않게 다른 캐릭터처럼 하단에 나오게 한다.
2. 다른 캐릭터들이 랫풀다운/스쿼트/벤치프레스 위치에 있을 때, 정지 이미지가 아니라 운동 동작을 수행하는 것처럼 움직이게 한다.

## 브랜치/격리

- 의도한 작업 브랜치: `codex/home-image-rendering-nameplates` 또는 여기서 새로 딴 홈 전용 브랜치.
- 현재 작업트리에 다른 스레드의 미커밋 운동 변경이 감지됨:
  - `render-calendar.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md`
  - `style.css` 일부
- 실행 세션에서는 위 운동 변경을 revert/수정/커밋하지 않는다.
- `style.css`는 홈 라이프존 섹션만 최소 수정하되, 기존 미커밋 운동 변경과 섞이지 않게 diff를 확인한다.
- `www/`는 수정하지 않는다.

## 그릴 결과

핵심 판단:

- 트레이너 라벨은 지금처럼 트레이너 얼굴/상체 근처에 떠 있는 클릭 텍스트가 아니라, actor 이름표와 같은 "발밑 이름표"처럼 보여야 한다.
- 기존 `life-zone:npc-quest` 이벤트와 `detail: { npc: 'trainer' }`는 유지한다.
- 현재 운동 캐릭터는 포즈별 단일 PNG만 있으므로, 1차 구현은 새 이미지 자산 없이 CSS `transform` 애니메이션으로 동작감을 만든다.
- 실제 팔/다리 프레임이 바뀌는 고품질 애니메이션은 별도 sprite frame 자산이 필요하므로 후속 Slice로 분리한다.
- 사용자가 "움직임"을 켜둔 환경에서만 애니메이션하고, `prefers-reduced-motion: reduce`에서는 정지 상태를 유지한다.

## 실행 Slice 1 — Label Placement + CSS Motion

대상 파일:

- `home/life-zone.js`
- `style.css`의 라이프존 섹션
- `tests/home-life-zone-npc-quest.test.js`
- 필요 시 새 홈 라이프존 애니메이션 테스트
- `sw.js`
- cache-version 참조 테스트
- `docs/ai/NEXT_ACTION.md`

구현:

- trainer/NPC 이름표도 actor 이름표처럼 씬 좌표 기반 하단에 배치한다.
  - 예: `--lz-name-x`, `--lz-name-y` 또는 별도 `--lz-npc-name-x/y`를 사용한다.
  - 클릭 가능한 투명 버튼은 이름표 주변 또는 트레이너 하단 영역을 커버하되 얼굴을 덮지 않는다.
- actor image class에 pose 식별자를 추가한다.
  - 예: `lz-actor--pose-workout-lat`, `lz-actor--pose-workout-bench`, `lz-actor--pose-workout-squat`
- CSS keyframes를 추가한다.
  - 랫풀다운: 짧은 수직 pull/bob 리듬
  - 벤치프레스: 아주 작은 상하/scale 리듬
  - 스쿼트: 하강/상승 bounce 리듬
- 애니메이션 amplitude는 작게 유지해 이름표/말풍선/다른 캐릭터와 겹치지 않게 한다.
- `@media (prefers-reduced-motion: reduce)`에서 해당 애니메이션을 끈다.
- `style.css`와 `home/life-zone.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

범위 밖:

- 운동 탭, 캘린더, 운동 데이터 로직 변경
- 새 sprite PNG 생성/교체
- NPC 퀘스트 모달 구현
- 라이프존 활동 판정 로직 변경
- `www/` 직접 수정

검증:

- `node --check home/life-zone.js; node --check sw.js`
- `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js`
- `node --test tests/*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 마커 확인:
  - `home/life-zone.js`에 pose class 마커
  - `style.css`에 세 keyframes와 reduced-motion guard
  - `sw.js` 새 cache marker
- UI flow:
  - 홈 탭 라이프존에서 `트레이너` 이름표가 얼굴이 아니라 하단에 보인다.
  - 운동 상태 캐릭터가 랫풀다운/벤치프레스/스쿼트 슬롯에서 작게 반복 움직인다.
  - `prefers-reduced-motion`에서는 움직임이 꺼진다.

## 실행 Slice 2 — Optional Sprite Frame Animation

조건:

- Slice 1의 CSS transform 애니메이션으로 동작감이 부족할 때만 진행한다.

구현 후보:

- 각 운동 포즈별 2-3 frame PNG를 추가한다.
- `home/life-zone.js` 또는 CSS에서 frame swap 애니메이션을 적용한다.
- 새 자산은 `sw.js` `STATIC_ASSETS`에 포함하고 `CACHE_VERSION`을 bump한다.

## 다음 실행 지시

다음 세션은 Slice 1만 실행한다. 변경 범위는 홈 라이프존 렌더링(`home/life-zone.js`, `style.css` 라이프존 섹션, 홈 라이프존 테스트, `sw.js`, cache marker 테스트)로 제한한다. 현재 작업트리에 있는 운동 관련 미커밋 변경은 수정하거나 커밋하지 않는다.

## 실행 결과

- `2026-06-27`: Slice 1 완료.
- 스크린샷 증상 진단:
  - 배포 URL의 `index.html`, `style.css`, `sw.js`, `home/life-zone.js`는 모두 HTTP 200으로 내려온다.
  - 스크린샷의 완전 무스타일 상태는 이번 CSS 블록 하나가 아니라 모바일 브라우저/서비스워커 캐시 또는 일시적 stylesheet 적용 실패 가능성이 높다.
  - 구현은 전역 레이아웃을 건드리지 않고 `style.css` 라이프존 섹션에만 scoped rule을 추가했다.
- `home/life-zone.js`:
  - actor image class에 `lz-actor--pose-${slot.pose}`를 추가했다.
  - 기존 actor/nameplate/status/state 로직은 유지했다.
- `style.css`:
  - `트레이너` 이름표를 `top: calc(1116 / 1672 * 100%)`로 내려 얼굴을 덮지 않고 하단에 놓이게 했다.
  - `workout-lat`, `workout-bench`, `workout-squat` pose class에 작은 transform 애니메이션을 추가했다.
  - `@media (prefers-reduced-motion: reduce)`에서 라이프존 운동 애니메이션을 끈다.
- `sw.js`:
  - `CACHE_VERSION`을 `tomatofarm-v20260627z8-home-life-zone-motion`으로 bump했다.
- 테스트:
  - `tests/home-life-zone-npc-quest.test.js`에 trainer 위치, pose class, keyframes, reduced-motion 회귀 테스트를 추가했다.
  - cache marker 참조 테스트를 새 버전으로 갱신했다.

검증:

- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
- PASS: `node --test tests/*.test.js` — 552 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=834`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 검증은 커밋 후 실행 필요
- not verified yet: 인증 계정 홈 탭에서 실제 라이프존 UI flow 확인 필요

## 리뷰 결과

- 리뷰 문서: `docs/ai/reviews/2026-06-27-home-life-zone-workout-animation-review.md`
- 결과: blocking issue 없음.

## 회귀 수정 — Trainer Bulb Restore

- `2026-06-27`: 사용자가 `트레이너` 위 전구 말풍선까지 사라진 회귀를 보고했다.
- 원인:
  - `assets/home/life-zone/ui/npc-quest-bubble.png` 한 장 안에 전구 말풍선과 아래 `NPC` 명찰 카드가 같이 들어있다.
  - 이전 Slice에서 `NPC` 카드 제거를 파일 렌더 제거로 처리해 전구 말풍선까지 함께 사라졌다.
- 수정:
  - `home/life-zone.js`에서 `span.lz-npc-bulb > img`로 같은 PNG를 다시 렌더한다.
  - `style.css`에서 `.lz-npc-bulb`를 `aspect-ratio: 192 / 150`과 `overflow: hidden`으로 crop해 상단 전구 말풍선만 보이게 한다.
  - `트레이너` 이름표는 crop된 전구 아래, 하단 라벨로 유지한다.
  - `sw.js` `STATIC_ASSETS`에 `npc-quest-bubble.png`를 다시 포함하고 `CACHE_VERSION`을 `tomatofarm-v20260627z10-home-npc-bulb-restore`로 갱신했다.
- 검증:
  - PASS: `node --check home/life-zone.js; node --check sw.js`
  - PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
  - PASS: `node --test tests/*.test.js` — 553 tests passed
  - PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
  - PASS: `git diff --check`

## 회귀 수정 — Overhead Labels + Smaller Trainer Bulb

- `2026-06-27`: 사용자가 전구 말풍선은 50% 줄이고, `트레이너` 텍스트와 다른 캐릭터 닉네임을 모두 머리 위에 띄워 달라고 요청했다.
- 수정:
  - actor 이름표 위치 계산을 스프라이트 하단 기준에서 머리 위 기준(`slot.y - 6`)으로 변경한다.
  - `.lz-nameplate`의 transform을 위쪽 anchor 기준으로 바꿔 텍스트가 체형을 가리지 않게 한다.
  - `.lz-npc-bulb` 표시 폭만 50%로 줄이고, `트레이너` label은 같은 버튼 안에서 유지한다.
  - 트레이너 overlay 좌표를 머리 위로 올리고, `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z13-home-overhead-labels`로 갱신한다.
- 검증:
  - PASS: `node --check home/life-zone.js; node --check sw.js`
  - PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
  - PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
  - PASS: `git diff --check`
  - WARN: `node --test tests/*.test.js` — 553 tests 중 552 pass, `tests/workout-picker-gym-rail.test.js`의 기존 운동 피커 CSS rule 탐색 1건 fail. 이번 홈 라이프존 변경 범위와 무관하다.
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` — deployed `tomatofarm-v20260627z13-home-overhead-labels`
  - PASS: deployed markers — `Math.max(24, Number(slot.y) - 6)`, `top: calc(850 / 1672 * 100%)`, `width: 50%`, `transform: translate(-50%, -100%)`, `.lz-npc-bulb`
  - not verified yet: 인증 세션이 없어 실제 홈 탭 라이프존 UI flow는 직접 조작 미완료

## 회귀 수정 — Trainer Face Clearance + Lat Pull Motion

- `2026-06-27`: 사용자가 트레이너 얼굴을 가리지 말 것과, 랫풀다운 모션이 바를 당기는 동작이 아니라 머신 전체 흔들림처럼 보인다고 보고했다.
- 수정:
  - 트레이너 overlay를 `top: calc(760 / 1672 * 100%)`로 더 올려 전구/`트레이너` 라벨이 얼굴을 덮지 않게 한다.
  - actor 렌더링을 `span.lz-actor > img.lz-actor-img` 구조로 바꾸고 스프라이트 URL을 CSS 변수로 제공한다.
  - 랫풀다운은 원본 머신 이미지를 고정하고, `::after` 클립 레이어로 바/팔 영역만 작게 당기는 애니메이션을 적용한다.
  - `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z14-home-trainer-lat-motion`으로 갱신한다.
- 검증:
  - PASS: `node --check home/life-zone.js; node --check sw.js`
  - PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
  - PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
  - PASS: `git diff --check`
  - WARN: `node --test tests/*.test.js` — 553 tests 중 552 pass, `tests/workout-picker-gym-rail.test.js`의 기존 운동 피커 CSS rule 탐색 1건 fail. 이번 홈 라이프존 변경 범위와 무관하다.
  - not verified yet: Dashboard3 Pages 배포 검증은 커밋/푸시 후 실행 필요

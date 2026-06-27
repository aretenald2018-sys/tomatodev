# 홈 라이프존 트레이너 라벨/운동 애니메이션 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-27-home-life-zone-workout-animation.md`
- Slice: Label Placement + CSS Motion

## 리뷰 결과

- Blocking issue 없음.
- 전역 CSS reset, layout root, header/nav, 운동 탭 CSS는 수정하지 않았고 라이프존 섹션의 scoped rule만 변경했다.
- `트레이너` 이름표는 기존 얼굴 근처 중심 배치에서 하단 y 좌표로 내려갔다.
- actor image에는 slot pose 기반 class만 추가되어 상태 판정/스프라이트 경로/말풍선/이름표 데이터 흐름을 건드리지 않는다.
- 운동 애니메이션은 새 sprite asset 없이 `transform`만 사용하며, amplitude가 작아 기존 absolute slot 배치를 크게 흔들지 않는다.
- `prefers-reduced-motion: reduce` guard가 있어 접근성 모션 감소 설정에서는 정지한다.
- `style.css`와 `home/life-zone.js`가 `STATIC_ASSETS` 대상이므로 `sw.js` cache marker 갱신과 cache marker 테스트 갱신이 포함됐다.

## 검증

- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
- PASS: `node --test tests/*.test.js` — 552 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=834`
- PASS: `git diff --check`

## 남은 확인

- not verified yet: Dashboard3 Pages 배포 검증은 커밋 후 실행 필요.
- not verified yet: 인증 계정 홈 탭에서 실제 트레이너 라벨 위치와 운동 pose animation 시각 확인 필요.

## 회귀 수정 리뷰 — Trainer Bulb Restore

- Blocking issue 없음.
- 이전 구현은 `npc-quest-bubble.png` 전체를 제거해 전구 말풍선도 사라졌으므로, 이번 수정에서 동일 PNG를 다시 렌더했다.
- 아래 `NPC` 카드 영역은 별도 자산 생성 없이 `.lz-npc-bulb` wrapper의 `aspect-ratio: 192 / 150`과 `overflow: hidden`으로 숨긴다.
- button 내부 flow가 `전구 말풍선 -> 트레이너 이름표` 순서라, 트레이너 표시가 얼굴을 덮지 않고 하단 라벨로 유지된다.
- 해당 PNG를 다시 런타임 자산으로 쓰므로 `sw.js` precache에 복구했고 cache marker와 테스트 참조도 갱신했다.

검증:

- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
- PASS: `node --test tests/*.test.js` — 553 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`

## 회귀 수정 리뷰 — Overhead Labels + Smaller Trainer Bulb

- Blocking issue 없음.
- actor 이름표는 `_applyActorNameplatePosition()`에서 `slot.y - 6`으로 계산되고, CSS `translate(-50%, -100%)`로 위쪽에 떠 있어 체형을 덮지 않는다.
- 트레이너 overlay는 같은 버튼 구조를 유지해 click target과 `life-zone:npc-quest` 이벤트 계약을 바꾸지 않았다.
- `.lz-npc-bulb`는 PNG 원본과 crop 계약을 유지하면서 표시 폭만 50%로 줄였고, `트레이너` 텍스트는 같은 overlay 안에서 그대로 렌더된다.
- `style.css`, `home/life-zone.js`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z13-home-overhead-labels`로 bump했다.

검증:
- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- WARN: `node --test tests/*.test.js` — 553 tests 중 552 pass, `tests/workout-picker-gym-rail.test.js`의 기존 운동 피커 CSS rule 탐색 1건 fail. 이번 홈 라이프존 변경 범위와 무관하다.
- not verified yet: Dashboard3 Pages 배포 검증은 커밋/푸시 후 실행 필요.

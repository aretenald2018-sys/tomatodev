# 홈 라이프존 트레이너 전구 세로 정렬 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-29-home-life-zone-trainer-quest-bubble-offset.md` Slice 2
- 변경 파일:
  - `style.css`
  - `sw.js`
  - `tests/home-life-zone-npc-quest.test.js`
  - 공통 SW cache marker를 고정하는 `tests/*.test.js` 일부
  - `docs/ai/NEXT_ACTION.md`

## 결과

발견 이슈 없음.

## 확인한 내용

1. 이전 `--lz-bulb-x: 62%` 오른쪽 offset을 제거했다.
2. 트레이너 전구는 `order: 0`, 이름표는 `order: 1`로 고정되어 DOM column에서 전구가 위, 이름표가 아래에 렌더된다.
3. 버튼 폭을 `168 기준`으로 되돌려 전구/이름표 중심선이 트레이너 머리 위에서 벗어나지 않게 했다.
4. 회귀 테스트가 `order: -1`과 `--lz-bulb-x: 62%` 재도입을 막는다.
5. `style.css`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z28-trainer-quest-vertical-stack`으로 bump했다.

## 검증

- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/trainer-quest-modal.test.js` — 15 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 608 tests passed
- PASS: `git diff --check`
- pending: Dashboard3 Pages 배포 검증

## 남은 리스크

인증 세션이 없어 로그인 후 실제 홈 화면에서 픽셀 단위 시각 확인은 직접 수행하지 못했다. 배포 marker 검증 후 사용자는 홈 탭 라이프존에서 `전구 -> 트레이너 이름표 -> 머리` 순서인지 확인하면 된다.

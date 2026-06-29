# 홈 라이프존 트레이너 퀘스트 전구 위치 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-29-home-life-zone-trainer-quest-bubble-offset.md`
- 변경 파일:
  - `style.css`
  - `sw.js`
  - `tests/home-life-zone-npc-quest.test.js`
  - 공통 SW cache marker를 고정하는 `tests/*.test.js` 일부
  - `docs/ai/NEXT_ACTION.md`

## 결과

발견 이슈 없음.

## 확인한 내용

1. `.lz-npc-quest`의 세로 기준점을 `824`에서 `792`로 올려 전구가 얼굴 중심에 놓이지 않게 했다.
2. 버튼 폭을 `168 기준`에서 `188 기준`으로 넓혀 trainer 전용 전구 offset 공간을 확보했다.
3. `.lz-npc-quest--trainer .lz-npc-bulb`에 `--lz-bulb-x: 62%`, `--lz-bulb-y: -72%`를 추가해 전구를 얼굴 우상단으로 분리했다.
4. `.lz-npc-bulb` 기본 `transform`을 CSS 변수 기반으로 지정해 `prefers-reduced-motion: reduce`에서도 offset이 유지된다.
5. 미란다 NPC, 퀘스트 이벤트, 트레이너 모달 구조는 변경하지 않았다.
6. `style.css`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z27-trainer-quest-bubble-offset`으로 bump했다.
7. 캐시 버전을 직접 고정하는 회귀 테스트들의 marker를 새 버전으로 맞췄다.

## 검증

- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/trainer-quest-modal.test.js` — 15 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 608 tests passed
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` — `tomatofarm-v20260629z27-trainer-quest-bubble-offset` 확인
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260629z27-trainer-quest-bubble-offset" "style.css::.lz-npc-quest--trainer .lz-npc-bulb" "style.css::--lz-bulb-x: 62%" "style.css::--lz-bulb-y: -72%" "style.css::top: calc(792 / 1672 * 100%)"`
- not verified yet: 인증 세션이 없어 배포 홈 화면에서 실제 트레이너 얼굴 겹침 UI flow는 직접 클릭/시각 확인하지 못했다.

## 다음 상태

리뷰 기준으로 추가 수정 이슈는 없다. 인증 계정에서 홈 탭 라이프존의 트레이너 전구가 얼굴 우상단에 분리되어 보이는지만 최종 시각 확인하면 된다.

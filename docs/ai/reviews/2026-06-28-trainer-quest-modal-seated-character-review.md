# 트레이너 퀘스트 모달 착석 캐릭터 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-06-28-trainer-quest-modal-seated-character.md`
- 변경 대상:
  - `assets/home/life-zone/ui/trainer-quest-seated-trainer.png`
  - `modals/trainer-quest-modal.js`
  - `style.css`
  - `sw.js`
  - `tests/trainer-quest-modal.test.js`
  - cache marker 테스트 파일들

## Findings

- 발견된 차단 이슈 없음.

## 확인 사항

- 새 캐릭터 이미지는 장식용이므로 `aria-hidden="true"`와 빈 `alt`를 유지한다.
- `.trainer-quest-seated-character`는 `pointer-events: none`으로 모달 닫기/버튼 클릭을 가로채지 않는다.
- `.trainer-quest-sheet`는 시트 상단 padding을 확보해 착석 이미지가 헤더 텍스트와 겹치지 않도록 했다.
- 새 PNG는 `sw.js` `STATIC_ASSETS`에 등록했고, `CACHE_VERSION`도 함께 bump했다.

## 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js` — 10 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=849`
- PASS: `node --test @tests` — 580 tests passed
- PASS: `git diff --check`
- PASS: PNG alpha validation — `size=(1080, 1456)`, `mode=RGBA`, `alpha=(0, 255)`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ baf98b3` — `[deploy-verify] ok baf98b3b27d5 tomatofarm-v20260628z9-trainer-modal-seated-character static=223`
- PASS: deployed markers — 새 cache version, `data-trainer-quest-character`, `trainer-quest-seated-trainer.png`, `.trainer-quest-seated-character`, SW PNG asset
- PASS: PNG deployed asset — `HTTP 200`, `image/png`, `803246 bytes`

## 잔여 리스크

- not verified yet: Dashboard3 Pages 브라우저 세션이 로그인 전 상태라 홈 라이프존/트레이너 전구가 렌더되지 않았다. 인증 세션에서 `홈 -> 트레이너 전구` 클릭 시 실제 시각 위치 확인이 남아 있다.

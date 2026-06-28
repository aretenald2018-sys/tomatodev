# 홈 트레이너 NPC 퀘스트 모달 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-28-home-trainer-npc-quest-modal.md`
- 변경 파일: `app.js`, `modal-manager.js`, `modals/trainer-quest-modal.js`, `render-stats.js`, `style.css`, `sw.js`, `tests/*`, `docs/ai/NEXT_ACTION.md`

## Findings

- 발견된 차단 이슈 없음.

## 확인한 점

- `home/life-zone.js`의 기존 `life-zone:npc-quest` 이벤트를 유지하고, `app.js`에서 `detail.npc === 'trainer'`일 때만 새 모달을 연다.
- 모달 내부 버튼은 inline `onclick` 없이 `modals/trainer-quest-modal.js`에서 직접 바인딩한다.
- `render-stats.js`는 모달 내부에서 중복 `id`를 만들지 않도록 `data-stats-id`와 root-scoped 조회를 사용한다.
- 건강 지표 Chart instance는 canvas별 `WeakMap`으로 관리해 통계 탭과 모달 차트가 서로 destroy하지 않게 했다.
- `style.css`, `app.js`, `modal-manager.js`, `render-stats.js` 변경에 맞춰 `sw.js` `CACHE_VERSION`을 bump했고, 새 modal 파일을 `STATIC_ASSETS`에 포함했다.

## 검증

- PASS: `node --check app.js; node --check render-stats.js; node --check modal-manager.js; node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js`
- PASS: `node --test @tests` — 580 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=848`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 76c7085` — deployed `76c70852f6b5`, `tomatofarm-v20260628z8-trainer-quest-modal`, `static=222`
- PASS: deployed marker checks for trainer quest modal, scoped stats render, app event hook, CSS, and SW asset registration.
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` — `HTTP/1.1 200 OK`

## 남은 확인

- 인증 세션이 없어 배포 URL에서 홈 탭 -> 트레이너 전구 -> `내 운동 통계 살펴보기` -> 모달 내부 통계 표시 flow는 직접 확인하지 못했다.

# 홈 라이프존 상담실장 NPC 추가 리뷰

## 대상

- 계획 문서: `docs/ai/features/2026-06-29-home-consulting-chief-npc.md`
- 구현 커밋: `f6bc1679999f8c0d5bc9f2ddae802dc04c21bf1a`
- 주요 변경 파일: `home/life-zone.js`, `app.js`, `modal-manager.js`, `modals/consulting-chief-quest-modal.js`, `style.css`, `sw.js`, `tests/consulting-chief-quest-modal.test.js`, `tests/home-life-zone-npc-quest.test.js`, `assets/home/life-zone/ui/consulting-chief-npc-home.png`, `assets/home/life-zone/ui/consulting-chief-npc-modal.png`

## 리뷰 결과

발견된 코드/캐시/테스트 이슈 없음.

1. `consultingChief` 이벤트 detail이 `app.js`의 `openConsultingChiefQuestModal` 분기와 연결된다.
2. 새 모달은 sheet 내부 `stopPropagation()`을 직접 바인딩하고, 새 inline `onclick`을 만들지 않았다.
3. 홈 이름표는 DOM 텍스트이며, 전구는 기존 `npc-quest-bubble.png`를 재사용한다.
4. 새 PNG 두 개와 새 모달 JS는 `sw.js` `STATIC_ASSETS`에 등록됐고, `CACHE_VERSION`은 `tomatofarm-v20260629z29-consulting-chief-npc`로 bump됐다.
5. 홈 합성 미리보기에서 NPC는 우측 하단 소파/상담 코너에 배치되고 트레이너/미란다/러닝트랙과 겹치지 않는다.

## 검증

1. PASS: `node --check home/life-zone.js; node --check app.js; node --check modal-manager.js; node --check modals/consulting-chief-quest-modal.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js tests/miranda-quest-modal.test.js tests/trainer-quest-modal.test.js` — 24 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
4. PASS: `node --test tests/*.test.js` — 613 tests passed
5. PASS: `git diff --check`
6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ f6bc1679999f8c0d5bc9f2ddae802dc04c21bf1a` — `[deploy-verify] ok f6bc1679999f tomatofarm-v20260629z29-consulting-chief-npc static=234`
7. PASS: 배포 URL 직접 fetch — `index.html`, `sw.js`, `home/life-zone.js`, `modals/consulting-chief-quest-modal.js`, `consulting-chief-npc-home.png`, `consulting-chief-npc-modal.png`가 HTTP 200을 반환했고 JS marker가 확인됐다.

## 남은 리스크

- not verified yet: in-app browser가 Dashboard3 페이지 로딩 확인에서 두 차례 timeout되어, 배포된 홈 화면에서 `상담실장` 전구를 실제 클릭해 모달이 열리는 UI flow는 직접 확인하지 못했다.

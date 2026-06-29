# 라이프존 NPC 퀘스트 말풍선 리뷰

## 결론

- 결과: 이슈 없음
- 범위: `docs/ai/features/2026-06-25-life-zone-npc-quest-bubble.md` Slice 1

## 확인 내용

- `assets/home/life-zone/ui/npc-quest-bubble.png`는 `192x258` RGBA 투명 PNG이며, corner alpha가 0이다.
- `home/life-zone.js`는 `.lz-scene` 내부에 `button[data-lz-action="npc-quest"]`를 렌더한다.
- NPC 버튼은 기존 actor layer의 `pointer-events: none` 바깥에 있어 클릭 가능하다.
- 클릭 시 `life-zone:npc-quest` custom event가 bubbling되어 추후 퀘스트 모달 연결점으로 사용할 수 있다.
- `sw.js` `STATIC_ASSETS`에 새 sprite가 포함됐고 `CACHE_VERSION`이 bump됐다.

## 검증

1. PASS: `python scripts/validate-life-zone-assets.py`
2. PASS: `node --check home/life-zone.js; node --check sw.js`
3. PASS: `node --test tests/home-life-zone-npc-quest.test.js`
4. PASS: `node scripts/verify-runtime-assets.mjs`
5. PASS: `node --test .\tests\*.test.js` — 518 tests passed
6. PASS: `git diff --check`
7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ bb8bf7e`
8. PASS: 배포된 `sw.js`, `home/life-zone.js`에서 `tomatofarm-v20260625z59-life-zone-npc-quest`, `npc-quest-bubble.png`, `life-zone:npc-quest` 마커 확인
9. PASS: 배포 URL의 `assets/home/life-zone/ui/npc-quest-bubble.png`가 HTTP 200, `192x258`, RGBA alpha 포함으로 내려오며 로컬 파일과 SHA-256이 일치

## 남은 리스크

- 실제 홈 카드에서 말풍선 위치와 클릭 동작은 인증 계정으로 최종 수동 확인해야 한다.
- 퀘스트 모달 자체는 이번 범위에서 제외했으므로, 클릭 후 화면 변화는 아직 없다.

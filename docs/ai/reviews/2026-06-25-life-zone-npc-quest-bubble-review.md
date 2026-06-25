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

## 남은 리스크

- Dashboard3 Pages 배포 후 실제 홈 카드에서 말풍선 위치와 클릭 동작은 인증 계정으로 최종 확인해야 한다.
- 퀘스트 모달 자체는 이번 범위에서 제외했으므로, 클릭 후 화면 변화는 아직 없다.

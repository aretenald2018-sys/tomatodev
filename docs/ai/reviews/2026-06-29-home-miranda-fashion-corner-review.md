# 홈 미란다 패션 코너 리뷰

## 상태

- 상태: `pass`
- 계획 문서: `docs/ai/features/2026-06-29-home-miranda-fashion-corner.md`
- 리뷰일: 2026-06-29

## 리뷰 결과

1. 좌측 하단 공간은 별도 투명 PNG 스프라이트 `miranda-fashion-corner.png`로 덮어 기존 집기보다 옷 행거/의상/거울 중심으로 보이게 했다.
2. 미란다 버튼은 기존 NPC 이벤트와 이름표 구조를 유지하면서, 러닝트랙보다 아래쪽 좌측 하단 패션 코너로 이동했다.
3. 새 PNG는 `sw.js` `STATIC_ASSETS`에 등록했고, 캐시 버전은 `tomatofarm-v20260629z13-home-miranda-fashion-corner`로 갱신했다.
4. 회귀 테스트에는 패션 코너 DOM, CSS 좌표, PNG 헤더, 서비스워커 등록 확인을 추가했다.

## 검증

1. `node --check home/life-zone.js; node --check sw.js` 통과
2. `node --test tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js` 통과
3. `node --test tests/*.test.js` 통과, 603개 테스트 pass
4. `node scripts/verify-runtime-assets.mjs` 통과
5. `git diff --check` 통과

## 잔여 리스크

- 로컬/정적 검증 기준으로는 통과했으며, 최종 사용 흐름은 Dashboard3 Pages 배포 후 홈탭에서 미란다가 패션 코너 아래에 표시되는지 확인해야 한다.

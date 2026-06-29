# 홈 라이프존 이름표 리뷰

## 리뷰 대상

- `home/life-zone.js`
- `style.css`
- `sw.js`
- `tests/home-life-zone-npc-quest.test.js`
- cache-version 참조 테스트들
- `docs/ai/features/2026-06-27-home-life-zone-nameplates.md`

## 결론

블로킹 이슈 없음.

## 확인 내용

- actor 이름표는 `_renderActors()` 내부에서 sprite image와 같은 slot 좌표계로 렌더되고, `textContent`를 사용해 이름 문자열을 안전하게 넣는다.
- 이름표는 status row와 중복되는 장식 정보이므로 기존 `data-lz-actors aria-hidden="true"` 계약을 유지한다.
- NPC 라벨은 `.lz-npc-quest` button 안에 있으나 `pointer-events: none` 스타일을 공유하므로 기존 NPC click target을 방해하지 않는다.
- NPC 이벤트 detail은 기존 `trainer` 값을 유지했다. 보이는 이름만 첨부 이미지에 맞춰 `브루스`로 추가했다.
- `style.css`와 `home/life-zone.js`는 `STATIC_ASSETS` 대상이므로 `sw.js` cache version과 참조 테스트를 함께 갱신했다.

## 남은 리스크

- 실제 홈 UI에서 캐릭터별 sprite top padding이 이미지별로 다르면 이름표가 머리 위에서 약간 위/아래로 보일 수 있다. 이 경우 다음 조정은 slot별 `labelY` override를 추가하는 방식이 안전하다.
- 인증 계정이 필요한 Dashboard3 Pages 실제 홈 flow는 배포 후 별도 확인이 필요하다.

## 검증

- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js`
- PASS: `node --test tests/*.test.js` — 552 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

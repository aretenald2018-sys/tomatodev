# 홈 이미지 렌더링 이름표 정리 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-27-home-image-rendering-nameplates.md`
- Slice: Life Zone Nameplate Cleanup

## 리뷰 결과

- Blocking issue 없음.
- actor 이름표 좌표가 기존 `slot.width * 0.98` 중심 기준에서 스프라이트 실제 비율 기반 하단 기준으로 이동해, 닉네임이 캐릭터 몸통을 덮을 위험을 줄였다.
- NPC 카드 PNG는 DOM 렌더와 `sw.js` precache에서 제거됐다.
- 보이는 이름은 `트레이너`로 바뀌었고, 기존 이벤트 detail `{ npc: 'trainer' }`는 유지됐다.
- CSS 변경은 투명 텍스트 레이어와 직접 클릭 가능한 버튼 크기만 조정했다. 새 card/pill/background UI는 추가하지 않았다.
- `style.css` 변경에 대한 `tds-reviewer` 전용 도구는 현재 노출되지 않았고, sub-agent 도구는 사용자가 명시적으로 요청한 경우에만 사용할 수 있어 직접 리뷰로 대체했다.

## 검증

- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 18 tests passed
- PASS: `node --test tests/*.test.js` — 552 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=834`
- PASS: `git diff --check`

## 남은 확인

- not verified yet: Dashboard3 Pages 배포 검증은 커밋 후 실행 필요.
- not verified yet: 인증 계정 홈 탭에서 실제 라이프존 UI flow 확인 필요.

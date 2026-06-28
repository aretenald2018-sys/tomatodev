# 트레이너 퀘스트 모달 NPC 유도 효과 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-06-28-trainer-quest-modal-seated-character.md`
- 변경 대상:
  - `modals/trainer-quest-modal.js`
  - `style.css`
  - `sw.js`
  - `tests/trainer-quest-modal.test.js`
  - `tests/home-life-zone-npc-quest.test.js`
  - cache marker 테스트 파일들

## Findings

- 발견된 차단 이슈 없음.

## 확인 사항

- 라이프존 전구는 `lz-npc-bulb-blink`로 깜빡이며 노란 glow를 만든다.
- `prefers-reduced-motion: reduce`에서 전구 animation과 말풍선 cursor animation은 꺼진다.
- `PT / 트레이너 / X` 헤더 row는 modal HTML과 관련 CSS에서 제거됐다.
- close button binding도 제거되어 죽은 selector가 남지 않는다.
- 말풍선은 `aria-label`로 전체 문구를 유지하고, 화면 텍스트는 `data-trainer-quest-speech-value`에 빠르게 타이핑된다.

## 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js` — 11 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=849`
- PASS: `node --test @tests` — 581 tests passed
- PASS: `git diff --check`

## 잔여 리스크

- Dashboard3 Pages 배포 후 실제 로그인 세션에서 `홈 -> 트레이너 전구 -> 퀘스트 모달` 클릭 flow의 시각 확인이 필요하다. 인증 세션이 없는 브라우저에서는 홈 라이프존이 렌더되지 않을 수 있다.

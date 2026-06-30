# 미란다/상담실장 전구 표시 숨김 리뷰

## 리뷰 대상

- `docs/ai/features/2026-06-30-home-npc-bulb-hide.md`
- `style.css`
- `sw.js`
- `tests/home-life-zone-npc-quest.test.js`
- `tests/miranda-quest-modal.test.js`
- `tests/consulting-chief-quest-modal.test.js`
- `tests/*` cache marker 기대값 변경

## Findings

- 없음.

## 확인한 사항

- 미란다와 상담실장 전구만 `.lz-miranda-npc .lz-npc-bulb, .lz-consulting-chief-npc .lz-npc-bulb { display: none; }`로 숨겼다.
- 트레이너 전구 규칙인 `.lz-npc-quest--trainer .lz-npc-bulb`와 공통 전구 animation/keyframes는 유지했다.
- 미란다/상담실장 버튼 DOM, 이름표, `data-lz-action`, `life-zone:npc-quest` 이벤트 detail, 모달 opener 매핑은 변경하지 않았다.
- 새 이미지 자산은 없고, `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` cache version bump가 필요했고 반영됐다.

## 검증

- PASS: `node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js tests/consulting-chief-quest-modal.test.js tests/trainer-quest-modal.test.js` — 24 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 홈 라이프존 화면에서 미란다/상담실장 전구가 사라진 상태 확인이 남아 있다.

## 결정

- 추가 코드 수정 없이 Dashboard3 Pages 배포 검증으로 진행한다.

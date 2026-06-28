# 트레이너 퀘스트 모달 말풍선/착석 보정 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-06-28-trainer-quest-modal-seated-character.md`
- 변경 대상:
  - `modals/trainer-quest-modal.js`
  - `style.css`
  - `sw.js`
  - `tests/trainer-quest-modal.test.js`
  - cache marker 테스트 파일들

## Findings

- 발견된 차단 이슈 없음.

## 확인 사항

- `무엇을 도와드릴까요?`는 이제 `.trainer-quest-speech` 말풍선 `h2#trainer-quest-title`에만 존재한다.
- `aria-labelledby="trainer-quest-title"`는 유지되어 모달 접근성 제목은 계속 연결된다.
- 캐릭터와 말풍선은 `.trainer-quest-stage`에 묶였고 `pointer-events: none`으로 모달 버튼 클릭을 막지 않는다.
- `style.css`와 `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 `tomatofarm-v20260628z10-trainer-speech-bubble`로 bump했다.

## 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js` — 10 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=849`
- PASS: `node --test @tests` — 580 tests passed
- PASS: `git diff --check`

## 잔여 리스크

- Dashboard3 Pages 배포 후 인증 세션 없이 실제 홈 라이프존/트레이너 전구 클릭 flow는 여전히 확인이 어렵다. deployed marker와 HTTP asset 검증을 우선 proof로 남기고, 로그인 세션에서 최종 시각 확인이 필요하다.

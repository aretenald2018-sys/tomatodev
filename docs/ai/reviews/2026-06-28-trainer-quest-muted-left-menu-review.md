# 트레이너 퀘스트 회색 시트/좌측 선택지 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-06-28-trainer-quest-modal-seated-character.md` Slice 7-8
- 변경 대상: `style.css`, `sw.js`, 관련 cache marker 테스트

## Findings

- 발견된 차단 이슈 없음.

## 확인 사항

- 트레이너 무릎 아래 시트 영역은 흰색 배경이 아니라 더 어두운 회색조 반투명 그라데이션과 blur를 사용한다.
- 시트와 배경의 경계는 상단 border와 얇은 shadow로만 구분되며, 별도 강한 흰색 면을 만들지 않는다.
- 선택지 박스 묶음은 `width: min(360px, 72vw)`로 제한되어 전체 행을 차지하지 않고 좌측 일부 영역만 사용한다.
- 선택지 박스 높이와 padding을 줄여 첨부 게임 화면의 좌측 하단 메뉴처럼 슬림하게 보이도록 했다.
- `style.css`가 `sw.js` `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION`을 `tomatofarm-v20260628z17-trainer-menu-left`로 bump했다.

## 검증

- PASS: `node --check sw.js; node --test tests/trainer-quest-modal.test.js` — 6 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 583 tests passed
- PASS: `git diff --check`

## 잔여 리스크

- 실제 모바일 인증 화면에서 회색조 농도와 좌측 선택지 폭은 추가 눈검수가 필요하다.

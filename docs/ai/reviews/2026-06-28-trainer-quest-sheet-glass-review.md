# 트레이너 퀘스트 시트 반투명/타이포 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-06-28-trainer-quest-modal-seated-character.md` Slice 6
- 변경 대상: `style.css`, `sw.js`, 관련 cache marker 테스트

## Findings

- 발견된 차단 이슈 없음.

## 확인 사항

- 모달 시트는 순백 배경 대신 반투명 회색조 배경과 backdrop blur를 사용해 뒷면이 약하게 비치도록 조정했다.
- 게임형 선택지 박스 구조는 유지하되, 선택지 텍스트는 `var(--font-sans)`와 TDS size/weight token을 사용해 기존 앱 타이포에 맞췄다.
- 선택지 텍스트의 강한 그림자는 제거해 TDS 계열 폰트 렌더링이 과장되어 보이지 않게 했다.
- `style.css`가 `sw.js` `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION`을 `tomatofarm-v20260628z14-trainer-sheet-glass`로 bump했다.

## 검증

- PASS: `node --check sw.js; node --test tests/trainer-quest-modal.test.js` — 6 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 583 tests passed
- PASS: `git diff --check`

## 잔여 리스크

- 실제 모바일 브라우저에서 `backdrop-filter` 지원 여부와 회색조 농도는 인증 계정 화면으로 추가 눈검수가 필요하다.

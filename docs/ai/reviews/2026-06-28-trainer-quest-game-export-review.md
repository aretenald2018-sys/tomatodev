# 트레이너 퀘스트 게임 선택지/통계 Export 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-06-28-trainer-quest-modal-seated-character.md` Slice 5
- 변경 대상: `modals/trainer-quest-modal.js`, `render-stats.js`, `style.css`, `sw.js`, 관련 회귀 테스트

## Findings

- 발견된 차단 이슈 없음.

## 확인 사항

- 전구 클릭 첫 화면은 TDS 카드형 3열 타일이 아니라 게임 대화 선택지 느낌의 세로형 직사각형 상자 3개로 바뀌었다.
- `내 운동 통계` 화면의 공유/복사 아이콘은 모달 내부에서 직접 바인딩되어, 시트 내부 `stopPropagation` 계열 이벤트와 충돌하지 않는다.
- 공유 JSON은 통계 화면에서 쓰는 집계 함수와 동일한 데이터 원천을 재사용하며, Web Share API 미지원 환경에서는 클립보드 복사로 fallback한다.
- `style.css`가 `sw.js` `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION`을 `tomatofarm-v20260628z13-trainer-game-export`로 bump했다.

## 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check render-stats.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/stats-overall-compact-summary.test.js` — 16 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 583 tests passed
- PASS: `git diff --check`

## 잔여 리스크

- 인증된 실제 계정으로 배포 URL에서 `홈 -> 라이프존 트레이너 전구 -> 내 운동 통계 살펴보기 -> 공유/복사` UI flow를 직접 조작하는 확인은 별도 필요하다.

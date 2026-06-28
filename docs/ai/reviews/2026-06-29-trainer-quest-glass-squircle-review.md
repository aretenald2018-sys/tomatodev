# 트레이너 퀘스트 모달 글래스/스퀘어클 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-29-trainer-quest-glass-squircle.md`
- 변경 파일:
  - `modals/trainer-quest-modal.js`
  - `style.css`
  - `sw.js`
  - `tests/trainer-quest-modal.test.js`
  - 캐시 버전 marker를 참조하는 관련 테스트

## Findings

- 차단 이슈 없음.

## 확인한 근본 원인

- 트레이너 모달은 공통 `.modal-backdrop`의 어두운 overlay를 그대로 받았고, `.trainer-quest-sheet`도 회색 반투명 값과 낮은 saturation blur를 써서 glass보다 TDS sheet에 가깝게 보였다.
- 선택지는 하나의 어두운 직사각 패널 안 row 구조였기 때문에 사용자가 요청한 스퀘어클 형태가 아니었다.
- `tests/trainer-quest-modal.test.js`가 기존 `28ms` 타자 속도, 회색 sheet, 어두운 직사각 메뉴를 정답으로 강제하고 있어 수정이 다시 되돌아가거나 실패할 가능성이 있었다.

## 리뷰 중 수정한 사항

- 없음.

## 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js` — 13 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=855`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 591 tests passed
- PASS: `git diff --check`

## 남은 리스크

- 인증 계정이 없어 배포 전 로컬/원격 브라우저에서 실제 홈탭 트레이너 버튼을 눌러 모달 시각 상태를 직접 확인하지는 못했다. 최종 배포 후 인증 계정으로 홈탭 트레이너 모달을 열어 glass sheet, 느린 타자, 50% 이하 폭의 둥근 선택지를 확인해야 한다.

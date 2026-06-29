# 홈 라이프존 러닝 실제 지도/제자리 모션 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-29-home-running-real-map-stationary.md`
- 변경 파일:
  - `workout/running-session.js`
  - `home/life-zone-state.js`
  - `home/life-zone.js`
  - `style.css`
  - `sw.js`
  - 관련 테스트

## Findings

- 차단 이슈 없음.

## 리뷰 중 수정한 사항

- 홈 말풍선 지도는 사용자가 지도 provider를 Google/TMAP으로 바꿔둔 경우에도 공개 VWorld 키로 실제 타일을 렌더하도록 `CONFIG.MAPS.VWORLD_API_KEY` fallback을 추가했다.

## 검증

- PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check workout/running-session.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js tests/running-tracker.test.js` — 38 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=855`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 591 tests passed
- PASS: `git diff --check`

## 남은 리스크

- 인증 계정이 없어 배포 전 로컬 브라우저에서 실제 홈탭 러닝 UI flow를 클릭 검증하지는 못했다. 최종 배포 후 Dashboard3 URL에서 인증 계정으로 러닝 시작 -> 홈탭 라이프존 복귀 흐름을 확인해야 한다.

# 러닝 VWorld 기본 지도화 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-28-running-vworld-default-map.md`
- 변경 범위:
  - `config.js`
  - `workout/running-map.js`
  - `sw.js`
  - `tests/*.test.js` cache marker
  - `tests/running-entry.test.js`
  - `tests/running-tracker.test.js`

## Findings

- 발견된 차단 이슈 없음.

## 확인한 사항

- 기본 실행 경로에서 `CONFIG.MAPS.VWORLD_API_KEY`가 제공된 VWorld browser map key로 채워진다.
- `cfg_running_map_provider`가 `auto`, `none`, 키 없는 `google`, 키 없는 `tmap` 상태여도 VWorld key가 있으면 VWorld provider로 fallback한다.
- 사용자 화면에서 `키를 설정하면 실제 지도에 GPS가 표시됩니다` 문구가 더 이상 렌더되지 않는다.
- `sw.js` cache marker가 `tomatofarm-v20260628z5-running-vworld-default-map`로 갱신됐다.

## 검증

- PASS: `node --check config.js; node --check workout/running-map.js; node --check sw.js`
- PASS: `node --test tests/running-tracker.test.js tests/running-entry.test.js` — 12 tests passed
- PASS: `node --test tests/*.test.js` — 576 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`

## 남은 리스크

- VWorld key는 정적 프론트엔드에서 호출되는 browser map key라 배포 JS에서 보인다. 운영 리스크는 VWorld 콘솔의 도메인 제한과 사용량 모니터링으로 관리해야 한다.
- 인증 세션과 실제 모바일 GPS 권한 flow는 로컬 Node 테스트로 검증할 수 없다. Pages 배포 후 `운동 -> 런닝/조깅`에서 지도 타일과 현재 위치 marker가 뜨는지 사용자 환경에서 최종 확인한다.

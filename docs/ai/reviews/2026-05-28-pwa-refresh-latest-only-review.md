# PWA 새로고침 최신 버전 단일 적용 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-05-28-pwa-refresh-latest-only.md`
- 슬라이스: `Slice 1: 최신 SW 확인 후 단일 reload`
- 변경 파일: `pwa-register.js`, `utils/build-info.js`, `app.js`, `index.html`, `sw.js`, `docs/ai/NEXT_ACTION.md`

## Findings

- 발견된 차단 이슈 없음.

## 확인한 사항

- 기존 `registration.waiting`이 있을 때 바로 오래된 worker를 안내하지 않고, `registration.update()`로 최신 app SW를 한 번 확인한 뒤 안내한다.
- 새로고침 버튼 클릭 시 다시 최신 registration을 확인하므로, 오래 켜둔 탭에서도 이전 배포의 waiting worker를 먼저 활성화할 가능성을 줄였다.
- `installing` worker가 있으면 최대 8초 동안 `installed`/`activated`/`redundant` 상태를 기다린 뒤 최신 `waiting`만 `SKIP_WAITING` 처리한다.
- reload 중복 방지 플래그는 기존처럼 유지되어 버튼 연타로 여러 reload가 실행되지 않는다.
- 변경된 정적 자산에 맞춰 `app.js`/`index.html` query version과 `sw.js` `CACHE_VERSION`이 갱신됐다.

## 검증

- `node --check pwa-register.js; node --check utils/build-info.js; node --check sw.js; node --check app.js` 통과.
- `git diff --check` 통과.
- `node scripts/verify-runtime-assets.mjs` 통과 (`refs=710`).
- 실제 PWA 업데이트 UI는 로컬 개발 환경에서 service worker가 스킵되므로 not verified yet. 배포 환경 `/tomatofarm/`에서 오래 열린 탭 기준으로 확인해야 한다.

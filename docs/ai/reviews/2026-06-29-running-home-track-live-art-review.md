# 러닝 홈 트랙 라이브 아트 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-29-running-track-live-art.md`
- 변경 파일:
  - `workout/running-session.js`
  - `style.css`
  - `sw.js`
  - `tests/running-entry.test.js`
  - cache marker 테스트 파일들

## Findings

- 발견된 차단 이슈 없음.

## 확인 내용

- 새 트랙 PNG를 만들지 않고 홈 라이프존 기존 배경 `assets/home/life-zone/base-room-expanded-alpha.png`를 재사용한다.
- 러닝 진행 화면의 `progress-bubble` 지도 shell은 기존 `renderRunningMap` 경로를 사용하므로 지도 provider/data 저장 schema를 바꾸지 않는다.
- 러너 모션은 CSS overlay이며 `prefers-reduced-motion: reduce`에서 꺼진다.
- `style.css`와 `workout/running-session.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260629z1-running-home-track-live`로 bump됐다.

## 검증

- PASS: `node --check workout/running-session.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/home-life-zone-npc-quest.test.js` — 19 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 584 tests passed
- PASS: `git diff --check`

## 남은 리스크

- 배포 페이지에서 `운동 탭 -> 런닝/조깅 -> 시작` 실제 UI flow는 인증/위치 권한 상태에 따라 추가 확인이 필요하다.

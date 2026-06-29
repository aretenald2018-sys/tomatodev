# 홈탭 러닝 트랙 캐릭터 아트 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-29-running-track-live-art.md`
- 변경 파일:
  - `app.js`
  - `home/life-zone.js`
  - `home/life-zone-state.js`
  - `workout/running-session.js`
  - `style.css`
  - `sw.js`
  - `assets/home/life-zone/manifest.json`
  - `assets/home/life-zone/sprites/*-running-track.png`
  - `scripts/make-life-zone-running-sprites.py`
  - `scripts/validate-life-zone-assets.py`
  - 관련 테스트/cache marker 파일

## Findings

- 발견된 차단 이슈 없음.

## 확인 내용

- 러닝 연출은 러닝 세션 progress 화면이 아니라 홈탭 life-zone actor layer에서 동작한다.
- 새 런닝트랙 배경을 만들지 않고 기존 홈 life-zone 배경의 트랙 좌표 위에 `running` actor slot을 배치한다.
- `jups`, `moonjung-tomato`, `lee-jaeheon` running sprite는 새 캐릭터가 아니라 기존 `*-office-center.png` 홈 캐릭터 스프라이트에서 머리/헤어 픽셀을 가져와 만든 추가 pose sheet다.
- 러닝 세션은 `window.__tomatoRunningLive`와 `life-zone:running-live` 이벤트만 발행하고, 홈탭이 열려 있으면 `renderHome()`으로 즉시 갱신한다.
- 지도 말풍선은 `lz-running-map-bubble`로 홈 actor layer 안에 렌더되고, self 러닝 actor를 우선한다.
- `style.css`, `home/life-zone.js`, `home/life-zone-state.js`, 새 sprite PNG가 정적 자산 영향권이므로 `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260629z2-home-running-track-actors`로 bump됐다.

## 검증

- PASS: `python -m py_compile scripts/make-life-zone-running-sprites.py scripts/validate-life-zone-assets.py`
- PASS: `python scripts/validate-life-zone-assets.py` — `validated base=1672x1672, sprites=30`
- PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check workout/running-session.js; node --check app.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/running-tracker.test.js` — 36 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=853`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 588 tests passed
- PASS: `git diff --check`

## 남은 리스크

- Dashboard3 Pages 배포 후 인증 계정으로 `운동 탭 -> 런닝/조깅 -> 시작 -> 홈 탭` 실제 UI flow를 확인해야 최종 사용자 화면 검증이 완료된다.

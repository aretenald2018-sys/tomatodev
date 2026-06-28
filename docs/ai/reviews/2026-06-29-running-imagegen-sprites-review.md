# 홈탭 러닝 imagegen 스프라이트 리뷰

## 리뷰 결과

- 발견된 차단 이슈: 없음.
- `scripts/make-life-zone-running-sprites.py` 삭제 후 테스트가 해당 스크립트 존재를 요구하지 않도록 갱신됐다.
- `jups/moonjung-tomato/lee-jaeheon-running-track.png`는 모두 `256x192` RGBA sprite sheet로 유지되어 기존 CSS `steps()` 계약과 맞는다.
- `home/life-zone-state.js`와 `assets/home/life-zone/manifest.json`의 running slot 좌표가 일치한다.
- 빨강/파랑/초록 running slot 좌표는 합성 미리보기에서 홈탭 기존 런닝트랙 lane 위에 놓이는 것으로 확인했다.
- `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260629z3-home-running-imagegen-sprites`로 bump됐고, 관련 테스트 marker도 갱신됐다.

## 검증

- PASS: `python scripts/validate-life-zone-assets.py`
- PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check workout/running-session.js; node --check app.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/running-tracker.test.js` — 36 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 588 tests passed
- PASS: `git diff --check`

## 잔여 리스크

- 실제 인증 세션의 홈탭 UI에서 러닝 시작 후 live 이벤트가 발생하는 시각 flow는 배포 페이지에서 추가 확인이 필요하다.

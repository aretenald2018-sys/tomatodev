# 홈 라이프존 발밑 이름표 리뷰

## 대상

- 계획: `docs/ai/features/2026-07-01-home-life-zone-foot-nameplates.md`
- 변경 파일:
  - `home/life-zone.js`
  - `style.css`
  - `sw.js`
  - `tests/home-life-zone-npc-quest.test.js`
  - cache marker 테스트 파일들

## 리뷰 결과

문제 없음.

1. 하단 상태칩 제거
   - `renderLifeZoneCard()`에서 `lz-status-row`가 제거됐다.
   - `_renderStatus()`는 상단 `data-lz-sync` 문구만 갱신하므로 하단 X 표시 대상이 다시 렌더되지 않는다.

2. 발밑 이름표 배치
   - actor 이름표가 `.lz-actor` 내부 child로 이동했다.
   - `.lz-nameplate--actor`는 `top: 100%` 기준이라 pose별 PNG 세로 비율 차이와 러닝 pseudo sprite에도 발밑 배치를 유지한다.
   - `.lz-actor { overflow: visible; }`가 있어 이름표가 actor box 밖으로 내려가도 잘리지 않는다.

3. 캐시/테스트
   - `home/life-zone.js`와 `style.css`는 `STATIC_ASSETS` 대상이며, `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260701z1-life-zone-foot-nameplates`로 bump됐다.
   - cache marker 테스트들이 새 버전으로 정렬됐다.

## 검증

1. PASS: `node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` - 29 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=858`
4. PASS: `git diff --check`
5. PASS: `node --test --test-reporter=dot tests/*.test.js`
6. PASS: Dashboard3 Pages 배포 검증 - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b37bce6` -> `[deploy-verify] ok b37bce6b88a5 tomatofarm-v20260701z1-life-zone-foot-nameplates static=233`
7. PASS: Dashboard3 Pages marker 검증 - `sw.js::tomatofarm-v20260701z1-life-zone-foot-nameplates`, `home/life-zone.js::actorElement.append(image, nameplate)`, `style.css::.lz-nameplate--actor`

## 남은 확인

1. not verified yet: 인증 세션이 없어 실제 홈 탭 라이프존에서 캐릭터 발밑 이름표 시각 상태는 직접 확인하지 못했다.

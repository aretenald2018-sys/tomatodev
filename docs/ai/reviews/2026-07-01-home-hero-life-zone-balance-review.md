# 홈 히어로/라이프존 높이 재배치 리뷰

## 대상

- 계획: `docs/ai/features/2026-07-01-home-hero-life-zone-balance.md`
- 변경 파일:
  - `home/tomato.js`
  - `style.css`
  - `sw.js`
  - `tests/home-hero-layout.test.js`
  - `tests/home-life-zone-npc-quest.test.js`
  - cache marker 테스트 파일들

## 리뷰 결과

문제 없음.

1. 히어로 카드 축소
   - 토마토 SVG가 `72`에서 `44`로 줄었고, `.tf-hero` padding/count/unit 크기가 compact 값으로 낮아졌다.
   - `.tf-hero-sub` 줄을 제거해 히어로 높이를 줄이는 주된 원인을 제거했다.
   - 토마토 규칙 버튼은 `.tf-hero-info-btn`으로 우측 상단에 유지되어 기존 규칙 sheet 접근이 사라지지 않았다.

2. 라이프존 확대
   - `.lz-scene`이 `1672 / 1872` 비율로 커졌다.
   - `.lz-world`를 `112%`로 같은 비율 확대해 기존 `1672x1672` actor 좌표계와 overlay 정렬을 유지한다.

3. 캐시/테스트
   - `home/tomato.js`, `style.css`는 `STATIC_ASSETS` 대상이며, `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260701z2-home-hero-life-zone-balance`로 bump됐다.
   - 히어로 compact marker, 라이프존 비율 marker, cache marker가 테스트에 반영됐다.

## 검증

1. PASS: `node --check home/tomato.js; node --check sw.js`
2. PASS: `node --test tests/home-hero-layout.test.js tests/home-life-zone-npc-quest.test.js` - 11 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=858`
4. PASS: `git diff --check`
5. PASS: `node --test --test-reporter=dot tests/*.test.js`
6. PASS: Dashboard3 Pages 배포 검증 - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ da7b5c0` -> `[deploy-verify] ok da7b5c0fe3c9 tomatofarm-v20260701z2-home-hero-life-zone-balance static=233`
7. PASS: Dashboard3 Pages marker 검증 - `sw.js::tomatofarm-v20260701z2-home-hero-life-zone-balance`, `home/tomato.js::renderCharacterSVG(characterMood, { size: 44 })`, `style.css::aspect-ratio: 1672 / 1872`
8. PASS: 배포 URL 브라우저 접근 - `https://aretenald2018-sys.github.io/dashboard3/`는 열렸고 로그인 화면이 먼저 표시됨을 확인했다.

## 남은 확인

1. not verified yet: 인증 세션이 없어 실제 홈 탭에서 히어로/라이프존 시각 비율은 직접 확인하지 못했다.

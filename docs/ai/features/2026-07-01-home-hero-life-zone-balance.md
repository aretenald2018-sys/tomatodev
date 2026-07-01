# 홈 히어로/라이프존 높이 재배치

## 상태

- 상태: `complete`
- 요청일: 2026-07-01
- 트리거: `/grill-me` - 홈 화면 UX/레이아웃 변경

## 요청

홈 상단 히어로 카드는 지금보다 높이를 약 50% 줄이고, 라이프존 카드는 더 크게 보이게 한다.

## 그릴 결과

코드에서 확인한 결정:

1. 사용자가 말한 히어로 카드는 `home/tomato.js`의 `renderTomatoCard()`가 렌더하는 `.tf-card > .tf-hero.tf-hero--gradient`다.
2. 라이프존 카드는 같은 함수가 `#home-hero` 바로 뒤에 삽입하는 `#tf-life-zone-card`다.
3. 히어로 높이를 CSS padding만 줄이면 `.tf-hero-sub` 줄 때문에 50% 축소가 어렵다.
4. 토마토 규칙 버튼은 유지해야 하므로, 기존 `.tf-hero-sub` 안의 `ⓘ` 버튼을 라벨 줄로 옮기고 sub 줄은 카드 높이에서 제거한다.
5. 라이프존은 기존 `1672x1672` 좌표계와 actor overlay 정렬을 유지해야 하므로, 좌표계를 바꾸지 않고 `.lz-world`를 같은 비율로 확대해 더 크게 보이게 한다.

## Slice 1 - Hero Compact + Life Zone Expand

### 구현

1. `home/tomato.js`
   - `renderCharacterSVG(characterMood, { size: 72 })`를 더 작은 크기로 줄인다.
   - 히어로 라벨 줄에 `tomato-rule-info-card` 버튼을 붙인다.
   - `.tf-hero-sub` 줄을 렌더하지 않아 히어로 세로 높이를 줄인다.
2. `style.css`
   - `.tf-hero` padding, gap, count font, unit font, character size를 compact 값으로 줄인다.
   - `.tf-hero-label`을 한 줄 ellipsis로 만들고, 내부 info 버튼이 같이 들어가도 넘치지 않게 한다.
   - `.lz-scene`을 기존 정사각형보다 더 높은 비율로 바꾼다.
   - `.lz-world`를 같은 비율로 확대해 actor 좌표 정렬을 유지하면서 라이프존 이미지를 크게 보이게 한다.
3. `tests/home-life-zone-npc-quest.test.js`
   - 라이프존 scene/world 비율 marker를 새 값으로 갱신한다.
4. `tests/home-hero-layout.test.js`
   - 히어로 compact marker와 info button 위치를 검증한다.
5. `sw.js`
   - `style.css`, `home/tomato.js`가 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 bump한다.

### 제외

- 라이프존 스프라이트/배경 자산 재생성
- 홈 카드 순서 변경
- 칼로리/체중 summary strip 제거
- 운동 deck 미완료 작업

## 검증

1. `node --check home/tomato.js; node --check sw.js`
2. `node --test tests/home-hero-layout.test.js tests/home-life-zone-npc-quest.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. `node --test --test-reporter=dot tests/*.test.js`
6. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
7. UI flow: 홈 탭에서 빨간 히어로 카드 높이가 이전 대비 약 절반으로 줄고, 바로 아래 라이프존 장면이 더 크게 보인다.

## 실행 결과

1. `home/tomato.js`에서 히어로 토마토 SVG 크기를 `72`에서 `44`로 줄였다.
2. `.tf-hero-sub` 줄을 렌더하지 않게 하고, `tomato-rule-info-card` 버튼은 `.tf-hero-info-btn`으로 히어로 우측 상단에 유지했다.
3. `style.css`에서 `.tf-hero` padding/count/unit/character 크기를 compact 값으로 줄이고, `.tf-hero-sub` 스타일을 제거했다.
4. `style.css`에서 `.lz-scene`을 `1672 / 1872` 비율로 키우고, `.lz-world`를 `112%`로 확대해 actor 좌표 정렬을 유지한 채 라이프존을 크게 보이게 했다.
5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260701z2-home-hero-life-zone-balance`로 bump했다.
6. 테스트: `tests/home-hero-layout.test.js`를 추가하고 라이프존 CSS marker 테스트를 갱신했다.
7. 리뷰: `docs/ai/reviews/2026-07-01-home-hero-life-zone-balance-review.md`

## 검증 결과

1. PASS: `node --check home/tomato.js; node --check sw.js`
2. PASS: `node --test tests/home-hero-layout.test.js tests/home-life-zone-npc-quest.test.js` - 11 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=858`
4. PASS: `git diff --check`
5. PASS: `node --test --test-reporter=dot tests/*.test.js`
6. not verified yet: Dashboard3 Pages 배포 검증은 커밋/푸시 후 실행한다.
7. not verified yet: 인증 세션이 없어 실제 홈 탭 UI flow는 브라우저에서 직접 확인하지 못했다.

## 다음 실행 지시

없음. Slice 1 구현과 리뷰까지 완료했다.

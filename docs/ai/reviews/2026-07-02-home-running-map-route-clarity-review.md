# 홈 러닝 지도 말풍선 경로 가시성 개선 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-07-02-home-running-map-route-clarity.md`
- 변경 파일: `home/life-zone.js`, `style.css`, `sw.js`, 관련 cache marker 테스트, 홈 러닝 지도 테스트

## 결과

- 발견 사항: 없음.

## 확인 내용

1. 홈 지도 말풍선은 더 이상 `172x121` 내부 캡처와 `max 76px` 표시 폭에 묶이지 않고, `300x210` 내부 지도와 최대 `136px` 표시 폭을 사용한다.
2. route zoom은 위경도 span 고정 분기가 아니라 지도 viewBox padding 안에 들어오는 픽셀 span 기준으로 계산된다.
3. GPS live route 주입 흐름은 기존 `_pushPosition()` -> `_publishRunningLiveState()` -> `life-zone:running-live` -> `renderHome()` 체인을 유지한다.
4. route overlay는 흰색 casing과 빨간 main polyline을 겹쳐 타일 위 대비를 높이고, 시작점 marker와 현재 위치 dot을 함께 표시한다.
5. VWorld provider, GPS 수집/저장 schema, 운동 상세 지도 렌더러는 변경하지 않았다.

## 검증

1. PASS: `node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `node --test --test-reporter=dot tests/*.test.js`
5. PASS: `git diff --check`
6. PASS: Dashboard3 Pages 배포 검증 - `ef2b8327e044ff8b50550ae47fd3342d046d015c`
7. PASS: Dashboard3 Pages marker 검증 - 배포된 `sw.js`, `home/life-zone.js`, `style.css`에 홈 러닝 지도 route marker 반영 확인

## 남은 확인

- not verified yet: 인증 계정에서 `홈 -> 오늘의 라이프존 -> 러닝 actor 말풍선`의 실제 타일/경로 가시성을 확인해야 한다.

## Slice 2 추가 리뷰

### 리뷰 대상

- 요청: 홈 말풍선 크기 50% 축소, 내부 지도 배율은 올림픽공원 맥락이 드러나도록 보정
- 변경 파일: `home/life-zone.js`, `style.css`, `sw.js`, 관련 tests

### 결과

- 발견 사항: 없음.

### 확인 내용

1. 말풍선 표시 폭은 `clamp(92px, calc(300 / 1672 * 100%), 136px)`에서 `clamp(46px, calc(150 / 1672 * 100%), 68px)`로 줄어 Slice 1 대비 50% 크기가 됐다.
2. 홈 지도 최대 zoom은 `14`로 낮아져 짧은 route에서도 주변 공원/지형 맥락이 더 넓게 잡힌다.
3. tile을 SVG `<image>`로 렌더하므로 말풍선을 줄여도 타일, route line, 시작점, 현재 위치가 같은 viewBox 안에서 함께 축소된다.
4. VWorld provider, GPS 수집/저장 schema, 운동 상세 지도는 변경하지 않았다.

### 검증

1. PASS: `node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `node --test --test-reporter=dot tests/*.test.js`
5. PASS: `git diff --check`

### 남은 확인

- not verified yet: Dashboard3 Pages 배포 후 인증 계정에서 홈탭 실제 러닝 말풍선의 올림픽공원 맥락 가시성을 확인해야 한다.

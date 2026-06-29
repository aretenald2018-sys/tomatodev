# 홈 러닝 GPS 지도 배율 조정 리뷰

## 결과

- 문제 없음.

## 확인한 범위

1. 홈 라이프존 러닝 지도 말풍선에 `RUNNING_MAP_HOME_MAX_ZOOM = 14`를 추가해 짧은 러닝이나 라이브 위치에서도 과도하게 확대되지 않도록 제한했다.
2. 운동 탭 러닝 결과 지도는 `workout/running-map.js`와 `renderRunningMap(... phase: 'detail')` 경로를 그대로 유지했다.
3. 완료된 러닝 기록과 라이브 러닝은 모두 홈 라이프존의 동일한 `_buildRunningMapBubbleData()` 경로를 타므로 같은 홈 전용 배율을 사용한다.
4. `home/life-zone.js`가 `sw.js` `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 `tomatofarm-v20260629z19-home-running-map-zoom`으로 갱신했다.

## 검증

1. PASS: `node --check home/life-zone.js`
2. PASS: `node --check sw.js`
3. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/running-tracker.test.js tests/workout-calendar-bottom-sheet.test.js` — 41 tests passed
4. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
5. PASS: `node --test tests/*.test.js` — 606 tests passed
6. PASS: `git diff --check`

## 남은 위험

- Dashboard3 Pages 배포 검증은 최종 커밋으로 수행한다.
- 실제 홈탭 시각 배율은 인증 계정 브라우저에서 `홈 -> 러닝 중/러닝 기록 지도 말풍선`을 확인해야 한다.

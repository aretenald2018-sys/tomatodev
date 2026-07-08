# 러닝 GPS 전체 궤적 및 중단 복구 리뷰

## 결과

- 판정: `PASS`
- 계획 문서: `docs/ai/features/2026-07-09-running-gps-full-route-resilience.md`
- 실행 범위: Slice 1 `웹/PWA 러닝 route integrity 수정`
- 제외 범위: Android foreground service, iOS Core Location background tracking
- 코드 변경 commit: `a0e5085ff05b130be5a88c081b0969d448a19dac`
- 최종 배포: 코드 변경 commit을 포함한 current `origin/main`
- 운영 URL: `https://aretenald2018-sys.github.io/tomatofarm/`

## 변경 요약

1. `workout/running-session.js`
   - route point에 `segmentId`, `gapBefore`, `gapReason`을 보존한다.
   - 시작 시 preview/current point를 첫 route point로 seed한다.
   - `pagehide`, `beforeunload`, `visibilitychange(hidden)`, pause, restore, GPS error, 긴 위치 업데이트 공백 뒤 다음 point를 새 segment로 시작한다.
   - 거리/고도 계산은 gap edge를 제외하고, summary에 `segmentCount`, `gapCount`, `interrupted`를 저장한다.
2. `workout/running-map.js`
   - `splitRunningMapSegments()`를 추가했다.
   - Google/TMAP/VWorld renderer가 segment별 polyline만 그려 중단 구간을 직선으로 잇지 않는다.
3. `render-calendar.js`, `style.css`
   - 저장된 러닝 상세 카드가 GPS 중단 구간 상태를 표시한다.
4. `sw.js`
   - `CACHE_VERSION`을 `tomatofarm-v20260709z1-running-gps-route-resilience`로 bump했다.
5. `tests/`
   - gap edge 거리 제외, segment metadata 보존, 지도 segment split, 상세 카드 중단 표시 회귀 테스트를 추가했다.

## 디버깅 근거

1. 가설: 지도 renderer가 route 전체를 하나의 polyline으로 그려 중단 지점을 직선 연결한다.
   - 증거: 첫 회귀 테스트에서 `splitRunningMapSegments` export 부재로 실패했다.
   - 확인: 수정 후 focused test 49개 통과, 수동 드라이버 결과 `segments=2`.
2. 가설: 거리 계산이 gap edge를 합산해 누락 구간 거리를 실제 이동처럼 더한다.
   - 증거: `runningRouteDistanceMeters()`가 모든 인접 point를 더하던 구조였다.
   - 확인: 수동 드라이버 결과 `distanceM=44`, `gapCount=1`, `interrupted=true`.
3. 가설: draft/downsample이 gap metadata를 버리면 저장 후 다시 끝점 연결이 재발한다.
   - 증거: `_safePoint()`와 `downsampleRunningRoute()`가 기존에는 lat/lng 중심으로만 정규화했다.
   - 확인: `running session draft normalizer preserves interrupted route metadata` 및 `running route downsample and map normalization preserve gap metadata` 통과.

## 검증

1. FAIL 확인: `node --test tests/running-tracker.test.js tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js`
   - 초기 실패: `splitRunningMapSegments` 없음, gap metadata/cache/UI 기대값 미충족.
2. PASS: `node --test tests/running-tracker.test.js tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js`
   - 63 pass.
3. PASS: `find tests -maxdepth 1 -name '*.test.js' ! -name 'wear-*.test.js' -print0 | xargs -0 node --test`
   - 743 pass.
4. PASS: `npm.cmd run verify:assets`
   - `[runtime-assets] ok refs=903`.
5. PASS: `git diff --check`
6. PASS: `node --check workout/running-session.js && node --check workout/running-map.js && node --check render-calendar.js && node --check sw.js`
7. PASS: 수동 route driver
   - 출력: `{"segments":2,"distanceM":44,"gapCount":1,"interrupted":true}`
8. PASS: `npm.cmd run deploy:production`
   - `origin/main`에 코드 변경 commit `a0e5085ff05b130be5a88c081b0969d448a19dac`를 포함해 반영.
   - `[deploy-verify] ok ... tomatofarm-v20260709z1-running-gps-route-resilience static=260`
   - deployed marker: `index.html::app.js`, `app.js::initBuildInfoSurface`, `sw.js::tomatofarm-v20260709z1-running-gps-route-resilience`
9. PASS: production browser QA
   - 모바일 390x844, `https://aretenald2018-sys.github.io/tomatofarm/` HTTP 200.
   - `build-info.json` commit/cache marker가 `a0e5085ff05b` / `tomatofarm-v20260709z1-running-gps-route-resilience`.
   - 실제 브라우저 module import에서 `segments=2`, `distanceM=44`, `gapCount=1`, `interrupted=true`.
10. INFO: `node --test tests/*.test.js` 전체는 현재 `origin/main`에도 없는 `android/wear`/`android/app/build.gradle` 파일을 요구하는 Wear 계약 테스트 6개 때문에 실패한다. 이번 slice의 JS/PWA 러닝 경로는 Wear 제외 전체와 focused tests로 검증했다.

## 남은 확인

- not verified yet: 인증 계정 실제 기기 GPS로 `운동 -> 러닝 시작 -> background/pause/reload -> 종료 -> 저장 -> 상세 카드` 플로우를 끝까지 저장 검증하지는 못했다. 이 세션에서는 로그인 계정과 OS 위치 센서 권한이 없어 production browser module QA로 route split/summary 동작을 검증했다.
- LSP diagnostics: TypeScript LSP server가 설치되어 있지 않고 이전에 설치가 거절된 상태라 실행하지 못했다.

## 리뷰 결론

Slice 1의 목표인 “웹/PWA에서 누락된 GPS 구간을 거짓 직선으로 잇지 않기”는 구현과 테스트로 충족했다. Android/iOS에서 앱이 죽은 동안 계속 GPS를 수집하는 기능은 네이티브 foreground/background location 구현이 필요하며 이번 slice 범위가 아니다.

# 런닝/조깅 GPS 트래커 Slice 2 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-27-running-jogging-entry.md`
- 슬라이스: Slice 2. Foreground GPS 러닝 트래커
- 변경 파일:
  - `index.html`
  - `style.css`
  - `calc.js`
  - `data/data-load.js`
  - `data/data-pure.js`
  - `workout/activity-forms.js`
  - `workout/cross-domain.js`
  - `workout/load.js`
  - `workout/running-tracker.js`
  - `workout/save.js`
  - `workout/save-schema.js`
  - `workout/sessions.js`
  - `workout/state.js`
  - `workout/timers.js`
  - `sw.js`
  - 관련 테스트 파일

## 결과

- Finding 없음.

## 확인 내용

- `workout/running-tracker.js`는 foreground `navigator.geolocation.watchPosition()` 기반으로 GPS 시작/일시정지/종료를 처리하고, haversine 거리, 시간, pace, bbox/centroid, downsampled route, SVG route preview를 생성한다.
- `runRoute`, `runRouteSummary`, `runPlaceSummary`, `runSource`, GPS accuracy/pace 필드가 운동 저장, 회차 저장, 날짜 로드, active draft, twin-account 병합 경로에 연결되었다.
- `runPlaceSummary`는 현재 provider 결과 슬롯만 저장한다. Kakao key 없는 환경에서 동네/공원명을 추정해 저장하지 않는다.
- `calc.js`, `data/data-pure.js`, `workout/cross-domain.js`가 route-only 러닝 기록을 운동 기록으로 인정한다.
- `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260627z16-running-gps`로 bump되었고 `./workout/running-tracker.js`가 `STATIC_ASSETS`에 포함되었다.

## 검증

- PASS: `node --check workout/running-tracker.js; node --check workout/activity-forms.js; node --check workout/save.js; node --check workout/load.js; node --check workout/sessions.js; node --check calc.js`
- PASS: `node --test tests/running-tracker.test.js tests/running-entry.test.js tests/workout-sessions.test.js tests/save-schema.test.js tests/data.load-save.test.js tests/calc.record.test.js` — 137 tests passed.
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 567 tests passed.
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=839`.
- PASS: `git diff --check; git diff --cached --check`.

## 남은 리스크

- not verified yet: 인증 계정과 실제 브라우저/모바일 위치 권한이 필요해 Dashboard3 배포 페이지에서 `GPS 시작 -> 권한 허용 -> 일시정지/종료 -> 저장` 실제 UI flow는 아직 직접 확인하지 못했다.
- 한국 지도 tile, route polyline, 동네/공원명 자동 표출은 Slice 3 범위다. Kakao JavaScript key 또는 동등한 국내 지도 provider key가 필요하다.

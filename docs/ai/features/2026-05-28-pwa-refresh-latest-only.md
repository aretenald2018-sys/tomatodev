# PWA 새로고침 최신 버전 단일 적용 계획

## 요청 요약

- 배포가 여러 번 누적된 뒤 앱의 `새로고침` 업데이트 안내를 누르면 최신 버전 하나만 적용되어야 한다.
- 현재는 배포 횟수만큼 여러 번 새로고침해야 하는 것처럼 보인다.

## 진단

1. `pwa-register.js`는 로드 시점에 `registration.waiting`이 있으면 그 worker를 바로 업데이트 대상으로 저장한다.
2. 사용자가 오래 켜둔 탭에는 이전 배포의 waiting worker가 남아 있을 수 있고, 그 사이 새 배포가 더 생기면 사용자가 오래된 waiting worker부터 순차 활성화할 위험이 있다.
3. `utils/build-info.js`의 새로고침 버튼은 저장된 `latestRegistration.waiting`에 `SKIP_WAITING`을 보내거나 단순 reload만 수행한다. 클릭 시점에 `registration.update()`로 최신 service worker를 다시 확인하지 않는다.
4. 따라서 "마지막 업데이트만 띄우기" 요구는 표시 DOM 중복보다, 새로고침 실행 직전에 최신 SW 확인과 최신 waiting/installing worker 선택을 보장해야 한다.

## 목표

- 앱 업데이트 아이콘/패널은 하나만 유지한다.
- 새로고침 버튼 클릭 시 먼저 app service worker registration을 강제로 업데이트 확인한다.
- 업데이트 확인 후 가장 최신 `waiting` worker가 있으면 그 worker만 `SKIP_WAITING` 처리하고 한 번만 reload한다.
- 새 SW가 이미 활성화된 상태라면 한 번만 reload한다.

## 실행 슬라이스

### Slice 1: 최신 SW 확인 후 단일 reload

수정 대상:

- `pwa-register.js`
  - app SW 등록 후 기존 waiting worker를 바로 표시하기 전에 `registration.update()`를 한 번 시도한다.
  - update 결과와 `updatefound` 이벤트가 겹쳐도 기존 pending queue의 최신 seq만 표시하도록 유지한다.
- `utils/build-info.js`
  - 새로고침 클릭 시 `navigator.serviceWorker.getRegistration('/tomatofarm/')` 또는 저장된 registration을 최신화한다.
  - update 직후 `installing` worker가 있으면 `installed`/`activated` 상태까지 짧게 기다린 뒤 최신 `waiting`을 선택한다.
  - reload 중복 방지 상태는 유지한다.
- `app.js`, `index.html`, `sw.js`
  - 정적 자산 변경에 맞춰 query version과 `CACHE_VERSION`을 갱신한다.

비범위:

- `www/` 직접 수정 금지.
- FCM 전용 service worker scope 변경 금지.
- 배포/push는 사용자가 명시하지 않았으므로 하지 않는다.

검증:

- `node --check pwa-register.js utils/build-info.js sw.js app.js`
- `git diff --check`
- 로컬 개발 환경은 service worker 등록을 스킵하므로 실제 PWA 업데이트 클릭 플로우는 `not verified yet`일 수 있다.
- 배포 환경 `/tomatofarm/`에서 오래 열린 탭에 업데이트 아이콘이 하나만 보이고, `새로고침` 1회 후 최신 빌드로 이동해야 한다.

## 실행 기록

- Slice 1 완료: `pwa-register.js`가 기존 `registration.waiting`을 바로 안내하기 전에 `registration.update()`로 최신 app SW를 다시 확인하도록 했다.
- Slice 1 완료: `utils/build-info.js`의 새로고침 버튼은 클릭 시점에 최신 registration을 재확인하고, `installing` worker가 있으면 설치/활성 상태를 최대 8초 기다린 뒤 최신 `waiting` worker만 `SKIP_WAITING` 처리한다.
- Slice 1 완료: `app.js`, `index.html` query version과 `sw.js` `CACHE_VERSION`을 갱신했다.
- Slice 1 검증: `node --check pwa-register.js; node --check utils/build-info.js; node --check sw.js; node --check app.js` 통과.
- Slice 1 검증: `git diff --check` 통과.
- Slice 1 검증: `node scripts/verify-runtime-assets.mjs` 통과 (`refs=710`).
- Slice 1 not verified yet: 로컬 개발 환경은 service worker 등록이 스킵되므로 실제 업데이트 아이콘 클릭 후 1회 reload 플로우는 배포 환경 `/tomatofarm/`에서 확인해야 한다.
- 리뷰 완료: `docs/ai/reviews/2026-05-28-pwa-refresh-latest-only-review.md`에 차단 이슈 없음으로 기록했다.

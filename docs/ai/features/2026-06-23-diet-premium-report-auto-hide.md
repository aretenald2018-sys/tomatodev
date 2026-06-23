# 식단 프리미엄 리포트 자동 팝업 차단

## 배경

- 사용자 제보 스크린샷에서 `식단 프리미엄 리포트` 모달이 계속 노출되고 있다.
- 현재 `showDietPremiumReportIfNeeded()`는 `REPORTS[userId]`가 있으면 `diet_premium_report_inbox`가 없어도 `DIET_PREMIUM_CONTENT_VERSION`을 기본 리포트 ID로 사용해 자동 노출할 수 있다.
- 닫기 저장이 실패했거나 기존 사용자 설정에 `diet_premium_report_seen`이 없으면 같은 사용자가 재방문할 때 반복 노출될 수 있다.

## 진단

1. 자동 호출 지점
   - `app.js` 초기화 중 관리자 경로, 일반 사용자 우선 팝업 경로, `finally`의 `requestAnimationFrame`에서 `showDietPremiumReportIfNeeded()`가 호출된다.
2. 반복 노출 조건
   - `feature-diet-premium-report.js`는 타겟 사용자 ID만 맞으면 inbox 없이도 기본 리포트를 보여준다.
   - `getDietPremiumReportSeen(reportId)`가 false이면 반복 노출된다.
3. 다른 자동 팝업 점검
   - `feature-tutorial.js`: 신규 가입 30분 이내, `tutorial_completed`/`tutorialDoneAt` 조건이 있다.
   - `home/welcome-back.js`: 이전 로그인과 계정별 일자 sessionStorage 조건이 있다.
   - `home/streak-warning.js`, `home/admin-onboarding.js`: Firebase ack 조건이 있다.
   - 스크린샷 증상과 직접 일치하는 반복 모달은 식단 프리미엄 리포트다.

## 범위

### Slice 1: 식단 프리미엄 리포트 자동 노출 차단 및 운영 반영

- `feature-diet-premium-report.js`
  - 자동 노출 플래그를 `false`로 두고 `showDietPremiumReportIfNeeded()`가 항상 `false`를 반환하게 한다.
  - localhost 수동 미리보기 함수는 유지해 개발자가 직접 확인할 수 있게 한다.
- `data.js`
  - 관리자 발간 함수가 실수로 새 inbox를 배송하지 않도록 disabled 응답으로 막는다.
- `sw.js`
  - `STATIC_ASSETS` 대상 파일 변경에 맞춰 `CACHE_VERSION`을 bump한다.
- 운영 산출물
  - `npm.cmd run build`로 `www/`를 갱신한다.
  - 명시 배포 요청에 따라 원격 반영까지 수행한다.

## 제외

- 리포트 UI 디자인 수정.
- 기존 리포트 콘텐츠 삭제.
- 튜토리얼/복귀 안내/PWA 설치 안내 정책 변경.

## 검증

1. `node --check feature-diet-premium-report.js`
2. `node --check data.js`
3. `node --check sw.js`
4. 리포트 자동 노출 소스 검사: `showDietPremiumReportIfNeeded()`가 disabled guard에서 종료되는지 확인.
5. `npm.cmd run dev` 후 출력 URL에서 HTTP 200 확인.
6. 브라우저에서 앱 진입 후 `#diet-premium-report-modal`이 생성되지 않는지 확인.
7. `npm.cmd run build`로 운영계 `www/` 갱신.
8. 배포 명령 실행 후 운영 URL HTTP 200 및 모달 미노출 확인.

## 실행 결과

### Slice 1: 식단 프리미엄 리포트 자동 노출 차단 및 운영 반영

- 상태: 구현 완료, 로컬 검증 완료, 배포 진행 중.
- 변경:
  1. `data.js`: `DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED = false`를 추가하고, `publishDietPremiumReportIssue()`가 비활성 상태에서는 Firestore inbox를 쓰지 않고 `{ deliveredCount: 0, disabled: true }`로 종료하게 했다.
  2. `feature-diet-premium-report.js`: `showDietPremiumReportIfNeeded()`가 비활성 플래그에서 즉시 `false`를 반환하게 했다. 기존 `app.js`의 여러 호출 지점은 그대로 있어도 자동 모달이 뜨지 않는다.
  3. `admin/admin-actions.js`: 관리자 설정의 리포트 발간 UI를 `자동 배송 중지됨` 상태로 표시하고 클릭 가드를 추가했다.
  4. `sw.js`: `STATIC_ASSETS` 대상 변경에 맞춰 최종 `CACHE_VERSION`을 `tomatofarm-v20260623z5-diet-report-off`로 bump했다.
  5. `npm.cmd run build`로 `index.html`, `build-info.json`, `sw.js`, `www/` 운영 산출물을 갱신했다.
- 로컬 검증:
  1. PASS: `node --check feature-diet-premium-report.js`
  2. PASS: `node --check data.js`
  3. PASS: `node --check admin/admin-actions.js`
  4. PASS: `node --check sw.js`
  5. PASS: guard source smoke — root와 `www/`의 리포트/데이터 모듈에 비활성 플래그 존재
  6. PASS: `git diff --check` — CRLF 변환 경고만 출력
  7. PASS: `npm.cmd run dev` — 기존 healthy 서버 `http://localhost:5500` 재사용
  8. PASS: `GET http://localhost:5500/index.html` — HTTP 200
  9. PASS: `GET http://localhost:5500/sw.js` — HTTP 200, `tomatofarm-v20260623z5-diet-report-off`
  10. PASS: `GET http://localhost:5500/feature-diet-premium-report.js` — HTTP 200, disabled guard 포함
  11. PASS: 브라우저 DOM 확인 — `#diet-premium-report-modal` 0개, `식단 프리미엄 리포트` 텍스트 미노출
  12. 참고: 브라우저 세션은 로그인 완료 상태가 아니라 `window.__tomatoAppReady`는 false였지만, 자동 노출 함수가 모듈 최상단 guard에서 종료되므로 기존 target 사용자/inbox 상태와 무관하게 모달 생성 경로가 닫힌다.

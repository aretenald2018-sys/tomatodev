# 식단 프리미엄 리포트 자동 팝업 차단 리뷰

## 결과

치명적 문제는 발견하지 못했다. 스크린샷의 `식단 프리미엄 리포트` 모달은 이제 자동 노출 함수 진입 즉시 비활성 플래그로 종료되며, 관리자 발간 함수도 새 inbox를 쓰지 않는다.

## 확인한 내용

1. 자동 노출 차단
   - `feature-diet-premium-report.js`의 `showDietPremiumReportIfNeeded()`가 `DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED` false 상태에서 즉시 `false`를 반환한다.
   - `app.js`에 남아 있는 초기화/우선 팝업/finally 호출은 유지되지만 모달 DOM을 만들 수 없다.

2. 새 배송 차단
   - `data.js`의 `publishDietPremiumReportIssue()`는 비활성 상태에서 Firestore `users/{uid}/settings/diet_premium_report_inbox`를 쓰지 않는다.
   - 따라서 기존 사용자에게 새 리포트 inbox가 누적되는 운영자 실수 경로도 닫혔다.

3. 관리자 UI
   - `admin/admin-actions.js`의 발간 카드는 `식단 프리미엄 리포트 발간 중지됨`으로 표시된다.
   - 버튼은 disabled이며 직접 함수가 호출되어도 toast 후 종료된다.

4. 다른 자동 팝업 점검
   - 튜토리얼은 신규 가입 30분 이내 + `tutorial_completed`/`tutorialDoneAt` 조건이 있다.
   - 복귀 안내는 이전 로그인 기준과 계정/날짜 sessionStorage 키가 있다.
   - 스트릭/관리자 안내 배너는 Firebase ack 조건이 있다.
   - 이번 반복 모달 증상과 직접 일치하는 무조건 타겟 자동 노출 경로는 식단 프리미엄 리포트였다.

## 검증

- PASS: `node --check feature-diet-premium-report.js`
- PASS: `node --check data.js`
- PASS: `node --check admin/admin-actions.js`
- PASS: `node --check sw.js`
- PASS: root와 `www/` source smoke — `DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED`와 `deliveredCount: 0, disabled: true` 확인
- PASS: `git diff --check` — CRLF 변환 경고만 출력
- PASS: `npm.cmd run dev` — `http://localhost:5500` 재사용
- PASS: `GET http://localhost:5500/index.html` HTTP 200
- PASS: `GET http://localhost:5500/sw.js` HTTP 200, `CACHE_VERSION = tomatofarm-v20260623z2-diet-report-off`
- PASS: `GET http://localhost:5500/feature-diet-premium-report.js` HTTP 200, disabled guard 포함
- PASS: 브라우저 DOM — `#diet-premium-report-modal` 0개, `식단 프리미엄 리포트` 텍스트 미노출

## 잔여 리스크

- 로그인된 실제 target 계정으로 리포트 함수 호출 전후를 직접 확인하지는 못했다. 다만 guard가 사용자 조회보다 먼저 실행되므로 계정/inbox/seen 상태와 무관하게 자동 모달 생성이 차단된다.
- 배포 검증은 원격 push 후 `https://aretenald2018-sys.github.io/tomatofarm/`에서 별도로 수행한다.

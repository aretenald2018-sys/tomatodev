# 식단 프리미엄 리포트 자동 노출 중지 계획

## 상태

- 상태: `approved`
- 요청일: `2026-06-23`
- 요청: 기존 사용자에게 `식단 프리미엄 리포트` 팝업이 반복 노출되지 않도록 처리하고 운영계까지 반영한다.

## 문제

- `feature-diet-premium-report.js`의 `showDietPremiumReportIfNeeded()`가 대상 사용자(`REPORTS`)면 inbox가 없어도 기본 리포트 ID로 모달 표시를 시도한다.
- `app.js` 초기화 경로에서 같은 표시 함수가 여러 번 호출되므로, seen 저장이 실패했거나 캐시된 구버전이 남은 사용자는 같은 팝업을 반복해서 볼 수 있다.
- 관리자 발행 함수가 `diet_premium_report_inbox`를 다시 쓰면 기존 사용자에게 같은 종류의 불필요한 팝업이 재발할 수 있다.

## 범위

- Slice 1: 식단 프리미엄 리포트 자동 배송/자동 표시를 비활성화한다.
- Slice 1: 관리자 발행 UI와 직접 발행 함수도 같은 플래그로 잠근다.
- Slice 1: `STATIC_ASSETS` 대상 파일 변경에 맞춰 `sw.js` 캐시 버전을 갱신하고 운영 배포를 검증한다.

## 범위 제외

- 기존 Firestore 사용자 문서의 `diet_premium_report_inbox` 삭제 마이그레이션은 수행하지 않는다.
- 리포트 미리보기(`localhost` 전용 `showDietPremiumReportPreview`)는 개발 확인용으로 유지한다.
- 다른 목적의 온보딩/복귀/연속 기록 팝업은 반복 노출 조건을 점검하되 이번 Slice에서 기능 제거하지 않는다.

## 설계

- `data.js`에 `DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED = false`를 두고 단일 차단 스위치로 사용한다.
- `publishDietPremiumReportIssue()`는 플래그가 꺼져 있으면 Firestore 쓰기 없이 `deliveredCount: 0`, `disabled: true` 결과만 반환한다.
- `showDietPremiumReportIfNeeded()`는 플래그가 꺼져 있으면 사용자/seen/inbox 확인 전에 즉시 `false`를 반환한다.
- `admin/admin-actions.js`는 발행 버튼을 비활성화하고 직접 호출도 toast 후 종료한다.

## 검증 계획

- `node --check feature-diet-premium-report.js`
- `node --check data.js`
- `node --check admin/admin-actions.js`
- `node --check sw.js`
- 관련 테스트 스위트 실행
- 로컬 dev server에서 HTTP 200 및 `#diet-premium-report-modal` 미생성 확인
- 운영 URL에서 HTTP 200, 새 `sw.js` 캐시 버전, 배포된 `feature-diet-premium-report.js` 차단 guard 확인

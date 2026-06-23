# 다음 자동 액션

## 현재 상태

- 상태: `complete`
- 계획 문서: `docs/ai/features/2026-06-23-diet-premium-report-auto-hide.md` (식단 프리미엄 리포트 자동 노출 중지)
- 현재 단계: `deploy complete — Slice 1 자동 배송/자동 표시 중지`
- 마지막 완료: `식단 프리미엄 리포트 자동 배송 플래그를 꺼 사용자 화면 모달 생성과 관리자 재발행을 차단하고 운영 URL 배포 검증을 완료했다.`
- 다음 액션: `없음. 리포트를 다시 운영하려면 DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED를 켠 별도 계획을 작성한다.`
- 차단 사유: `없음.`

## 다음 실행 대상

- 완료 파일: `data.js` · `feature-diet-premium-report.js` · `admin/admin-actions.js` · `index.html` · `sw.js` · `build-info.json` · `docs/ai/features/2026-06-23-diet-premium-report-auto-hide.md` · `docs/ai/reviews/2026-06-23-diet-premium-report-auto-hide-review.md`
- 방금 완료한 Slice 1:
  1. `DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED = false` 추가
  2. 사용자 자동 표시 진입점 `showDietPremiumReportIfNeeded()` 즉시 종료
  3. 관리자 리포트 발행 UI/직접 호출 비활성화
  4. `sw.js` 캐시 버전 `tomatofarm-v20260623z9-diet-report-off`로 갱신
  5. 운영 `tomatofarm/main` 배포 및 URL 검증
- 검증 완료:
  1. PASS: `node --check feature-diet-premium-report.js`
  2. PASS: `node --check data.js`
  3. PASS: `node --check admin/admin-actions.js`
  4. PASS: `node --check sw.js`
  5. PASS: `node --test tests/save-schema.test.js tests/workout-sessions.test.js tests/data.load-save.test.js tests/home-life-zone-state.test.js` — 87개 통과
  6. PASS: `node scripts/verify-runtime-assets.mjs` — `refs=785`
  7. PASS: 로컬 `http://localhost:5500` HTTP 200, `feature-diet-premium-report.js` guard 확인, 브라우저 DOM `#diet-premium-report-modal` 0개
  8. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ add15d70b139`
  9. PASS: 운영 URL 브라우저 DOM `#diet-premium-report-modal` 0개, `식단 프리미엄 리포트` 텍스트 미노출

## 보류 중 (이전 흐름)

- `docs/ai/features/2026-06-12-test-mode-simplify-wendler.md` — v1 개편 실행 완료(커밋 2922b64까지), 리뷰 미수행. **v2 구현으로 v1은 동결 상태** — 해당 리뷰는 폐기 권장.
- `docs/ai/features/2026-06-20-calendar-workout-tab.md` — Slice 1 구현, 리뷰, tomatofarm 원격 배포 완료. 후속 Slice 2는 로컬 정적 검증 완료, 브라우저 UI 플로우는 not verified yet.

## 상태값

- `idle`: 진행 중인 자동 액션 없음
- `needs_user_decision`: 사용자 결정이 필요함
- `ready_for_execution`: 다음 실행 슬라이스를 바로 진행
- `ready_for_review`: 직전 실행 결과를 바로 리뷰
- `ready_for_fix`: 리뷰에서 발견된 문제만 바로 수정
- `complete`: 현재 계획 완료

## 자동 진행 규칙

- 세션 시작 시 이 파일을 먼저 읽는다.
- 사용자가 "계속", "다음", "진행", "리뷰해", "해줘"처럼 짧게 말하면 이 파일의 `다음 액션`을 실행한다.
- 사용자가 새로운 요청을 명시하면 새 요청이 우선한다. 단, 기존 대기 액션과 충돌하면 어느 흐름을 계속할지 한 번만 확인한다.
- 계획 세션 종료 후 차단 질문이 없으면 `ready_for_execution`으로 갱신한다.
- 실행 세션 종료 후 `ready_for_review`로 갱신한다.
- 리뷰 세션 종료 후 문제가 있으면 `ready_for_fix`, 문제가 없고 다음 슬라이스가 있으면 `ready_for_execution`, 모든 슬라이스가 끝났으면 `complete`로 갱신한다.
- 다음 프롬프트나 리뷰 프롬프트를 사용자에게 복붙하라고 요구하지 않는다. 필요한 프롬프트 내용은 계획 문서와 이 파일에 남기고 에이전트가 직접 읽어 진행한다.

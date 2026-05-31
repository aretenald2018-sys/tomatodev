# 미사용 코드 삭제 리팩토링 Slice 3 리뷰

## 범위

- 계획: `docs/ai/features/2026-05-31-unused-code-cleanup.md`
- Slice: `Slice 3: 함수/export 단위 dead code 감사`
- 변경 파일:
  - `admin/admin-cache.js`
  - `admin/admin-charts.js`
  - `admin/admin-segmentation.js`
  - `admin/admin-utils.js`
  - `admin/admin-engagement.js`
  - `sw.js`
  - `tools/init_firebase.py`
  - `tools/init_firebase_complete.py`
  - `docs/RAILWAY_DEPLOYMENT.md`

## 검토 결과

- 차단 이슈: 없음.
- `admin/admin-engagement.js`는 실제 import/동적 로드 참조가 없고 `sw.js` 정적 캐시 목록에만 남아 있어 삭제 대상이 맞다.
- `admin/admin-engagement.js`를 `STATIC_ASSETS`에서 제거했으므로 `CACHE_VERSION` bump를 함께 적용한 것이 맞다.
- `admin/admin-cache.js`, `admin/admin-segmentation.js`의 helper들은 동일 파일 내부 호출만 남아 있어 export만 제거하고 함수는 유지한 것이 안전하다.
- `admin/admin-charts.js`, `admin/admin-utils.js`에서 삭제한 helper들은 실제 코드 경로에 외부 참조가 남아 있지 않다.
- 삭제한 Python seed 도구와 Railway 배포 문서는 현재 lite 버전 서버/API 범위와 맞지 않는 영화 크롤러 잔재다.

## 검증

- PASS: 삭제/내부화 대상 역참조 검색 결과 실제 코드 경로에 외부 참조 없음. 과거 작업 로그 매치는 기록성 데이터로 제외.
- PASS: `node --check admin/admin-cache.js; node --check admin/admin-charts.js; node --check admin/admin-segmentation.js; node --check admin/admin-utils.js; node --check sw.js`
- PASS: `node --check render-admin.js; node --check tools/api-server.js`
- PASS: `npm.cmd pkg get dependencies scripts`
- PASS: `node --test tests/*.test.js` (`371` tests)
- PASS: `git diff --check`
- not verified yet: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 미추적 `mockups/trio-renewal/shared.css` 참조 때문에 실패했다. 이번 삭제 파일인 `admin/admin-engagement.js`에 대한 누락은 보고되지 않았다.
- not verified yet: dev server/API server는 장기 실행 서버라 Codex 세션에서 실행하지 않았다. 사용자가 일반 터미널에서 앱 UI와 `/api/health` HTTP 200을 확인한다.

## 다음 단계

- 현재 계획 완료.

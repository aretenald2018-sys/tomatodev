# 관리자 CSV 체중 기록 누락 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-05-28-admin-csv-body-checkins.md`
- 변경 파일: `render-admin.js`, `admin/admin-export.js`, `sw.js`

## 확인 결과

- 발견된 차단 이슈: 없음
- 관리자 데이터 로더가 `body_checkins`를 최근 30일 기준으로 수집하고, 기존 `workoutMap` 흐름과 분리된 `bodyCheckinMap` / `bodyCheckins`로 전달한다.
- 일일 CSV는 기존 활동 컬럼을 유지하면서 체중 기록 수, 체중 기록 유저 수, 평균 체중, 일별 기록 문자열을 추가한다.
- 전체 CSV는 기존 4개 파일에 상세 체중 기록 CSV를 추가로 다운로드한다.
- 정적 자산 변경에 맞춰 `sw.js` `CACHE_VERSION`이 bump됐다.

## 검증

- 통과: `node --check render-admin.js`
- 통과: `node --check admin/admin-export.js`
- 통과: `node --check sw.js`
- 통과: fixture 기반 CSV 생성 검사

## 남은 리스크

- not verified yet: 실제 관리자 화면에서 `내보내기 > Daily CSV`와 `All CSV` 다운로드 버튼을 누르는 브라우저 플로우는 이 세션에서 장기 dev server를 띄우지 않는 규칙 때문에 직접 확인하지 못했다.

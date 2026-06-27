# 웬들러 SSOT Slice 1 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-27-wendler-program-ssot-diagnosis.md`
- Slice: Slice 1 — `board-core` SSOT 모델과 회귀 테스트
- 변경 파일:
  - `workout/test-v2/board-core.js`
  - `tests/test-v2.board-core.test.js`
  - `sw.js`
  - cache version 참조 테스트들

## Findings

- 발견된 차단 이슈 없음.

## 확인한 계약

- `programStartDate` 저장은 더 이상 group active cycle의 `startDate`를 변경하지 않는다.
- Wendler 처방은 `bm.programStartDate` 기준의 `programWeek`/`cycleWeek`로 계산한다.
- `wendler.tmAnchors[]`는 처방 대상 주차보다 같거나 이른 최신 anchor를 선택한다.
- 과거 TM anchor를 나중에 수정해도 더 늦은 anchor 이후 처방은 보존된다.
- 정산 시 다음 cycle 시작 주에 TM anchor를 추가한다.
- `workout/test-v2/board-core.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 함께 bump했다.

## 검증

- PASS: `node --check workout/test-v2/board-core.js sw.js`
- PASS: `node --test tests/test-v2.board-core.test.js`
- PASS: `node --test .\tests\*.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 범위

- Slice 2의 종목 수정 UI/캘린더 rail 표시는 아직 미수행.
- 운영 Firestore 데이터 보정은 아직 미수행.
- Dashboard3 Pages 배포 검증은 아직 미수행.

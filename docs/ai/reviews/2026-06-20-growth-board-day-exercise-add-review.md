# 성장 보드 날짜별 운동 추가 열 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-20-growth-board-day-exercise-add.md`
- 변경 파일:
  - `workout/test-v2/board-render.js`
  - `test-mode-v2.css`
  - `sw.js`
  - `docs/ai/features/2026-06-20-growth-board-day-exercise-add.md`
  - `docs/ai/NEXT_ACTION.md`

## 확인 결과

- 문제 없음.
- `board-render.js`의 새 버튼은 모두 `data-action` 위임으로 연결되어 인라인 핸들러를 추가하지 않았다.
- 날짜별 라인업 저장은 기존 `getLineup()`/`toggleLineup()` API를 사용해 기존 보드 데이터 계약을 유지한다.
- 현재 주차 선택은 실제 운동 상태(`WS.workout.exercises`)에 동일 처방 세트를 추가한다.
- `test-mode-v2.css`와 `board-render.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION` 범프가 함께 적용됐다.

## 검증

1. PASS: `node --check workout/test-v2/board-render.js`
2. PASS: `node --check sw.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `git diff --check`
5. PASS: `npm.cmd run dev` 후 `http://localhost:5500` HTTP 200
6. PASS: Puppeteer UI smoke — `+` 열 렌더, 시트 오픈, 종목 담기, 오늘 운동 엔트리 생성 확인

## 결론

- Slice 1 완료. 배포 진행 가능.

# 운동 과거 상세 완료 체크 표시 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-history-detail-ui-regression.md` 후속 Slice 5
- 변경 파일:
  - `style.css`
  - `sw.js`

## 발견 사항

- Blocking 없음.

## 확인 내용

- `render-calendar.js`는 이미 기록된 본세트를 `.wt-max-set-row.is-done`으로 렌더한다.
- 이번 변경은 누락된 `.is-done` 시각 스타일만 추가했다.
- 완료 체크는 어두운 배경/흰 체크로 명확하게 보이며, X/그립 보조 아이콘은 더 약하게 표시된다.
- `style.css`는 `STATIC_ASSETS`에 포함되므로 `sw.js` `CACHE_VERSION`이 함께 bump됐다.

## 검증

- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 리스크

- Dashboard3 배포 URL에서 인증된 계정의 과거 운동 상세 화면을 열어 실제 시각 상태를 확인해야 최종 UI 검증이 완료된다.

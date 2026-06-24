# 운동 홈 과거 상세 액션 Toolbar Slice 3 리뷰

## 검토 범위

- 계획: `docs/ai/features/2026-06-24-workout-history-detail-ui-regression.md`
- 변경 파일: `style.css`, `sw.js`
- 요청: 상단 액션을 날짜 오른쪽 빈 영역에 몰아 넣고 칩 형태가 아닌 toolbar 형태로 변경

## 결과

- 문제 없음.

## 확인 내용

- `.wt-day-head`가 뒤로가기, 날짜, 우측 액션 영역의 3열 grid로 바뀌었다.
- `.wt-day-actions`가 `grid-column: 3 / 4`로 이동해 날짜 오른쪽 헤더 영역 안에 배치된다.
- 개별 action button은 pill/chip 배경, shadow, 둥근 border를 제거하고 toolbar cell 구분선만 사용한다.
- 기록 있음 5개 버튼은 3x2 toolbar로, 기록 없음 3개 버튼은 1-row toolbar로 보여도 하단 border가 남지 않도록 처리됐다.
- `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION` bump가 함께 반영됐다.

## 검증

- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- pending: Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

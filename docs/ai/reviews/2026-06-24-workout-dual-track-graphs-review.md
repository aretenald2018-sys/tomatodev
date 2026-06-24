# 운동 Max 카드 볼륨/강도 그래프 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-history-detail-ui-regression.md` 후속 Slice 6
- 변경 파일:
  - `workout/exercises.js`
  - `render-calendar.js`
  - `style.css`
  - `sw.js`

## 발견 사항

- Blocking 없음.

## 확인 내용

- 당일 Max 카드의 별도 그래프 행이 제거되고, `오늘 성공 기준` row 오른쪽 칸에 볼륨/강도 그래프가 렌더된다.
- 기록이 없는 당일 Max 카드도 볼륨/강도 두 줄 구조를 유지하므로 `현재 트랙` 단일 카드로 회귀하지 않는다.
- 과거 운동 상세도 동일하게 볼륨/강도 두 줄 그래프를 렌더한다.
- 과거 상세 강도 그래프 fallback은 `estimateSet1RM()`을 사용해 라이브 그래프의 강도 의미와 맞췄다.
- `workout/exercises.js`, `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되므로 `sw.js` `CACHE_VERSION`이 함께 bump됐다.

## 검증

- PASS: `node --check workout/exercises.js`
- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `git push origin HEAD:main` (`08d5f32`)
- PASS: GitHub Actions `Verify Pages Runtime Assets` run `28070130104`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 08d5f32`
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` -> `HTTP/1.1 200 OK`

## 남은 리스크

- 인증된 계정 데이터에서 운동 탭의 당일 운동 추가 카드와 과거 운동 상세 카드를 열어 실제 모바일 폭 시각 상태를 확인해야 최종 UI flow 검증이 완료된다.

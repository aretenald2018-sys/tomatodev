# 운동 과거 상세 요약 카드/그래프 재배치 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-history-detail-ui-regression.md` 후속 Slice 4
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`

## 발견 사항

- Blocking 없음.

## 확인 내용

- 상단 `.wt-day-actions` toolbar 렌더는 사용자 요청대로 제거됐다.
- `운동시간`/`세트`/`볼륨`은 헤더 우측 `.wt-day-summary-card` 단일 카드로 이동했다.
- 별도 `.wt-day-metrics` row와 `.wt-max-track` 단독 카드는 제거됐다.
- 운동 카드 그래프는 `.wt-max-plan` 오른쪽 칸에 들어간다.
- `style.css`에서 `.wt-max-plan-goal` selector를 사용해 그래프 stat에 성공 기준 typography가 누수되지 않게 했다.
- `style.css`에서 요약 카드 값에 `min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis`를 적용해 모바일 overflow 위험을 낮췄다.
- `render-calendar.js`와 `style.css`는 `STATIC_ASSETS`에 포함되므로 `sw.js` `CACHE_VERSION`이 함께 bump됐다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 리스크

- Dashboard3 배포 URL에서 실제 로그인 데이터가 있는 과거 운동 상세 화면을 열어 UI flow를 확인해야 최종 검증이 완료된다.
- 상단 toolbar 제거로 `오늘`/`루틴`/`내보내기`/`회차 삭제` 즉시 노출은 사라진다. 이는 사용자 스크린샷 요청과 Slice 4 계획의 명시 범위에 따른 의도된 변경이다.

# Discord 인입 통계 개선 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-11-discord-stats-calorie-weight.md`
- 변경 파일:
  - `index.html`
  - `render-stats.js`
  - `style.css`
  - `sw.js`

## 결과

- 상태: 통과
- 발견한 차단 이슈: 없음

## 확인 내용

- 전체 기록 리포트 행은 desktop `1280x900`, mobile `360x740`에서 `nowrap`으로 유지되고 외부 행 overflow가 발생하지 않았다.
- `체중 + 섭취칼로리` 결합 차트는 Chart.js 데이터셋 2개(`체중`, `섭취칼로리`)와 최근 90일 라벨로 렌더링됐다.
- 월간 칼로리 리포트 차트는 데이터셋 3개(`섭취칼로리`, `운동칼로리`, `목표`)로 렌더링됐다.
- 월간 요약은 성공/실패/초과 kcal와 끼니별 평균/비율 영역을 표시했다.
- `STATIC_ASSETS` 대상 파일 변경에 맞춰 `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260611z2-discord-stats-calorie-weight`로 갱신됐고, 배포 빌드에서 `tomatofarm-v20260611z3-discord-stats-calorie-weight`로 최종 범프됐다.

## 검증

- `node --check render-stats.js`
- `node --check sw.js`
- `node --check scripts/dev-start.mjs`
- `npm.cmd run dev`
- `http://localhost:5500/index.html` HTTP 200
- Puppeteer UI probe:
  - desktop `1280x900`: 메타 행 `overflowingRows=0`, `wrappedRows=0`, 두 차트 렌더링
  - mobile `360x740`: 메타 행 `overflowingRows=0`, `wrappedRows=0`, 두 차트 렌더링

## 잔여 리스크

- 실제 사용자 데이터의 오래된/희소 기록 조합은 샘플 데이터 검증보다 다양할 수 있다. 다만 기록 없음 상태와 데이터 있음 상태 모두 기존 empty UI와 Chart.js dataset 생성 경로를 유지한다.

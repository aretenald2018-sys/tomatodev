# 캘린더 운동 셀 부위 요약 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-20-calendar-workout-tab.md` 후속 Slice 2
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`

## 결과

- 발견된 결함: 없음
- `render-calendar.js`의 월간 운동 셀은 더 이상 운동종목명을 직접 렌더하지 않고, 실제 작업세트가 있는 근력 운동을 주동근 대분류별로 합산해 `가슴 12`, `등 8` 형태로 표시한다.
- 개별 운동명과 세트 상세는 날짜 상세 모달에만 남아 있어, 월간 셀의 정보 밀도와 상세 확인 흐름이 분리되어 있다.
- `style.css`에서 셀 바 폰트/높이를 줄였고, `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` 캐시 버전 범프가 포함되어 있다.

## 검증

1. PASS: `node --check render-calendar.js`
2. PASS: `node --check sw.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `git diff --check`
5. not verified yet: 이 세션 지침상 장기 dev server를 sandbox에서 시작하지 않았으므로 실제 브라우저에서 `캘린더 -> 운동` 셀 표시 확인은 사용자 로컬 일반 터미널에서 필요하다.

## 수동 확인 흐름

- `npm.cmd run dev`
- 하단 `캘린더` 탭 -> 내부 `운동` 탭
- 운동 기록이 있는 날짜 셀에서 `케이블...`, `랫풀다운` 같은 종목명 대신 `복부 4`, `등 10` 같은 부위별 세트 라인이 보이면 통과

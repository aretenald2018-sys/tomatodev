# 종목별 볼륨 그래프 기준 표시 및 일자 상세 리뷰

## 대상

- 계획 문서: `docs/ai/features/2026-06-11-volume-chart-point-details.md`
- 변경 파일: `render-stats.js`, `style.css`, `sw.js`, `docs/ai/NEXT_ACTION.md`

## 결과

- 발견 이슈: 없음
- 범위 확인: 통계 탭 `종목별 볼륨 추이` 카드 안에서 기준 문구, 기준 종목 선택, 점/행 선택 상세 패널만 변경했다.
- 데이터 경계 확인: Firestore 직접 호출이나 저장 로직 변경 없이 기존 `getCache()`, `getExList()`, `getVolumeHistory()`, `calcVolume()`만 사용한다.
- 이벤트 확인: 새 상세 동작은 `data-volume-date` 버튼과 Chart `onClick`으로 직접 바인딩했다. 신규 `onclick=`은 추가하지 않았다.
- 캐시 확인: `render-stats.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 함께 범프했다.

## 검증

- PASS: `node --check render-stats.js`
- PASS: `node --check sw.js`
- PASS: `npm.cmd run dev` 실행 결과 기존 `http://localhost:5500` 서버 재사용
- PASS: `curl.exe -I http://localhost:5500` 응답 `HTTP/1.1 200 OK`
- PASS: 인앱 브라우저에서 더보기 → 통계 탭 진입 확인. 현재 로그인 계정에는 운동 기록이 없어 실제 계정의 볼륨 카드는 빈 상태였다.
- PASS: Puppeteer 모바일 viewport 390x844, 저장 없는 브라우저 메모리 fixture에서:
  - 기준 문구/기준 종목 표시 확인
  - 차트 점 주변 클릭 후 `2026-05-12` 상세 표시 확인
  - 최근 기록 행 클릭 후 `2026-05-22` 상세 표시 확인

## 잔여 위험

- 실제 사용자 계정의 비어 있지 않은 데이터는 현재 브라우저 세션에 없어, 비어 있지 않은 흐름은 fixture로 검증했다.

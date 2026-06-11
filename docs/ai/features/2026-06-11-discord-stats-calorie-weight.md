# Discord 인입 통계 개선 계획

## 배경

- Discord 요청 ID:
  - `devreq_discord_1514532788433453127`: 전체 기록 리포트 행을 한 줄에 들어오게 처리
  - `devreq_discord_1514533402361991168`: 섭취칼로리와 체중을 하나의 그래프에서 통계 탭에 표출
  - `devreq_discord_1514533520826040501`: 칼로리 월간 집계 데이터를 만들어 통계 탭에 표출
  - `devreq_discord_1514604874225156097`: 16:32 이후 인입 건 미시작 원인 확인
- `1514604874225156097`은 앱 기능 구현이 아니라 Discord agent 상태 진단이다. 원인은 `devreq_discord_1514507586240774166`이 Discord에는 완료 메시지를 보냈지만 `discord-agent-state.json`에는 `running`으로 남은 상태 잠금이다.

## 그릴 결과

- 핵심 질문: 3개의 기능 요청을 각각 별도 기능으로 나눌지, 통계 탭 개선 1개 슬라이스로 묶을지?
- 결정: 통계 탭의 같은 화면/데이터(`render-stats.js`, `index.html`, `style.css`)를 공유하므로 1개 슬라이스로 묶는다.
- 남은 가정:
  - 칼로리 성공/실패는 기존 `dietDayOk()` 판정을 그대로 따른다.
  - 초과 칼로리는 `일일 섭취칼로리 - getDayTargetKcal()`의 양수 합으로 계산한다.
  - 섭취칼로리/체중 결합 그래프는 최근 90일을 기본 범위로 한다.

## 슬라이스 1: 통계 탭 칼로리/체중 개선

- 목표:
  - 전체 기록 리포트 메타 행이 모바일에서 불필요하게 여러 줄로 무너지지 않게 한다.
  - `통계 > 전체통계`에 최근 90일 `체중 + 섭취칼로리` 결합 차트를 추가한다.
  - 현재 월 칼로리 리포트에 성공일, 실패일, 총 초과 칼로리, 끼니별 평균/비율을 표시한다.
- 터치 예상 파일:
  - `index.html`
  - `render-stats.js`
  - `style.css`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
- 비목표:
  - 새 저장 필드 추가
  - `www/` 직접 수정
  - Discord agent runner 코드 수정
  - 배포
- 검증:
  - `node --check render-stats.js`
  - `node --check sw.js`
  - `npm.cmd run dev` 후 HTTP 200
  - `통계 > 전체통계`에서 전체 기록 리포트 행, 결합 차트, 월간 칼로리 리포트가 렌더링되는지 확인
  - `index.html`, `render-stats.js`, `style.css`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 범프한다.

## 실행 상태

- 상태: review complete
- 완료 내용:
  - 전체 기록 리포트 메타 행을 한 줄 레이아웃으로 정리하고 긴 값은 값 영역 안에서만 가로 스크롤되게 처리했다.
  - `통계 > 전체통계`에 최근 90일 `체중 + 섭취칼로리` 결합 차트를 추가했다.
  - 현재 월 칼로리 리포트에 섭취/운동/목표 그래프, 성공/실패일, 총 초과 kcal, 끼니별 평균/비율을 추가했다.
  - `index.html`, `render-stats.js`, `style.css`가 `STATIC_ASSETS` 대상이라 `sw.js` `CACHE_VERSION`을 범프했다.
  - 배포 빌드에서 최종 캐시 버전은 `tomatofarm-v20260611z3-discord-stats-calorie-weight`가 됐다.
- 검증:
  - `node --check render-stats.js`
  - `node --check sw.js`
  - `node --check scripts/dev-start.mjs`
  - `npm.cmd run dev` -> `http://localhost:5500`
  - `http://localhost:5500/index.html` HTTP 200
  - Puppeteer로 desktop `1280x900`, mobile `360x740`에서 통계 탭 렌더 검증
- 다음 액션: 없음

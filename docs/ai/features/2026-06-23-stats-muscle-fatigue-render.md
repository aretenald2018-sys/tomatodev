# 통계 탭 근육 피로도 렌더 보강

## 그릴 결과

- 핵심 질문: 첨부 스크린샷의 인체 렌더링을 어떻게 반영할 것인가?
- 결정: 스크린샷에서 전면/후면 인체 렌더만 잘라 정적 에셋으로 추가하고, 앱 데이터로 계산한 활성 근육을 그 위에 반투명 색상 오버레이로 표시한다.
- 결정: 스크린샷의 슬라이더는 구현하지 않는다. 대신 `일별`, `주별`, `월별` 버튼을 제공하고 클릭한 기간 기준으로 근육 활성도를 다시 계산한다.
- 결정: 기존 통계 탭의 `전체통계` 첫 화면 상단에 `근육 피로도` 섹션을 추가해 누락 정보가 바로 보이도록 한다.
- 남은 가정: "운영계 반영 및 배포"는 기존 프로젝트 규칙대로 `tomatofarm` 원격 push와 GitHub Pages URL 확인으로 처리한다.

## 목표

첨부 이미지에 있는 통계 정보 중 현재 통계 탭에 없는 첫 화면형 근육 피로도 정보를 추가한다. 인체 렌더링은 첨부 이미지에서 추출한 에셋을 사용하고, 사용자는 `일별/주별/월별` 중 하나를 눌러 해당 기간에 활성화된 대근육을 색상으로 확인한다.

## 실행 슬라이스

### Slice 1: 통계 탭 근육 피로도 카드 추가 및 운영 반영

변경 범위:

1. `assets/stats/muscle-fatigue-body.png`
   - 첨부 이미지에서 전면/후면 인체 렌더링 영역만 추출한다.
2. `index.html`
   - `stats-overall-panel` 상단에 `근육 피로도` 카드 컨테이너를 추가한다.
3. `render-stats.js`
   - `renderStats()`에서 새 카드 렌더 함수를 호출한다.
   - 최근 1일/7일/30일 운동 기록을 기준으로 대근육별 활성 점수, 유효세트, 볼륨, 최근 운동일을 계산한다.
   - `일별/주별/월별` 버튼 클릭 시 활성 기간을 바꾸고 인체 오버레이/요약을 갱신한다.
4. `style.css`
   - 첨부 이미지의 어두운 통계 화면 톤을 유지하면서 모바일에서 텍스트와 오버레이가 겹치지 않게 스타일을 추가한다.
5. `sw.js`
   - `STATIC_ASSETS`에 새 이미지가 필요하면 추가한다.
   - `render-stats.js`, `index.html`, `style.css` 변경에 맞춰 `CACHE_VERSION`을 범프한다.
6. `docs/ai/NEXT_ACTION.md`
   - 실행 완료 후 리뷰 대상으로 갱신한다.
7. `docs/ai/reviews/2026-06-23-stats-muscle-fatigue-render-review.md`
   - 리뷰 결과와 검증 증거를 기록한다.

하지 않을 것:

- 새 데이터 저장 필드나 Firestore 직접 호출을 추가하지 않는다.
- `www/` 산출물을 직접 수정하지 않는다.
- 첨부 이미지의 슬라이더 UI를 구현하지 않는다.
- 기존 통계 차트의 의미나 계산 방식을 리팩터링하지 않는다.

## 검증 계획

1. `node --check render-stats.js`
2. `node --check sw.js`
3. `git diff --check`
4. `npm.cmd run dev` 후 실제 URL에서 HTTP 200 확인
5. 통계 탭 진입 후 `근육 피로도` 카드가 보이고 `일별/주별/월별` 클릭 시 활성 버튼과 근육 오버레이가 바뀌는지 확인
6. `npm.cmd run build`로 운영 산출물 갱신
7. `git push tomatofarm main` 후 `https://aretenald2018-sys.github.io/tomatofarm/` HTTP 200 및 원격 `sw.js` 캐시 버전 확인

## 상태

- 2026-06-23: 계획 작성 완료. Slice 1 실행 가능.

## 2026-06-24 회귀 진단

사용자 피드백:

- 통계탭 근육 활성 UI가 깨져 있고 일부 정보가 보이지 않는다.
- 운동 활성 부위는 `주별`/`월별` 기준으로만 표시한다.
- 활성 부위는 단일 붉은색 계열로만 칠하고, 활성도가 높을수록 채도/강도를 높이며 낮을수록 낮춘다.
- 현재처럼 부위별로 초록/파랑/보라/주황 등 다른 색을 쓰지 않는다.

재현/확인 루프:

1. `render-stats.js`의 `FATIGUE_PERIODS`, `FATIGUE_GROUPS`, `_fatigueHotspotsHtml()`, `_fatigueRowsHtml()`를 정적 확인한다.
2. `style.css`의 `.stats-muscle-fatigue-*` 레이아웃과 색상 변수를 확인한다.
3. 수정 후 `node --check render-stats.js`, `node --check sw.js`, `git diff --check`를 실행한다.
4. Dashboard3 배포 URL에서 통계 탭 진입 후 `주별`/`월별` 전환, 활성 부위 붉은색 표시, 비활성 부위 미표시를 확인한다.

가설:

1. `FATIGUE_GROUPS.color`가 부위별 다색으로 하드코딩되어 사용자 요구와 반대로 렌더링된다.
2. `일별` 버튼까지 렌더링되어 요구한 `주별`/`월별` 범위를 벗어난다.
3. 모든 부위 row를 항상 렌더링하면서 0값과 색상 막대가 노출되어 UI가 깨져 보인다.
4. 근육 카드가 어두운 카드/흰 텍스트 전제로 스타일링되어 배포 테마나 캐시 상태에 따라 텍스트가 보이지 않을 수 있다.

### Slice 2: 통계탭 근육 활성 UI 복구 및 붉은색 단일화

변경 범위:

1. `render-stats.js`
   - 근육 활성 기간을 `주별`, `월별`만 남긴다.
   - 부위별 색상 필드를 제거하거나 사용하지 않고, 활성도 기반 단일 red intensity 값을 계산한다.
   - hotspot과 row는 활성 부위만 렌더링한다.
   - 활성 기록이 없을 때는 깨진 0값 목록 대신 빈 상태 문구를 표시한다.
   - 최신 운동 저장 구조인 `workoutSessions`를 기준으로 각 회차의 `exercises`를 펼쳐 계산한다.
2. `style.css`
   - 근육 활성 카드가 밝은/어두운 배경 모두에서 읽히도록 텍스트, 여백, 요약 영역을 복구한다.
   - hotspot과 bar 색상을 `#fa342c` 계열 단일 빨간색으로 통일하고 intensity 변수만 반영한다.
3. `sw.js`
   - `render-stats.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.
4. `docs/ai/NEXT_ACTION.md`
   - 실행 완료 후 리뷰 대상으로 갱신한다.

하지 않을 것:

- 새 근육 이미지 자산을 만들거나 기존 `assets/stats/muscle-fatigue-body.png`를 수정하지 않는다.
- 통계탭의 다른 차트/리포트 계산을 리팩터링하지 않는다.
- 운동 기록 저장 구조나 Firestore 접근 경로를 변경하지 않는다.

검증 계획:

1. `node --check render-stats.js`
2. `node --check sw.js`
3. red-only source check: `render-stats.js`의 근육 활성 그룹에 다색 hex가 남아 있지 않은지 확인
4. `git diff --check`
5. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
6. 배포 URL에서 더보기 → 통계 → 근육 활성 카드 → `주별`/`월별` 버튼 전환 시 활성 부위만 붉은색 강도 차이로 보이는지 확인

실행 결과:

- 2026-06-24: Slice 2 구현 완료.
- PASS: `node --check render-stats.js`
- PASS: `node --check sw.js`
- PASS: `rg -n "#22c55e|#38bdf8|#f97316|#84cc16|#a78bfa|일별" render-stats.js` 출력 없음
- PASS: `git diff --check`
- 2026-06-24 후속 보정: 근육 활성 계산이 `day.exercises`만 보던 문제를 수정해 `workoutSessions` 기반 다회차 운동 기록도 반영하도록 했다.
- 리뷰: `docs/ai/reviews/2026-06-24-stats-muscle-red-review.md`
- 배포 검증:
  - PASS: 커밋 `e2f2a99`를 `origin/main`에 push했다.
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e2f2a99`
  - PASS: 배포된 `render-stats.js`에서 `getWorkoutSessions`, red tint, 활성 부위 빈 상태 문구가 확인됐고 `label: '일별'`은 제거됐다.
  - not verified yet: 배포 URL은 로그인 화면에 막혀 더보기 → 통계 → 운동 활성 부위 카드 UI 클릭 흐름을 인증 계정으로 끝까지 확인하지 못했다.

### Slice 3: 저활성 부위 푸른색 표시와 실행 가능한 보강 인사이트

사용자 피드백:

- 상대적으로 미활성되어 있거나 덜 한 부위는 푸르스름한 푸른색 계열로 표출한다.
- 단순히 색칠하는 것만으로 사용자가 실질적으로 도움을 받는지 의문이 있다.
- 이 통계가 다음 운동 판단에 도움이 되도록 표현 방식을 고민해 추가 반영한다.

그릴 결과:

- 질문: 색상을 피로도처럼 해석하게 할지, 다음 운동 우선순위처럼 해석하게 할지가 핵심이다.
- 결정: 빨강은 "이번 기간에 많이 쓴/회복 확인할 부위", 파랑은 "상대적으로 덜 쓴/다음 보강 후보"로 의미를 분리한다.
- 근거: 모든 부위를 빨간 강도로만 칠하면 사용자는 "어디가 부족한지"를 알기 어렵다. 푸른색은 부족/차가움/비활성 신호로 쓰고, 별도 인사이트 문구로 다음 행동을 제안한다.
- 가정: 부위별 절대 권장 세트 기준보다 현재 카드의 상대 분포가 더 직관적이다. 따라서 같은 기간 내 최고 활성 부위 대비 낮은 부위를 보강 후보로 본다.

변경 범위:

1. `render-stats.js`
   - 기간 내 기록이 있으면 모든 주요 그룹을 상대 활성도로 분류한다.
   - 최고 활성 대비 낮은 그룹은 blue tint와 `보강`/`낮음` 상태로 표시한다.
   - 많이 쓴 그룹은 red tint와 `집중`/`회복 확인` 상태로 표시한다.
   - 헤드라인, 요약 카드, 인사이트 박스에 `다음 운동 보강 후보`, `집중 부위`, `쏠림 비율`을 노출한다.
2. `style.css`
   - hotspot과 row bar가 red/blue tint를 모두 받을 수 있게 투명 gradient와 상태 badge를 정리한다.
   - 인사이트 박스와 row badge를 추가하되 카드 높이가 과도하게 커지지 않게 모바일 밀도를 유지한다.
3. `sw.js`
   - `render-stats.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.
4. `tests/stats-muscle-fatigue-insight.test.js`
   - red/blue tint, 보강 인사이트, 처방성 문구가 source-level로 유지되는지 확인한다.

하지 않을 것:

- 새 근육 이미지 자산 제작.
- 운동 저장 스키마 또는 Firestore 접근 경로 변경.
- 통계탭 전체 차트 구조 재배치.
- `www/` 직접 수정.

검증 계획:

1. `node --check render-stats.js`
2. `node --check sw.js`
3. `node --test tests/stats-muscle-fatigue-insight.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `git diff --check`
6. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
7. 배포 URL에서 더보기 → 통계 → 운동 활성 부위 카드가 red/blue 상태와 `다음 운동 힌트`를 표시하는지 인증 계정으로 확인한다.

실행 결과:

- 2026-06-24: Slice 3 구현 완료.
- `render-stats.js`에서 기간 내 최고 활성 대비 상대 점수를 계산하고, 낮은 그룹은 `under`/`low` blue tint, 높은 그룹은 `hot` red tint로 분류한다.
- 인체 hotspot은 기록이 있는 기간에 모든 주요 그룹을 렌더해, 운동한 곳은 빨강/균형색, 상대적으로 덜 한 곳은 푸른색으로 보이게 했다.
- 헤드라인과 요약 카드에 `집중 부위`, `보강 후보`, `총 볼륨`을 표시한다.
- `다음 운동 힌트` 인사이트를 추가해 보강 후보 1-2개를 `2-4세트 먼저` 실행하도록 안내한다.
- row 목록은 `보강`/`낮음`/`집중`/`균형` badge와 함께 표시한다.
- `style.css`에서 red/blue hotspot, 보강 인사이트, 상태 badge 스타일을 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z29-stats-blue-balance`로 bump했다.
- `tests/stats-muscle-fatigue-insight.test.js`를 추가하고 기존 `tests/workout-test-mode-unified.test.js` 캐시 버전 검증을 갱신했다.
- PASS: `node --check render-stats.js; node --check sw.js`
- PASS: `node --test tests/stats-muscle-fatigue-insight.test.js tests/workout-test-mode-unified.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 리뷰: `docs/ai/reviews/2026-06-24-stats-muscle-blue-balance-review.md`
- 배포 검증:
  - PASS: 커밋 `cdd4e96`을 `origin/main`에 push했다.
  - PASS: `npm.cmd run deploy:dashboard3`
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ cdd4e96`
  - PASS: Dashboard3 Pages가 `tomatofarm-v20260624z29-stats-blue-balance` 캐시 버전을 서빙하는 것을 확인했다.
  - PASS: `https://aretenald2018-sys.github.io/dashboard3/` HTTP 200 확인.
  - not verified yet: 배포 URL은 로그인 화면에 막혀 더보기 → 통계 → 운동 활성 부위 카드 red/blue UI 클릭 흐름을 인증 계정으로 끝까지 확인하지 못했다.

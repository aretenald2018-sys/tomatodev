# Max Growth Preview Weak Comment Restore

## 요청

`성장판 미리보기`에서 최근 운동 기록을 고려해 상부/중부/하부, 등 넓이/두께/후면사슬 같은 세부 부위 중 무엇을 보완해야 하는지 알려주던 코멘트가 사라졌다.

## 진단 결과

- `buildMuscleComparison()`의 `imbalance.weakSubPatterns`와 동일 부위 최근 기록의 `subBalance` 데이터는 유지되고 있다.
- `renderMaxGrowthPreview()`가 벤치마크 계획/실측 카드만 렌더링하면서, 기존 동일 부위 보완 코멘트 경로를 성장판 미리보기 상단에 붙이지 않는다.
- 카드 내부 최근 수행 로그는 남아 있지만, 사용자가 기대하는 “최근 기록이 어느 패턴 위주라 어느 세부 부위를 보완” 문장이 화면에서 빠졌다.

## 결정

- 성장판 미리보기 상단에 `보완 코멘트` 블록을 추가한다.
- 우선 동일 부위 최근 2회 기록 기반 `_buildSameDayMajorPlans()`를 재사용해 세부 부위 부족, 볼륨 회복, 기준 기록 만들기 같은 경고성 코멘트만 노출한다.
- 캐시 기반 코멘트가 없지만 `comparison.imbalance.weakSubPatterns`가 있으면, 비교 결과를 fallback으로 사용한다.
- `오늘 보강 종목` 추천 패널은 다시 끼워 넣지 않는다. 성장판은 코멘트만, 추천 종목 패널은 별도 역할로 유지한다.

## 실행 슬라이스

### Slice 1: 성장판 보완 코멘트 복구

- Status: Completed on 2026-05-15.
- Scope:
  - `renderMaxGrowthPreview()`에 최근 동일 부위 기반 `보완 코멘트` 블록을 추가한다.
  - RDL 위주 등 기록에서 `등 넓이/등 두께 보강` 코멘트와 랫풀다운/하이로우 예시가 노출되는 회귀 테스트를 추가한다.
  - `STATIC_ASSETS` 대상 변경에 맞춰 ESM query와 `sw.js` `CACHE_VERSION`을 범프한다.
- Files:
  - `workout/expert/max-same-day-advice.js`
  - `workout/expert/max.js`
  - `workout/expert.js`
  - `app.js`
  - `index.html`
  - `tests/calc.max.test.js`
  - `sw.js`

### Slice 2: 보완 코멘트 시각 위계 조정

- Status: Completed on 2026-05-15.
- Scope:
  - 보완 코멘트 블록을 pill 강조 스타일에서 성장판 보조 설명 톤으로 낮춘다.
  - 코멘트 본문에서 `<b>` 태그를 제거하고 11px 보조 텍스트 계열로 맞춘다.
  - `expert-mode.css` 변경에 맞춰 CSS query와 `sw.js` `CACHE_VERSION`을 범프한다.
- Files:
  - `workout/expert/max-same-day-advice.js`
  - `expert-mode.css`
  - `index.html`
  - `tests/calc.max.test.js`
  - `sw.js`

### Slice 3: 성장판 주차 하이라이트 정리

- Status: Completed on 2026-05-15.
- Scope:
  - 계단 그래프의 주차 전체를 덮던 큰 파란 배경 하이라이트를 제거한다.
  - 현재 주차 식별은 기존 W 라벨 색상과 실제 수행점 표시로 유지한다.
  - `expert-mode.css` 변경에 맞춰 CSS query와 `sw.js` `CACHE_VERSION`을 범프한다.
- Files:
  - `expert-mode.css`
  - `index.html`
  - `sw.js`

## Verification

- Passed: `node --check workout/expert/max-same-day-advice.js`
- Passed: `node --check workout/expert/max.js`
- Passed: `node --check app.js`
- Passed: `node --check workout/expert.js`
- Passed: `node --check sw.js`
- Passed: `node --test tests/calc.max.test.js` (39 tests)
- Passed: `node --test tests/data.load-save.test.js` (28 tests)
- Passed: `git diff --check`

## Review

- Review target: 성장판 미리보기의 코멘트 복구가 기존 벤치마크 카드/저장값 보존/추천 패널 분리 원칙을 깨지 않는지 확인한다.

## 실행 결과

- 성장판 미리보기 상단에 `보완 코멘트` 블록을 추가했다.
- 기존 동일 부위 최근 기록 분석을 재사용해 “최근 2회가 후면사슬 위주라 등 넓이/등 두께가 부족합니다” 같은 문장을 노출한다.
- 비교 결과의 `weakSubPatterns`는 캐시 기반 코멘트가 없을 때 fallback으로 사용한다.
- RDL 위주 등 기록에서 `랫풀다운 / 하이로우 중 1개` 예시가 나오는 회귀 테스트를 추가했다.
- Slice 2에서 코멘트 전용 마크업/CSS를 분리하고, 본문 `<b>`를 제거해 다른 성장판 보조 텍스트와 맞췄다.
- Slice 3에서 계단 그래프 주차 전체를 덮던 파란 `::before` 배경을 제거했다.

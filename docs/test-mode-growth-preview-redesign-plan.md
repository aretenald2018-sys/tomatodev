# 테스트모드 성장판 미리보기 개편 계획

## 목표

오늘 선택한 부위별로 직직전, 직전, 오늘의 의미를 한 화면에서 확인하게 만든다.
사용자는 오늘 운동이 단순 추천 목록이 아니라 중장기 성장판 안에서 어떤 역할을 하는지 이해하고, 볼륨/강도/부족 세부 부위를 스스로 납득한 뒤 시작한다.

## 확정된 UX 원칙

- 선택한 큰 부위 수만큼 작은 성장판 그래프를 렌더링한다.
- `docs/test-mode-growth-preview-mockup.html`에 구현한 계단식 그래프 감각을 실제 코드 기준으로 삼는다.
- 직직전, 직전, 오늘을 그래프와 하단 슬롯으로 함께 보여준다.
- 그래프 y값은 우상향 보정 없이 `기준 대비 수행지수`로 만든다.
- 오늘 위치는 그래프의 선/점만 은은하게 깜빡인다. 셀/카드 전체 빨간 깜빡임은 사용하지 않는다.
- 직전/직직전의 요약은 그래프 하단 슬롯에서 해당 부위의 최근 동일 부위 기록 2개를 기준으로 보여준다.
- 직전/직직전은 볼륨 위주인지 강도 위주인지 드러낸다.
- 직전/직직전의 대표 벤치마크는 대표 종목 1개로 요약한다.
- 오늘은 그래프의 마지막 목표 위치에서 추천 트랙과 부족 세부 부위를 함께 보여준다.
- 기존 `오늘 열릴 벤치마크`, `다음 동일 부위 Day 제안`, `오늘 보강 종목`, `오늘 시작 전 코치`는 별도 카드로 두지 않고 이 미리보기 안으로 통합한다.
- `오늘 트랙` 수동 전환 UI는 유지하되, 미리보기 안에서 추천 근거를 먼저 보여준다.
- 보강 종목의 `추가` 행동은 미리보기 안에 유지한다.

## 변경 대상

- `workout/expert/max-same-day-advice.js`
  - 부위별 최근 2회 기록, 트랙 판정, 대표 벤치마크, 기준 대비 수행지수, 부족 세부 부위, 오늘 추천을 만드는 모델/렌더러 추가.
  - 기존 `renderNextSameMuscleDayAdvice`는 새 렌더러로 대체하거나 얇은 호환 래퍼로 유지.

- `workout/expert/max-cycle-render.js`
  - 기존 6주 붉은/검정 곡선 카드와 `오늘 열릴 벤치마크` 카드 제거.
  - 새 `growthPreviewHtml`에는 부위별 계단식 그래프를 렌더링.
  - `growthPreviewHtml` 슬롯을 받아 히어로 바로 아래에 렌더링.
  - `nextAdviceHtml`는 제거하거나 legacy fallback으로만 남김.

- `workout/expert/max.js`
  - 시작 전 부위 선택 화면과 진행 중 대시보드 모두에서 새 성장판 미리보기 모델을 생성.
  - 기존 `_renderMaxEntryBenchmarkPreview`를 새 `_renderMaxEntryGrowthPreview` 흐름으로 교체.
  - 기존 `_renderMaxCycleRecommendationPanel`의 추천 보드 생성 로직을 재사용 가능한 per-major 형태로 분리.

- `expert-mode.css`
  - 계단식 그래프, 오늘 구간 깜빡임, 통합 추천 리스트 스타일 추가.
  - 기존 `wt-v4-next-day-coach`, `wt-v4-rec-panel`, `wt-v4-benchmark-card` 의존 스타일은 새 구조와 충돌하지 않게 정리.

- `tests/calc.max.test.js`
  - `renderMaxCycleDashboard` 테스트를 새 통합 미리보기 배치로 변경.
  - 새 렌더러가 `오늘 열릴 벤치마크`, `오늘 시작 전 코치`, `다음 동일 부위 Day 제안`을 별도 카드로 출력하지 않는지 회귀 테스트 추가.
  - 가슴 하부 부족, 강도/볼륨 추천, 대표 벤치마크 요약, 기준 대비 수행지수가 HTML에 포함되는지 테스트.

- `sw.js`
  - 위 파일들은 `STATIC_ASSETS`에 포함되어 있으므로 실제 구현 시 `CACHE_VERSION`을 반드시 bump.

## 데이터 모델 초안

```js
{
  todayKey: '2026-05-14',
  weekIndex: 2,
  cards: [
    {
      major: 'chest',
      label: '가슴',
      benchmark: {
        id: 'bm_chest_barbell_bench',
        name: '바벨 벤치프레스',
        primaryMajor: 'chest',
        note: '사전 설정 벤치마크. 오늘 목표 슬롯과 대표 기록 우선 매칭의 원천.'
      },
      recommendation: {
        track: 'M',
        trackLabel: '볼륨',
        headline: '볼륨 회복',
        weakParts: ['chest_lower'],
        weakPartLabels: ['가슴 하부'],
        reason: '최근 2회가 강도 위주이고 가슴 하부 세트 비중이 낮습니다.'
      },
      graphPoints: [
        {
          role: 'prevPrev',
          label: '직직전',
          dateKey: '2026-05-06',
          track: 'M',
          trackLabel: '볼륨',
          text: '4set x 75kg x 10reps',
          index: 100
        },
        {
          role: 'prev',
          label: '직전',
          dateKey: '2026-05-11',
          track: 'H',
          trackLabel: '강도',
          text: '3set x 82.5kg x 6reps',
          index: 100
        },
        {
          role: 'today',
          label: '오늘',
          track: 'M',
          trackLabel: '볼륨',
          text: '4set x 77.5kg x 12reps',
          index: 103,
          isToday: true
        }
      ],
      recentEvidence: [
        { label: '직직전', dateKey: '2026-05-06', trackLabel: '볼륨', text: '인클라인 벤치프레스 · 4set x 60kg x 10reps' },
        { label: '직전', dateKey: '2026-05-11', trackLabel: '강도', text: '바벨 벤치프레스 · 3set x 82.5kg x 6reps' }
      ]
    }
  ]
}
```

## 정규화와 편향 방지

- 강도와 볼륨을 원자료 그대로 하나의 y축에 섞지 않는다.
- 그래프 y값은 각 날짜의 트랙에 맞는 metric을 `최근 같은 부위/같은 트랙 기준`과 비교한 `기준 대비 수행지수`로 만든다.
- 슬롯에는 실제 처방/수행값을 `3set x 82.5kg x 6reps`처럼 그대로 표시한다.
- 내부 추천 판단과 그래프 좌표에만 `기준 대비 수행 지수`를 쓴다.
- `100`은 최근 같은 부위/같은 트랙의 기준 수행, `100 초과`는 기준보다 강함, `100 미만`은 기준보다 낮음을 뜻한다.
- 하락, 정체, 회복 목표가 모두 그대로 표현되어야 하며, 우상향 보정은 금지한다.
- 오늘 점은 실제 달성이 아니라 계획/추천이므로 `목표 위치`로 표시한다.
- 오늘 선/점만 은은하게 pulse 처리하고, 셀 전체 점멸이나 과도한 빨간 강조는 쓰지 않는다.

## 사전 설정 벤치마크 반영 방식

- 사전 설정 벤치마크는 사라지지 않고 부위별 그래프의 기준 종목이 된다.
- 오늘 목표 슬롯은 해당 벤치마크의 `plannedByTrack`, `activeTrack`, `plannedKg`, `targetReps`, `targetSets`에서 우선 생성한다.
- 직전/직직전 대표 기록은 같은 `exerciseId` 또는 `movementId`를 우선 찾는다.
- 같은 벤치마크 기록이 없으면 같은 부위 안에서 가장 대표적인 실제 수행 세트를 fallback으로 표시한다.
- 한 부위에 벤치마크가 여러 개 있으면 대표 1개를 노출하고, 나머지는 `외 N개`로 표시한다.
- 대표 우선순위는 `오늘 선택 부위와 일치 -> 최근 기록 있음 -> activeTrack 일치 -> 성장판 목록 순서`다.

## 예상 산출물 목업

- 그래프형 목업: `docs/test-mode-growth-preview-mockup.html`

## 구현 순서

1. 모델 빌더를 먼저 만든다.
   - `_sameDayMajorHistorySlots`를 재사용해서 부위별 직전/직직전 기록을 얻는다.
   - `summarizeMuscleSession`의 `exercises`와 세트 정보를 이용해 대표 벤치마크를 고른다.
   - 트랙은 명시 트랙이 있으면 우선하고, 없으면 반복수 기준으로 `10회 이상=볼륨`, `8회 이하=강도`로 판정한다.
   - 사전 설정 벤치마크에서 오늘 목표 슬롯의 세트/중량/반복수를 만든다.

2. 오늘 추천을 만든다.
   - 최근 2회가 강도 위주면 볼륨 회복을 추천.
   - 최근 2회가 볼륨 위주면 강도 도전을 추천.
   - 한쪽으로 명확하지 않으면 현재 성장판 트랙을 유지.
   - 세부 부위 부족은 `SAME_DAY_DETAIL_PARTS`와 기존 gap 로직을 우선 사용한다.
   - 오늘 추천 트랙에 해당하는 그래프 마지막 구간과 점만 `today` 상태로 깜빡이게 한다.

3. 추천 종목 보드를 per-major로 분리한다.
   - 기존 `_renderMajorRecommendationBoard`의 버튼/`data-action="apply-max"`는 유지한다.
   - 새 미리보기 카드 안에서 해당 부위 추천만 접이식으로 보여준다.

4. 렌더러를 교체한다.
   - 시작 전 화면: 선택 부위가 있으면 새 미리보기 표시, 없으면 기존 빈 안내 유지.
   - 진행 중 대시보드: 히어로 아래에 새 미리보기 표시.
   - `오늘 열릴 벤치마크`, `다음 동일 부위 Day 제안`, `오늘 보강 종목`, `오늘 시작 전 코치` 별도 카드 제거.
   - 부위별 카드에는 그래프, 최근 근거 슬롯, 부족 부위, 추천 종목을 순서대로 배치한다.

5. 스타일을 추가한다.
   - `.wt-v4-growth-preview`, `.wt-v4-growth-card`, `.wt-v4-growth-chart`, `.wt-v4-growth-slot`, `.wt-v4-growth-rec-panel` 중심으로 추가.
   - 모바일에서는 카드 1열, 넓은 화면에서는 2열까지 허용한다.

6. 테스트와 검증을 갱신한다.
   - `node --test tests/calc.max.test.js`
   - `node --check workout/expert/max.js`
   - `node --check workout/expert/max-cycle-render.js`
   - `node --check workout/expert/max-same-day-advice.js`
   - `bash scripts/dev-start.sh` 후 실제 테스트모드 화면에서 부위 선택, 그래프 렌더, 추천 버튼 클릭을 확인한다.

## 리스크와 대응

- 추천 종목 보드를 per-major로 쪼개면서 기존 `apply-max` 버튼 동작이 끊길 수 있다.
  - 대응: 버튼의 `data-action`, `data-movement-id`, `data-weak-part` 구조를 유지하고 브라우저에서 클릭 검증한다.

- 오늘이 아직 운동 전이면 `buildMuscleComparison`의 `today`가 비어 있을 수 있다.
  - 대응: 오늘 슬롯은 기록이 아니라 성장판 계획과 추천 트랙으로 채운다.

- 기록이 0개 또는 1개인 부위가 있을 수 있다.
  - 대응: 없는 슬롯은 `기록 없음` 단계로 렌더링하고, 오늘 추천은 스타터/기준 기록 만들기로 fallback한다.

- 작은 그래프에 정보가 과밀해질 수 있다.
  - 대응: 그래프에는 흐름만 두고, 실제 세트/중량/반복수와 대표 벤치마크는 하단 슬롯에 정리한다.

- 강도와 볼륨이 한 축에 섞이며 무조건 성장처럼 보일 수 있다.
  - 대응: 원자료를 직접 섞지 않고, 같은 부위/같은 트랙 기준 대비 지수로만 그래프 좌표를 만든다.

- 오늘 강조가 산만해질 수 있다.
  - 대응: 그래프의 오늘 선/점만 은은하게 움직이고, 카드/슬롯 전체 점멸은 금지한다.

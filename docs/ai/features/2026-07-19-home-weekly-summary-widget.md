# 홈 탭 "오늘/이번 주 요약" 위젯 (스크린샷 재현)

> 2026-07-19 갱신 2회차: 아래는 세 번의 정정을 거친 최종본이다.
> 1차: 색상 제약 폐지 (스크린샷 색상 그대로 재현 가능, `CLAUDE.md` 참고).
> 2차: 워크플로우 정책 갱신으로 "슬라이스 강제 분리/승인 게이트" 삭제, "구현 범위"로 재구성.
> 3차(이 갱신): **가장 중요한 정정** — "이번 주 근력 목표"는 신규 기능이 아니라 이미 구현된
> **시즌(season) 시스템**의 데이터이고, "오늘 식단"도 이미 구현된 다이어트 플랜 시스템의
> 데이터다. 아래 "핵심 정정" 섹션을 반드시 먼저 읽는다.

## 요청 원문

사용자가 스크린샷 1장을 첨부: 4개 카드로 구성된 모바일 홈 화면 위젯.
1. "오늘 식단" — 원형 게이지(섭취 2,250/2,500kcal 90%) + 탄수화물/단백질/지방 바 3개 + 우측 상단 "기록한 식사 3회" 배지
2. "이번 주 근력 목표" — "3/5 목표 달성" + 벤치프레스 90kg 12회 등 5개 항목 체크리스트
3. "이번 주 러닝" — 평균 페이스 7'44"/km, "페이스 개선 -25초", 지난주 8'09"/km, 우측에 하락 추세 미니 차트
4. "이번 주 변화" — 단백질 섭취 +18%(전주 대비) / 관찰된 운동 목표 3/5(지난주 2/5) / 평균 페이스 개선 +5.1%, 3열 비교

이후 사용자가 정정: "근력 목표는 이미 구현되어 있는 시즌 목표랑 같은 것이고, 오늘 식단도 마찬가지."

## 핵심 정정 (반드시 먼저 읽을 것)

이전 버전은 "이번 주 근력 목표"를 완전히 새로운 독립 데이터 모델(`_settings/weekly_strength_goals`,
사용자가 직접 종목/무게/횟수 5개를 입력)로 설계했다. **이는 틀렸다.** 실제로 확인한 결과:

- 이 저장소에는 이미 완전한 **시즌(season) 시스템**이 구현·배포되어 있다:
  - `data/season-model.js`, `data/season-store.js`, `data/season-selectors.js`, `data/season-creation.js`, `data/season-board-resolver.js`, `data/season-widget-snapshot.js`
  - `workout/season-manager.js`, `workout/season-reset.js`, `workout/season-widget-bridge.js`
  - `data.js`가 이를 배럴로 노출: `getSeasonRegistry`, `getSeasonWorkoutPlan`, `getSeasonTestBoardV2`, `getSeasonRunningPlan`, `getSeasonBundleForDate`, `getCache` 등
  - `app.js`에 이미 완전히 배선되어 있다 — 초기 로드, `sheet:saved`, 시즌 변경, 수동 새로고침 시 `scheduleSeasonDashboardWidgetSync()`가 호출되어 **Android 홈스크린 네이티브 위젯(`SeasonDashboardWidget`)에 데이터를 밀어 넣고 있다.** 이 위젯 XML(`android/app/src/main/res/layout/widget_season_dashboard.xml`)이 사용자가 "지금도 위젯이 있다"고 말한 그 위젯이다.
- 이 네이티브 위젯은 스트릭 7일 점, 러닝 카드(거리 진행률바), 헬스 카드(계획 세션 수 진행률바), 다음 계획을 보여주지만 **스크린샷과 비주얼이 다르고(TDS Mobile 카드 스타일이 아님), 오늘 식단·매크로·이번 주 변화 비교 카드가 없다.** 사용자가 "구체적이지 않다"고 한 지점이 이것이다.
- `data/season-widget-snapshot.js`의 `buildSeasonDashboardSnapshot()`은 이미 다음을 계산한다:
  - `selectSeasonRunningStats()` (`data/season-selectors.js`) — 이번 주 거리/세션 진행률 + `trend.paceImprovementSecPerKm`(완료된 2주 vs 그 전 2주 페이스 비교), `trend.distanceDeltaPct`
  - `selectSeasonStrengthStats()` (`data/season-selectors.js`) — 이번 주 세션 진행률(`currentWeek.sessions`), `totalVolumeKg`, `volumeTrend.volumeDeltaPct`(완료된 1주 vs 그 전 1주 볼륨 비교), `liftDeltas`(등록 종목별 시즌 시작 1RM 대비 현재 1RM 차이)
  - `calcSeasonWorkoutStreak()` — 스트릭 + 요일별 완료 상태
- "벤치프레스 90kg 12회" 같은 **개별 종목별 이번 주 목표 중량/횟수**는 `selectSeasonStrengthStats`에는 없고, **성장 보드(`workout/test-v2/board-core.js`)의 `board`(=`getSeasonTestBoardV2(seasonId)`) 셀**에 있다: `activeBenchmarks(board, groupId)`로 등록된 종목(벤치마크) 목록을 얻고, 각 벤치마크×트랙에 대해 `expandColumnCells(board, benchmarkId, track, cycleId, todayKey)`로 이번 주에 해당하는 셀을 찾으면 `{ kg, reps, state }`가 나온다 (`state === 'done'`이면 그 주 처방을 완료한 것). 벤치프레스가 스크린샷에 두 줄(90kg 12회 / 105kg 8회)로 나온 건 한 벤치마크의 서로 다른 트랙(예: volume/health 트랙)일 가능성이 높다 — 정확한 트랙 구성은 구현 중 실제 시즌 데이터로 확인한다.
- "오늘 식단"은 이미 `home/today-summary.js`의 `renderDietGoalCard()`가 `getDietPlan()` + `calcDietMetrics()` + `getBodyCheckins()`로 구현해 `#diet-goal-content`(`#card-diet-goal`)에 렌더링하고 있다(체중/체지방 목표 카드로). 스크린샷의 "오늘 식단" 원형 게이지는 이 카드와 다른 카드지만 **같은 함수(`calcDietMetrics`)와 같은 날짜의 `getDiet(y,m,d)` 데이터를 재사용**하면 된다 — 새 다이어트 계산 로직은 필요 없다.
- 결론: **새 Firestore 데이터 모델을 추가하지 않는다.** 시즌 시스템과 다이어트 플랜 시스템에서 이미 계산된 값을 읽어와 스크린샷의 TDS 카드 레이아웃으로 다시 그리는 것이 이번 작업의 전부다.

## 이해한 내용 (정정 반영)

- 목표: 스크린샷과 동일한 레이아웃의 홈 탭 카드 4종을, **이미 구현된 시즌 시스템 + 다이어트 플랜 시스템의 데이터**로 채운다. 새 계산 로직은 다이어트 주간 비교(카드 4의 단백질 % 변화) 정도만 필요할 수 있다.
- 비목표:
  - 새 Firestore 데이터 모델·CRUD 추가 없음.
  - `workout/test-v2/`(성장 보드)·`data/season-*`(시즌 시스템)의 기존 로직 변경 없음 — **읽기만** 한다.
  - 기존 `renderDietGoalCard`(체중/체지방 카드)와 기존 Android `SeasonDashboardWidget`(네이티브 위젯)은 그대로 유지 — 이번 작업은 **인앱 홈 탭에 추가되는 새 카드 4종**이며 네이티브 위젯을 대체하지 않는다.
  - 스크린샷 색상은 그대로 재현 가능 (2026-07-19 색상 제약 폐지, 아래 "색상 정책" 참고).
- 시즌이 없는 유저(`getSeasonBundleForDate().season === null`) 처리: 카드 1(식단)은 시즌과 무관하게 그대로 동작. 카드 2·3·4는 "시즌을 시작하면 이번 주 요약을 볼 수 있어요" 같은 빈 상태로 대체.
- 데이터 가정: 아래 "화면 명세 + 데이터 바인딩" 참고.
- 열려 있는 질문: 벤치프레스가 두 줄로 나오는 정확한 트랙 매핑, 그리고 성장 보드가 아직 test-v2 온보딩을 거치지 않은 유저(등록 벤치마크 0개)의 빈 상태 문구는 구현 중 실제 데이터로 확정한다.

## 색상 정책 (2026-07-19 갱신 — 제약 폐지, 변경 없음)

이전 초안에서는 "이 프로젝트는 토마토 레드 단색 스케일만 쓴다"는 CLAUDE.md 규칙을 근거로 스크린샷의 파랑/보라/주황 색상을 쓰지 말라고 명시했었다. 이후 사용자 확인 결과 **그 규칙 자체가 legacy였다** — 실제 `style.css`에는 근육 부위 구분, 차트, 상태 표시 등에 블루(`#2563eb`/`#217cf9`), 앰버(`#f59e0b`), 틸(`#0e7490`) 등 다색이 이미 광범위하게 쓰이고 있고, CLAUDE.md/ARCHITECTURE.md/prd.md의 "컬러 스케일만 커스텀" 문구는 2026-07-19에 폐지·수정했다.

따라서 이번 위젯은 **스크린샷의 색상 의도를 그대로 재현해도 된다**:
- 탄수화물/단백질/지방 바는 서로 다른 색으로 구분한다 (기존 `style.css`에 이미 쓰인 톤이 있으면 우선 재사용).
- 유일한 원칙: **색은 의미를 가져야 한다** — 아무 의미 없이 색 종류만 늘리지 않는다 (`TEST_MODE_UX_V4_FROM_SCRATCH.md`에 기록된 과거 실패 사례 반복 금지).
- `tds-reviewer` 에이전트는 색상이 아니라 컴포넌트 스펙(사이즈/라운딩/트랜지션/타이포)만 검사한다.

## 화면 명세 + 데이터 바인딩

### 카드 1 — 오늘 식단 (다이어트 플랜 시스템 재사용)

| 요소 | 값 | 데이터 소스 |
|---|---|---|
| 카드 제목 | "오늘 식단" | 고정 텍스트 |
| 우상단 배지 | "기록한 식사 N회" | 오늘 `getDiet(y,m,d)`에서 텍스트·foods·kcal·photo 중 하나라도 있고 skip이 아닌 끼니 수 카운트 (`home/today-summary.js`의 `_mealRow` 판정 로직과 같은 기준 재사용) |
| 원형 게이지 중앙 | "섭취 칼로리 2,250 / 2,500kcal 90%" | 실제: 오늘 `bKcal+lKcal+dKcal+sKcal` 합계. 목표: `getDietPlan()` + `calcDietMetrics()` → 오늘이 refeed day(`plan.refeedDays`)면 `metrics.refeed.kcal`, 아니면 `metrics.deficit.kcal` (`renderDietGoalCard`의 `isRefeed`/`dayTarget` 로직과 동일 패턴) |
| 탄수화물/단백질/지방 행 | "45/220g 20%" 등 | 실제: 오늘 각 끼니 매크로 합. 목표: `dayTarget.carbG`/`proteinG`/`fatG` |

다이어트 플랜 미설정(`plan._userSet === false`)이면 기존 `renderDietGoalCard`의 빈 상태와 동일하게 "목표를 설정해주세요" 안내로 대체.

### 카드 2 — 이번 주 근력 목표 (시즌 성장 보드 재사용)

| 요소 | 값 | 데이터 소스 |
|---|---|---|
| 카드 제목 | "이번 주 근력 목표" | 고정 텍스트 |
| 진행 배지 | "N/M 목표 달성" | `getSeasonBundleForDate(todayKey).board`에서 `activeBenchmarks(board)` 전체 개수(M) 중, 각 벤치마크의 이번 주 셀 `state === 'done'`인 개수(N). 셀은 `activeCycleOf(board, groupId)` + `expandColumnCells(board, benchmarkId, track, cycleId, todayKey)`로 조회하고 `weekStart`가 이번 주 월요일인 셀만 필터링 |
| 리스트 항목 | "벤치프레스 90kg 12회" + 체크 아이콘 | 위에서 조회한 이번 주 셀의 `kg`/`reps`, 종목명은 `benchmarkById(board, id).label` 또는 `exList`에서 조회. `state === 'done'`이면 체크 표시 |
| 시즌 없음 | 시즌 미설정 | "시즌을 시작하면 이번 주 목표를 볼 수 있어요" + 시즌 시작 진입 버튼 (기존 시즌 관리 진입점 재사용) |
| 등록 종목 0개 | 시즌은 있지만 벤치마크 미등록 | "종목을 등록해주세요" 안내 |

**주의:** 이 카드는 `workout/test-v2/board-core.js`의 export 함수(`activeBenchmarks`, `activeCycleOf`, `benchmarkById`, `expandColumnCells`, `mondayOf`, `weekIndexOf` 등)를 **읽기 전용으로만** 쓴다. 보드 로직 자체(셀 페인팅, 정산 등)는 건드리지 않는다.

### 카드 3 — 이번 주 러닝 (시즌 러닝 셀렉터 재사용)

| 요소 | 값 | 데이터 소스 |
|---|---|---|
| 카드 제목 | "이번 주 러닝" | 고정 텍스트 |
| 큰 숫자 | "7'44"/km" | `selectSeasonRunningStats(cache, registry, todayKey, runningPlan).currentWeek.summary.avgPaceSecPerKm`을 `m'ss"` 포맷으로 변환 |
| 보조 배지 | "페이스 개선 -25초" | 같은 결과의 `trend.paceImprovementSecPerKm` (완료된 최근 2주 vs 그 전 2주 비교 — `sampleWeeks === 4 && status === 'ready'`일 때만 표시, 아니면 "기준 수집 중") |
| 하단 텍스트 | "지난주 8'09"/km" | `trend.previous.avgPaceSecPerKm` 포맷 (2주 평균이므로 스크린샷의 "지난주 1주"와 정확히 같은 정의는 아님 — 라벨을 "최근 2주 평균"으로 조정하거나, 필요하면 단일 지난 주 비교용 헬퍼를 얇게 추가) |
| 우측 미니 차트 | 하락(개선) 추세 스파크라인 | 이번 주 `currentWeek.summary`에 포함된 세션별 페이스를 SVG polyline으로. 없으면 `workout/running-analytics.js`의 `listRunningActivities`로 이번 주 엔트리를 직접 조회 |

시즌 없음/러닝 기록 없음이면 카드 2와 같은 원칙으로 빈 상태 처리.

### 카드 4 — 이번 주 변화 (기존 시즌 트렌드 재사용 + 다이어트 비교만 신규)

| 요소 | 값 | 데이터 소스 |
|---|---|---|
| 카드 제목 | "이번 주 변화" | 고정 텍스트 |
| 열 1 | "단백질 섭취 증가 +18%" | **유일하게 새로 계산이 필요한 값.** 이번 주(오늘까지) vs 지난 주 같은 요일 수까지의 일평균 단백질(g) 비교 — `calc.js`에 작은 순수 함수 하나만 추가 (아래 "구현 범위" 참고) |
| 열 2 | "관찰된 운동 목표 3/5 / 지난주 2/5" | 카드 2와 같은 셀 카운트를 이번 주와 지난 주 각각 계산 (지난 주는 `todayKey` 대신 지난 주 월요일 기준으로 `expandColumnCells` 재호출) |
| 열 3 | "평균 페이스 개선 +5.1%" | `selectSeasonRunningStats(...).trend.distanceDeltaPct` 또는 `paceImprovementSecPerKm`을 `trend.previous.avgPaceSecPerKm` 대비 %로 환산 |

세 지표 모두 표본 부족(`trend.status !== 'ready'` 등)이면 "%" 대신 "기준 수집 중" 문구로 대체.

## 비주얼 정밀 스펙 (프론트엔드 — 반드시 정확히 따를 것)

Codex는 데이터 바인딩보다 프론트엔드 디테일(간격, 정렬, 크기 비율)에서 스크린샷과 어긋나는
경우가 많다. 아래는 임의로 해석하지 말고 **기존 코드에 이미 있는 값을 그대로 재사용**하라는
지시다. 새 px 값을 발명하지 말 것 — 아래 나열된 기존 변수/클래스가 이미 이 프로젝트의 스케일이다.

**공통 재사용 대상** (`style.css`에 이미 존재, 확인 후 그대로 쓸 것):
- 카드 컨테이너: `.home-card` (`padding:20px`, `border-radius:var(--radius-md)`, `border:1px solid var(--border)`), 헤더는 `.home-card-header`(`display:flex;justify-content:space-between;margin-bottom:12px`) + `.home-card-title`(`font-size:14px;font-weight:600`)
- 통계 블록: `.diet-goal-stat` 패턴(`background:var(--primary-bg)`, `border-radius:var(--radius-lg)`, `padding:16px`, 중앙 정렬) — 큰 숫자는 `.diet-goal-stat-val`처럼 `font-family:var(--font-mono);font-size:24px;font-weight:700`, 단위는 `.diet-goal-unit`처럼 `font-size:13px;color:var(--text-secondary)`
- 얇은 진행바: `.diet-goal-prog-bar`(`height:6px;background:var(--surface3);border-radius:var(--radius-full)`) + `.diet-goal-prog-fill`(`height:100%;border-radius:var(--radius-full);transition:width .3s`)
- 홈 탭 전용 폰트 크기 오버라이드 패턴: `#tab-home .home-card-title { font-size: var(--seed-t5) }` 처럼 `#tab-home .새클래스 { font-size: var(--seed-tN) }` 규칙이 이미 있다. 새 요소에도 하드코딩 px 대신 이 패턴을 따라 seed 토큰 오버라이드를 추가할지 검토.
- 3열/다열 비교 레이아웃에서 구분선이 필요하면 CSS `border-left` 방식(예: `docs/workout-seasons-uiux-mockup.html`의 `.metric-grid .metric { border-left:1px solid var(--separator) }` 패턴, 단 실제 변수명은 `var(--border)`로 대체)을 참고.

**카드 1 — 오늘 식단** (좌: 원형 게이지 / 우: 매크로 3행, 가로 2분할):
- 원형 게이지: `conic-gradient`로 구현. 링 두께는 카드 안에서 시각적으로 10~12px 정도(전체 지름 약 100~120px), 배경 트랙은 `var(--surface3)`, 진행 색은 매크로/칼로리 의미에 맞는 색(카드 4 등과 마찬가지로 의미별 색 사용 가능).
- 원 중앙에 세로로 4줄 쌓기: ① `섭취 칼로리`(라벨, 작고 회색, `var(--text-secondary)`) ② 실제 kcal 큰 숫자(`font-family:var(--font-mono)`, `.diet-goal-stat-val`과 동일한 무게감) ③ `/ 목표kcal`(작고 회색) ④ 퍼센트(볼드, 진행색과 같은 색).
- 우측 매크로 3행: 각 행 = [라벨 텍스트] + [실제/목표 g, `font-family:var(--font-mono)`] + [퍼센트, 작은 배지 or 텍스트] 한 줄, 그 아래 `.diet-goal-prog-bar` 패턴의 얇은 바. 행 사이 간격은 카드 내부 다른 요소들과 동일하게 8~10px.
- 카드 우상단 배지("기록한 식사 3회")는 pill 모양: `border-radius:var(--radius-full)`, `padding:4px 10px` 정도, `background:var(--surface3)` 또는 `var(--primary-bg)`, `font-size:11px`.

**카드 2 — 이번 주 근력 목표** (세로 리스트):
- 헤더 우측에 "N/M 목표 달성" — `.home-card-header` 오른쪽 슬롯에 볼드 텍스트로, 필요하면 작은 아이콘(⚡ 또는 기존에 쓰는 근력 아이콘) 추가.
- 리스트 각 행: 좌측 체크 인디케이터(지름 18~20px 원형 — 미완료는 `border:1.5px solid var(--border)` 빈 원, 완료는 `background:var(--primary)` 배경에 흰 체크마크 ✓), 그 옆에 종목명+무게/횟수 한 줄 텍스트. 행 높이는 `ListRow` 스펙(min-height 44px)을 참고하되 카드 안에서는 촘촘하게 32~36px로 줄여도 됨 — 단 터치 영역이 필요한 인터랙티브 요소면 44px 유지.
- 행 사이 구분은 얇은 `border-top:1px solid var(--border)` 또는 8px gap 중 기존 리스트 패턴(`goal-item`, `quest-item` 등)에서 실제 쓰는 방식을 확인해서 통일.

**카드 3 — 이번 주 러닝**:
- 좌측(또는 상단) 영역: 아이콘 + "이번 주 러닝" 타이틀, 그 아래 아주 큰 페이스 숫자(카드 1의 `.diet-goal-stat-val`보다 한 단계 크게, 약 26~28px, `font-family:var(--font-mono)`) + 작은 단위 "/km".
- 그 아래 한 줄: 개선 표시(예: "페이스 개선 -25초") — 개선(음수 초, 더 빨라짐)이면 긍정색, 악화면 중립/경고색. 아이콘(▼ 또는 화살표)을 텍스트 색과 맞춰 함께 표시해도 됨.
- 그 아래 회색 보조 텍스트: "지난주 8'09"/km" (`var(--text-secondary)`, 11px 정도).
- 우측(또는 카드 하단): 미니 스파크라인 — 인라인 SVG `<polyline>` 또는 `<path>`, viewBox 약 `0 0 60 30`, stroke 색은 개선 방향에 맞는 의미색, `stroke-width` 2, 배경 없이 투명, 데이터가 2점 미만이면 그리지 않고 자리만 비움(빈 상태에서 어색한 평평한 선 금지).

**카드 4 — 이번 주 변화** (3열 그리드):
- `display:grid;grid-template-columns:repeat(3,1fr)`, 각 열 좌측에 `border-left` 구분선(첫 열 제외), 열 내부는 상단부터 [작은 라벨] → [큰 퍼센트 숫자, 의미색] → [작은 보조 설명("지난주 대비" 등)] 순서로 세로 쌓기, 텍스트 중앙 정렬.
- 퍼센트 숫자 색: 개선/긍정이면 긍정색, 악화면 경고색, 표본 부족이면 `var(--text-secondary)`로 "기준 수집 중" 텍스트만.

**반드시 지킬 것 — 프론트엔드 자가 검증 루프:**
1. 카드 4종을 만들고 나서 반드시 로컬(`npm.cmd run dev`)에서 브라우저로 열어 스크린샷을 찍는다.
2. 그 스크린샷을 사용자가 첨부한 원본 스크린샷과 나란히 비교한다: 카드 순서, 각 카드 내부 요소 배치(좌/우 분할 비율, 텍스트 정렬), 폰트 크기 위계(어떤 텍스트가 크고 어떤 게 작은지), 여백 리듬이 얼추 맞는지 확인한다.
3. 어긋나는 부분(예: 원형 게이지가 너무 작다/크다, 매크로 바가 카드 폭을 넘친다, 리스트 행 높이가 너무 크다/작다, 3열 비교 카드의 구분선이 없다 등)을 발견하면 CSS를 수정하고 다시 스크린샷을 찍어 재비교한다 — 이 과정을 한 번에 끝내지 말고 최소 2~3회 반복해서 눈으로 맞춰본다.
4. 색상 값(정확한 hex)까지 스크린샷과 똑같이 맞출 필요는 없지만(색상은 의미 기반으로 자유), **레이아웃 비율·타이포 위계·여백은 스크린샷과 눈으로 봤을 때 같은 종류의 화면이라고 느껴져야 한다.**
5. 완료 증거로 제출하는 스크린샷은 반드시 실제 브라우저 렌더링이어야 하고("코드가 이렇게 만들 것이다"라는 설명이 아니라), 데스크톱 폭이 아니라 모바일 폭(375~414px 정도)에서 찍는다 — 이 앱은 모바일 우선이다.

## 구현 범위

이 계획은 승인 게이트 없이 이어서 구현해도 된다 (`CLAUDE.md`/`docs/ai/WORKFLOW.md` 참고).
자연스러운 순서는 다음과 같다.

1. **다이어트 주간 비교 순수 함수 1개만 추가** — `calc.js`에 `calcWeeklyDietMacroChange(thisWeekDietDays, lastWeekDietDays)` 같은 작은 함수 하나(카드 4 열 1용). 이것 외에는 러닝/근력 계산을 다시 만들지 않는다 — `data/season-selectors.js`/`workout/test-v2/board-core.js`의 기존 함수를 그대로 import해서 쓴다.
2. **시즌·다이어트 데이터를 읽어 카드 4종을 홈 탭에 렌더링** — `home/today-summary.js`(또는 신규 `home/weekly-report.js`) + `index.html`(`.home-card` 컨벤션 재사용) + `style.css`(원형 게이지, 매크로 바, 체크리스트, 미니 스파크라인 — TDS 타이포/컴포넌트 규격 준수) + `home/index.js`(`renderHome()` 호출 등록) + `sw.js`(`STATIC_ASSETS` 추가 시 `CACHE_VERSION` 범프).
   - `home/today-summary.js`의 기존 `renderTodayDiet`/`renderTodayWorkout`은 `index.html`에 대응 컨테이너가 없어 어디서도 호출되지 않는 고아 코드다 — 재사용하지 말고 정리하거나 대체한다.
   - 데이터 접근은 전부 `data.js` 배럴 경유 (`getSeasonBundleForDate`, `getCache`, `getDietPlan`, `getDiet`, `calcDietMetrics` 등). Firebase 직접 호출 금지.
   - 원형 게이지·미니 차트는 외부 라이브러리 없이 `conic-gradient` 또는 인라인 SVG로.

수정하지 말 것: `workout/test-v2/*`, `data/season-*`의 계산 로직 자체(읽기만), 기존 `renderDietGoalCard`, Android 네이티브 `SeasonDashboardWidget` 관련 파일(`android/**`, `workout/season-widget-bridge.js`).

검증 방법: `node --test tests/`(신규 다이어트 비교 함수 테스트 포함) → `npm.cmd run dev`로 로컬 확인(시즌 있는 계정 / 시즌 없는 계정 둘 다) → `origin/main` push → `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>` → 배포 URL에서 실제 로그인 계정으로 4개 카드 확인.

완료 증거: 배포 URL 스크린샷(4개 카드 전부, 시즌 있음/없음 두 상태) + verify:deploy 로그 + tds-reviewer 에이전트 결과.

## 검증/리뷰 메모

이 계획 문서와 변경 파일을 놓고 우선 점검: (1) 성장 보드·시즌 셀렉터 로직을 실수로 다시 구현하지 않았는지(중복 로직 금지), (2) 시즌 없음/벤치마크 없음/러닝 없음 빈 상태가 깨지지 않는지, (3) `home/today-summary.js`의 고아 함수 정리가 다른 호출을 깨지 않는지, (4) `setDoc` 필드 누락 여부, (5) `sw.js` `CACHE_VERSION` 범프 여부, (6) 색상이 의미 없이 남발되지 않았는지.

## 큰 다중 세션 작업일 때만: NEXT_ACTION.md 메모

- 상태: `ready_for_execution` (핵심 정정 반영 완료)
- 다음 액션: "다이어트 주간 비교 순수 함수 1개 추가 → 시즌/다이어트 데이터로 카드 4종 렌더링" 순서로 진행
- 막힌 지점: 없음. 벤치프레스 2줄 트랙 매핑과 등록 벤치마크 0개 빈 상태 문구는 구현 중 실 데이터로 확정.

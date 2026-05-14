# 심층통계 — 자연인 헬스 트레이너 관점 비판 & 재설계 계획

작성일: 2026-05-02
범위: `render-stats.js` 의 `_renderDeepStats()` (line 132-183) + 그 의존 함수 `_analyzeWindow()` (line 91-130). 실제 코드 수정 아님 — 평가 + 재설계 제안.

---

## 0. 한 줄 요약

> 현재 심층통계는 "지난 14일 vs 직전 14일" 의 단순 차분 요약이다. 자연인 보디빌딩 코칭의 핵심 메탈모델 (**Volume Landmarks · Mesocycle Periodization · Stimulus-Recovery-Adaptation 루프 · Energy Balance × Body Recomposition**) 을 거의 반영하지 못한다. KPI 4개와 As-Is/To-Be 텍스트는 사용자에게 위안을 주지만, **트레이닝 의사결정에는 거의 도움 안 된다.**

---

## Part A. 비판 — 12 개 의학적·코칭적 결함

### A.1 [통계 윈도우] 14일 비교는 noise level

**위치**: `render-stats.js:135-136`
```js
const recent = _analyzeWindow(_keyOffset(13), _keyOffset(0));
const prev   = _analyzeWindow(_keyOffset(27), _keyOffset(14));
```

**문제**:
- 자연인 적응 주기는 단일 자극 → 회복 → 적응 = 48–72h. **의미 있는 progression 신호는 최소 4–8주.**
- RP / Wendler 5·3·1 / Mike Israetel 의 mesocycle 표준은 **4-week accumulation + 1-week deload**. 14일은 한 페이즈 안의 잡음.
- 의도된 디로드 1주 + 회복 2주만 끼어들어도 시스템이 "정체/후퇴 위험" 으로 false positive.
- 진짜 자연인 코치는 **8–12 week trend** 와 그 안의 mesocycle 분기를 본다.

**개선 방향**: 윈도우는 1주/4주/12주 3 layer. 1주는 "이번 주 컨디션", 4주는 "이번 mesocycle 안 진행", 12주는 "macrocycle 트렌드".

---

### A.2 [수행능력 지표] e1RM 합산은 트레이닝 의학적으로 무의미

**위치**: `render-stats.js:139-141`
```js
const strengthNow  = Object.values(recent.byExercise).reduce((s,e)=>s+(e.best||0),0);
const strengthPrev = Object.values(prev.byExercise).reduce((s,e)=>s+(e.best||0),0);
const strengthDelta = _pctDelta(strengthNow, strengthPrev);
```

**문제**:
- 종목 7개 e1RM 의 단순 합. 5종목 하던 사람이 3종목으로 줄이면 strengthDelta 가 -40% 로 보임 — 실제로는 종목 rotation 일 뿐.
- 종목 추가/삭제, 부상으로 인한 일시 제외, 사이클 중 종목 변경이 모두 strengthDelta 를 흔듦.
- e1RM 자체도 Epley 공식 단순 적용 — 1RM 의 90% 이상에서는 정확하지만 12+ reps 영역에선 ±10% 오차.

**올바른 접근**: **종목별 e1RM trend** 를 따로. 벤치 e1RM 80→82.5 (4주 +3.1%), 스쿼트 130→135 (+3.8%) 식으로. 합산하지 않는다. 각 종목의 **선형회귀 slope (kg/week)** 가 진짜 progression 지표.

---

### A.3 [볼륨 지표] "총볼륨 kg×reps 합" 단일 지표는 위험

**위치**: `render-stats.js:113`, `_analyzeWindow.totalVolume`

**문제**:
- 부위별 가중치 없음. 가슴 5세트 vs 등 5세트 vs 하체 5세트가 모두 kg×reps 로 합산됨.
- 하체는 가슴의 **2-3배 자극**을 줘야 같은 hypertrophy 효과 — Israetel/Helms 의 muscle-specific volume guideline.
- 워밍업 / 본세트 / 드롭세트 가 무게×반복 로 평등하게 합산. RPE 무시.
- 같은 1,000 vol이라도 **70%×8 (RPE 6)** 와 **80%×10 (RPE 9)** 는 자극 강도가 완전히 다르다.

**올바른 접근**: **Hard Sets** 단위로 카운트. 정의는 "RPE 7 이상의 본세트 (warmup/drop 제외)" — 부위별 weekly hard sets 가 표준 단위. 1 hard set 의 자극 ≒ 8-12 reps × RPE 7-9.

---

### A.4 [부위 편향] over/under 라벨이 비과학적

**위치**: `render-stats.js:150`
```js
const tone = share >= 35 ? 'over' : (share <= 8 ? 'under' : 'ok');
```

**문제**:
- 35% / 8% magic number — 의학적 근거 없음.
- 부위별 MEV/MAV/MRV 가 다른데 동일 % 기준 적용.
  - 가슴: MEV 8 / MAV 12-14 / MRV 22 sets/wk
  - 등: MEV 10 / MAV 14-16 / MRV 25
  - 하체 (대퇴사두): MEV 8 / MAV 12-14 / MRV 18-20
  - 어깨 측면: MEV 6 / MAV 12-16 / MRV 22-26
  - 이두/삼두: MEV 4-6 / MAV 8-12 / MRV 18
- 백분율은 상대값. 절대 sets 수가 핵심.

**올바른 접근**: **부위별 절대 hard sets/주** + MEV/MAV/MRV 라인. "어깨 5 sets — MEV 미달 (6)", "가슴 18 sets — MAV 초과 (16), MRV 임박 (22)".

---

### A.5 [RPE 미사용] 코드에 데이터 있는데 안 씀

**위치**: `set.rpe` 필드는 `workout/exercises.js:644` 에서 저장됨. `render-stats.js _renderDeepStats` 어디에서도 참조 0.

**문제**:
- 자연인 코칭의 핵심 fatigue 지표 = **RPE drift**: 같은 무게 같은 reps 인데 RPE 가 7 → 8 → 9 로 올라가는 패턴.
- 정체의 진짜 신호는 무게가 안 오르는 게 아니라 **같은 무게의 RPE 가 올라가는 것**.
- Deload 타이밍 신호도 RPE drift. 4주 평균 RPE 가 7.5 → 8.5 → 9 → "이번 주 deload".

**올바른 접근**: 종목별 RPE trend, 같은 무게 같은 reps 의 RPE drift 자동 detect, "이번 mesocycle 의 fatigue accumulation" 으로 가시화.

---

### A.6 [Periodization 부재] Deload 인식 0

**문제**:
- 의도된 deload (주간 -50% 볼륨, RPE 6 으로 의도적 회복) 를 시스템은 "정체/후퇴 위험" 으로 판정.
- 자연인 표준 mesocycle: **4 주 accumulation + 1 주 deload + 1주 회복/재시작**. 5/3/1 의 4주차 = deload week, RP 의 6주차 = active rest.
- Phase 인식 없이 "성장 중 / 정체 / 후퇴" 라벨링 = 사용자에게 잘못된 시그널.

**올바른 접근**: Mesocycle phase 자동 분류. Accumulation week 1-4 / Deload week 5 / Reset week 6. `_settings.max_cycle.weekIndex` 와 연동해 "이번은 디로드 주차 — 볼륨 -40% 가 정상" 코칭.

---

### A.7 [식단 분석] 단순 OK/NG + 절대 g

**위치**: `render-stats.js:103-105, 176`

**문제**:
- "✅ 식단 OK 일수" / "❌ 식단 NG 일수" — binary 라벨. 자연인 식단의 질을 판단할 수 없음.
- protein 110g 절대값 표시 — 체중 80kg 에게는 1.4g/kg (자연인 hypertrophy MAV 1.6-2.2g/kg 미달), 체중 60kg 에게는 1.83g/kg (충분).
- **Bulk / Cut / Maintenance 인식 0**. surplus/deficit 컨텍스트 없음.
- TDEE (Total Daily Energy Expenditure) 추정 없음.

**올바른 접근**:
- protein **g/kg bodyweight** 로 표시.
- 4주 평균 칼로리 ↔ 체중 변화 → **유지 칼로리 (TDEE) 역추정**.
- 체중 변화율 / 체지방률 변화로 **Phase 자동 감지**: Bulking (+0.2-0.5%/wk), Cutting (-0.5-1%/wk), Maintenance (±0.1%/wk), Recomp (체중 유지 + 체지방률 -).

---

### A.8 [체성분 통합 부재] 식단 / 운동 / 체성분이 분리

**위치**: 체크인 차트 (`render-stats.js:418`) 는 별도 섹션. `_renderDeepStats` 에서 체성분 데이터 미참조.

**문제**:
- 진짜 자연인 코치의 1순위 분석: "식단 OK 70% + 운동 6일/주 + 체중 +1kg / 체지방률 +1.5%" → "근육보다 지방 증가 우세, surplus 너무 큼."
- 시스템은 식단/운동/체성분이 따로 그래프 로 떠 있어서 **상호관계가 안 보임**.

**올바른 접근**: Body Comp × Energy Balance 통합 패널. 4주 윈도우로 (체중 변화) ÷ (칼로리 sum - TDEE × 4) → muscle/fat 분리 추정 (체중 +1kg, surplus 누적 +5,000kcal → 0.65kg muscle + 0.35kg fat 같은 식, M.A.D.S. 식 단순 모델로).

---

### A.9 [정체/Plateau 자동 detect 부재]

**문제**:
- 종목별 정체 detect 없음. `_topSetE1rm` 만 계산.
- 진짜 코치는 "벤치 3주째 80kg×8 — 정체. RPE 도 8.5→9 drift. 다음 주 deload + rotate 후보 (인클라인 벤치 또는 덤벨 벤치)."
- 시스템은 이 신호를 자동으로 잡아내지 못함.

**올바른 접근**: 종목별 Plateau Detection 알고리즘.
- 같은 종목 3주 연속 같은 무게 + RPE drift > 0.5 → 정체 시그널 ON.
- Plateau 종목에 대해 "교체 후보" (같은 부위 다른 종목) 추천.
- v3 design 에 있던 `rotatePolicy.plateauWeeks: 2` 가 이미 cycle 데이터에 있는데 stats 에서 미참조.

---

### A.10 [As-Is / To-Be 텍스트 generic]

**위치**: `render-stats.js:157-166`

**문제**:
- "운동 빈도는 충분합니다" / "단백질이 낮습니다" 같은 일반론.
- 사용자 수치/맥락 기반 구체 권장이 아님.

**비교**:
- 현재: "단백질 평균이 낮습니다. 110-140g 범위로 안정화하세요."
- 코치 톤: "체중 78kg, 4주 평균 protein 105g (1.35g/kg). bulking phase 라면 +30g (간식으로 그릭요거트 200g+훼이 30g) 추천. 4주 안에 1.6g/kg 도달 목표."

**올바른 접근**: 사용자 컨텍스트 (체중 / phase / 종목별 progression / 부위별 sets / RPE) 를 모두 입력으로 받는 권장 엔진. 동적 generation.

---

### A.11 [Sleep / Stress / 회복 markers 부재]

**문제**:
- 자연인 코칭의 4번째 변수 = **Recovery quality** (수면, 스트레스, 근육통).
- 현재 시스템: 데이터 캡처 0.
- RPE drift 가 회복 부족의 proxy 인데 미사용.

**올바른 접근 (장기)**:
- RPE drift 기반 fatigue index 우선 도입.
- Phase 2 에서 사용자 입력 (수면 시간 / morning HRV proxy) 추가 검토.

---

### A.12 [메탈모델 부재] 자극-적응-회복-증량 4-step 루프

**문제**:
- 통계가 "성장 중 / 정체 / 후퇴" 라는 결과 라벨만 줌.
- 자연인 코칭의 메탈모델 = **Stimulus → Adaptation → Recovery → Progression** 의 4-step 루프.
  - **Stimulus**: 부위별 hard sets, RPE 7+ 비율
  - **Adaptation**: 식단 (protein g/kg, calorie balance), sleep proxy
  - **Recovery**: RPE drift, plateau detection, deload timing
  - **Progression**: 종목별 e1RM trend, 부위별 weekly volume trend
- 4 변수가 따로 보이지 않으면 사용자는 "왜 안 자라나" 를 진단 못 함.

**올바른 접근**: 통계 화면을 4 step 별 패널로 재구성. 사용자가 패널 보면 어느 변수에서 막혔는지 self-diagnose 가능.

---

## Part B. 자연인 트레이너의 멘탈 모델 — 무엇을 봐야 하나

### B.1 4-Variable Loop

```
   STIMULUS (자극)               ADAPTATION (적응)
   ────────────────              ─────────────────
   · 부위별 weekly hard sets      · Protein g/kg
   · RPE 7+ 비율                   · Calorie balance vs TDEE
   · 종목별 working volume         · Body comp 변화율
   ↓                              ↓
   ─────────────────────────────────────────
   PROGRESSION (증량)             RECOVERY (회복)
   ─────────────────              ─────────────────
   · 종목별 e1RM slope kg/week    · RPE drift (같은 무게 RPE 추이)
   · 부위별 PR 빈도               · Plateau detection (3주 연속 정체)
   · Volume MAV/MRV 도달          · Deload phase 인식
```

이 4 변수가 따로 보여야 사용자가 **"진단"** 할 수 있다.

### B.2 Volume Landmarks (Mike Israetel / RP)

| 부위 | MEV | MAV | MRV | 단위 |
|---|---|---|---|---|
| 가슴 | 8 | 12–14 | 22 | hard sets/주 |
| 등 (전체) | 10 | 14–16 | 25 |  |
| 어깨 측면 | 6 | 12–16 | 22 |  |
| 어깨 후면 | 6 | 10–12 | 18 |  |
| 대퇴사두 | 8 | 12–14 | 18 |  |
| 햄스트링 | 6 | 10 | 16 |  |
| 둔근 | 6 | 8–10 | 16 |  |
| 이두 | 6 | 8–14 | 20 |  |
| 삼두 | 6 | 10–14 | 18 |  |
| 복근 | 0 | 12 | 25 |  |

이 표가 **부위별 절대 sets/주 의 reference**. 화면에 라인으로 그려준다.

### B.3 Mesocycle Phase

```
Week 1 — Accumulation (MEV 시작, RPE 6-7)
Week 2 — Accumulation (MAV 진입, RPE 7-8)
Week 3 — Accumulation (MAV 유지, RPE 8-9)
Week 4 — Accumulation (MRV 근접, RPE 9)
Week 5 — Deload (-40-50% volume, RPE 6)
Week 6 — Reset (다음 mesocycle 시작값 +5kg / +1set)
```

자연인 표준 6주 사이클. 시스템의 `_settings.max_cycle.weekIndex` 와 매핑돼야 phase 자동 분류 가능.

### B.4 Body Recomposition Math

```
체중 변화 (kg) ≈ (Calorie balance × 4주) ÷ 7,700
                + (수분/glycogen 변동 ±0.5kg)

Bulking 정상범위: +0.2~0.5%/주 (체중 80kg → +160-400g/주)
  Surplus +250-500 kcal/day
Cutting 정상범위: -0.5~1%/주
  Deficit -500-750 kcal/day
Recomp: 체중 ±0.1%/주 + 체지방률 -0.5-1%/4주
```

체중 변화 + 체지방률 변화 + 식단 칼로리 → 위 식으로 muscle/fat 분리 추정 가능.

---

## Part C. 재설계 — 5 패널 구성

기존 `_renderDeepStats` 의 hero + 4 KPI + As-Is + To-Be + 부위편향 + topExercises 를 폐기.
대신 4-Variable Loop 메탈모델에 맞춰 **5 패널** + 동적 권장 코칭 카피 1 패널.

### Panel 1 — Mesocycle Pulse (hero)

**목적**: "지금 mesocycle 어디쯤이고, 다음 액션이 뭐야"

**구성**:
- 6주 사이클 timeline (W1..W6) + 현재 위치 표식
- Phase 라벨: `Accumulation` / `Deload` / `Reset`
- Phase 별 기대 RPE 범위와 실측 RPE 비교 한 줄
- 다음 deload 까지 N 일

**예시 카피**:
```
Mesocycle 3주차 · Accumulation
  실측 평균 RPE 8.2 (기대 7-8) — 정상 범위
  다음 deload 까지 8일 (5/10)
```

**데이터 소스**:
- `_settings.max_cycle.weekIndex` (이미 있음)
- 종목별 RPE 평균 (4주 윈도우)

---

### Panel 2 — Stimulus: Volume Landmarks per Muscle

**목적**: "각 부위에 충분한 자극이 가고 있나"

**구성** (부위별 한 행):
```
가슴   ●━━━━━━●─────●        16 sets/주
       MEV 8  MAV 12-14  MRV 22
       ↑ 현재 16 — MAV 초과, MRV 도달까지 6 sets

어깨 측면   ●●─────────────  4 sets/주  ⚠️
            MEV 6 미달 — +2 sets 권장
            (사이드 레터럴 3세트 추가)
```

**원칙**:
- 백분율이 아니라 **절대 sets/주**.
- MEV/MAV/MRV 라인을 가로로 그려주고 현재 위치를 dot 으로.
- under MEV / over MRV 만 경고 색.
- "+2 sets 권장" 같은 구체 액션.

**데이터 소스**:
- 4주 윈도우 hard sets (RPE 7+ working sets) 부위별 sum.
- 부위별 MEV/MAV/MRV 는 §B.2 표 hard-coded.

**Hard Set 정의 (코드 추가 필요)**:
```js
function isHardSet(set) {
  if (set?.setType === 'warmup') return false;
  if (set?.done === false) return false;
  if (!(Number(set?.kg) > 0 && Number(set?.reps) > 0)) return false;
  // RPE 가 있으면 7+ 만 인정. 없으면 reps 기준 (8+ reps with kg > 0 가정).
  if (Number.isFinite(Number(set?.rpe)) && Number(set.rpe) > 0) {
    return Number(set.rpe) >= 7;
  }
  return Number(set.reps) >= 5;
}
```

---

### Panel 3 — Progression: Lift Trends (벤치마크별)

**목적**: "벤치마크 종목의 무게가 진짜 늘고 있나"

**구성** (벤치마크 5종):
```
바벨 벤치프레스         77.5 → 80 kg (+3.2%/4주)
[8주 sparkline e1RM trend]
slope +0.42 kg/주 — 자연인 표준 (+0.3-0.5)

바벨 백스쿼트          105 → 105 kg (+0%/3주) ⚠️ 정체
[8주 sparkline e1RM trend, plateau 강조]
3주 연속 같은 무게, 같은 무게 RPE 8.5 → 9 drift
→ 다음 주 deload 권장 + 인클라인 스쿼트로 rotate 후보
```

**원칙**:
- e1RM 합산 폐기. 종목별 trend.
- Linear regression slope (kg/주) 표시.
- Plateau 자동 detect (3주 연속 같은 무게 + RPE drift).
- Rotate 후보 자동 추천 (같은 부위 다른 종목).

**데이터 소스**:
- 종목별 8주 set history.
- e1RM = Epley `kg × (1 + reps/30)`.
- Linear regression on 8-12 data points.
- RPE drift on same-weight-same-reps groups.

---

### Panel 4 — Adaptation: Body Comp × Energy Balance

**목적**: "식단/체성분 변화가 운동 자극과 정렬되어 있나"

**구성**:
```
[4주 윈도우]
체중       80.2 → 80.8 kg  (+0.75%, +0.6kg)
체지방률   18.0 → 18.3%   (+0.3%p)
허리둘레   82.0 → 82.5 cm  (+0.5cm)

추정 분리: muscle +0.4kg / fat +0.2kg
Phase: 〔 ◉ Bulking (lean) 〕
       지방 증가 < 50% — 자연인 lean bulk 성공 범위

식단:    avg 2,720 kcal / 138g protein
TDEE 추정: 2,500 kcal — surplus +220 kcal/day (정상 +200-500)
Protein:  1.72 g/kg — MAV 도달
```

**원칙**:
- 절대값이 아니라 **비율 + 컨텍스트**.
- TDEE 자동 추정 (체중 변화 ÷ surplus 역산).
- Phase 자동 분류: Bulking / Cutting / Recomp / Maintenance.
- muscle/fat 분리 추정.

**데이터 소스**:
- `getBodyCheckins()` 의 weight, bodyFatPct (있으면).
- 일간 kcal sum.
- 4주 평균.

**자동 phase 분류 로직** (의사코드):
```js
function classifyPhase(weightSlope, bfSlope) {
  const wPct = weightSlope; // %/week
  if (Math.abs(wPct) < 0.1 && bfSlope < -0.1) return 'recomp';
  if (wPct > 0.15) return bfSlope > 0.15 ? 'bulk_dirty' : 'bulk_lean';
  if (wPct < -0.15) return bfSlope < -0.15 ? 'cut_lean' : 'cut_lean_loss';
  return 'maintenance';
}
```

---

### Panel 5 — Recovery: Fatigue Signals

**목적**: "지금 회복이 따라오고 있나, 디로드가 필요한가"

**구성**:
```
[4주 RPE Drift]
같은 무게의 평균 RPE
  W1 7.4 → W2 7.8 → W3 8.2 → W4 8.6
  drift +1.2 / 4주 — 정상 (1주에 +0.3)

부위별 RPE 평균
  가슴 7.8     | 등 7.5      | 하체 8.4 ⚠️
  어깨 7.2     | 이두/삼두 7.6

Plateau 종목: 1개 (백스쿼트)
다음 주 권장: 디로드 (volume -50%, RPE -2)
```

**원칙**:
- 종목별 / 부위별 RPE drift.
- Plateau detection 결과.
- 디로드 timing 자동 권장.

---

### Panel 6 (추가) — Coaching Brief (동적 생성)

**목적**: 위 5 패널을 종합한 사용자별 코칭 한 단락

**예시**:
```
### 이번 주 코칭

당신은 Mesocycle 3주차 (Accumulation) 입니다. 가슴/등은 MAV 도달, 어깨 측면은
MEV 미달이라 사이드 레터럴 +2 sets 추가가 우선입니다. 백스쿼트는 3주 연속
105kg, 같은 무게 RPE 가 8.5→9 로 drift — 다음 주 디로드 권장
(70-80% × 5세트 RPE 6) 또는 인클라인 스쿼트로 rotate.

식단은 surplus +220 kcal/day, lean bulk 범위 내. Protein 1.72 g/kg 충분.
다만 체지방 +0.3%p (4주) 는 다음 4주에 0.5%p 누적될 것으로 보여,
Week 7 부터는 surplus 를 +150 kcal/day 로 줄이는 미세조정 권장.

다음 디로드: 5/10 (8일 후).
```

**원칙**:
- 사용자 수치 기반 구체 권장.
- Stimulus → Adaptation → Recovery → Progression 4 변수 모두 reference.
- 한 단락 안에 우선순위 1-2개만.

**데이터 소스**: 위 5 패널의 모든 추출값.
**구현**: 우선 rule-based template (LLM 없이도 가능). 후일 OpenAI 호출로 자연어 강화 옵션.

---

## Part D. 데이터 요구사항

### D.1 현재 데이터로 가능한 것

| 패널 | 필요 데이터 | 현재 보유 |
|---|---|---|
| 1 Mesocycle Pulse | weekIndex, RPE per set | ✅ `_settings.max_cycle`, ✅ `set.rpe` |
| 2 Volume Landmarks | hard sets per muscle | ✅ `cache[date].exercises[].sets` + `entry.muscleId/movementId` |
| 3 Lift Progression | exercise history, e1RM | ✅ `getVolumeHistory(exerciseId)` |
| 4 Body Comp × Diet | weight, bf%, kcal | ✅ `getBodyCheckins()`, `_dayKcal()` |
| 5 Recovery Signals | RPE per set | ✅ `set.rpe` (단 사용자가 입력해야 의미) |
| 6 Coaching Brief | 위 모든 추출값 | ✅ 위 모두 가능 |

**결론**: 거의 모든 패널이 현재 데이터로 구현 가능. 추가 캡처 없이 분석 layer 만 추가하면 됨.

### D.2 추가 캡처 권장 (선택)

| 항목 | 가치 | 비용 |
|---|---|---|
| 허리둘레 (4주 1회) | 체지방률 정확도 보조, recomp phase 진단 강화 | 낮음 (체크인 모달에 input 1개 추가) |
| 수면 시간 (일간) | Recovery proxy | 중 (입력 마찰) |
| 1RM 테스트 (12주 1회) | e1RM 보정 | 낮음 (이벤트 1회) |
| 사진 측정 (4주 1회) | 체성분 변화 시각 confirm | 낮음 (이미 일부 사진 필드 있음) |

### D.3 RPE 입력률을 올려야 함

현재 RPE 는 expert mode + 본세트 + 완료 일 때만 노출 (`workout/exercises.js:644`). **default 비노출 → 입력률 낮음 → Recovery panel 의미 떨어짐**.

**제안**:
- 테스트모드에서 RPE 입력은 **본세트만 default 노출**. select 가 아니라 **하드/적당/쉬움 3 chip** (RPE 9/8/7 매핑) 으로 입력 비용 1탭으로.
- 사용자가 1주 이상 RPE 미입력이면 Recovery panel 회색 처리 + "RPE 입력 시 회복 분석 가능" 안내.

---

## Part E. 구현 우선순위

### P0 — 분석 layer 신설 (4주 데이터로 즉시 가능)

| # | 항목 | 비용 | 의존 |
|---|---|---|---|
| P0.1 | `calc.js` 에 `computeHardSets`, `computeRpeAvg`, `computeE1rmTrend`, `detectPlateau`, `classifyMesocyclePhase` 추가 | 중 | 없음 |
| P0.2 | `data/data-stats.js` 신설 — 위 함수의 4주/12주 윈도우 호출 + 결과 캐시 | 중 | P0.1 |
| P0.3 | `_renderDeepStats` 폐기, `renderTrainerDashboard` 신설. Panel 1-5 + Coaching Brief 노출 | 높음 | P0.2 |

P0 완료 시 사용자 지적 12개 중 §A.1, A.2, A.3, A.4, A.6, A.9, A.10, A.12 동시 해결.

### P1 — 데이터 캡처 보강

| # | 항목 | 비용 | 의존 |
|---|---|---|---|
| P1.1 | RPE 입력 UI 단순화 (3 chip, default 노출) | 중 | 없음 |
| P1.2 | 체크인 모달에 허리둘레 input 추가 | 낮음 | 없음 |
| P1.3 | TDEE 자동 추정 (체중 변화 ÷ kcal balance 역산) | 낮음 | P0.2 |

### P2 — 코칭 브리프 고도화

| # | 항목 | 비용 |
|---|---|---|
| P2.1 | 동적 권장 엔진 rule-based template | 중 |
| P2.2 | Plateau 종목 → rotate 후보 추천 (`MOVEMENTS` 같은 부위 다른 종목) | 낮음 |
| P2.3 | LLM 기반 자연어 코칭 (선택) | 높음 |

### P3 — 시각화 폴리싱

| # | 항목 |
|---|---|
| P3.1 | MEV/MAV/MRV 라인 차트 (Chart.js custom plugin) |
| P3.2 | RPE drift heatmap |
| P3.3 | Phase timeline animation |

---

## Part F. 비교 요약

| 항목 | 현재 | 재설계 |
|---|---|---|
| 윈도우 | 14일 vs 14일 | 1주 / 4주 / 12주 layer |
| Strength | e1RM 합산 (의미 없음) | 종목별 slope kg/주 |
| Volume | 단순 kg×reps 합 | 부위별 hard sets vs MEV/MAV/MRV |
| RPE | 미사용 | drift detection, fatigue index |
| Periodization | 인식 0 | Mesocycle phase 자동 분류 |
| 식단 | OK/NG + 절대 g | g/kg, TDEE, phase 분류 |
| 체성분 | 별도 차트 | Energy Balance 통합 추정 |
| 정체 | 라벨링만 | 종목별 detect + rotate 추천 |
| 권장 | 3 generic 문장 | 사용자 수치 기반 동적 |
| 메탈모델 | "성장/정체/후퇴" binary | Stimulus-Adaptation-Recovery-Progression 4 변수 |

---

## Part G. 한 줄 결론

> 자연인 트레이너가 통계 화면 30초 보고 다음 4 질문에 답할 수 있어야 한다.
>
> 1. 자극이 충분한가? → Volume Landmarks 패널
> 2. 회복이 따라오나? → RPE Drift 패널
> 3. 진짜 자라고 있나? → 종목별 e1RM slope
> 4. 식단이 운동을 받쳐주나? → Body Comp × Energy Balance
>
> 현재 심층통계는 4 질문 중 어느 것도 명확히 답하지 못한다. 재설계의 목표는 4 질문 모두에 30초 안에 답이 보이게 만드는 것.

---

## 변경 이력

- 2026-05-02: `_renderDeepStats` 라이브 코드 분석 + 자연인 보디빌딩 코칭 (RP/Israetel/Helms 표준) 관점 12 비판 + 5 패널 + 1 코칭 브리프 재설계 + 데이터 요구사항 + 우선순위 매트릭스. 목업 산출물 생성 시 별도 후속 단계.

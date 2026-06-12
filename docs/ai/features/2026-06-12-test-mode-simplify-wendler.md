# 테스트모드 단순화 개편 + 웬들러 모듈 (2026-06-12)

## 요청 요약

현재 테스트모드(Max V4)는 UI/UX가 번잡하다. 아래 3가지만 유지하고, **현재 구현된 코드베이스와 UI(wt-v4 컴포넌트)를 기준으로 스무스하게 통합**하는 방식으로 개편한다. 새 디자인 시스템·새 화면 신설 금지.

1. **6주에 한 번, 설정한 증량값만큼 성장하는 것이 보여야 한다.**
2. **볼륨(M)/강도(H) 트랙은 유지한다.**
3. **일부 부위는 웬들러 프로그램으로 수행할 수 있어야 한다.** 정통 5/3/1뿐 아니라 8/6/3, BBB 같은 모듈을 사용자가 직접 설정할 수 있어야 한다.

- 목업: [docs/ai/mockups/2026-06-12-test-mode-simplify-wendler.html](../mockups/2026-06-12-test-mode-simplify-wendler.html)
  - 목업은 `expert-mode.css` **원본을 직접 링크**하고, `renderMaxCycleDashboard()` / `_renderV4Lift()` / `renderMaxPlanEditor()` / `renderMaxCycleSettle()`이 실제 출력하는 마크업 구조를 그대로 사용한다. 변경점은 유지/변경/추가/제거 태그로만 표시.

## 핵심 발견 (코드 탐색 결과)

| 발견 | 의미 |
|------|------|
| 트랙별 **증량폭(incrementKg) 입력이 계획 조정 시트에 이미 존재** (`_renderPlanTrackInputs`, max-cycle-render.js:669) | 요구 1을 위한 UI 신설 불필요 |
| 정산 `settleMaxCycle()`(max.js:3268)은 그 값을 무시하고 **nextSeed에 +2.5/5 하드코딩** | 요구 1의 진짜 갭 — UI가 아니라 데이터 흐름 연결 문제 |
| 계단(stair) 시각화 컴포넌트 `_renderPlanStairLane()`이 이미 존재 (검정 계획선·파랑 실측·hitgrid 상태 라벨) | 사이클 성장 계단·웬들러 주차표 모두 이 컴포넌트 재사용으로 해결 |
| 완료 사이클 요약은 nextSeed 생성 후 **유실** (히스토리 없음) | 사이클 간 성장 비교가 불가능했던 원인 |
| `max-config.js:37` `wendler531` 프레임워크는 라벨만 존재, 유일한 구현은 `dual_track_progression_v2` | 웬들러는 신규 구현 필요. 단 사이클 컨테이너(6주/정산)는 공통 사용 |
| M/H 트랙 토글·± 인라인 조정은 `_renderV4Lift()`에 이미 구현 | 요구 2는 "유지"만 하면 됨 |

## 결정 사항

- **웬들러는 벤치마크 단위 프로그램.** `benchmark.program: 'linear'|'wendler'` (기본 linear). "일부 부위만 웬들러"가 벤치마크 단위 선택으로 해결. 사이클 컨테이너(6주, 정산, 성장)는 공통.
- **성장은 정산(6주 1회) 시점에만.** 주차별 계획은 수행 처방일 뿐, 대표 무게(linear=트랙 startKg, wendler=TM)는 정산 때만 `+증량폭`. 하드코딩 +2.5/5 제거.
- **웬들러 6주 매핑은 모듈이 소유.** `weekMap[6]` 기본 프리셋 = 3주 웨이브 ×2 (W1–3 / W4–6). 디로드·% 변경은 사용자가 주차표 셀에서 직접 편집 (편집 시 scheme='custom').
- **신규 UI 패턴 0개 원칙.** 모든 추가 UI는 기존 클래스 재사용: 프로그램 세그먼트=`.wt-v4-row-track`, 스킴 탭=`.wt-v4-plan-major-tabs`, 주차표=`.wt-v4-plan-stair-hitgrid`, TM/보조 입력=`.wt-v4-track-edit-row`.

## 개편안 (목업 화면 1~4와 1:1)

### 화면 1 — 진입 카드 (`renderMaxCycleDashboard()`)

구조는 그대로 두고 카드만 정리:

- **유지**: topbar, hero, 벤치마크 아코디언(`_renderV4Lift` 행: M/H 토글, ± 인라인 조정, 진행바), next-actions.
- **변경 1**: hero `.score-row` 3번째 슬롯 "오늘 트랙" → **"정산 시 +x kg 성장"**. (트랙은 행마다 토글이 있어 중복 정보였음. 요구 1의 상시 노출 지점.)
- **변경 2**: `_renderV4CycleChart()` "오늘 수행 궤적" 곡선 카드 → **성장 계단 카드**. `_renderPlanStairLane()` 재사용, 축만 주차→사이클(C1→C2→…). 점선 마지막 계단 = 이번 정산 시 +증량폭 예약.
- **변경 3**: `_renderV4Lift()`에 `program==='wendler'` 분기 — 트랙 세그먼트 자리에 모듈 라벨(`is-single` 패턴), 큰 숫자=오늘 톱세트, reps 칸=메인 3세트(%TM)+보조(BBB) 처방.
- **제거**: 동일부위 조언 카드(`nextAdviceHtml`, max-same-day-advice.js), 추천 패널(`recommendationHtml`).

### 화면 2 — 계획 조정 시트 (`renderMaxPlanEditor()`)

- **추가는 1줄**: 벤치마크 카드에 프로그램 세그먼트 (기본 트랙 ↔ 웬들러), `.wt-v4-row-track` 재사용.
- **유지**: W1 시작일, 부위 탭, 연결 종목 select, M/H 계단 lane, 트랙별 시작/목표/**증량폭**/반복 입력, 벤치마크 추가.
- **동작 변경**: 정산이 이 증량폭 값을 성장에 사용 (UI 그대로, 데이터 흐름만 연결).
- **제거**: 장비 풀 진입(→ Expert 체육관 설정), cleanse(→ 정산 내부 처리).

### 화면 3 — 웬들러 모듈 (같은 시트, 프로그램=웬들러 선택 시 카드 내부 전환)

- 스킴 프리셋 탭: `5/3/1` / `8/6/3` / `커스텀` (`.wt-v4-plan-major-tabs` 재사용).
- 주차표: `.wt-v4-plan-stair-lane` + hitgrid 재사용 — 셀마다 `%TM 3개 + 반복`, 셀 탭으로 직접 편집(편집 시 커스텀 전환), 디로드 지정 가능.
- TM/보조 입력: `.wt-v4-track-edit-row` 재사용 — TM·증량폭·라운딩 / BBB %TM·세트·반복·사용(FSL 전환).
- 프리셋 기본값:
  - `w531`: W1·W4 65/75/85%×5,5,5+ · W2·W5 70/80/90%×3,3,3+ · W3·W6 75/85/95%×5,3,1+
  - `w863`: W1·W4 60/65/70%×8,8,8+ · W2·W5 65/70/75%×6,6,6+ · W3·W6 70/75/80%×3,3,3+
  - 보조: `bbb`(50%TM×10×5, 파라미터 편집 가능) / `fsl` / `none`. 마지막 메인 세트 AMRAP(+) 기본 on.

### 화면 4 — 정산 시트 (`renderMaxCycleSettle()` 보강)

- 행 구조(`wt-max-cycle-settle-row`) 유지, 내용 변경: `105 → 107.5kg (+2.5)` — **설정 증량폭 그대로**. 웬들러는 TM에 적용.
- 실측 미달 벤치마크는 "유지"가 기본 (강제 증량으로 실패 누적 방지).
- 정산 직후 같은 계단 lane에 새 계단 "방금 확정" 피드백 — 화면 1 성장 계단과 동일 컴포넌트로 6주 루프가 닫힘.
- 완료 사이클 요약을 히스토리로 보존 (성장 계단의 데이터원).

## 데이터 모델 (Firestore `_settings.max_cycle` — setDoc 전체 보존)

기존 cycle/benchmark 필드 전부 유지, benchmark에만 추가:

```javascript
benchmark: {
  // 기존 필드 유지 (id, movementId, label, primaryMajor, tracks{M,H}, ...)
  program: 'linear' | 'wendler',   // 기본 'linear' — 필드 없는 기존 사이클은 그대로 linear 동작
  wendler: {                        // program==='wendler'일 때만
    tmKg: 152.5,
    incrementKg: 5,                 // 정산 시 TM 증량 (linear의 tracks[t].incrementKg와 동일 의미)
    roundKg: 2.5,
    scheme: 'w531' | 'w863' | 'custom',
    weekMap: [ { sets: [{pct, reps, amrap?}] } × 6 ],
    supplemental: { kind: 'none'|'bbb'|'fsl', pct: 50, sets: 5, reps: 10 },
  },
}
```

사이클 히스토리: 정산 시 `_settings.max_cycle_history` (또는 cycle 내 배열)에 `{cycleId, 기간, 벤치마크별 시작/확정/증량}` 보존. 저장은 전부 `data.js` 경유.

## 실행 슬라이스

### Slice 1: 정산 연결 + 사이클 히스토리 (요구 1)
- `settleMaxCycle()` 하드코딩 +2.5/5 → 트랙별 `incrementKg` 사용. 미달 벤치마크 "유지" 기본. 완료 사이클 요약 히스토리 보존.
- 파일: `workout/expert/max.js`, `max-cycle-core.js`, `data.js`, `tests/`
- 주의: `_settings.max_cycle` setDoc 전체 보존. Max V4 Draft Preservation Rule.

### Slice 2: 진입 카드 정리
- hero score 3번째 교체, 궤적 카드 → 성장 계단 카드(`_renderPlanStairLane` 재사용, 히스토리 데이터), 조언/추천 패널 제거, 장비 풀/cleanse 표면 분리.
- 파일: `max-cycle-render.js`, `max.js`, `max-same-day-advice.js`(축소), `sw.js` 버전 범프
- 주의: Max V4 Inline Handler Ban — `data-action` + `.wt-v4-sheet` 캡처 바인딩만.

### Slice 3: 웬들러 엔진 + 모듈 설정 UI (요구 3)
- 신규 `workout/expert/max-wendler.js` — 순수 함수만(주차 처방 계산, 프리셋, 라운딩, 보조 세트). `tests/calc.max.test.js` 패턴으로 단위 테스트.
- `renderMaxPlanEditor()` 프로그램 세그먼트 + 웬들러 카드 내부(스킴 탭/주차표/TM·보조 입력).
- 파일: 신규 1 + `max-cycle-core.js`, `max-cycle-render.js`, `max.js`, `tests/`

### Slice 4: 진입 행 웬들러 분기 + 정산 시트 보강
- `_renderV4Lift()` wendler 분기, `renderMaxCycleSettle()` 증량 표시·유지 선택·계단 피드백.
- 파일: `max-cycle-render.js`, `max.js`

## 검증 기준

- 계획 조정 시트의 기존 증량폭 input을 바꾸면 → hero "정산 시 +x" 문구·성장 계단 점선·정산 결과에 모두 반영.
- 스쿼트를 웬들러(5/3/1+BBB)로 전환 → 진입 행이 %TM 처방으로 바뀌고 세션 추가 시 메인 3세트+BBB 5세트 생성.
- 주차표 셀 % 수정 → 해당 주 처방에만 반영 + scheme이 custom으로.
- W6 정산 → linear/wendler 모두 대표 무게 +증량폭, 성장 계단에 새 계단, 히스토리 보존.
- `program` 필드 없는 기존 사이클 로드 → linear로 기존과 동일 동작, 필드 손실 없음 (data-guardian 감사).

## 다음 액션

사용자가 목업/기획을 승인하면 Slice 1부터 실행 세션으로 진행한다. 이번 세션에서는 앱 코드를 수정하지 않는다.

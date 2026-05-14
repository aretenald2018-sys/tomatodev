# Workout Data Lineage

이 문서는 테스트모드 운동 앱에서 같은 데이터가 화면마다 다르게 해석되는 문제를 막기 위한 기준표다.

## Field Ownership

| Field | Meaning | Writer | Readers |
| --- | --- | --- | --- |
| `exerciseId` | 실제 추가/기록 단위 | 운동 추가 모달, dev seed | 세트 목록, 직전 기록, 추천 무게, 벤치마크 actuals |
| `movementId` | 같은 동작을 묶는 통합 단위 | 운동 메타데이터 | 벤치마크 후보, movement 기반 fallback |
| `gymId`, `gymTags`, `gymIds` | 특정 지점 노출 범위 | 기구/운동 메타 편집 | 종목 추가 필터, benchmark resolver |
| `recommendationMeta.track` | 볼륨 `M` / 강도 `H` 실제 기록 분류 | 추천 세트 생성, 세트 저장 | 그래프, fixture 검증 |
| `romPct` | 세트별 ROM 보정률 | 세트 UI | `calcSetVolume`, `estimateSet1RM`, 그래프 |
| `rpe` | 내부 계산 입력값 | 세트 UI/추천 | `estimateSet1RM`; UI 문구는 RIR 기준으로 표시 |

## SSOT Functions

| Concern | Single Source |
| --- | --- |
| 세트 볼륨 | `calc/volume.js` `calcSetVolume(set)` |
| 세트 e1RM | `calc.js` `estimateSet1RM(set)` |
| 트랙별 세션 지표 | `calc.js` `calcTrackSessionMetric(entry, track)` |
| 운동 지점 스코프 | `resolveMovementExercises(movementId, exList, { gymId })` |
| 벤치마크 대표 운동 | `resolveBenchmarkExercise(benchmark, exList, { gymId })` |
| 벤치마크 실측 | `buildBenchmarkActuals({ cache, exList, benchmark, todayKey })` |

## Required Invariants

1. `exerciseId`가 있는 벤치마크는 같은 `movementId`의 다른 지점 운동 기록을 섞지 않는다.
2. legacy `movementId` 벤치마크는 resolver를 통해 현재 지점에서 실제 추가 가능한 종목으로 표시한다.
3. ROM 80% 세트는 볼륨과 강도 지표 모두 0.8배로 반영한다.
4. 테스트모드 직전 기록 표시는 `kg x reps x sets`만 노출한다.
5. 배포 완료 기준은 GitHub Pages 성공이 아니라 `build-info.json.commit === github.sha` 확인까지다.

## Fixture

대표 데이터는 `tests/fixtures/workout-test-mode-fixture.json`에 둔다. 검증은 아래 명령으로 한다.

```bash
node scripts/verify-workout-fixture.mjs
node --test tests/*.js
```

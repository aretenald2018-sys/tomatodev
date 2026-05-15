# Max Plan Track Persistence

## 요청

사용자가 `계획 조정`에서 저장해둔 볼륨/강도 트랙 값이 사라졌다고 보고했다. 저장 상태가 계속 유지되는지 확인이 필요하다.

## 진단 결과

- 계획 조정의 볼륨/강도 값은 각 benchmark의 `tracks.M`/`tracks.H`에 저장되는 구조다.
- 저장 시 `saveMaxPlanEditorSheet()`는 `expert_preset.maxCycle`와 별도 `max_cycle` 설정 양쪽에 저장한다.
- 하지만 현재 읽기 경로 `_getMaxCycleSafe()`는 `getExpertPreset()?.maxCycle`만 사용한다.
- 따라서 두 저장소 중 하나가 더 최신이거나 더 완전한 `tracks` 값을 갖고 있어도, `expert_preset.maxCycle`가 stale이면 화면에서 값이 사라진 것처럼 보일 수 있다.

## 결정

- 사이클 읽기 시 `expert_preset.maxCycle`와 `getMaxCycle()`의 별도 설정 값을 비교해 최신/더 완전한 값을 선택한다.
- 선택 기준은 `updatedAt` 우선, 동률이면 `tracks.M`/`tracks.H` 보존 점수 우선으로 한다.
- 저장 구조와 Firebase 스키마는 바꾸지 않는다.
- 기존 DOM draft 보존 로직과 벤치마크 후보 필터는 유지한다.

## 실행 슬라이스

### Slice 1: 저장된 maxCycle 읽기 경로 복구

- Status: Implemented on 2026-05-15.
- Scope:
  - 저장된 사이클 후보 중 최신/완전한 값을 선택하는 순수 헬퍼를 추가한다.
  - `_getMaxCycleSafe()`가 `getExpertPreset().maxCycle`와 `getMaxCycle()` 둘 다 확인하게 한다.
  - 볼륨/강도 `tracks`가 별도 `max_cycle` 쪽에 남아 있으면 그 값을 읽는 회귀 테스트를 추가한다.
  - `STATIC_ASSETS` 대상 파일 변경 시 `sw.js` `CACHE_VERSION`을 범프한다.
- Likely files:
  - `workout/expert/max-cycle-core.js`
  - `workout/expert/max-cycle.js`
  - `workout/expert/max-cycle-render.js`
  - `workout/expert/max.js`
  - `workout/expert.js`
  - `app.js`
  - `tests/calc.max.test.js`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
- Do not change:
  - `www/`
  - Firebase 저장 스키마
  - 운동 catalog

## Verification

- `node --test tests/calc.max.test.js`
- `git diff --check`
- 사용자 로컬 터미널에서 `npm.cmd run dev` 실행 후 `계획 조정` 저장 → 닫기/새로고침 → 다시 열기에서 볼륨/강도 값 유지 확인.

## Execution Prompt

Read this plan and implement Slice 1 only. Preserve the existing DOM draft-reading behavior and benchmark candidate filtering. Bump service worker cache when static assets change.

## 실행 결과

- `workout/expert/max-cycle-core.js`에 `selectPersistedMaxCycle()`을 추가했다.
- `_getMaxCycleSafe()`가 `expert_preset.maxCycle`만 보지 않고 별도 `getMaxCycle()` 설정도 함께 확인하도록 변경했다.
- 저장된 두 사이클 중 `updatedAt`이 더 최신인 쪽을 우선하고, 동률이면 `tracks.M`/`tracks.H`가 더 완전한 쪽을 선택한다.
- ESM import query를 `20260515v3`으로 갱신하고, `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260515z89-max-plan-track-persistence`로 범프했다.
- 검증:
  - `node --test tests/calc.max.test.js` 통과, 35개 테스트 모두 pass.
  - `git diff --check` 통과, Git의 기존 LF/CRLF 경고만 표시됨.

## 리뷰 결과

- 리뷰 문서: `docs/ai/reviews/2026-05-15-max-plan-track-persistence-review.md`
- 결정: 통과.

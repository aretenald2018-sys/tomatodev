# Max 계획 조정: 소근육 볼륨 단일 트랙 + W1 시작일 직접 입력 리뷰

## 리뷰 대상

- Plan: `docs/ai/features/2026-05-15-max-volume-only-tracks-and-start-date.md`
- 변경 범위:
  - `workout/expert/max-cycle-core.js`
  - `workout/expert/max-cycle-render.js`
  - `workout/expert/max-cycle.js`
  - `workout/expert/max-benchmark-picker.js`
  - `workout/expert/max.js`
  - `workout/expert/max-same-day-advice.js`
  - `expert-mode.css`
  - `app.js`
  - `workout/expert.js`
  - `index.html`
  - `sw.js`
  - `tests/calc.max.test.js`

## 결과

- 복근, 삼두, 이두는 `max-cycle-core` 정규화 단계에서 `H.enabled = false`, `defaultTrack = M`으로 고정된다.
- 대시보드, 계획 조정 모달, 성장판 미리보기, 운동추가 picker는 활성 트랙 목록을 코어 helper로부터 받아 강도 트랙을 렌더링하지 않는다.
- 계획 조정 모달에 `W1 시작일` date input을 추가했고, 변경 시 DOM draft를 먼저 읽은 뒤 재렌더링한다.
- 저장 시 `startDate`가 `maxCycle`에 함께 저장된다.
- 변경된 정적 자산에 맞춰 import query와 `CACHE_VERSION`을 갱신했다.

## 검증

- Passed: `node --check workout/expert/max-cycle-core.js`
- Passed: `node --check workout/expert/max-cycle-render.js`
- Passed: `node --check workout/expert/max.js`
- Passed: `node --check workout/expert/max-benchmark-picker.js`
- Passed: `node --check workout/expert/max-cycle.js`
- Passed: `node --check workout/expert/max-same-day-advice.js`
- Passed: `node --check workout/expert.js`
- Passed: `node --check app.js`
- Passed: `node --check sw.js`
- Passed: `node --test tests/calc.max.test.js` (42 tests)
- Passed: `node --test tests/data.load-save.test.js` (28 tests)
- Passed: `git diff --check`

## 잔여 리스크

- 브라우저 UI 실사용 검증은 아직 수행하지 않았다. 로컬에서 `npm.cmd run dev` 실행 후 계획 조정 모달에서 이두/삼두/복근 벤치마크와 W1 시작일 변경 플로우를 확인해야 한다.

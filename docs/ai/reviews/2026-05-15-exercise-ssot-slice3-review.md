# Exercise SSOT Slice 3 Review

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-05-15-exercise-ssot.md`
- 슬라이스: `Slice 3: 성장판 계획 SSOT 정리`
- 변경 파일:
  - `data/data-pure.js`
  - `data/data-load.js`
  - `data.js`
  - `workout/expert/max.js`
  - `workout/exercises.js`
  - `tests/data.load-save.test.js`
  - `sw.js`

## 결과

- Blocker: 없음.
- 성장판 계획의 canonical store는 `settings/max_cycle`로 정리됐다.
- `expert_preset.maxCycle`은 load migration/fallback 입력으로만 남고, 신규 저장에서는 제거된다.
- 기존 legacy 값만 가진 계정은 load 시 `max_cycle`로 승격된다.
- 운동추가 벤치마크 피커와 계획 조정 저장 경로가 canonical `getMaxCycle()`/`saveMaxCycle()`을 우선한다.

## 검증

- `node --test tests/data.load-save.test.js`
- `node --test tests/calc.max.test.js`
- `node --check data.js`
- `node --check data/data-load.js`
- `node --check workout/expert/max.js`
- `node --check workout/exercises.js`
- `git diff --check`

## 다음 단계

- `Slice 4: 소비자 정리 및 브라우저 검증`을 진행한다.

# Exercise SSOT Slice 2 Review

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-05-15-exercise-ssot.md`
- 슬라이스: `Slice 2: 삭제/참조 정합성 강화`
- 변경 파일:
  - `data/data-pure.js`
  - `data.js`
  - `tests/data.load-save.test.js`
  - `sw.js`

## 결과

- Blocker: 없음.
- 운동종목 삭제 시 성장판 벤치마크에서 같은 `exerciseId`를 참조하는 항목을 제거한다.
- 삭제 정리 기준 cycle은 최신 `updatedAt/createdAt`을 우선하고, 동률이면 `exerciseId` 보존 점수가 높은 저장소를 고른다.
- 과거 운동 기록은 자동 삭제하지 않으므로 기록 보존 정책과 충돌하지 않는다.

## 검증

- `node --test tests/data.load-save.test.js`
- `node --test tests/calc.max.test.js`
- `node --check data.js`
- `git diff --check`

## 다음 단계

- `Slice 3: 성장판 계획 SSOT 정리`를 진행한다.

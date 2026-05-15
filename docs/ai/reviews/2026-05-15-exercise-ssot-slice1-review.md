# Exercise SSOT Slice 1 Review

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-05-15-exercise-ssot.md`
- 슬라이스: `Slice 1: 운동종목 카탈로그 seed migration`
- 변경 파일:
  - `data/data-pure.js`
  - `data/data-load.js`
  - `data/data-core.js`
  - `tests/data.load-save.test.js`
  - `sw.js`

## 결과

- Blocker: 없음.
- `DEFAULT_EXERCISES`는 seed 완료 전 누락분을 Firestore에 쓰는 template로만 사용된다.
- seed 완료 후 `_exList`는 Firestore `exercises`만 사용하므로 삭제된 기본 운동이 코드 기본값에서 재합류하지 않는다.
- 기존 저장 운동과 같은 `id`는 seed가 덮어쓰지 않는다.
- Firestore seed 실패 시에는 완료 marker를 쓰지 않고 경고만 남겨 다음 로드에서 다시 시도할 수 있다.

## 검증

- `node --test tests/data.load-save.test.js`
- `node --test tests/calc.max.test.js`
- `node --check data/data-load.js`
- `node --check data/data-pure.js`
- `git diff --check`

## 다음 단계

- `Slice 2: 삭제/참조 정합성 강화`를 진행한다.

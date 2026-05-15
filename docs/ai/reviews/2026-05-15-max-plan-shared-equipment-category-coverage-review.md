# Max Plan Shared Equipment Category Coverage Review

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-05-15-max-plan-shared-equipment-category-coverage.md`
- 슬라이스: `Slice 1: shared equipment category 후보 보강`
- 변경 파일:
  - `workout/expert/max-cycle-core.js`
  - `tests/calc.max.test.js`
  - `sw.js`
  - `docs/ai/features/2026-05-15-max-plan-shared-equipment-category-coverage.md`
  - `docs/ai/NEXT_ACTION.md`

## 발견 사항

- 통과. 최초 구현에서 category fallback이 등록되지 않은 바벨 movement-only 후보까지 만들 수 있었고, 테스트에서 `incline_barbell_bench` fallback이 잡혔다.
- 수정 후 category fallback은 이미 등록된 운동을 활성 기구 category로 살리는 데만 쓰고, movement-only fallback은 명시 `movementIds`에 있는 경우로 제한했다.
- 추가 회귀는 발견하지 못했다.

## 검증

- 명령:
  - `node --test tests/calc.max.test.js`
  - `git diff --check`
- URL 또는 사용자 흐름:
  - 사용자 로컬 터미널에서 `npm.cmd run dev` 실행 후 운동 탭 → 맥스 성장판 → `계획 조정`.
- 기대 증거:
  - 기존 `루마니안 데드리프트` 벤치마크가 `현재 운동추가 목록에서 찾을 수 없습니다` 상태로 뜨지 않는다.
  - 활성 바벨 아래 등록된 RDL은 후보에 남고, 등록되지 않은 바벨 movement가 category fallback만으로 추가되지는 않는다.
- 실제 결과:
  - Node 테스트 34개 모두 통과.
  - `git diff --check` 통과. Git의 기존 LF/CRLF 경고만 표시됨.
  - Codex 세션에서는 장기 dev server를 시작하지 않았으므로 브라우저 UI 플로우는 not verified yet.

## 결정

- 통과: 예
- 수정 필요: 없음
- 후속 계획 필요: 없음

## NEXT_ACTION.md 업데이트

- 리뷰 종료 상태: 완료
- 다음 자동 상태: `complete`
- 다음 액션: 없음
- 차단 사유: 없음

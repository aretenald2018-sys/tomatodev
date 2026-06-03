# 테스트모드 피커 데이터 배지 회귀 수정 리뷰

## 범위

- 계획 문서: `docs/ai/features/2026-06-03-test-mode-picker-data-badge.md`
- 슬라이스: `Slice 1: 테스트모드 피커 데이터 배지 판정 보정`
- 변경 파일: `workout/expert/max-benchmark-picker.js`, `workout/exercises.js`, `tests/calc.max.test.js`, `sw.js`, `docs/ai/features/2026-06-03-test-mode-picker-data-badge.md`, `docs/ai/NEXT_ACTION.md`

## Findings

차단 이슈 없음.

## 확인 내용

- 기존 벤치마크 후보는 `__maxBenchmark` 경로를 그대로 사용하므로 `볼륨/강도 · 계획 중량 x 목표 반복` 표시가 유지된다.
- 벤치마크가 아닌 추가 후보는 최신 표시용 세트 데이터를 `latest`로 전달받아 `데이터 없음` 대신 최근 기록 배지를 표시할 수 있다.
- 오늘 피커에서 이미 추가된 종목은 저장 전 `S.workout.exercises`의 현재 세트도 우선 확인한다.
- `kg=0`이고 `reps>0`인 복부/맨몸 계열은 데이터가 있는 상태로 처리된다.
- `workout/exercises.js`, `workout/expert/max-benchmark-picker.js`, `sw.js`는 `STATIC_ASSETS`에 포함되며, `CACHE_VERSION` bump가 함께 반영됐다.
- Firestore 직접 호출이나 운동 기록 데이터 마이그레이션은 추가되지 않았다.

## 검증

- PASS: `git diff --check`
- PASS: `node --check workout/exercises.js`
- PASS: `node --check workout/expert/max-benchmark-picker.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/calc.max.test.js` (`55` tests)
- PASS: `node --test tests/*.test.js` (`374` tests)
- not verified yet: 실제 모바일 UI 클릭 플로우는 dev server를 Codex 세션에서 장기 실행하지 않는 프로젝트 규칙 때문에 수행하지 않았다.

## 결론

계획 범위에 맞게 구현됐고, 코드/회귀 테스트 기준 차단 이슈는 없다.

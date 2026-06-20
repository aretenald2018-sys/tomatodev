# 성장 보드 웬들러 기본값 및 과거 기록 표시 수정

## 문제

- 성장 보드에서 한 번 웬들러로 바꾼 종목이 보드를 다시 만들거나 종목 후보를 다시 열 때 기본 계단으로 돌아갈 수 있다.
- 2026-06-08 주차처럼 실제 운동기록에는 스모데드 세트가 있어도, 보드의 색칠 로그가 없으면 과거 셀 시트가 `이 주는 기록이 없어요.`로 표시된다.

## 원인

- `buildOnboardingCandidates()`가 v1 `maxCycle`만 웬들러 상속 출처로 보고, 현재 v2 보드의 `benchmarks[].program/wendler` 상태를 후보 기본값에 반영하지 않았다.
- 과거 셀 요약은 `wendlerLog` 또는 `weekLog`만 읽고, 실제 운동 캐시(`getCache().YYYY-MM-DD.exercises`)를 fallback으로 조회하지 않았다.
- 과거 주차의 운동 문서가 앱 메모리 캐시에 아직 없으면 fallback도 빈 값으로 판단할 수 있었다.

## 수정 범위

1. v2 보드의 현재/보관 벤치마크를 후보 생성에 넘겨, 같은 종목의 웬들러 설정을 다음 기본값으로 상속한다.
2. 같은 종목이 v2 보드에서 기본 계단으로 바뀐 상태면 v1 웬들러보다 v2 기본 계단을 우선한다.
3. 과거 셀 시트에서 보드 색칠 로그가 없을 때 해당 주의 실제 운동기록을 exerciseId/movementId/benchmarkId/name 기준으로 조회해 표시한다.
4. 과거 셀을 열 때 해당 주 7일 운동 문서를 `data.js` 경유로 직접 캐시에 보강한다.
5. ID가 달라도 `스모 데드리프트`처럼 이름이 정규화 기준으로 맞으면 같은 종목으로 인식한다.
6. 회귀 테스트와 서비스워커 캐시 버전 범프를 함께 반영한다.

## 검증 계획

- `node --check workout/test-v2/board-core.js`
- `node --check workout/test-v2/board-render.js`
- `node --check workout/test-v2/onboarding.js`
- `node --check data.js`
- `node --check sw.js`
- `node --test tests/test-v2.board-core.test.js`

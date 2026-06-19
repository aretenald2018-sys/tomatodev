# 성장 보드 당일 선택 운동 반영 수정

## 요청

- 운동 성장모드에서 당일 선택한 운동이 아니라 팔/복근만 보이는 문제를 고친다.
- Discord에서 고쳤다고 했는데 실제 앱에 반영되지 않은 이유와 Discord 관련 오류도 점검한다.

## 진단

- `/diagnose` 대상: 성장 보드 v2의 당일 운동/부위 필터가 실제 오늘 운동 상태와 어긋나는 버그.
- `workout/test-v2/board-core.js`에는 이미 오늘 세션 종목을 후보/시작무게에 병합하는 `mergeSessionExercises()`와 `sessionRecentMap()`이 있었고 테스트도 존재했다.
- 하지만 실제 UI 경로인 `workout/test-v2/onboarding.js`와 `workout/test-v2/board-render.js`는 해당 함수를 쓰지 않고 `getExList()`/`getCache()`만 읽었다.
- 이미 만들어진 보드의 그룹 필터는 `arm`, `abs`를 기본으로 넣고 시작했다. 오늘 세션 entry에 `exerciseId`만 있고 `muscleId`가 없으면 등록 운동으로 역조회하지 못해 오늘 부위를 못 찾고, 결과적으로 팔/복부만 남을 수 있었다.
- Discord 감사/아웃박스 기준 `devreq_discord_1516270292027052164`는 push와 배포 검증까지 완료되어 전송 자체의 치명 오류는 보이지 않는다. 다만 그 요청의 범위가 `posterior` 등 운동을 `back`으로 분류하는 수정이어서, 이번 “당일 선택 운동 반영” 경로는 빠져 있었다.

## 실행 Slice 1

- `board-core.js`
  - 세션 entry가 `exerciseId`만 가질 때 등록 운동 리스트와 movement 메타로 성장 보드 그룹을 복원하는 `resolveSessionEntryGroupId()`를 추가한다.
  - `abs_core`도 복부 그룹으로 정규화한다.
- `onboarding.js`
  - 후보 생성 시 오늘 세션 운동을 등록 운동 목록에 병합한다.
  - 오늘 세션 세트 기록을 시작 무게 소스로 병합한다.
  - 첫 진입 시 오늘 선택 운동 후보를 켜고 해당 부위 탭으로 연다.
- `board-render.js`
  - 종목 추가 후보도 오늘 세션을 반영한다.
  - 그룹 필터에서 기본 `arm`/`abs` 강제 포함을 제거한다.
  - 오늘 세션/`maxMeta`가 있으면 DOM class fallback보다 상태값을 우선한다.
- `tests/test-v2.board-core.test.js`
  - 세션 entry가 `exerciseId`만 가져도 등록 운동의 가슴/팔 그룹으로 복원하는 회귀 테스트를 추가한다.
- `sw.js`
  - 정적 자산 변경에 맞춰 `CACHE_VERSION`을 범프한다.

## 검증 계획

- `node --test tests/test-v2.board-core.test.js`
- `node --check workout/test-v2/board-core.js`
- `node --check workout/test-v2/onboarding.js`
- `node --check workout/test-v2/board-render.js`
- `node --check sw.js`
- 로컬 UI 수동 확인: `cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; npm.cmd run dev` 후 운동 탭에서 오늘 운동을 하나 선택하고 성장 보드를 열었을 때 해당 부위/종목이 우선 표시되어야 한다.

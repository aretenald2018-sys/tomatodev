# Max 계획 조정: 소근육 볼륨 단일 트랙 + W1 시작일 직접 입력

## 문제

- 복근, 삼두, 이두는 실제 운영상 볼륨 트랙만 쓰면 되는데 성장판/벤치마크/운동추가 picker가 여전히 볼륨·강도 듀얼 트랙을 전제로 렌더링한다.
- 계획 조정 모달에서 W1 시작일을 직접 수정할 수 없어, 사용자가 사이클 시작 시점을 바꿀 때 저장된 계획과 화면 주차가 어긋날 수 있다.

## 목표

- `bicep`, `tricep`, `abs` 벤치마크는 코어 정규화 단계에서 강도 트랙을 비활성화한다.
- 대시보드, 성장판 미리보기, 계획 조정 모달, 운동추가 picker는 코어의 트랙 활성 상태만 바라본다.
- 계획 조정 모달에서 `W1 시작일`을 날짜 입력으로 수정할 수 있고, 수정 즉시 active week와 계단 그래프가 다시 계산된다.
- 저장 시 `startDate`, 벤치마크 트랙, 기존 gym/weeks/draft 값이 함께 보존된다.

## 실행 슬라이스

### Slice 1: 코어 SSOT 트랙 규칙

- `max-cycle-core`에 볼륨 단일 부위 helper를 추가한다.
- `_trackSpec`, `normalizeMaxCycleTracks`, `buildMaxCycleSnapshot`, `createDefaultMaxCycle`이 같은 규칙을 따른다.
- 검증: 코어 단위 테스트로 복근/삼두/이두의 `H.enabled === false`, active track 강제 `M` 확인.

### Slice 2: 렌더와 picker 반영

- 대시보드/행 토글/매트릭스/성장판 미리보기/계획 조정 모달에서 비활성 강도 트랙을 렌더링하지 않는다.
- 운동추가 picker의 `trackAlternatives`도 활성 트랙만 만든다.
- 검증: HTML 문자열 테스트로 강도 입력/계단이 사라지고 `볼륨 단일` 안내가 보이는지 확인.

### Slice 3: W1 시작일 입력과 저장

- 계획 조정 모달에 `W1 시작일` date input을 추가한다.
- 날짜 변경 시 현재 DOM draft를 보존한 채 모달을 재렌더링해 active week를 즉시 갱신한다.
- 저장 시 `maxCycle.startDate`에 반영한다.
- 검증: date input value와 `--active-week` 렌더 값 테스트.

### Slice 4: 캐시/버전/리뷰

- 변경된 정적 자산의 쿼리스트링과 service worker cache version을 갱신한다.
- `node --check`, 관련 node test, `git diff --check`로 확인한다.
- 리뷰 문서를 작성하고 `NEXT_ACTION`을 갱신한다.

## 리스크와 대응

- 강도 트랙 저장값이 이미 있는 사용자: 코어 정규화에서 소근육 H를 비활성화하되 기존 값은 삭제하지 않아 복구 가능성을 남긴다.
- 모달 재렌더 중 미저장값 유실: 재렌더 전 `_draftMaxPlanEditorCycle()`로 DOM 값을 먼저 읽는다.
- 혼합 부위 사이클: 전체 오늘 트랙은 H가 가능한 벤치마크가 있을 때만 H를 허용하고, 소근육 행은 개별적으로 M에 고정한다.

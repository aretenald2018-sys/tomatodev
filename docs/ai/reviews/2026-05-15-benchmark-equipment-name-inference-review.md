# 벤치마크 기구명 추론 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-05-15-max-plan-benchmark-select-all-registered.md`
- 슬라이스: `Slice 2: 실제 기구명 기반 movement 연결 보정`, `Slice 3: 등록 종목명 기반 movement 연결 보정`, `Slice 4: 같은 부위 머신 후보 확장`
- 변경 파일:
  - `data/data-pure.js`
  - `data.js`
  - `data/data-load.js`
  - `data/data-equipment-pool.js`
  - `workout/expert/max-cycle-core.js`
  - `tests/data.load-save.test.js`
  - `tests/calc.max.test.js`
  - ESM import chain, `sw.js`

## 발견 사항

- Blocker: 없음.
- `movementIds`가 비어 있는 실제 기구는 `inferEquipmentMovementIds()`를 통해 `MOVEMENTS` 이름/id와 연결된다.
- 새 기구 저장 정규화와 기존 기구 벤치마크 후보 생성이 같은 pure helper를 사용한다.
- `머신`/`핀머신` 같은 category alias는 표준 `machine`으로 해석된다.
- 등록 종목의 `movementId`가 없거나 `unknown`이어도 `inferExerciseMovementId()`로 이름 기반 복원이 된다.
- `루마니안 데드리프트`는 더 구체적인 이름 매칭 점수로 `deadlift`가 아니라 `rdl`로 복원된다.
- `파나타 플레이트 하이로우` 같은 등/머신 등록 종목이 있으면 같은 등/머신 movement인 `lat_pulldown`도 후보로 보강된다.
- 명시 `movementIds`가 있는 기구는 저장값을 우선하므로 기존 연결을 이름 추론이 덮어쓰지 않는다.
- 머신 category는 전체 무조건 fallback이 아니라 같은 `primary`와 같은 category로 제한해 후보 폭발을 줄인다.

## 검증

- `node --check data.js` 통과.
- `node --check data/data-load.js` 통과.
- `node --check data/data-pure.js` 통과.
- `node --check workout/expert/max-cycle-core.js` 통과.
- `node --check data/data-equipment-pool.js` 통과.
- `node --test tests/data.load-save.test.js` 통과: 28개 테스트.
- `node --test tests/calc.max.test.js` 통과: 38개 테스트.
- `git diff --check` 통과. LF/CRLF warning만 출력됨.

## 남은 확인

- sandbox 장기 dev server 금지 규칙 때문에 실제 브라우저 UI는 아직 미검증이다.
- 로컬 터미널에서 `npm.cmd run dev` 실행 후 `계획 조정` → `벤치마크 추가` → `운동종목 선택`에서 `랫풀다운` 또는 `파나타 랫풀다운 머신` 기반 후보가 노출되는지 확인한다.

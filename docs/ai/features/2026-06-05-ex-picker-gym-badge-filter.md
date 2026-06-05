# 종목 피커 헬스장 배지 원클릭 필터 전환

## 그릴 결과

- 요청: `종목 선택` 모달에서 각 종목 카드의 `헬스장명 전용 기구` 배지를 한 번 클릭하면 해당 헬스장 범위로 전환되게 한다.
- 화면 근거: 첨부 스크린샷은 Max/벤치마크용 종목 피커이며, `기구 관리` 버튼과 `오늘 벤치마크 ... + 같은 부위 추가 종목 ...` 안내가 표시된다.
- 결정: 배지는 종목 선택 버튼 내부에 있으므로 배지 클릭은 `stopPropagation()`으로 종목 선택을 막고, picker 헬스장 필터만 변경한다.
- 가정: `공통 · 모든 헬스장` 배지는 `공통` 필터로 전환하고, 특정 헬스장 배지는 해당 `gymId` 필터로 전환한다.

## 실행 슬라이스

### Slice 1: 배지 클릭으로 picker gym filter 전환

대상 파일:

- `workout/exercises.js`
- `style.css`
- `sw.js`

작업:

- `_exerciseSourceMeta()`가 배지 클릭용 필터 대상(`global` 또는 `gymId`)을 반환하게 한다.
- `.ex-picker-source` 배지에 `data-gym-filter`, 버튼 역할, 접근성 라벨을 부여한다.
- 종목 카드 렌더 후 배지 클릭/Enter/Space 이벤트를 직접 바인딩해 `window._wtSetPickerGymFilter()`를 호출한다.
- Max/벤치마크용 피커에서도 배지 필터가 유지되도록 렌더 중 `all` 강제 초기화를 제거한다.
- 클릭 가능 상태가 보이도록 스타일을 보강한다.
- `STATIC_ASSETS` 대상 파일 변경에 맞춰 `sw.js`의 `CACHE_VERSION`을 bump한다.

비범위:

- 기구 관리 모달 구조 변경
- 운동 데이터 저장 스키마 변경
- `www/` 산출물 직접 수정

검증:

- `node --check workout/exercises.js`
- `node --test tests/calc.max.test.js`
- 로컬 UI는 사용자가 `npm.cmd run dev` 실행 후 `종목 선택` 모달에서 `헬스장명 전용 기구` 배지를 탭했을 때 필터 배너가 `헬스장: <해당 헬스장>`으로 바뀌고 목록이 해당 헬스장 종목으로 좁혀지면 통과한다.

## 다음 세션 프롬프트

`docs/ai/features/2026-06-05-ex-picker-gym-badge-filter.md`의 Slice 1을 실행하고 리뷰한다.

## 실행 결과

- 상태: 실행 완료
- 변경 파일: `workout/exercises.js`, `style.css`, `sw.js`
- 검증:
  - `node --check workout/exercises.js` 통과
  - `node --test tests/calc.max.test.js` 통과
  - `git diff --check -- workout/exercises.js style.css sw.js docs/ai/features/2026-06-05-ex-picker-gym-badge-filter.md docs/ai/NEXT_ACTION.md` 통과
- 로컬 UI 플로우: Codex 세션에서 장기 dev server를 시작할 수 없어 not verified yet. 사용자가 `npm.cmd run dev` 후 브라우저에서 배지 탭 동작을 확인해야 한다.

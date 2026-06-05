# 종목 피커 헬스장 배지 원클릭 필터 전환 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-05-ex-picker-gym-badge-filter.md`
- 변경 파일: `workout/exercises.js`, `style.css`, `sw.js`, `build-info.json`

## 결과

- 발견 이슈: 없음

## 확인 사항

- `workout/exercises.js`
  - `.ex-picker-source[data-gym-filter]` 클릭과 Enter/Space 입력이 `preventDefault()`와 `stopPropagation()`을 호출해 부모 `.ex-picker-item`의 종목 선택을 트리거하지 않는다.
  - Max/벤치마크 피커 렌더 중 `_pickerGymFilter = 'all'` 강제 초기화를 제거해 배지 클릭 후 해당 헬스장 필터가 유지된다.
  - `wtOpenExercisePicker()`는 전문가 세션의 저장된 `pickerGymFilter`를 유지하고, 필터가 없을 때만 `all`로 시작한다.
- `style.css`
  - 배지의 클릭 가능 상태와 키보드 포커스 상태만 추가했고 레이아웃 크기 변경 위험은 낮다.
- `sw.js`
  - `workout/exercises.js`와 `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION`을 함께 갱신했다.
- `build-info.json`
  - 배포 검증 스크립트가 `sw.js`의 `CACHE_VERSION`과 같은 cacheVersion을 요구하므로 같은 값으로 갱신했다.

## 검증

- `node --check workout/exercises.js` 통과
- `node --test tests/calc.max.test.js` 통과
- `git diff --check -- workout/exercises.js style.css sw.js docs/ai/features/2026-06-05-ex-picker-gym-badge-filter.md docs/ai/NEXT_ACTION.md` 통과

## 남은 리스크

- 로컬 dev server를 Codex 세션에서 시작하지 않는 프로젝트 규칙 때문에 실제 모바일 UI 탭 플로우는 not verified yet이다.

# Dashboard3 테스트모드 운동 UI 일원화 리뷰

## 대상

- 계획: `docs/ai/features/2026-06-24-test-mode-card-render-regression.md`
- 실행 슬라이스: Slice 1 — 운동 기록 화면 테스트모드 렌더 일원화
- 기능 커밋: `bf20b38fc9b33dbe7d06140b25c3f770097d1f67`

## 변경 파일

- `workout/exercises.js`
- `workout/expert.js`
- `tests/workout-test-mode-unified.test.js`
- `tests/workout-card-layout-css.test.js`
- `sw.js`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/features/2026-06-24-test-mode-card-render-regression.md`

## 리뷰 결과

- 발견된 차단 이슈 없음.
- 운동 기록 리스트 렌더는 `ex-block--max-v2` 테스트모드 카드 템플릿으로 고정됐다.
- 운동 추가 피커는 Dashboard3 표면에서 선택 엔트리를 `recommendationMeta.mode = 'max'`와 테스트모드 세트 구조로 정규화한다.
- 레거시 `normal/pro` 모드 전환 함수는 호출되어도 일반/프로 기록 UI를 저장하지 않고 테스트모드 또는 헬스장 기구 설정 경로로만 흐른다.
- `sw.js`의 `CACHE_VERSION`은 `tomatofarm-v20260624z20-test-mode-unified`로 갱신됐다.

## 검증

- PASS: `node --check workout/exercises.js`
- PASS: `node --check workout/expert.js`
- PASS: `node --test tests/workout-test-mode-unified.test.js tests/ex-picker-selection-flow.test.js tests/calc.max.test.js` — 63 pass
- PASS: `node --test tests/*.test.js` — 466 pass
- PASS: `npm.cmd run verify:assets` — `[runtime-assets] ok refs=814`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ bf20b38fc9b33dbe7d06140b25c3f770097d1f67` — `[deploy-verify] ok bf20b38fc9b3 tomatofarm-v20260624z20-test-mode-unified static=210`
- PASS: 배포 자산 직접 확인
  - `workout/exercises.js` HTTP 200
  - `DASHBOARD3_TEST_MODE_UI = true`
  - `ex-block ex-block--max-v2`
  - `function _ensureTestModePickerEntry`
  - `dashboard3-test-mode`
  - `ex-block-header` 미포함
  - `workout/expert.js` HTTP 200
  - `DASHBOARD3_TEST_MODE_ONLY = true`
  - `host.innerHTML = _renderDashboardTestModeEntry()`
  - `wtExcShowProView`에서 `mode: 'pro'` 저장 없음
  - `wtExcSwitchToNormalView`에서 `mode: 'normal'` 저장 없음

## 잔여 리스크

- 배포 페이지 브라우저 검증은 로그인 전 화면에서 앱 모듈이 로드되지 않아 실제 계정의 운동 추가 클릭 흐름까지는 진행하지 않았다. 임의 계정 생성이나 로그인은 외부 데이터 쓰기라 수행하지 않았다.

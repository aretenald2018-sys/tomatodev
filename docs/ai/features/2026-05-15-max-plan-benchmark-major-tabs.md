# Max Plan Benchmark Major Tabs

## 요청

`계획 조정` 모달의 `벤치마크 성장판`에서 부위 카테고리가 일부만 보여 벤치마크를 원하는 부위에 추가하기 어렵다. 현재 사용자가 본 카테고리는 `하체`, `어깨`, `삼두`, `복근`, `가슴`뿐이며, `등`, `이두`, `둔부` 같은 부위도 카테고리로 보여야 한다.

## 진단 결과

- 증상: 벤치마크 성장판의 부위 탭이 현재 사이클에 이미 저장된 벤치마크의 `primaryMajor`만 기준으로 생성된다.
- 원인 후보:
  - 현재 저장된 벤치마크가 없는 부위는 탭 자체가 렌더링되지 않는다.
  - `벤치마크 추가`는 현재 선택한 부위 탭을 고려하지 않고, 전체 후보 중 첫 미사용 종목을 추가한다.
  - 빈 부위 패널이 없어 사용자가 "등 탭을 누르고 등 벤치마크를 추가"하는 흐름이 불가능하다.
- 확인된 핵심 파일: `workout/expert/max-cycle-render.js`, `workout/expert/max.js`.

## 결정

- `벤치마크 성장판` 탭은 `MAJOR_LABEL`에 정의된 전체 큰 부위(`가슴`, `등`, `하체`, `어깨`, `둔부`, `이두`, `삼두`, `복근`)를 항상 보여준다.
- 기존 벤치마크가 없는 부위도 빈 패널을 렌더링한다.
- `벤치마크 추가`는 현재 켜진 부위 탭의 미사용 종목을 우선 추가한다.
- 선택한 부위에 추가 가능한 등록 종목이 없으면 다른 부위 종목을 몰래 추가하지 않고 경고 토스트를 띄운다.

## 실행 슬라이스

### Slice 1: 전체 부위 탭과 선택 부위 추가 흐름

- Status: Implemented in the execution session on 2026-05-15.
- Scope:
  - `renderMaxPlanEditor()`에서 전체 큰 부위 탭과 빈 패널 렌더링.
  - `addMaxBenchmarkEditorRow()`에서 현재 선택된 부위의 후보를 사용.
  - 회귀 테스트 추가.
  - `STATIC_ASSETS` 대상 파일 변경에 따른 `sw.js` `CACHE_VERSION` 범프.
- Likely files:
  - `workout/expert/max-cycle-render.js`
  - `workout/expert/max.js`
  - `workout/expert/max-cycle.js`
  - `workout/expert.js`
  - `app.js`
  - `tests/calc.max.test.js`
  - `sw.js`
- Do not change:
  - Firebase/data save schema.
  - `www/` 산출물.
  - 운동 카탈로그 자체.
  - 계획 조정 모달의 다른 설정/계단 편집 동작.
- Verification:
  - `node --test tests/calc.max.test.js`
  - 사용자 로컬 터미널에서 `npm.cmd run dev` 실행 후 운동 탭에서 `계획 조정` 모달을 열고 `벤치마크 성장판`에 8개 부위 탭이 보이는지 확인.
  - `등` 또는 `이두` 탭을 누른 뒤 `벤치마크 추가`를 눌렀을 때 해당 부위 등록 종목이 추가되는지 확인.

## Review Prompt

Read this plan and the changed files. Review whether the plan editor always renders all major tabs, whether adding a benchmark respects the active major tab without discarding unsaved draft values, whether service-worker cache/query versions were updated for changed static assets, and whether the focused regression test covers the missing-category case.

## Review Result

- Status: Complete on 2026-05-15.
- Review document: `docs/ai/reviews/2026-05-15-max-plan-benchmark-major-tabs-review.md`
- Findings: 없음.
- Automated verification: `node --test tests/calc.max.test.js` 통과, `git diff --check` 통과.
- UI verification: not verified yet. 로컬 dev server에서 `계획 조정` 모달 흐름 확인이 필요하다.

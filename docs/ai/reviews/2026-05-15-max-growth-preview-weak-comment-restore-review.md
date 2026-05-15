# Max Growth Preview Weak Comment Restore Review

## 검토 범위

- Plan: `docs/ai/features/2026-05-15-max-growth-preview-weak-comment-restore.md`
- 변경 대상:
  - `workout/expert/max-same-day-advice.js`
  - `tests/calc.max.test.js`
  - ESM query chain: `index.html`, `app.js`, `workout/expert.js`, `workout/expert/max.js`
  - `sw.js`

## 결과

- Findings: 없음.
- 성장판 미리보기는 `오늘 보강 종목` 추천 패널을 다시 포함하지 않고, 코멘트 블록만 복구했다.
- 동일 부위 최근 2회 기록 기반 코멘트가 우선 적용되고, `comparison.imbalance.weakSubPatterns`는 fallback으로만 사용된다.
- `workout/expert/max-same-day-advice.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION` 범프를 확인했다.
- Slice 2에서 코멘트 전용 CSS를 분리해 pill 강조 스타일을 제거했고, 코멘트 본문에는 `<b>` 태그가 남지 않도록 회귀 테스트를 추가했다.
- `expert-mode.css`가 `STATIC_ASSETS`에 포함되어 있어 CSS query와 `sw.js` `CACHE_VERSION` 범프를 확인했다.
- Slice 3에서 계단 그래프의 큰 파란 주차 배경(`.wt-v4-plan-stair-graph::before`)을 비활성화했고, 기존 W 라벨/실측점 표시만 남겼다.

## 검증

- Passed: `node --check workout/expert/max-same-day-advice.js`
- Passed: `node --check workout/expert/max.js`
- Passed: `node --check app.js`
- Passed: `node --check workout/expert.js`
- Passed: `node --check sw.js`
- Passed: `node --test tests/calc.max.test.js` (39 tests)
- Passed: `node --test tests/data.load-save.test.js` (28 tests)
- Passed: `git diff --check`
- Slice 2 Passed: `node --check workout/expert/max-same-day-advice.js`
- Slice 2 Passed: `node --test tests/calc.max.test.js` (39 tests)
- Slice 2 Passed: `git diff --check`
- Slice 3 Passed: `node --check sw.js`
- Slice 3 Passed: `node --test tests/calc.max.test.js` (39 tests)
- Slice 3 Passed: `git diff --check`

## 잔여 리스크

- 브라우저 UI 플로우는 이 세션에서 장기 dev server를 띄우지 않는 프로젝트 규칙 때문에 아직 직접 exercised 되지 않았다.

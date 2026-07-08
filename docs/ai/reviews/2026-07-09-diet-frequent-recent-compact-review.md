# 식단 자주/최근 음식 추천 compact 개선 리뷰

## 대상

- 계획: `docs/ai/features/2026-07-09-diet-frequent-recent-compact.md`
- Slice: Diet Frequent Recent Compact Slice 1
- 요청: `이때 자주 먹었던 것` 추천 폰트를 더 작게 하고 한 줄에 3개가 들어오게 하며, `최근에 먹은 것`도 위 항목과 중복되지 않게 최대 3개 표시한다.

## 결과

로컬 정적/브라우저 harness 기준 PASS. 운영 Pages 배포 검증은 아직 하지 않았다.

## 변경 확인

1. `workout/render.js`
   - 기존 빈도 추천은 최대 3개와 `groupKey`를 유지한다.
   - `_collectRecentFoodSuggestions(meal, excludedGroupKeys)`를 추가해 같은 끼니의 최근 히스토리에서 최신순으로 최대 3개를 고른다.
   - 최근 추천은 현재 끼니에 이미 추가된 음식과 빈도 추천 `groupKey`를 제외한다.
   - 추천 카드는 `이때 자주 먹었던 것` / `최근에 먹은 것` 두 섹션을 렌더하고, 둘 다 비어 있으면 container를 숨긴다.
   - 두 섹션 모두 기존 `data-action="addFrequentFood"`와 `wtAddFrequentFoodSuggestion()` 저장 경로를 그대로 쓴다.
2. `style.css`
   - `.diet-frequent-food-options`를 `repeat(3, minmax(0, 1fr))` grid로 변경했다.
   - 추천 option 폰트를 `var(--seed-t1)`로 줄이고 내부 name/meta/add layout을 grid로 고정했다.
   - 긴 음식명은 ellipsis 처리되어 360px에서도 한 줄 3개가 유지된다.
3. `tests/diet-frequent-food-suggestions.test.js`
   - 최근 추천 collector, 중복 제외, `최근에 먹은 것` label, 3열 grid, 더 작은 option font 회귀를 고정했다.
4. `sw.js`, `build-info.json`, cache marker tests
   - `CACHE_VERSION`을 `tomatofarm-v20260709z1-diet-recent-compact`로 bump했다.

## 검증

1. PASS RED: `node --test tests/diet-frequent-food-suggestions.test.js`가 구현 전 `recent suggestions should have a dedicated collector`에서 실패했다.
2. PASS: `node --check workout/render.js && node --check sw.js`.
3. PASS: `node --test tests/diet-frequent-food-suggestions.test.js tests/diet-add-button-binding.test.js tests/save-schema.test.js` - 63 tests, 63 pass.
4. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=911`.
5. PASS: `node --test tests/*.test.js` - 756 tests, 756 pass.
6. PASS with CRLF warnings only: `git diff --check`.
7. PASS visual harness:
   - `.omo/evidence/diet-frequent-recent-compact/mobile-390.png`
   - `.omo/evidence/diet-frequent-recent-compact/mobile-360.png`
   - `.omo/evidence/diet-frequent-recent-compact/mobile-390.json`
   - `.omo/evidence/diet-frequent-recent-compact/mobile-360.json`
   - 390px/360px 모두 각 섹션 `count: 3`, `sameRow: true`, `overflowX: false`.

## 제한 / not verified yet

1. LSP diagnostics는 TypeScript LSP가 설치되어 있지 않아 실행하지 못했다. 도구 응답: `LSP server 'typescript' ... is NOT INSTALLED; user previously declined installation`.
2. `/visual-qa`의 독립 subagent 2-pass는 이 세션의 `multi_agent_v1.spawn_agent` 제한(사용자가 명시적으로 subagent를 요청한 경우만 허용) 때문에 실행하지 않았다. 대신 Puppeteer screenshot/metrics evidence를 남겼다.
3. 운영 URL `https://aretenald2018-sys.github.io/tomatofarm/` 배포 검증은 아직 하지 않았다. 현재 worktree에 이 요청과 무관한 대량 미커밋 변경이 있어, 이번 slice만 안전하게 commit/push/deploy하지 않았다.

## 리뷰 결론

로컬 코드와 component-level visual evidence 기준 요청 동작은 충족한다. 최종 사용자-facing 완료 판정은 관련 변경만 안전하게 commit/push한 뒤 production Pages에서 식단 탭 flow를 확인해야 한다.

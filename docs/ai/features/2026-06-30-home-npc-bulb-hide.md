# 미란다/상담실장 전구 표시 숨김

## 요청

홈 라이프존에서 미란다와 상담실장의 전구 표시를 일단 뜨지 않게 한다.

## 적용 워크플로

- `docs/ai/WORKFLOW.md`: 요청이 UX/코드 변경이므로 계획 -> 실행 -> 리뷰 순서로 진행한다.
- `docs/ai/NPC_ASSET_WORKFLOW.md`: NPC 전구 상호작용 수정에 해당하므로 체크리스트를 확인한다.

## NPC 체크리스트 답변

1. 홈 위치: 미란다는 패션 코너 근처 `left: 302`, `top: 1392`, 상담실장은 우측 하단 상담 공간 `left: 1338`, `top: 1260` 기준 위치다.
2. 겹침 여부: 이번 변경은 좌표/크기 변경이 아니므로 가구, 운동기구, 트랙, 캐릭터 겹침 상태를 바꾸지 않는다.
3. 홈/모달 아트에셋: 새로 만들지 않는다. 기존 `miranda-npc-home.png`, `consulting-chief-npc-home.png`, 모달 PNG를 그대로 둔다.
4. NPC 전용 공간/소품 overlay: 새 overlay가 필요 없다.
5. 시선/자세: 자산과 위치를 변경하지 않아 기존 원근을 유지한다.
6. 크기 기준: 미란다 `clamp(26px, calc(78 / 1672 * 100%), 36px)`, 상담실장 `clamp(18px, calc(56 / 1672 * 100%), 28px)`을 유지한다.
7. 이름표와 전구 DOM: 이름표와 버튼 DOM은 유지하고, 미란다/상담실장 전구만 CSS로 표시하지 않는다. 트레이너 전구는 유지한다.
8. 새 PNG/JS/CSS의 `STATIC_ASSETS`: 새 PNG는 없다. `style.css`는 `STATIC_ASSETS`에 포함된다.
9. `CACHE_VERSION` bump: `style.css` 변경이 있으므로 `sw.js` cache version을 bump한다.
10. 배포 완료 증거: `https://aretenald2018-sys.github.io/dashboard3/`에서 최종 커밋과 새 cache version이 확인되고, 원격 `style.css` marker가 확인되어야 한다.

## Slice 1 — 미란다/상담실장 전구만 숨김

### 포함

- `style.css`에서 `.lz-miranda-npc .lz-npc-bulb`, `.lz-consulting-chief-npc .lz-npc-bulb`를 `display: none` 처리한다.
- 트레이너 전구와 이름표, 미란다/상담실장 클릭 이벤트, 모달 진입은 그대로 유지한다.
- 관련 회귀 테스트를 추가/갱신한다.
- `sw.js` `CACHE_VERSION`을 bump한다.
- Dashboard3 Pages(`origin/main`)에만 배포한다.

### 제외

- NPC 자산 생성/교체.
- 미란다/상담실장 좌표, 크기, 이름표 위치 조정.
- 트레이너 전구 변경.
- 모달 내용/이벤트 변경.
- `www/` 직접 수정.
- `tomatofarm` remote 배포.

## 예상 변경 파일

- `style.css`
- `sw.js`
- `tests/home-life-zone-npc-quest.test.js`
- `tests/miranda-quest-modal.test.js`
- `tests/consulting-chief-quest-modal.test.js`
- `tests/*`의 cache marker 기대값
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/reviews/2026-06-30-home-npc-bulb-hide-review.md`

## 검증 계획

- `node --check sw.js`
- `node --test tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js tests/consulting-chief-quest-modal.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test --test-reporter=dot tests/*.test.js`
- `git diff --check`
- 커밋 후 `git push origin main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL marker 확인:
  - `style.css`의 `.lz-miranda-npc .lz-npc-bulb`
  - `style.css`의 `.lz-consulting-chief-npc .lz-npc-bulb`
  - `style.css`의 `display: none`
  - `sw.js`의 새 cache version

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-home-npc-bulb-hide.md` Slice 1을 실행한다.

## 실행 결과

- `style.css`에 `.lz-miranda-npc .lz-npc-bulb`, `.lz-consulting-chief-npc .lz-npc-bulb` 전용 `display: none` 규칙을 추가했다.
- 미란다/상담실장 버튼, 이름표, `life-zone:npc-quest` 이벤트, 모달 진입 경로는 그대로 유지했다.
- 트레이너 전구 규칙은 변경하지 않았다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z03-home-npc-bulb-hide`로 bump하고 cache marker 테스트 기대값을 갱신했다.
- `tests/home-life-zone-npc-quest.test.js`, `tests/miranda-quest-modal.test.js`, `tests/consulting-chief-quest-modal.test.js`에 미란다/상담실장 전구 숨김 marker를 추가했다.

검증:

- PASS: `node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js tests/consulting-chief-quest-modal.test.js tests/trainer-quest-modal.test.js` — 24 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: Dashboard3 Pages 배포 검증 — `6eca291ca93f`, `tomatofarm-v20260630z03-home-npc-bulb-hide`
- PASS: Dashboard3 Pages marker 검증 — `style.css`의 `.lz-miranda-npc .lz-npc-bulb`, `.lz-consulting-chief-npc .lz-npc-bulb`, `display: none`, `sw.js`의 cache version 확인
- not verified yet: 인증 계정 실제 홈 라이프존 화면에서 미란다/상담실장 전구가 사라진 상태 확인이 남아 있다.

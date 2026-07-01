# 홈 라이프존 발밑 이름표 정리

## 상태

- 상태: `complete`
- 요청일: 2026-07-01
- 트리거: `/diagnose` - 홈 라이프존 UI가 캐릭터 이름을 하단 상태칩으로 중복 표시하고, 씬 안 이름표가 캐릭터 발밑에 붙지 않는 문제
- 적용 문서: `docs/ai/NPC_ASSET_WORKFLOW.md`

## 요청

첨부 이미지에서 X 표시된 라이프존 카드 하단 캐릭터 상태칩을 삭제한다. 캐릭터 닉네임은 씬 안에서 각 캐릭터 하단부, 즉 발 밑에 배치하되 캐릭터 이미지를 가리지 않게 한다.

## 진단

1. 하단 X 표시 영역은 `home/life-zone.js`의 `<div class="lz-status-row" data-lz-status>`와 `_renderStatus()`가 만드는 `.lz-status-chip`이다.
2. actor 이름표는 이미 DOM 텍스트로 렌더되지만 `_applyActorNameplatePosition()`이 `slot.labelY || slot.y - 6`을 사용해 일부 상태에서 캐릭터 위쪽에 놓인다.
3. 스프라이트 PNG와 러닝 pseudo sprite는 pose마다 세로 비율이 달라서 좌표 비율을 하드코딩하면 다시 겹칠 수 있다. actor 요소 내부에 이름표를 넣고 CSS `top: 100%`로 발밑에 붙이는 편이 더 안정적이다.
4. `style.css`와 `home/life-zone.js`는 `sw.js` `STATIC_ASSETS` 대상이므로 앱 코드 변경 시 `CACHE_VERSION` bump가 필요하다.

## NPC 체크리스트 답

1. 홈 위치: 기존 `1672x1672` 라이프존 좌표계의 actor slot 위치를 유지한다.
2. 겹침: 이름표를 actor 요소 내부 absolute child로 렌더하고 `top: 100%` 기준으로 캐릭터 발 아래에 둔다.
3. 아트 산출물: 새 NPC/스프라이트/모달 아트는 만들지 않는다.
4. 공간 overlay: 기존 방, 러닝트랙, 미란다 코너, NPC overlay를 유지한다.
5. 시선/자세: 기존 스프라이트와 원근을 유지한다.
6. 크기 기준: actor sprite width 기준으로 기존 slot 폭을 유지하고, 이름표는 기존 `9px`/모바일 `8px` 작은 픽셀 텍스트를 유지한다.
7. 이름표와 전구: 이름표는 이미지가 아니라 DOM `.lz-nameplate--actor` 텍스트로 유지한다.
8. 새 PNG/JS/CSS: PNG 추가 없음. `home/life-zone.js`, `style.css`, `sw.js`, 관련 테스트만 변경한다.
9. 캐시: `home/life-zone.js`, `style.css`가 `STATIC_ASSETS`에 포함되므로 `CACHE_VERSION`을 bump한다.
10. 배포 증거: Dashboard3 Pages URL에서 최신 commit/assets가 확인되고, 홈 라이프존에서 하단 상태칩 없이 각 캐릭터 닉네임이 발밑에 보이면 완료다.

## Slice 1 - 상태칩 제거와 발밑 이름표

### 구현

1. `home/life-zone.js`
   - `_renderStatus()`를 동기 텍스트 갱신 전용으로 축소한다.
   - 카드 HTML에서 `lz-status-row`를 제거한다.
   - actor 이름표를 actor layer의 독립 sibling이 아니라 actor 요소 내부에 append한다.
2. `style.css`
   - `.lz-nameplate--actor`를 `left: 50%`, `top: 100%`, `transform: translate(-50%, 2px)`로 배치한다.
   - 불필요한 `.lz-status-row`, `.lz-status-chip`, `.lz-status-dot` 스타일을 제거한다.
3. `tests/home-life-zone-npc-quest.test.js`
   - actor 이름표 테스트를 발밑 좌표 기준으로 갱신한다.
   - `lz-status-row`/`lz-status-chip`이 카드에서 렌더되지 않는 회귀 테스트를 추가한다.
4. `sw.js`
   - `CACHE_VERSION`을 새 marker로 bump한다.

### 제외

- 캐릭터/NPC 스프라이트 재생성
- NPC 퀘스트 버튼/전구/모달 동작 변경
- 라이프존 actor 상태 판정 변경
- 칼로리/체중 summary strip 제거

## 검증

1. `node --check home/life-zone.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
6. UI flow: 홈 탭 라이프존에서 캐릭터 하단 상태칩이 없고, 줍스/문정토마토/이재헌 닉네임이 각 캐릭터 발밑에 보이며 캐릭터 본체를 가리지 않는다.

## 실행 결과

1. `home/life-zone.js`에서 `lz-status-row`와 `.lz-status-chip` 렌더링을 제거했다.
2. `_renderStatus()`는 상단 sync 문구만 갱신하도록 축소했다.
3. actor 이름표를 actor layer sibling이 아니라 각 `.lz-actor` 내부 child로 이동했다.
4. `style.css`에서 `.lz-nameplate--actor`를 `top: 100%`와 `--lz-name-gap` 기준으로 발밑 배치하고, `.lz-actor` overflow를 visible로 명시했다.
5. 더 이상 쓰지 않는 `.lz-status-row`, `.lz-status-chip`, `.lz-status-dot` 스타일을 삭제했다.
6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260701z1-life-zone-foot-nameplates`로 bump했고, 관련 cache marker 테스트를 갱신했다.
7. 리뷰: `docs/ai/reviews/2026-07-01-home-life-zone-foot-nameplates-review.md`

## 검증 결과

1. PASS: `node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` - 29 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=858`
4. PASS: `git diff --check`
5. PASS: `node --test --test-reporter=dot tests/*.test.js`
6. not verified yet: Dashboard3 Pages 배포 검증은 아직 실행하지 않았다.
7. not verified yet: 인증 세션이 없어 실제 홈 탭 라이프존 UI flow는 브라우저에서 직접 확인하지 못했다.

## 다음 실행 지시

없음. Slice 1 구현과 리뷰까지 완료했다.

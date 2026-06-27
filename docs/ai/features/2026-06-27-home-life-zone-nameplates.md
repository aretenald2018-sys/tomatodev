# 홈 라이프존 캐릭터/NPC 이름표

## 요청

홈화면 라이프존에 렌더링되는 캐릭터들과 NPC 이름을 첨부 이미지처럼 캐릭터 하단에 붙인다. 단, 현재 화면 밀도에 맞게 폰트 크기는 첨부 이미지보다 작게 한다.

## 그릴 결과

핵심 판단:

- 이름표는 상태칩이나 말풍선이 아니라, 씬 안에서 스프라이트 발밑에 붙는 장식 텍스트여야 한다.
- 배경 pill/card를 만들지 않는다. 첨부 이미지처럼 흰 글자와 어두운 외곽선/그림자로 픽셀 씬 위에 직접 올라가야 한다.
- 캐릭터 이름은 흰색, NPC 이름은 노란색 계열로 구분한다.
- 말풍선은 기존처럼 머리 위 상태 안내로 유지하고, 이름표는 항상 발밑에 작게 유지한다.
- actor layer는 이미 `aria-hidden="true"`이고 상태 row에 이름 정보가 따로 있으므로, 씬 이름표는 접근성 중복을 만들지 않는 장식 요소로 유지한다.

## 설계 결정

- `home/life-zone.js`의 `_renderActors()`에서 actor image를 append한 뒤 `span.lz-nameplate.lz-nameplate--actor`를 추가한다.
- label text는 `actor.displayName`을 `textContent`로 넣어 HTML 삽입 없이 렌더한다.
- 이름표 좌표는 slot 기준으로 계산한다.
  - x: `slot.x + slot.width * 0.5`
  - y: `slot.labelY || slot.y + slot.width * 0.98`
  - z-index: actor보다 조금 위, speech보다 낮게 둔다.
- NPC button 안에는 `span.lz-nameplate.lz-nameplate--npc`를 추가한다.
  - 보이는 이름은 첨부 이미지 기준으로 `브루스`를 기본값으로 한다.
  - 이벤트 계약은 그대로 `detail: { npc: 'trainer' }`를 유지한다.
  - label은 `pointer-events: none`으로 두어 NPC button click 영역을 방해하지 않는다.
- `style.css`에는 `.lz-nameplate` 공통 스타일을 추가한다.
  - `font-size: 9px`, mobile `8px`
  - `line-height: 1.05`
  - `font-weight: 800`
  - `letter-spacing: 0`
  - `white-space: nowrap`
  - `text-shadow` 다중 레이어로 어두운 외곽선 효과
  - `background`/`border-radius` 없음
- 긴 이름은 씬 밖으로 밀리지 않도록 `max-width`와 `text-overflow: ellipsis`를 둔다.

## 실행 Slice 1 — Life Zone Nameplates

대상 파일:

- `home/life-zone.js`
- `style.css`
- `tests/home-life-zone-npc-quest.test.js`
- 새 테스트가 필요하면 `tests/home-life-zone-nameplate.test.js`
- `sw.js`
- cache-version 참조 테스트들

구현:

- `_renderActors()`에 actor 이름표 DOM을 추가한다.
- NPC quest button에 NPC 이름표를 추가한다.
- 캐릭터/NPC 이름표 CSS를 추가한다.
- `style.css`와 `home/life-zone.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.
- 기존 NPC click 이벤트와 `life-zone:npc-quest` detail은 변경하지 않는다.

범위 밖:

- 캐릭터 슬롯/스프라이트 자산 변경
- NPC 퀘스트 모달 구현
- status row 제거
- life-zone 상태 판정 로직 변경

검증:

- `node --check home/life-zone.js sw.js`
- `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js`
- `node --test tests/*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- UI flow: 홈 탭 라이프존에서 각 캐릭터 발밑에 작은 흰 이름표가 보이고, NPC bubble 아래에 작은 노란 `브루스` 이름표가 보이며, NPC 클릭은 기존처럼 `life-zone:npc-quest`를 발생시킨다.

## 다음 실행 지시

다음 세션은 Slice 1만 실행한다. 변경 범위는 `home/life-zone.js`, `style.css`, 관련 home life-zone 테스트, `sw.js`, cache-version 참조 테스트로 제한한다. `www/`는 수정하지 않는다.

# 홈 라이프존 트레이너 퀘스트 전구 위치 수정

## 상태

- 상태: Slice 1 구현 및 리뷰 완료
- 요청: 홈 라이프존에서 퀘스트 아이콘이 트레이너 얼굴을 가리지 않게 수정
- 자동 트리거: `/diagnose` 우선 적용

## 진단

첨부 화면 기준 트레이너 전구 버튼은 `style.css`의 `.lz-npc-quest`에서 `left: 1084`, `top: 824`, `width: 168 기준`으로 배치된다. 버튼 내부는 이름표가 위, 전구가 아래인 column 구조라 모바일 축소 상태에서 전구가 트레이너 얼굴 바로 위에 놓인다.

반증 가능한 원인 가설:

1. `.lz-npc-quest`의 `top: 824`가 얼굴 중심과 너무 가깝다.
2. `.lz-npc-bulb`가 trainer 전용 offset 없이 중앙 정렬되어 얼굴을 덮는다.
3. 버튼 폭이 좁아 전구를 얼굴 옆으로 분리할 여유가 없다.
4. z-index 문제가 아니라 실제 시각 좌표가 얼굴과 겹친다.

우선순위: 1, 2, 3을 CSS로 함께 보정한다. z-index 변경은 하지 않는다.

## NPC_ASSET_WORKFLOW 체크리스트

1. 이 NPC의 홈 위치는 기존 방의 어느 좌표/공간인가?
   - 트레이너는 기존 베이스룸 우하단 카운터 뒤 고정 이미지 영역이며, 퀘스트 버튼은 현재 `x=1084`, `y=824` 주변에 있다.
2. 같은 공간에 있는 가구, 운동기구, 트랙, 캐릭터와 겹치는가?
   - 현재 전구가 트레이너 얼굴을 가린다. 수정 후 전구는 얼굴 우상단으로 분리하고 카운터/캐릭터와의 시각 겹침을 줄인다.
3. 홈 배치용 스프라이트와 모달용 아트에셋을 각각 만들었는가?
   - 새 자산을 만들지 않는다. 기존 `npc-quest-bubble.png`와 기존 모달 자산을 유지한다.
4. NPC 전용 공간/소품 overlay가 필요한가?
   - 필요 없다.
5. 캐릭터 시선과 자세가 홈탭 원근과 맞는가?
   - 기존 베이스룸 트레이너 위치를 유지하고 UI 전구만 오프셋한다.
6. 기존 NPC/actor와 비교한 스프라이트 크기 기준은 무엇인가?
   - 전구는 기존 `192x258` 자산을 `aspect-ratio: 192 / 150`으로 잘라 쓰는 현재 기준을 유지한다. 버튼 폭만 `168 기준`에서 약간 확장한다.
7. 이름표와 전구가 이미지가 아니라 DOM 구조로 들어가는가?
   - 기존 DOM 구조를 유지한다.
8. 새 PNG/JS/CSS가 `sw.js` `STATIC_ASSETS`에 포함되는가?
   - `style.css`는 `STATIC_ASSETS`에 포함된다.
9. `CACHE_VERSION` bump가 필요한가?
   - 필요하다.
10. 배포 후 어떤 URL, 어떤 UI 상태, 어떤 HTTP 상태가 완료 증거인가?
   - `https://aretenald2018-sys.github.io/dashboard3/` 배포 URL에서 새 `style.css`와 `sw.js`가 HTTP 200으로 내려오고, 캐시 버전 및 trainer bubble offset marker가 반영되어야 한다. 인증 세션 없이는 실제 홈 화면 UI flow는 `not verified yet`으로 기록한다.

## Slice 1

목표: 트레이너 퀘스트 전구가 얼굴 중앙을 덮지 않도록 전구를 얼굴 우상단으로 분리한다.

수정 파일:

- `style.css`
- `tests/home-life-zone-npc-quest.test.js`
- `sw.js`
- `docs/ai/NEXT_ACTION.md`
- 리뷰 문서: `docs/ai/reviews/2026-06-29-home-life-zone-trainer-quest-bubble-offset-review.md`

구현:

1. `.lz-npc-quest`의 vertical anchor를 위로 올리고 버튼 폭을 소폭 넓힌다.
2. `.lz-npc-quest--trainer .lz-npc-bulb`에 trainer 전용 `--lz-bulb-x`, `--lz-bulb-y`를 추가해 전구를 우상단으로 이동한다.
3. 기존 미란다 전구와 NPC modal 이벤트 구조는 변경하지 않는다.
4. `style.css`가 `STATIC_ASSETS`에 포함되므로 `sw.js` `CACHE_VERSION`을 bump한다.

제외:

- 새 NPC/전구 PNG 생성
- 트레이너 모달 UX 변경
- 라이프존 actor 상태/좌표 변경
- `www/` 직접 수정

검증:

1. `node --check home/life-zone.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/trainer-quest-modal.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
6. 배포 URL에서 `style.css` marker와 `sw.js` cache marker HTTP 200 확인

## 실행 결과

1. `.lz-npc-quest`의 `top`을 `824`에서 `792`로 올렸다.
2. `.lz-npc-quest`의 폭 기준을 `168`에서 `188`로 넓혔다.
3. `.lz-npc-quest--trainer .lz-npc-bulb`에 `--lz-bulb-x: 62%`, `--lz-bulb-y: -72%`를 추가했다.
4. `.lz-npc-bulb` 기본 `transform`을 CSS 변수 기반으로 지정해 reduced motion에서도 offset이 유지되게 했다.
5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z27-trainer-quest-bubble-offset`으로 bump했다.
6. 관련 회귀 테스트와 공통 cache marker 테스트를 갱신했다.

검증:

- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/trainer-quest-modal.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test tests/*.test.js`
- PASS: `git diff --check`
- PASS: Dashboard3 Pages 배포 검증 — `tomatofarm-v20260629z27-trainer-quest-bubble-offset` 확인
- PASS: Dashboard3 Pages marker 검증 — `style.css`의 trainer 전구 offset과 `sw.js` 캐시 버전 확인
- not verified yet: 인증 세션이 없어 실제 배포 홈 화면의 트레이너 얼굴 겹침은 직접 시각 확인하지 못했다.

## 다음 세션 시작 프롬프트

Dashboard3 Pages 배포 검증을 완료하고 사용자에게 URL과 확인 기준을 전달한다.

# 홈 라이프존 오버레이 정렬 보정

## 상태

- 상태: `complete`
- 요청일: 2026-06-29
- 트리거: `/diagnose` — 홈탭 NPC/러닝/지도 UI 깨짐
- 적용 문서: `docs/ai/NPC_ASSET_WORKFLOW.md`

## 사용자 지적

1. 트레이너 전구표시가 정수리 위가 아니다.
2. 미란다 이름표가 미란다 위에 맞지 않고, 미란다 전구가 트레이너 전구와 크기가 다르다.
3. 트랙 위를 도는 러닝 캐릭터가 원근법에 맞지 않고 너무 작다.
4. 홈탭 러닝 지도 말풍선 표기가 이상하다.

## 진단

1. 트레이너 전구 버튼은 원본 방 기준 `left:1118`, `top:716`에 있어, 실제 트레이너 머리 중심인 대략 x=1080, 머리 위 y=890보다 지나치게 위쪽에 떠 있다.
2. 미란다 전구는 `.lz-miranda-npc .lz-npc-bulb { width:34% }`라 트레이너 전구의 절반 이하로 보인다. 또한 공통 전구 애니메이션이 `transform`을 덮어써 absolute 위치 보정이 흔들릴 수 있다.
3. 미란다 이름표는 캐릭터 발 아래에 붙어 있어 NPC 이름표가 캐릭터 위/머리 근처에 있는 기존 문법과 다르게 보인다.
4. 러닝 슬롯 3개가 모두 `width:92`라 트랙 하단 가까운 인물도 작고, 앞/뒤 원근 차이가 없다.
5. 홈 지도 말풍선은 작은 크기 안에서 `VWorld` attribution이 노출되어 지도 내용보다 표기 자체가 눈에 띈다.

## NPC 체크리스트 답

1. 위치: 트레이너는 기존 데스크 뒤 트레이너 머리 위, 미란다는 좌측 하단 패션 코너, 러닝 캐릭터는 기존 홈 러닝트랙 하단/중단 lane 위다.
2. 겹침: 트레이너 전구는 머리 위로 내리고, 미란다 전구/이름표는 패션 코너 내부에서 캐릭터 머리 위로 올린다. 러닝 캐릭터는 트랙 하단 lane 위에 발 위치를 유지한다.
3. 아트 산출물: 새 NPC는 아니므로 신규 imagegen 자산은 만들지 않는다.
4. 공간 overlay: 기존 `miranda-fashion-corner.png`를 유지한다.
5. 시선/자세: 기존 홈 스프라이트를 유지하고 CSS 좌표만 보정한다.
6. 크기 기준: 트레이너/미란다 전구는 동일한 원본 좌표계 폭 약 84px로 맞춘다. 러닝 캐릭터는 가까운 하단 인물이 더 크고, 뒤쪽 인물이 조금 작게 보이도록 슬롯 width를 차등화한다.
7. 이름표/전구: 이미지가 아니라 DOM/CSS로 유지한다.
8. 캐시: `style.css`, `home/life-zone.js`, `home/life-zone-state.js`는 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 bump한다.
9. 검증: 관련 테스트와 전체 테스트, runtime asset, Dashboard3 배포 검증을 수행한다.

## Slice 1 범위

### 구현

1. `.lz-npc-bulb` 애니메이션이 absolute 위치 transform을 덮어쓰지 않도록 CSS custom property 기반 transform으로 바꾼다.
2. 트레이너 전구 버튼 좌표를 실제 트레이너 정수리 위로 내리고 좌측 보정한다.
3. 미란다 전구를 트레이너 전구와 같은 시각 크기로 키우고, 이름표를 캐릭터 머리 위에 배치한다.
4. 러닝 슬롯 width/y/labelY/bubbleY를 원근 기준으로 조정한다.
5. 홈 지도 말풍선에서 작은 화면에 불필요하게 보이는 `VWorld` attribution을 제거하고, 실제 지도/점/경로 중심으로 보이게 한다.
6. `sw.js` cache version과 관련 테스트를 갱신한다.

### 제외

- 새 NPC/캐릭터 이미지 생성
- 미란다 패션 코너 자산 재생성
- 러닝 상세 지도 화면 구조 변경
- 인증 세션이 필요한 실제 사용자 데이터 수정

## 실행 결과

1. 트레이너 전구 버튼을 `1672x1672` 홈 좌표계에서 실제 트레이너 정수리 위로 내렸다.
2. 미란다 전구는 트레이너 전구와 같은 원본 비율을 쓰도록 CSS 변수를 적용했고, 애니메이션이 절대 위치 보정 `transform`을 덮어쓰지 않게 했다.
3. 미란다 이름표를 캐릭터 발 아래가 아니라 캐릭터 위로 이동했다.
4. 러닝 actor 슬롯을 하단 트랙 위로 재배치하고, 중앙/좌측/우측 순서로 원근 스케일 차이를 줬다.
5. 홈 러닝 지도 말풍선은 실제 타일/경로/현재점/동 단위 라벨을 유지하되, 작은 말풍선에서 `VWorld` 표기가 지도 내용을 가리는 문제를 막기 위해 attribution을 숨겼다.
6. `sw.js` 캐시 버전을 `tomatofarm-v20260629z14-life-zone-alignment`로 갱신했다.

## 검증

1. PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/miranda-quest-modal.test.js tests/running-entry.test.js` — 41 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=859`
4. PASS: `node --test tests/*.test.js` — 603 tests passed
5. PASS: `git diff --check`
6. PASS 예정: Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행 프롬프트

없음. Slice 1 완료.

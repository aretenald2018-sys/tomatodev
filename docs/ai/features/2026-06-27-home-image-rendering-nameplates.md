# 홈 이미지 렌더링 이름표 정리

## 요청

홈화면 라이프존 이미지 렌더링 범위에서만 아래를 변경한다.

1. 닉네임이 캐릭터 체형을 가리지 않게 조정한다.
2. 브루스 캐릭터 위의 `NPC` 카드/말풍선 느낌을 제거한다.
3. 브루스의 표시 이름을 `트레이너`로 바꾼다.

## 브랜치/격리

- 작업 브랜치: `codex/home-image-rendering-nameplates`
- 이 브랜치에서는 홈 라이프존 이미지 렌더링 파일만 수정한다.
- 운동 관련 파일(`workout/`, `render-calendar.js`, 운동 테스트)은 수정하지 않는다.
- `www/`는 빌드 산출물이므로 직접 수정하지 않는다.

## 그릴 결과

핵심 판단:

- 사용자가 원하는 것은 동작 변경이 아니라 홈 라이프존 씬 위의 표시 레이어 조정이다.
- 캐릭터 닉네임은 스프라이트 위/몸통이 아니라 발 아래나 하단 여백 쪽으로 내려야 한다.
- 기존 NPC 퀘스트 click 계약은 `detail: { npc: 'trainer' }`로 이미 내부 의미가 맞으므로 유지한다.
- 보이는 텍스트만 `브루스`에서 `트레이너`로 바꾼다.
- `NPC`로 보이는 카드/버블 이미지는 제거 대상이다. 버튼/이벤트 훅은 유지하되, 씬 안에는 트레이너 이름표만 남긴다.
- `home/life-zone.js`와 `style.css`는 `sw.js` `STATIC_ASSETS`에 포함되어 있으므로 수정 시 `CACHE_VERSION`을 함께 올린다.

## 실행 Slice 1 — Life Zone Nameplate Cleanup

대상 파일:

- `home/life-zone.js`
- `style.css`
- `tests/home-life-zone-npc-quest.test.js`
- `sw.js`
- 필요 시 cache-version 참조 테스트

구현:

- actor 이름표 y 좌표를 기존보다 아래로 내려 스프라이트 몸통과 겹치지 않게 한다.
- NPC quest button에서 `npc-quest-bubble.png` 이미지를 렌더하지 않는다.
- 표시 이름 상수를 `트레이너`로 바꾼다.
- NPC button 접근성 문구/title도 보이는 명칭에 맞춰 `트레이너` 기준으로 정리한다.
- NPC click 이벤트와 `life-zone:npc-quest` detail은 변경하지 않는다.
- 관련 회귀 테스트를 새 DOM/CSS 계약에 맞게 갱신한다.
- `sw.js` `CACHE_VERSION`을 bump한다.

범위 밖:

- 운동 탭/운동 데이터/캘린더 변경
- 캐릭터 스프라이트 이미지 생성 또는 교체
- NPC 퀘스트 모달 구현
- 라이프존 활동 판정 로직 변경
- status row, summary strip, diet/weight action 변경

검증:

- `node --check home/life-zone.js; node --check sw.js`
- `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js`
- `node --test tests/*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 마커 확인: `sw.js` cache marker, `home/life-zone.js`의 `LIFE_ZONE_NPC_NAME = '트레이너'`, bubble 이미지 제거, `style.css` 이름표 위치 조정
- UI flow: 홈 탭 라이프존에서 캐릭터 닉네임이 몸통을 가리지 않고, 브루스 위치에는 `NPC` 카드 없이 `트레이너` 이름만 보인다.

## 다음 실행 지시

다음 세션은 Slice 1만 실행한다. 변경 범위는 `home/life-zone.js`, `style.css`, `tests/home-life-zone-npc-quest.test.js`, `sw.js`, 필요한 cache-version 참조 테스트로 제한한다. `workout/`, `render-calendar.js`, `www/`는 수정하지 않는다.

## 실행 결과

- `2026-06-27`: Slice 1 완료.
- `home/life-zone.js`에서 표시 이름을 `트레이너`로 바꾸고, 기존 `npc-quest-bubble.png` 렌더링을 제거했다.
- NPC click 이벤트 계약 `life-zone:npc-quest`와 `detail: { npc: 'trainer' }`는 유지했다.
- actor 이름표는 스프라이트 실제 비율 기반 높이 아래에 렌더되도록 `_getActorSpriteHeight()`와 `LIFE_ZONE_SPRITE_HEIGHT_RATIO`를 추가했다.
- `style.css`에서 actor 이름표 기준점을 중앙이 아니라 top 기준으로 바꿔 몸통을 가리지 않게 했다.
- NPC 버튼은 투명 텍스트 버튼으로 유지하고, `.lz-nameplate--npc`가 직접 클릭 영역 크기를 만들도록 정리했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z6-home-nameplate-cleanup`으로 bump하고, 사용하지 않는 `npc-quest-bubble.png` precache 항목을 제거했다.
- cache-version 참조 테스트는 새 cache marker로만 갱신했다. 운동 앱 코드 파일은 수정하지 않았다.

검증:

- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 18 tests passed
- PASS: `node --test tests/*.test.js` — 552 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=834`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 검증은 커밋 후 실행 필요
- not verified yet: 인증 계정 홈 탭의 실제 라이프존 UI flow는 배포 URL에서 직접 확인 필요

## 리뷰 결과

- 리뷰 문서: `docs/ai/reviews/2026-06-27-home-image-rendering-nameplates-review.md`
- 결과: blocking issue 없음.

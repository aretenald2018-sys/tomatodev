# 라이프존 NPC 퀘스트 말풍선 계획

## 상태

- 상태: `reviewed`
- 요청일: 2026-06-25
- 범위: 홈 라이프존의 헬스 트레이너 위 클릭 가능한 NPC 말풍선 스프라이트 추가

## 요청 요약

사용자 제공 픽셀아트 참고 이미지처럼 전구 모양 말풍선과 하단 이름표를 가진 스프라이트를 만들고, 이름은 `NPC`로 표시한다. 이 스프라이트는 확장 라이프존 배경의 헬스 트레이너 위에 표시되어야 하며, 향후 퀘스트 모달을 열 수 있도록 클릭 가능한 요소여야 한다. 퀘스트 모달 구현은 이번 범위에서 제외한다. 배포 대상은 개발계 Dashboard3(`origin`)만 해당하며 운영계 `tomatofarm` 원격은 사용하지 않는다.

## 결정

- 새 스프라이트는 actor sprite 검증 대상과 분리하기 위해 `assets/home/life-zone/ui/npc-quest-bubble.png`에 저장한다.
- 텍스트 `NPC`는 이미지 생성 결과에 의존하지 않고 최종 PNG에서 직접 보정해 정확도를 보장한다.
- 클릭 요소는 `button[data-lz-action="npc-quest"]`로 렌더하고, 지금은 `life-zone:npc-quest` custom event만 발생시켜 추후 퀘스트 모달이 연결될 수 있게 한다.
- 기존 `data-lz-action="diet"`/`weight"` 직접 바인딩 패턴을 따른다.

## 실행 Slice 1

1. 참고 이미지 기반 픽셀아트 시안을 생성하고 최종 투명 PNG 스프라이트를 저장한다.
2. `home/life-zone.js`의 `.lz-scene` 내부에 클릭 가능한 NPC 말풍선 버튼을 추가한다.
3. `style.css`에 버튼 위치, 클릭/포커스 상태, 이미지 렌더링 스타일을 추가한다.
4. `sw.js` `STATIC_ASSETS`에 새 스프라이트를 추가하고 `CACHE_VERSION`을 bump한다.
5. 정적 테스트/검증을 추가하거나 갱신한다.

## 실행 결과

- 참고 이미지 기반으로 built-in `image_gen` 시안을 만들고, 마젠타 chroma-key를 제거한 뒤 최종 스프라이트를 `assets/home/life-zone/ui/npc-quest-bubble.png`로 저장했다.
- 최종 스프라이트는 `192x258` RGBA 투명 PNG이며, 하단 이름표 텍스트는 `NPC`로 고정했다.
- `home/life-zone.js`에서 헬스 트레이너 위에 `button[data-lz-action="npc-quest"]` 오버레이를 추가했다.
- 클릭 시 지금은 모달을 열지 않고 `life-zone:npc-quest` custom event를 bubble로 발생시켜 추후 퀘스트 모달 연결점을 확보했다.
- `style.css`에 위치, 터치, 포커스, active 상태를 추가했다.
- `sw.js` `STATIC_ASSETS`에 새 sprite를 추가하고 `CACHE_VERSION`을 `tomatofarm-v20260625z59-life-zone-npc-quest`로 bump했다.
- `tests/home-life-zone-npc-quest.test.js`를 추가해 sprite 경로, 클릭 hook, CSS, PNG header, cache marker를 검증한다.

## 이미지 생성 프롬프트

Built-in `image_gen` mode를 사용했다. 핵심 프롬프트는 참고 이미지의 전구 말풍선/이름표 스타일만 가져오고, 배경은 `#ff00ff` chroma-key로 요청한 뒤 로컬에서 투명화하는 방식이었다. 텍스트는 `"NPC"`를 정확히 한 번 렌더하도록 요청했고, 최종 PNG에서 파일명과 크기를 앱용으로 정리했다.

## 제외

- 퀘스트 모달 UI/상태/데이터 구현
- NPC 대사/퀘스트 목록 생성
- 기존 actor sprite 27개 재생성
- 운영계 `tomatofarm` 배포

## 검증

1. `node --check home/life-zone.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
6. 배포 URL에서 `home/life-zone.js`, `sw.js`, `assets/home/life-zone/ui/npc-quest-bubble.png` 마커/HTTP 200 확인

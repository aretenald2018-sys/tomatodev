# 홈 라이프존 미란다 NPC 추가

## 상태

- 상태: `implemented`
- 요청일: 2026-06-29
- 실행 슬라이스: Slice 1 하나로 완료

## 사용자 요청

홈탭 스프라이트 영역의 하단을 조금 확장하고, 좌측에 `악마는 프라다를 입는다`의 미란다를 모티브로 한 앉아있는 NPC를 추가한다. 홈탭의 다른 아이소메트릭 아트에셋과 결을 맞춘 `imagegen` 생성 자산을 사용하고, 이상한 도형을 넣지 않는다. NPC 이름은 `미란다`이며, 트레이너처럼 전구 모양 상호작용 요소를 둔다. 전구 클릭 시 트레이너 모달처럼 미란다가 다리 꼬고 앉아있는 모달을 연다.

## 그릴 결과

- 질문: 미란다는 기존 트레이너와 별도 NPC인가?
  - 결정: 별도 NPC다. 트레이너의 이벤트/모달 흐름을 유지하고 `npc: 'miranda'` 분기를 추가한다.
- 질문: 홈탭의 하단 확장은 기존 아이소메트릭 방 이미지를 다시 그려야 하는가?
  - 결정: 기존 방 좌표계를 깨지 않도록 `lz-world`를 기존 1672x1672 기준으로 유지하고, `lz-scene`에 작은 하단 여백을 추가해 NPC가 아래쪽에 자연스럽게 걸치도록 한다.
- 질문: 미란다 자산은 어떤 방식으로 만든다?
  - 결정: `imagegen`으로 원본을 생성하고, 크로마키 제거/알파 검증 후 `assets/home/life-zone/ui/`에 투명 PNG로 저장한다. 실제 배우의 정확한 초상 복제가 아니라, 검은 선글라스와 더 나이 든 은발 보브컷 편집장 분위기를 가진 원본 NPC로 만든다.
- 남은 가정: 인증 세션이 없으면 배포 후 실제 홈탭 클릭 UI는 사용자가 로그인 상태에서 확인해야 한다.

## Slice 1 범위

### 구현

1. `imagegen`으로 미란다 NPC 투명 PNG를 생성한다.
2. `home/life-zone.js`에 미란다 NPC 버튼, 이름표, 전구 상호작용을 추가한다.
3. `style.css`에 하단 확장용 월드 래퍼와 미란다 NPC 배치/크기 스타일을 추가한다.
4. `app.js`에서 `life-zone:npc-quest` 이벤트를 트레이너와 미란다 모두 처리하도록 확장한다.
5. `modals/miranda-quest-modal.js`를 추가하고 `modal-manager.js`에 등록한다.
6. `sw.js`에 새 자산/모달을 등록하고 `CACHE_VERSION`을 bump한다.
7. 회귀 테스트에 미란다 NPC, 모달, 캐시 등록, PNG 속성 검증을 추가한다.

### 제외

- 기존 러닝 캐릭터 모션/지도 로직 수정
- 트레이너 모달 기능 변경
- 홈 라이프존 전체 배경 재생성
- 실제 영화 인물/배우의 정확한 초상 복제

## 검증

1. `node --check home/life-zone.js; node --check app.js; node --check modals/miranda-quest-modal.js; node --check modal-manager.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/trainer-quest-modal.test.js tests/miranda-quest-modal.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행 프롬프트

`docs/ai/features/2026-06-29-home-miranda-npc.md` Slice 1을 구현한다. 홈 라이프존 하단 좌측에 imagegen 기반 미란다 NPC를 추가하고, 전구 클릭 시 미란다 모달이 열리도록 한다.

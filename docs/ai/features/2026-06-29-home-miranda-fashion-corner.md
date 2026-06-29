# 홈 미란다 패션 코너 스프라이트

## 상태

- 상태: `implemented`
- 요청일: 2026-06-29
- 실행 슬라이스: Slice 1 하나로 완료

## 사용자 요청

좌측 하단 집기들을 미란다가 관할하는 옷 행거와 걸려있는 옷 스프라이트로 바꿔 해당 공간이 미란다 공간처럼 느껴지게 한다. 미란다는 러닝트랙보다 아래쪽에 배치하고, NPC로서 트레이너처럼 `미란다` 이름을 표기한다.

## 진단

- 현재 좌측 하단에는 기존 운동/보관 집기가 그대로 남아 있어 미란다 NPC만 따로 얹힌 느낌이 강하다.
- 미란다가 트랙 가장자리와 가까워 러닝 공간과 겹쳐 보인다.
- 이름표는 있으나 위치가 하단 UI와 가까워 NPC 표식으로 안정적으로 읽히지 않는다.

## Slice 1 범위

### 구현

1. `imagegen`으로 홈 라이프존 좌측 하단용 패션 코너 스프라이트를 생성한다.
2. 크로마키 제거 후 `assets/home/life-zone/ui/miranda-fashion-corner.png`로 저장한다.
3. `home/life-zone.js`에 패션 코너 overlay를 추가해 좌측 하단 집기 영역을 덮는다.
4. `style.css`에서 패션 코너 위치와 미란다 위치를 러닝트랙 아래 나무바닥 쪽으로 보정한다.
5. 미란다 이름표가 트레이너처럼 NPC 이름으로 보이도록 유지/보정한다.
6. `sw.js`에 새 자산을 등록하고 `CACHE_VERSION`을 bump한다.
7. 회귀 테스트에 패션 코너 자산, 미란다 이름표, 미란다 위치, 캐시 등록을 추가한다.

### 제외

- 베이스룸 전체 이미지 재생성
- 미란다 모달 캐릭터 변경
- 러닝 지도/러닝 캐릭터 로직 변경

## 검증

1. `node --check home/life-zone.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js`
3. `node --test tests/*.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `git diff --check`
6. Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 실행 결과

1. `assets/home/life-zone/ui/miranda-fashion-corner.png`를 추가해 좌측 하단 기존 집기 위에 옷 행거, 의상, 선반, 전신거울 오브젝트를 배치했다.
2. `home/life-zone.js`가 홈 라이프존 월드 안에서 패션 코너 스프라이트를 정적 환경 오브젝트로 렌더링한다.
3. `style.css`에서 미란다를 러닝트랙보다 아래쪽 좌측 하단 패션 코너로 내리고, 기존 `미란다` NPC 이름표를 유지했다.
4. `sw.js`에 새 PNG를 `STATIC_ASSETS`로 등록하고 `CACHE_VERSION`을 `tomatofarm-v20260629z13-home-miranda-fashion-corner`로 갱신했다.

## 다음 실행 프롬프트

`docs/ai/features/2026-06-29-home-miranda-fashion-corner.md` Slice 1을 구현한다. 좌측 하단 집기를 옷 행거/의상 스프라이트 overlay로 바꾸고, 미란다를 러닝트랙보다 아래쪽에 작게 배치하며 이름표를 유지한다.

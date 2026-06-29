# 홈 미란다 공간 스프라이트 및 러닝 프레임 수정

## 상태

- 상태: `implemented`
- 요청일: 2026-06-29
- 실행 슬라이스: Slice 1 하나로 완료

## 사용자 요청

1. 홈탭 미란다가 다른 캐릭터들과 달리 공간 안에 녹아들지 않으므로, 공간 안에 배치하는 스프라이트를 별도로 만들어 구현한다.
2. 러닝 모션이 여전히 두 캐릭터가 동시에 보이는 식으로 이상하게 렌더링되므로, 화면 전환 효과나 코드가 강제하는 문제가 있는지 전수점검하고 수정한다.

## 진단

- 미란다 홈 배치 문제:
  - 기존 구현은 모달용 큰 전신 PNG `miranda-npc-seated.png`를 홈 공간에도 축소 사용했다.
  - 이 자산은 모달 캐릭터로는 적합하지만 홈 라이프존의 작은 아이소메트릭 스프라이트 밀도와 다르고, 하단 확장 영역에 걸쳐 있어 실제 공간 안에 놓인 캐릭터처럼 보이지 않는다.
- 러닝 중복 렌더 문제:
  - `assets/home/life-zone/sprites/*-running-track.png`는 좌우 2프레임이 붙은 스프라이트시트다.
  - 현재 CSS는 `background-size: 200% 100%`와 `animation: lz-running-track-steps 0.54s steps(2, end) infinite`를 사용한다.
  - `steps(2, end)`는 중간 단계에서 `background-position: 50%` 같은 값을 만들 수 있어, 좌우 2프레임이 한 컷에 섞여 보이는 원인이 된다.
  - 별도 화면 전환 JS보다 CSS 프레임 애니메이션 계약이 문제다.

## Slice 1 범위

### 구현

1. `imagegen`으로 홈 공간용 미란다 소형 스프라이트를 별도 생성한다.
2. 새 자산은 `assets/home/life-zone/ui/miranda-npc-home.png`로 저장하고, 모달용 `miranda-npc-seated.png`는 그대로 유지한다.
3. 홈 라이프존은 새 홈용 스프라이트를 사용하고, 미란다를 기존 방 하단 좌측 공간 안으로 배치한다.
4. 이전 하단 확장 의존을 제거하고 `lz-scene` 비율을 기존 방 기준으로 되돌린다.
5. 러닝 프레임 애니메이션은 `steps(2, end)`를 제거하고 `0%/49.999%`와 `50%/100%`만 찍는 명시적 키프레임으로 교체한다.
6. `sw.js`에 새 홈 스프라이트를 추가하고 `CACHE_VERSION`을 bump한다.
7. 회귀 테스트에 홈/모달 미란다 자산 분리와 러닝 프레임 중간 배경 위치 금지를 추가한다.

### 제외

- 모달용 미란다 캐릭터 재생성
- 러닝 지도/기록 데이터 로직 변경
- 홈 전체 방 배경 재생성

## 검증

1. `node --check home/life-zone.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `node --test tests/*.test.js`
5. `git diff --check`
6. Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행 프롬프트

`docs/ai/features/2026-06-29-home-miranda-space-sprite-running-frame-fix.md` Slice 1을 구현한다. 홈 미란다는 별도 소형 스프라이트로 교체하고, 러닝 2프레임 CSS가 중간 배경 위치를 만들지 않게 수정한다.

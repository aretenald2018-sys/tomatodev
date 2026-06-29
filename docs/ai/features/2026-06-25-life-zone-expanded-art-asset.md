# 라이프존 확장 아트 에셋 계획

## 상태

- 상태: `reviewed`
- 요청일: 2026-06-25
- 범위: 홈 라이프존 배경 아트 확장 및 앱 적용 준비

## 요청 요약

현재 홈 라이프존은 앱 카드 폭에서 가로형 방처럼 보인다. 기존 상단의 헬스장·주방·업무 공간 정체성은 유지하되, 세로 방향으로 약 1.7~1.8배 확장해 하부 건물 구조를 추가한다. 게이미피케이션 요소로 타원형 실내 러닝 트랙과 안내데스크를 추가하고, 안내데스크에는 상의를 탈의한 성인 남자 헬스트레이너 NPC를 배치한다.

## 그릴 결과

- 결정: 기존 `base-room-alpha.png`의 폭 `1672px` 기준은 유지하고, 목표 높이는 약 `1600~1694px`로 잡는다.
- 결정: 좌측 하단의 어색한 창문/외벽 요소는 금지하고, 하부 좌측은 실내 트랙과 훈련 구역으로 설계한다.
- 결정: 트레이너는 성인 남자 NPC이며 상의를 탈의한 근육질 캐릭터로 표현하되, 비성적이고 친근한 게임 안내 캐릭터 톤을 유지한다.
- 결정: 최종 앱 적용 전에는 생성 시안을 그대로 쓰지 말고, 투명 외곽/비율/actor 좌표/모바일 카드 표시를 검증한다.
- 참고 시안: `docs/ai/art-drafts/life-zone-expanded-trainer-track-v3-young-face.png`

## 실행 Slice 1

1. 확정 시안을 기반으로 `assets/home/life-zone/base-room.png`와 `assets/home/life-zone/base-room-alpha.png`를 앱용 최종 크기와 투명 외곽으로 정리한다.
2. `assets/home/life-zone/manifest.json`, `home/life-zone.js`, `style.css`, `docs/pixel-life-zone-mockup.html`의 기준 높이와 aspect ratio를 새 배경에 맞춘다.
3. 기존 actor sprite 좌표가 상단 방 위에 자연스럽게 유지되는지 확인하고, 필요한 경우 `manifest.json`의 slot 좌표만 조정한다.
4. `sw.js` `STATIC_ASSETS`에 포함된 파일 변경이므로 `CACHE_VERSION`을 같은 변경에서 bump한다.
5. `www/`는 직접 수정하지 않는다.

## 실행 결과

- `docs/ai/art-drafts/life-zone-expanded-trainer-track-v3-young-face.png`를 기준으로 `1672x1672` 앱용 배경을 생성했다.
- `assets/home/life-zone/base-room.png`와 `assets/home/life-zone/base-room-alpha.png`를 교체했다.
- `manifest.json`, `home/life-zone.js`, `style.css`, `docs/pixel-life-zone-mockup.html`의 높이/aspect-ratio/y좌표 분모를 `1672` 기준으로 맞췄다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z50-life-zone-expanded-art`로 bump했다.
- 배포 대상은 `origin`(`dashboard3`)만 사용하며 `tomatofarm` 원격은 사용하지 않는다.

## 캐시 불일치 수정

- 배포 후 실제 앱에서 새 CSS/좌표 기준은 반영됐지만 기존 `base-room-alpha.png` 이미지가 브라우저/서비스워커 캐시에 남아, 캐릭터 위치가 틀어지고 신규 하단 이미지가 보이지 않는 증상이 확인됐다.
- 앱 참조 경로를 `base-room-expanded-alpha.png`로 변경하고 `base-room-expanded.png`/`base-room-expanded-alpha.png`를 `sw.js` `STATIC_ASSETS`에 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z51-life-zone-expanded-asset-url`로 bump했다.

## 제외

- 새 actor state나 운동 애니메이션 추가
- 러닝 트랙을 별도 인터랙션으로 만드는 작업
- 기존 27개 actor sprite 재생성
- 운동 네비게이션 stack 대기 작업과의 병합

## 검증

1. `python scripts/validate-life-zone-assets.py`
2. `node --check home/life-zone.js; node --check sw.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. 최종 적용 시 Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
6. 배포 URL에서 홈 카드의 라이프존 배경이 잘리지 않고, 트랙/안내데스크/트레이너가 모바일 카드 폭에서 읽히는지 확인

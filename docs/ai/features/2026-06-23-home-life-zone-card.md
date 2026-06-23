# 홈탭 라이프존 카드 개편 계획

## 요청

- 홈탭의 `오늘의 칼로리/체중` 카드 자리에 방금 만든 아이소메트릭 픽셀아트 이미지를 넣는다.
- 이미지는 완전한 정적 이미지가 아니라 `줍스`, `문정토마토`, `이재헌`의 최근 행동을 반영해 렌더링한다.
- 예: `줍스`가 운동기록을 입력/기록했으면 운동존의 랫풀다운, 벤치프레스, 스쿼트랙 위치에 보인다.
- 예: `문정토마토`가 최근 식단을 올렸으면 식사존에서 밥을 먹는 모습으로 보인다.
- 현재 웹앱 구조에서 가능한지/불가능한지 확인하고, 안 되면 대안을 제시한다.

## 현재 구조 관찰

- 홈탭 렌더 진입점은 `home/index.js`의 `renderHome()`이다.
- 비관리자 홈에서는 `renderTomatoCard()`가 실행되고, 이 함수가 `#home-hero` 바로 뒤에 `#tf-meal-card`와 `#tf-weight-card`를 동적으로 삽입한다.
- 따라서 새 라이프존 카드는 `home/tomato.js`의 `renderTomatoCard()` 흐름에서 `#tf-meal-card`/`#tf-weight-card` 자리를 대체하거나, 해당 카드들의 정보를 라이프존 카드 하단 요약으로 흡수하는 방식이 가능하다.
- 내 기록은 `data.js`의 `getExercises()`, `getDiet()`, `getDay()`, `getCache()`로 접근할 수 있다.
- 친구 기록은 `data.js`를 통해 export된 `getMyFriends()`, `getAccountList()`, `getFriendWorkout(friendId, dateKey)`를 사용할 수 있다.
- 친구 피드(`home/friend-feed.js`)도 이미 `getFriendWorkout()`으로 오늘/최근 workout 문서와 식단 필드를 읽고 있으므로, 같은 데이터 원천을 재사용할 수 있다.
- 계정 표시명은 `home/utils.js`의 `resolveNickname(account, accounts)` 패턴을 재사용할 수 있다.
- 식단 기록은 `workouts/{dateKey}` 문서의 `breakfast/lunch/dinner/snack`, `bFoods/lFoods/dFoods/sFoods`, `bPhoto/lPhoto/dPhoto/sPhoto`, `bKcal/lKcal/dKcal/sKcal` 계열로 판정할 수 있다.
- 운동 기록은 `exercises`, `muscles`, `cf`, `running`, `swimming`, `stretching` 계열 및 `isExerciseDaySuccess()` 판정을 참고할 수 있다.

## 가능/불가능 판단

### 가능한 것

- 홈탭의 `오늘의 칼로리/체중` 카드 위치를 새 카드로 대체하는 것은 가능하다.
- 오늘 또는 최근 날짜의 운동/식단 기록을 읽어 `운동존`, `식사존`, `업무존` 중 어디에 캐릭터를 배치할지 결정하는 것도 가능하다.
- `줍스`, `문정토마토`, `이재헌`이 실제 계정/이웃/관리자 계정 목록에 존재한다면, `getAccountList()`와 `resolveNickname()` 기반으로 해당 계정 id를 찾아 표시할 수 있다.
- 고품질 비주얼은 단일 HTML/CSS 드로잉보다, 빈 배경 bitmap + 캐릭터/행동 sprite layer를 겹치는 방식이 적합하다.
- 별도 캐릭터 원화가 없어도 1차 구현은 가능하다. 세 사람은 같은 기본 캐릭터를 쓰고 나시 색상만 `빨강/파랑/초록` 계열로 다르게 두는 방식으로 구분한다.

### 현재 구조만으로 어려운 것

- "지금 입력하고 있음" 같은 실시간 presence는 현재 데이터만으로는 정확히 알 수 없다.
- 현재 저장된 `workouts/{dateKey}` 문서에는 일반적으로 "방금 식단을 올림", "방금 운동기록 입력 중"을 안정적으로 판정할 수 있는 공통 `updatedAt`/activity timestamp가 없다.
- 현재 생성된 `docs/assets/pixel-life-zone-aseprite-style.png`는 사람까지 포함된 완성 이미지라, 특정 사람만 숨기거나 행동을 바꾸기 어렵다.
- 친구가 아니라 특정 이름의 전역 계정을 읽는 것은 프라이버시/권한/성능 측면에서 위험하다. 라이프존 대상자는 명시 roster 또는 친구/관리자 범위로 제한해야 한다.
- `imagegen`으로 세 사람 x 상태별 이미지를 매번 별도 생성하면 얼굴, 체형, 픽셀 밀도, 카메라 각도가 조금씩 달라질 수 있다. "같은 캐릭터의 색상 변형"이 목표라면 imagegen 결과를 그대로 9장 쓰기보다, 기본 sprite를 만든 뒤 색상 치환으로 파생시키는 편이 안정적이다.

## 권장 방향

단일 정적 PNG를 앱에 그대로 넣는 대신, 다음 레이어 구조로 간다.

1. `base room image`
   - 사람이 없는 라이프존 방 배경.
   - 웨이트존, 식사존, 업무존의 기구/가구/소품은 배경에 포함.
2. `actor sprites`
   - 별도 인물 원화가 없으므로 `줍스`, `문정토마토`, `이재헌`은 같은 기본 캐릭터의 색상 변형으로 시작한다.
   - 1차 구분 색상: `줍스=빨강 계열`, `문정토마토=파랑 계열`, `이재헌=초록 계열`.
   - 행동 상태별 sprite는 같은 상태의 여러 명이 겹치지 않도록 zone마다 3개 슬롯을 둔다.
   - 운동 슬롯: `workout_lat`, `workout_bench`, `workout_squat`.
   - 식사 슬롯: `diet_left`, `diet_center`, `diet_right`.
   - 업무 슬롯: `office_upper`, `office_center`, `office_lower`.
3. `hotspot map`
   - 각 행동 sprite가 배치될 좌표/크기/z-index를 JS 상수 또는 JSON으로 관리.
   - 예: `bench`, `latPulldown`, `squatRack`, `islandLeft`, `islandRight`, `deskTop`, `deskBottom`.
4. `activity resolver`
   - 계정별 오늘/최근 기록을 읽고 상태를 하나로 정규화한다.
   - 우선순위: 오늘 운동 기록 > 오늘 식단 기록 > 최근 접속/최근 기록 > idle.
5. `home card renderer`
   - 배경 이미지 위에 actor sprite와 짧은 상태 pill을 absolute positioning으로 올린다.
   - 기존 칼로리/체중 숫자는 카드 하단의 compact summary strip으로 흡수한다.

## 캐릭터 에셋 제작 방식

이번 대화 기준으로 캐릭터 에셋은 다음 방식이 가장 적합하다.

1. 사람 없는 `base room image`를 만든다.
   - 현재 만든 원화의 아이소메트릭 카메라, 픽셀 밀도, 웨이트존/식사존/업무존 구성을 유지한다.
   - 현재 원화에 이미 사람이 들어가 있으므로, 실제 앱용 배경은 사람을 제거한 버전으로 다시 만들거나 편집한다.
2. `imagegen`으로 기본 캐릭터 pose 9개를 만든다.
   - 운동 3개: 랫풀다운, 벤치프레스, 스쿼트.
   - 식사 3개: 아일랜드의 서로 다른 의자 방향.
   - 업무 3개: 사무실의 서로 다른 의자/책상 방향.
   - 아홉 pose는 같은 머리, 얼굴, 체형, 픽셀 밀도, 시점으로 맞춘다.
3. 기본 캐릭터는 임시 마스크 색상의 나시를 입힌다.
   - 예: 나시를 `#ff00ff` 계열으로 생성하고, 배경은 `#00ff00` chroma-key로 만든다.
   - chroma-key 배경을 로컬에서 alpha PNG로 제거한다.
   - 나시 픽셀만 로컬 후처리로 `빨강/파랑/초록` 팔레트로 치환한다.
   - 이렇게 하면 세 명이 imagegen drift 없이 같은 캐릭터의 색상 변형처럼 보인다.
4. 결과물은 1차 기준 `9 pose x 3 color = 27 sprite`가 된다.
   - 직접 imagegen을 27번 돌리는 것이 아니라, imagegen 산출물 1장의 3x3 pose sheet를 기반으로 로컬에서 색상 파생한다.
   - 필요한 경우 각 sprite canvas를 같은 크기로 맞추고 hotspot 기준점만 다르게 둔다.

### 1차 상태 매핑

- 운동 기록 있음: 같은 상태의 등장 순서대로 `workout_lat`, `workout_bench`, `workout_squat` 슬롯에 배치한다.
- 식단 기록 있음: 같은 상태의 등장 순서대로 `diet_left`, `diet_center`, `diet_right` 슬롯에 배치한다.
- 운동/식단 기록은 없지만 표시 대상이면: 같은 상태의 등장 순서대로 `office_upper`, `office_center`, `office_lower` 슬롯에 배치한다.
- 같은 존에 여러 명이 겹칠 수 있으므로, 각 상태별 hotspot은 최소 3개씩 둔다.

## 데이터 설계

### MVP: 기존 데이터만 사용

- `todayKey` 기준으로 내 기록은 `getDay()/getDiet()/getExercises()`에서 읽는다.
- 친구/타깃 계정 기록은 `getFriendWorkout(accountId, todayKey)`로 읽는다.
- 오늘 운동이 있으면 `workout`.
- 오늘 식단 필드/사진/kcal이 있으면 `diet`.
- 오늘 기록이 없고 최근 접속/최근 기록이 있으면 `office` 또는 `idle`.
- 장점: Firestore schema 변경이 적다.
- 단점: "방금 올림"이나 "입력 중"이 아니라 "오늘 기록 있음" 수준이다.

### V2: activity snapshot 추가

- 저장 경로에서 `life_zone_activity` 같은 별도 snapshot을 갱신한다.
- 예: `{ userId, type: 'workout'|'diet'|'office', subtype, at, dateKey, summary }`
- `workout/save.js`의 식단/운동 저장 성공 후 `data.js` 경유 함수로 업데이트한다.
- 장점: 최근성, 우선순위, "방금 올림" 표현이 정확해진다.
- 단점: 저장 경로 변경이므로 테스트와 사진 필드 보존 검증이 필요하다.

## 파일/모듈 설계

- `docs/assets/pixel-life-zone-aseprite-style.png`
  - 지금 만든 참고용 완성 원화. 실제 구현용 base로는 사람 없는 버전이 더 적합하다.
- `assets/home/life-zone/base-room.png` 또는 `home/assets/life-zone/base-room.png`
  - 앱에서 사용할 빈 방 배경.
- `assets/home/life-zone/sprites/*.png`
  - 캐릭터/행동 sprite. 같은 기본 캐릭터의 `빨강/파랑/초록` 색상 변형 x 9개 슬롯으로 시작한다.
- `assets/home/life-zone/manifest.json`
  - base image 크기, actor 목록, 상태별 슬롯 좌표/pose 순서를 담는다.
- `scripts/process-life-zone-sprites.py`
  - chroma-key 제거 후 만들어진 3x3 pose sheet를 crop하고, 나시 색상을 actor별 팔레트로 치환해 27개 sprite와 QA contact sheet를 생성한다.
- `home/life-zone.js`
  - 라이프존 카드 렌더러.
  - `renderLifeZoneCard({ replaceSummaryCards: true })`.
  - activity fetch/resolve를 호출하고 DOM을 만든다.
- `home/life-zone-state.js`
  - 순수 함수 중심: 계정 목록/워크아웃 문서/현재 날짜를 받아 actor state를 결정한다.
  - 단위 테스트 대상.
- `home/tomato.js`
  - `renderTomatoCard()`에서 기존 `tf-meal-card`/`tf-weight-card` 삽입 위치를 라이프존 카드로 교체하거나, 하단 요약으로 이관한다.
- `home/index.js`
  - 필요하면 `renderLifeZoneCard()` import 및 호출 순서 조정.
- `style.css`
  - 카드 레이아웃, responsive aspect ratio, overlay sprite, status pill.
- `sw.js`
  - `style.css` 또는 `STATIC_ASSETS` 등록 asset을 수정/추가하면 `CACHE_VERSION`을 bump한다.
- `tests/home-life-zone-state.test.js`
  - activity resolver 순수 함수 테스트.

## 구현 슬라이스

### Slice 1 — 홈 라이프존 카드 연결 + 기존 데이터 상태 판정

- 목표: 오늘 칼로리/체중 카드 자리에 라이프존 카드가 들어가고, 기존 오늘 기록 기반으로 actor 상태를 판정한다.
- 내용:
  - `assets/home/life-zone`의 base/sprite asset을 홈 카드로 렌더.
  - 기존 칼로리/체중 정보는 카드 하단 compact summary로 유지.
  - `줍스`, `문정토마토`, `이재헌`은 account id가 확정되기 전까지 nickname/displayName 기반으로 자동 매칭한다.
  - 내 계정이면 로컬 cache의 오늘 기록을 사용하고, 친구 계정이면 `getFriendWorkout(friendId, todayKey)`를 사용한다.
  - 매칭되지 않거나 읽을 수 없는 대상은 업무존 기본 상태로 둔다.
  - 같은 상태의 여러 명은 manifest/slot 배열 순서대로 서로 다른 pose/좌표에 배치한다.
  - 실시간 "입력 중" presence snapshot은 이번 slice에 포함하지 않는다.
- 검증:
  - `node --check home/tomato.js`
  - `node --check home/life-zone.js`
  - `node --check home/life-zone-state.js`
  - `node --test tests/home-life-zone-state.test.js`
  - `node --check sw.js`
  - `git diff --check`
  - 브라우저에서 홈탭 진입, 기존 `오늘의 칼로리/체중` 위치가 라이프존 카드로 대체되고 식단/체중 진입 동선 및 actor 상태 배치가 유지되는지 확인.

### Slice 2 — 기존 데이터 기반 actor state

- 목표: `줍스`, `문정토마토`, `이재헌`의 오늘 기록을 읽어 상태를 결정한다.
- 내용:
  - roster 설정: 표시명 또는 account id 매핑.
  - `home/life-zone-state.js`에 `resolveActorStates()` 순수 함수 작성.
  - 오늘 운동/식단/idle 판정.
  - 상태 pill 또는 간단한 marker를 표시.
- 검증:
  - `node --test tests/home-life-zone-state.test.js`
  - 브라우저에서 테스트 계정/친구 기록이 있는 날과 없는 날을 비교.

### Slice 3 — base/sprite layer 전환

- 목표: 단일 PNG 위 marker가 아니라, 빈 방 배경 + 행동 sprite로 실제 동적 장면을 만든다.
- 내용:
  - 사람 없는 base room 생성/저장.
  - 기본 캐릭터 3x3 pose sheet를 `imagegen`으로 생성하고, 나시 색상 치환으로 `줍스/문정토마토/이재헌` sprite set을 만든다.
  - hotspot map으로 정확한 위치에 sprite 배치.
  - 같은 상태의 여러 명은 상태별 슬롯 배열 순서대로 배치한다.
- 검증:
  - 화면 폭별 이미지/스프라이트 정렬 확인.
  - 브라우저 screenshot으로 sprite가 배경과 어긋나지 않는지 확인.

### Slice 0 — 아트 에셋/슬롯 준비

- 목표: 앱 연결 전, 동시 배치가 가능한 base room과 actor sprite asset을 만든다.
- 내용:
  - 사람 없는 base room을 생성해 `assets/home/life-zone/base-room.png`에 저장.
  - 3x3 pose sheet를 생성해 `assets/home/life-zone/sprites/source/slot-poses-green.png`에 저장.
  - chroma-key 제거본 `slot-poses-alpha.png` 생성.
  - `scripts/process-life-zone-sprites.py`로 27개 actor sprite 생성.
  - `assets/home/life-zone/manifest.json`에 상태별 슬롯 순서와 좌표를 정의.
  - `docs/pixel-life-zone-mockup.html`을 base+sprite overlay preview로 갱신.
- 상태: 2026-06-23 실행 완료. 브라우저 자동화 검증은 `file://` URL 정책으로 not verified yet.

### Slice 4 — 최근성/presence snapshot

- 목표: "오늘 기록 있음"을 넘어 "최근에 식단 올림/운동 입력함"을 표현한다.
- 내용:
  - 저장 성공 후 `data.js` 경유 activity snapshot 업데이트.
  - 최근 N분/N시간 우선순위 적용.
  - 친구/내 계정 activity read 함수 추가.
- 검증:
  - 운동 저장 직후 workout 상태 반영.
  - 식단 사진/음식 저장 직후 diet 상태 반영.
  - 사진 필드 보존 확인.

### Slice 5 — 라이프존 base 외곽선 품질 보정

- 목표: 홈 카드 축소 표시에서 `base-room-alpha.png`의 외곽 테두리가 거친 텍스처처럼 보이는 문제를 줄인다.
- 내용:
  - `scripts/make-life-zone-base-alpha.py`의 단색/두꺼운 crisp outline을 smoothed mask 기반의 얇은 anti-aliased 갈색 outline으로 교체한다.
  - `assets/home/life-zone/base-room-alpha.png`를 재생성한다.
  - `style.css`의 `.lz-base`는 `image-rendering:auto`로 표시하고, actor sprite의 pixelated 렌더링은 유지한다.
  - `docs/pixel-life-zone-mockup.html` preview도 base image는 `image-rendering:auto`로 맞춘다.
  - `scripts/validate-life-zone-assets.py`의 outline 검증 기준을 anti-aliased outline에 맞게 갱신한다.
  - `sw.js` `CACHE_VERSION`을 bump한다.
- 상태: 2026-06-23 실행 완료. 브라우저 UI 플로우는 not verified yet.
- 검증:
  - `python -m py_compile .\scripts\make-life-zone-base-alpha.py .\scripts\validate-life-zone-assets.py`
  - `python .\scripts\validate-life-zone-assets.py`
  - `node --check` 대상 홈 모듈과 `sw.js`
  - `node --test .\tests\home-life-zone-state.test.js`
  - `STATIC_ASSETS` 파일 존재 검사
  - `git diff --check`

### Slice 6 — 라이프존 actor 말풍선

- 목표: actor의 오늘 상태를 카드 안에서 바로 읽을 수 있도록 말풍선을 표시한다.
- 내용:
  - 운동 기록이 있으면 대근육만 추려 `오늘 등 완료`, `오늘 가슴/등 완료` 같은 문구를 만든다.
  - `등/이두/복근`처럼 소근육/복근이 섞여도 대근육만 표출한다.
  - 식단 기록이 있으면 마지막으로 입력된 식사를 기준으로 `아침냠냠`, `점심냠냠`, `저녁냠냠`, `간식냠냠`을 표시한다.
  - 아무 기록이 없으면 업무존 actor에 `다른 일 하는중`을 표시한다.
  - 말풍선은 actor sprite 위에 absolute layer로 렌더링한다.
  - actor sprite의 픽셀 렌더링은 유지한다.
  - `style.css`, `home/life-zone.js`, `home/life-zone-state.js`, `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 bump한다.
- 상태: 2026-06-23 실행 완료. 브라우저 UI 플로우는 not verified yet.
- 검증:
  - `node --check .\home\life-zone-state.js`
  - `node --check .\home\life-zone.js`
  - `node --check .\home\tomato.js`
  - `node --check .\home\hero.js`
  - `node --check .\sw.js`
  - `node --test .\tests\home-life-zone-state.test.js`
  - `python .\scripts\validate-life-zone-assets.py`
  - `STATIC_ASSETS` 파일 존재 검사
  - `git diff --check`

## 주요 리스크와 대안

- 리스크: 단일 원화에 사람이 이미 포함되어 있으면 동적 캐릭터가 겹친다.
  - 대안: 사람 없는 base room을 새로 생성하고 캐릭터는 sprite layer로만 표시한다.
- 리스크: base room의 어두운 바깥 배경이 홈 카드 안에서 검정 테두리처럼 보일 수 있다.
  - 대안: 가장자리와 연결된 어두운 배경만 flood-fill로 alpha 처리한 `base-room-alpha.png`를 앱에서 사용한다.
- 리스크: imagegen이 세 사람을 각각 생성하면 "같은 캐릭터의 색상 변형"처럼 보이지 않을 수 있다.
  - 대안: pose별 기본 캐릭터만 생성하고, 나시 색상은 로컬 팔레트 치환으로 파생한다.
- 리스크: 상태 chip의 색을 상태별로 두면 actor 색상과 혼동된다.
  - 대안: 상태 dot은 actor별 나시 색상과 일치시킨다. `줍스=#ff525c`, `문정토마토=#52a6ff`, `이재헌=#5ada7e`.
- 리스크: 단일 pose sprite를 CSS transform으로 흔드는 방식의 운동 모션은 팔/기구 정렬이 깨질 수 있다.
  - 대안: 모션은 별도 slice에서 2-3프레임 sprite를 pose별로 생성하고, `prefers-reduced-motion`을 고려한 frame animation으로 처리한다. 이번 slice에는 포함하지 않는다.
- 리스크: alpha base 외곽을 픽셀 단위로 두껍게 stroke 처리하면 홈 카드 축소 표시에서 테두리가 거칠게 보인다.
  - 대안: 외곽선은 smoothed mask 기반의 얇은 anti-aliased 갈색 라인으로 생성하고, 홈 카드 base 이미지는 `image-rendering:auto`로 표시한다. actor sprite만 pixelated 렌더링을 유지한다.
- 리스크: 말풍선이 actor나 가구를 가릴 수 있다.
  - 대안: 말풍선은 actor 중심보다 살짝 위에 배치하고, 작은 화면에서는 폭과 글자 크기를 줄인다. 실제 기기에서 겹침이 보이면 slot별 bubble offset을 manifest로 분리한다.

### Slice 7 — 말풍선 반투명 배경 보정

- 목표: 말풍선 배경이 완전 흰색으로 떠 보이지 않고, 뒤쪽 장면이 은은하게 비치도록 조정한다.
- 내용:
  - `.lz-speech`와 말풍선 꼬리 배경을 `rgba(255,255,255,0.72)`로 변경한다.
  - `backdrop-filter`를 적용해 반투명 유리판처럼 보이게 한다.
  - `style.css`와 `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 bump한다.
- 상태: 2026-06-23 실행 완료. 브라우저 UI 플로우는 not verified yet.

### Slice 8 — 운동 시간만 입력된 날의 라이프존 판정 보정

- 목표: 운동 세트 없이 `workoutDuration`만 저장된 오늘 기록도 라이프존에서 운동 상태로 표시한다.
- 내용:
  - `hasLifeZoneWorkoutActivity()`가 `workoutDuration > 0`을 운동 활동으로 판정하게 한다.
  - 줍스가 운동 시간만 입력한 경우에도 운동존으로 배치되고 `오늘 운동 완료` 말풍선을 표시하는 회귀 테스트를 추가한다.
  - `home/life-zone-state.js`와 테스트 수정에 맞춰 `sw.js` `CACHE_VERSION`을 bump한다.
- 상태: 2026-06-23 실행 완료. 브라우저 UI 플로우는 not verified yet.

### Slice 9 — 식단 입력 actor 최신 상태 반영 보정

- 목표: 줍스가 오늘 식단만 입력한 경우 업무존이 아니라 식사존으로 표시한다.
- 내용:
  - actor 계정 id와 실제 friend/workout owner id가 `id`, 공백 제거 id, `(guest)` 변형 중 하나로 엇갈려도 같은 사람으로 읽도록 owner id 후보를 둔다.
  - 이웃 actor의 오늘 문서를 읽을 때 owner id 후보를 순서대로 확인한다.
  - 라이프존 actor 상태 60초 캐시를 꺼서 방금 입력한 오늘 식단/운동 기록이 홈 재렌더에 바로 반영되게 한다.
  - 줍스가 점심 식단만 입력한 경우 `diet` 상태, 식사존 slot, `점심냠냠` 말풍선이 나오는 회귀 테스트를 추가한다.
  - `home/life-zone.js`, `home/life-zone-state.js`, `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 bump한다.
- 상태: 2026-06-23 실행 완료. 브라우저 UI 플로우는 not verified yet.

### Slice 10 — 모바일 요약 구획 표준화

- 목표: 모바일에서도 PC 렌더링과 같은 좌우 2칸 요약 구획을 표준으로 사용한다.
- 원인:
  - 기본 `.lz-summary-strip`은 `grid-template-columns: minmax(0, 1fr) minmax(0, 0.82fr)`라 PC에서는 좌우 2칸으로 구획된다.
  - 그러나 `@media (max-width: 420px)`에서 `.lz-summary-strip { grid-template-columns: 1fr; }`와 버튼 border override를 적용해 모바일만 세로 1열로 바뀌었다.
- 내용:
  - 모바일 media query에서 1열 전환과 하단 border override를 제거한다.
  - 좁은 화면에서 텍스트가 무리 없이 들어가도록 요약 버튼 padding과 숫자 크기만 소폭 줄인다.
  - `style.css`와 `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 bump한다.
- 상태: 2026-06-23 실행 완료. 브라우저 UI 플로우는 not verified yet.
- 리스크: `줍스/문정토마토/이재헌` 이름이 계정 id와 다르거나 사용자의 친구가 아닐 수 있다.
  - 대안: `lifeZoneRoster` 설정을 두고 account id를 명시한다. 없으면 현재 유저/이웃 중 닉네임 매칭으로 fallback.
- 리스크: 실시간 입력 중 상태는 현재 데이터만으로 판정할 수 없다.
  - 대안: MVP는 "오늘 기록 있음"으로 시작하고, 이후 `life_zone_activity` snapshot을 추가한다.
- 리스크: 친구별 Firestore read가 홈 렌더마다 늘어난다.
  - 대안: 대상 3명만 읽고, 30~60초 메모리 캐시를 둔다. 친구 피드와 중복 read가 많아지면 추후 공용 social activity cache로 합친다.
- 리스크: 이미지 asset을 앱 경로에 추가하면 PWA 캐시 정책과 충돌할 수 있다.
  - 대안: `STATIC_ASSETS`에 등록하는 경우 반드시 `CACHE_VERSION`을 bump한다. 등록하지 않으면 네트워크 우선 이미지로 두고 오프라인 보장은 하지 않는다.

## 결정 필요

1. `줍스`, `문정토마토`, `이재헌`을 어떤 account id에 매핑할지 정해야 한다.
2. 첫 구현에서 "정확한 최근성"까지 할지, 아니면 "오늘 기록 있음" 기반으로 시작할지 정해야 한다.
3. 지금 생성된 사람 포함 원화를 임시로 사용할지, 바로 사람 없는 base + sprite set을 만들지 정해야 한다. 현재 대화 기준 추천은 `base + sprite set` 즉시 제작이다.

## 추천 결정

- Slice 0에서 사람 없는 base room, 9 pose sprite sheet, actor별 27개 sprite, slot manifest를 먼저 만든다.
- Slice 1에서는 홈탭의 기존 `오늘의 칼로리/체중` 카드 위치에 base+sprite 기반 라이프존 카드를 연결하고, 칼로리/체중 요약은 하단 compact strip으로 흡수한다.
- Slice 2에서는 `오늘 기록 있음` 기반으로 3명 상태를 판정하고, 같은 상태의 여러 명은 슬롯 배열 순서대로 배치한다.
- Slice 4에서 저장 시점 activity snapshot을 추가해 "방금 올림/방금 운동함" 표현으로 고도화한다.
- 앱 코드 변경은 한 번에 크게 묶지 않는다. 첫 실행은 `아트 에셋/슬롯 준비`, 다음 실행은 `홈 카드 렌더러 연결`, 그 다음 실행은 `데이터 기반 상태 연결` 순서가 안전하다.

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-06-23-home-life-zone-card.md`의 Slice 1을 실행한다. `assets/home/life-zone/manifest.json`과 생성된 sprite를 사용해 홈탭의 기존 `오늘의 칼로리/체중` 카드 위치를 라이프존 카드로 교체하고, 기존 오늘 운동/식단 기록 기반으로 actor 상태를 판정한다. 앱 코드는 Slice 1 범위만 수정하고, `style.css` 또는 `STATIC_ASSETS` 항목을 수정하면 `sw.js` `CACHE_VERSION`을 함께 bump한다.

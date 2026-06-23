# 홈 라이프존 카드 연결 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 실행 범위: Slice 1 — 홈 라이프존 카드 연결 + 기존 데이터 상태 판정
- 변경 파일:
  - `home/life-zone-state.js`
  - `home/life-zone.js`
  - `home/tomato.js`
  - `style.css`
  - `sw.js`
  - `tests/home-life-zone-state.test.js`
  - `docs/ai/features/2026-06-23-home-life-zone-card.md`
  - `docs/ai/NEXT_ACTION.md`

## 결론

치명적 문제는 발견하지 못했다. 기존 `오늘의 칼로리/체중` 카드 위치는 `tf-life-zone-card`로 대체되었고, 라이프존 actor는 기존 오늘 기록 기반으로 `운동 > 식사 > 업무` 상태에 배치된다.

## 확인한 내용

- `home/life-zone-state.js`는 순수 함수로 account nickname/displayName 매칭, 운동/식단 기록 판정, 상태별 슬롯 분배를 수행한다.
- 같은 상태의 actor가 여러 명이면 `workout-lat/workout-bench/workout-squat`, `diet-left/diet-center/diet-right`, `office-upper/office-center/office-lower` 순서로 분산된다.
- `home/life-zone.js`는 홈 카드 DOM 렌더, actor overlay, summary strip, 비동기 계정/친구 기록 조회만 담당한다.
- Firestore 직접 호출은 추가하지 않았고, `data.js` export인 `getAccountList`, `getMyFriends`, `getFriendWorkout`만 사용한다.
- 계정 id가 확정되지 않은 상태라 `줍스/문정토마토/이재헌`은 닉네임/표시명 기반으로 자동 매칭한다. 매칭되지 않거나 친구가 아니면 업무존 기본 상태로 둔다.
- `style.css`와 `home/tomato.js`는 `STATIC_ASSETS`에 포함되므로 `sw.js`의 `CACHE_VERSION`을 bump했다.
- 새 모듈과 라이프존 이미지/sprite도 `STATIC_ASSETS`에 등록했다.
- 홈 카드에서 검정 바깥 배경이 테두리처럼 보이지 않도록 `base-room-alpha.png`를 생성하고 앱 참조를 alpha 이미지로 전환했다.
- alpha 이미지의 외곽 잔여 그림자 픽셀을 정리하고, 단색 갈색 outline `#58301c`를 추가해 방/바닥 경계를 더 명확하게 만들었다.
- 상태 dot은 상태별 색이 아니라 actor별 나시 색으로 고정했다.
  - `줍스`: `#ff525c`
  - `문정토마토`: `#52a6ff`
  - `이재헌`: `#5ada7e`
- 랫풀다운/벤치/스쿼트 모션은 이번 slice에 넣지 않았다. 단일 pose를 흔드는 방식은 정렬 리스크가 있고, 제대로 하려면 2-3프레임 sprite를 별도 제작해야 한다.

## 검증

- `node --check .\home\life-zone-state.js`
- `node --check .\home\life-zone.js`
- `node --check .\home\tomato.js`
- `node --check .\sw.js`
- `node --test .\tests\home-life-zone-state.test.js`
  - 결과: 5개 테스트 통과
- `python .\scripts\validate-life-zone-assets.py`
  - 결과: `validated base=1672x941, sprites=27`
- `STATIC_ASSETS` 파일 존재 검사
  - 결과: `static assets exist: 191`
- `git diff --check`
  - 결과: 통과

## not verified yet

브라우저 UI 플로우는 not verified yet이다. 이 환경에서는 long-lived dev server를 시작하지 않으며, 이전 `file://` mockup 자동화도 브라우저 정책으로 차단되었다. 사용자는 정상 터미널에서 `npm.cmd run dev` 실행 후 홈탭에서 카드 렌더와 버튼 동선을 확인해야 한다.

## 잔여 리스크

- 닉네임 매칭은 계정 데이터에 실제 `줍스`, `문정토마토`, `이재헌` 표시명이 있어야 정확하다. 실제 account id를 알면 roster 매핑을 고정하는 후속 수정이 필요하다.
- 현재 상태는 "오늘 기록 있음" 기반이다. "방금 식단 올림", "운동 입력 중" 표현은 activity snapshot을 추가하는 Slice 4가 필요하다.
- 실제 홈탭 카드 폭에서 sprite 좌표/scale 미세 조정이 필요할 수 있다.
- 운동 모션은 가능하지만 별도 animated sprite asset이 필요하다. 우선 lat pulldown 2프레임만 실험하는 것이 가장 낮은 리스크다.

## 다음 권장 액션

1. 정상 터미널에서 앱을 띄우고 홈탭 UI를 확인한다.
2. `줍스/문정토마토/이재헌` 실제 account id를 확정한다.
3. 계정 id 고정 매핑과 최근성 snapshot을 별도 slice로 진행한다.
4. 모션을 넣는다면 lat pulldown 2프레임 sprite부터 작은 slice로 검증한다.

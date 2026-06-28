# 러닝 기록 트랙 라이브 아트 계획

## 상태

- 상태: `reviewed`
- 작성일: `2026-06-29`
- 자동 트리거: `/grill-me`

## 요청 요약

이용자가 러닝 기록을 시작하면 러닝 세션 진행 화면에서 캐릭터들이 홈 라이프존 배경에 이미 있는 런닝트랙 위를 달리는 모션이 활성화되어야 한다. 캐릭터 머리 위에는 기존 전구 말풍선보다 약 2배 큰 지도 말풍선을 띄워, 실제 지도를 캡쳐한 듯한 미니 맵이 보이게 한다.

## 그릴 결과

- 핵심 질문: 이 효과를 홈 라이프존에 둘지, 러닝 기록이 시작되는 전용 러닝 화면에 둘지?
- 코드베이스 판단: 러닝 시작 플로우는 이미 `workout/running-session.js`의 full-screen `progress` 화면으로 분리되어 있고, 실제 지도 렌더링은 `workout/running-map.js`가 담당한다. 홈 화면에 있는 런닝트랙은 `assets/home/life-zone/base-room-expanded-alpha.png` 안에 포함되어 있다.
- 결정: 실행 Slice 1은 새 트랙 이미지를 만들지 않고 `wt-running-screen--progress` 안에서 홈 라이프존 배경의 트랙 부분을 crop처럼 재사용한다. 그 위에 runner overlay와 `data-running-real-map="progress-bubble"` 지도 shell을 말풍선 내부에 얹는다.
- 남은 가정: "캐릭터들"은 현재 앱의 라이프존 actor 스타일과 충돌하지 않는 독립 러너 실루엣 3명으로 처리한다. 특정 유저 캐릭터 매핑은 이번 slice에서 하지 않는다.

## 실행 Slice 1

### 목표

러닝 기록 시작 후 진행 화면에서 러닝트랙 위 캐릭터 달리기 모션과 큰 지도 말풍선이 즉시 보이도록 한다.

### 포함 범위

1. 새 트랙 에셋을 추가하지 않는다.
   - 사용자가 정정한 기준에 따라 홈 라이프존의 기존 배경 `assets/home/life-zone/base-room-expanded-alpha.png` 안에 있는 런닝트랙을 재사용한다.
   - 이전에 생성된 별도 draft 이미지는 프로젝트에 복사하거나 참조하지 않는다.
2. `workout/running-session.js`
   - `_renderProgress()`에 트랙 stage 마크업을 추가한다.
   - stage 내부에 runner lane 3개와 지도 말풍선 shell을 렌더한다.
   - `_pointsForMapKind()`가 `progress-bubble` 또는 equivalent kind에서 현재 route를 반환하게 한다.
   - 기존 시작/요약 지도와 save/load 데이터 구조는 변경하지 않는다.
3. `style.css`
   - 진행 화면에서 트랙 stage가 지표/버튼을 밀어내거나 겹치지 않게 배치한다.
   - 캐릭터 달리기 모션은 CSS animation으로 처리하고 `prefers-reduced-motion: reduce`에서 비활성화한다.
   - 지도 말풍선은 기존 전구 말풍선보다 약 2배 큰 시각 크기로 잡고, 작은 지도 캡쳐처럼 보이는 frame/clip을 둔다.
4. `sw.js`
   - `workout/running-session.js`, `style.css`는 `STATIC_ASSETS` 영향권이므로 `CACHE_VERSION`을 bump한다.
   - 기존 홈 라이프존 배경은 이미 `STATIC_ASSETS`에 등록되어 있으므로 신규 PNG 등록은 하지 않는다.
5. 테스트
   - `tests/running-entry.test.js` 또는 새 러닝 UI 테스트에서 progress stage, runner lanes, map bubble shell, 기존 홈 배경 재사용, reduced-motion 스타일, cache marker를 검증한다.

### 제외 범위

- GPS/지도 provider 자체 변경
- 러닝 데이터 저장 schema 변경
- 홈 라이프존 캐릭터/전구 말풍선 변경
- 유저별 캐릭터 선택, 프로필 아바타 연동
- 실제 브라우저 캡쳐 이미지를 파일로 저장하는 기능

### 에셋 결정

- 신규 생성 에셋: 없음.
- 재사용 에셋: `assets/home/life-zone/base-room-expanded-alpha.png`
- 메모: 계획 초안 단계에서 별도 트랙 이미지 생성을 고려했지만, 사용자 정정에 따라 프로젝트에는 반영하지 않는다.

## 검증

- 정적 검증:
  1. `node --check workout/running-session.js; node --check sw.js`
  2. `node --test tests/running-entry.test.js tests/running-tracker.test.js`
  3. `node scripts/verify-runtime-assets.mjs`
  4. `git diff --check`
- Dashboard3 Pages 검증:
  1. 커밋 후 `origin/main` push
  2. `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
  3. `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::<new-cache-version>" "workout/running-session.js::data-running-real-map=\"progress-bubble\"" "style.css::.wt-run-home-track-stage" "style.css::base-room-expanded-alpha.png"`
- UI flow:
  1. Dashboard3 Pages 접속
  2. `운동 탭 -> 런닝/조깅 -> 시작`
  3. 진행 화면에서 런닝트랙 아트, 달리는 캐릭터 모션, 캐릭터 머리 위 큰 지도 말풍선이 보이면 PASS
  4. 인증/위치 권한 때문에 실제 flow를 직접 행사하지 못하면 `not verified yet`과 blocker를 기록한다.

## 다음 실행 시작 프롬프트

`docs/ai/features/2026-06-29-running-track-live-art.md`의 실행 Slice 1을 구현한다. 앱 코드는 이 slice 범위 안에서만 수정하고, 신규 트랙 PNG를 만들지 말고 홈 라이프존의 기존 `base-room-expanded-alpha.png` 트랙을 재사용한다. `sw.js` cache version은 함께 갱신한다.

## 실행 결과

- `workout/running-session.js`: 러닝 진행 화면에 `wt-run-home-track-stage`를 추가하고, `progress-bubble` 지도 shell이 현재 route/preview point를 쓰도록 연결했다.
- `style.css`: 홈 라이프존 배경의 `base-room-expanded-alpha.png`를 crop처럼 재사용하는 트랙 stage, 러너 3명 모션, 지도 말풍선, reduced-motion fallback을 추가했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260629z1-running-home-track-live`로 갱신했다.
- `tests/running-entry.test.js`: 신규 PNG가 없고 기존 홈 배경을 재사용하는지, `progress-bubble` 지도 shell과 runner 모션이 존재하는지 검증을 추가했다.
- 기존 cache marker 테스트들은 새 `CACHE_VERSION`에 맞게 갱신했다.
- 별도 생성 draft 이미지는 프로젝트에 복사하지 않았고 runtime 참조도 없다.

## 로컬 검증

- PASS: `node --check workout/running-session.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/home-life-zone-npc-quest.test.js` — 19 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 584 tests passed
- PASS: `git diff --check`

## 리뷰 결과

- 리뷰 문서: `docs/ai/reviews/2026-06-29-running-home-track-live-art-review.md`

# 다음 자동 액션

## 현재 상태

- 상태: `complete`
- 계획 문서: `docs/ai/features/2026-06-24-workout-card-collapse-regression.md` (운동 카드 접기/펼치기 UI 회귀)
- 현재 단계: `review complete — 접힌 운동 상세 카드 완료 버튼 오클릭 차단`
- 마지막 완료: `운동 상세 카드가 접힌 상태에서 왼쪽 운동 완료 버튼이 편집 화면으로 이동하던 onclick을 제거하고, render-calendar.js 캐시 반영을 위해 sw.js CACHE_VERSION을 bump했다.`
- 다음 액션: `없음. 사용자는 로컬에서 운동 탭 월간 홈의 기록 날짜 상세를 열어 접힌 카드의 운동 완료 클릭이 편집 화면으로 이동하지 않는지 확인하면 된다.`
- 차단 사유: `not verified yet: 프로젝트 규칙상 장시간 dev server를 여기서 실행해 UI 검증 완료로 주장하지 않았다. 로컬 브라우저 플로우 확인이 남아 있다.`

## 다음 실행 대상

- 계획 파일: `docs/ai/features/2026-06-24-workout-card-collapse-regression.md`
- 방금 완료한 Slice 1:
  1. `render-calendar.js` 접힌 운동 상세 카드의 `운동 완료` 버튼에서 `_wtCalEditSession()` 호출 제거
  2. 접힌 카드의 펼치기는 기존 `세트 다시 보기` 버튼으로 유지
  3. 펼친 카드의 명시적 `편집하기` 경로 유지
  4. `sw.js` `CACHE_VERSION` bump
  5. `docs/ai/reviews/2026-06-24-workout-card-collapse-regression-review.md` 작성

- 검증:
  1. PASS: `node --check render-calendar.js`
  2. PASS: `node --check sw.js`
  3. PASS: `git diff --check`
  4. not verified yet: dev server/browser flow는 이 세션에서 실행하지 않았다. 확인 플로우는 운동 탭 월간 홈에서 기록 날짜 상세를 열고 카드 접기 후 접힌 카드의 `운동 완료` 클릭이 편집 화면으로 이동하지 않는지 확인한다.

## 이전 흐름 요약

- 이전 홈 라이프존 Slice 9:
  1. `home/life-zone-state.js`에 actor owner id 후보와 `readAccountId` 추가
  2. `home/life-zone.js`에서 이웃 actor의 오늘 문서를 owner id 후보로 읽도록 보정
  3. 방금 입력한 기록이 바로 반영되도록 라이프존 actor 상태 캐시 비활성화
  4. `tests/home-life-zone-state.test.js`에 줍스 식단-only 상태 회귀 테스트 추가
  5. `sw.js` `CACHE_VERSION` bump
  6. `docs/ai/reviews/2026-06-23-home-life-zone-diet-read-review.md` 작성

- 방금 완료한 Slice 8:
  1. `home/life-zone-state.js`에서 `workoutDuration > 0`을 운동 활동으로 판정
  2. `tests/home-life-zone-state.test.js`에 운동 시간만 입력된 날의 라이프존 회귀 테스트 추가
  3. `sw.js` `CACHE_VERSION` bump
  4. `docs/ai/reviews/2026-06-23-home-life-zone-duration-review.md` 작성

- 방금 완료한 Slice 7:
  1. `style.css` `.lz-speech` 배경을 반투명 흰색으로 변경
  2. `style.css` `.lz-speech`에 `backdrop-filter` 추가
  3. `sw.js` `CACHE_VERSION` bump

- 방금 완료한 Slice 6:
  1. `home/life-zone-state.js`에 운동/식단/업무 말풍선 문구 생성 로직 추가
  2. `home/life-zone.js`에서 actor sprite 위 말풍선 렌더링 추가
  3. `style.css`에 `.lz-speech` 스타일 추가
  4. `tests/home-life-zone-state.test.js`에 대근육/식단 말풍선 테스트 추가
  5. `sw.js` `CACHE_VERSION` bump
  6. `docs/ai/reviews/2026-06-23-home-life-zone-speech-review.md` 작성

- 방금 완료한 Slice 5:
  1. `scripts/make-life-zone-base-alpha.py`에서 anti-aliased outline 생성으로 변경
  2. `assets/home/life-zone/base-room-alpha.png` 재생성
  3. `style.css` `.lz-base`를 `image-rendering:auto`로 변경
  4. `docs/pixel-life-zone-mockup.html` base preview 렌더링 변경
  5. `scripts/validate-life-zone-assets.py` outline 검증 기준 변경
  6. `sw.js` `CACHE_VERSION` bump
  7. `docs/ai/reviews/2026-06-23-home-life-zone-soft-border-review.md` 작성

- 방금 완료한 Slice 3:
  1. `home/hero.js`에서 랭킹 렌더링 대상을 상위 5명으로 제한
  2. `sw.js` `CACHE_VERSION` bump
  3. `docs/ai/reviews/2026-06-23-home-ranking-top5-review.md` 작성

- 방금 완료한 Slice 2:
  1. `home/hero.js`에서 랭킹 참가자 소스를 전체 계정으로 변경
  2. 누적/주간 모두 전체 계정의 기록을 읽어 계산
  3. `sw.js` `CACHE_VERSION` bump
  4. `docs/ai/reviews/2026-06-23-home-ranking-all-accounts-review.md` 작성

- 방금 완료한 Slice:
  1. `index.html`에서 함께 축하해요 카드와 길드 카드를 제거하고 랭킹 UI를 `랭킹`/`누적·주간`으로 변경
  2. `home/index.js`에서 공용 축하 카드와 홈 길드 카드 렌더 호출 제거
  3. `home/hero.js`에서 랭킹 상태를 `cumulative/weekly`로 전환하고 선택값 저장
  4. `sw.js` `CACHE_VERSION` bump
  5. `docs/ai/reviews/2026-06-23-home-ranking-cleanup-review.md` 작성

## 이전 완료 항목

- 계획 파일: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 방금 완료한 Slice 0:
  1. `assets/home/life-zone/base-room.png`
  2. `assets/home/life-zone/sprites/*.png` 27개
  3. `assets/home/life-zone/manifest.json`
  4. `scripts/process-life-zone-sprites.py`
  5. `docs/pixel-life-zone-mockup.html`
- 방금 완료한 Slice 1:
  1. `home/life-zone-state.js`
  2. `home/life-zone.js`
  3. `home/tomato.js`
  4. `style.css`
  5. `sw.js`
  6. `tests/home-life-zone-state.test.js`
  7. `assets/home/life-zone/base-room-alpha.png`
  8. `scripts/make-life-zone-base-alpha.py`
- 다음 실행 후보:
  1. 계정 id 고정 매핑: `줍스`, `문정토마토`, `이재헌`의 실제 account id를 roster에 반영
  2. Slice 4: 저장 시점 activity snapshot으로 "방금 올림/방금 운동함" 최근성 반영
  3. 운동 모션 실험: lat pulldown 2프레임 sprite를 만들고 낮은 비용의 frame animation으로 검증

## 보류 중 (이전 흐름)

- `docs/ai/features/2026-06-23-pixel-life-zone-mockup.md` — bitmap 생성/정적 검증 완료, HTTP/UI 시각 검증은 not verified yet.
- `docs/ai/features/2026-06-12-test-mode-simplify-wendler.md` — v1 개편 실행 완료(커밋 2922b64까지), 리뷰 미수행. **v2 구현으로 v1은 동결 상태** — 해당 리뷰는 폐기 권장.
- `docs/ai/features/2026-06-20-calendar-workout-tab.md` — Slice 1 구현, 리뷰, tomatofarm 원격 배포 완료. 후속 Slice 2는 로컬 정적 검증 완료, 브라우저 UI 플로우는 not verified yet.
- `docs/ai/features/2026-06-20-growth-board-wendler-default-history.md` — 로컬 정적 검증 완료, 브라우저 UI 플로우는 not verified yet.

## 상태값

- `idle`: 진행 중인 자동 액션 없음
- `needs_user_decision`: 사용자 결정이 필요함
- `ready_for_execution`: 다음 실행 슬라이스를 바로 진행
- `ready_for_review`: 직전 실행 결과를 바로 리뷰
- `ready_for_fix`: 리뷰에서 발견된 문제만 바로 수정
- `complete`: 현재 계획 완료

## 자동 진행 규칙

- 세션 시작 시 이 파일을 먼저 읽는다.
- 사용자가 "계속", "다음", "진행", "리뷰해", "해줘"처럼 짧게 말하면 이 파일의 `다음 액션`을 실행한다.
- 사용자가 새로운 요청을 명시하면 새 요청이 우선한다. 단, 기존 대기 액션과 충돌하면 어느 흐름을 계속할지 한 번만 확인한다.
- 계획 세션 종료 후 차단 질문이 없으면 `ready_for_execution`으로 갱신한다.
- 실행 세션 종료 후 `ready_for_review`로 갱신한다.
- 리뷰 세션 종료 후 문제가 있으면 `ready_for_fix`, 문제가 없고 다음 슬라이스가 있으면 `ready_for_execution`, 모든 슬라이스가 끝났으면 `complete`로 갱신한다.
- 다음 프롬프트나 리뷰 프롬프트를 사용자에게 복붙하라고 요구하지 않는다. 필요한 프롬프트 내용은 계획 문서와 이 파일에 남기고 에이전트가 직접 읽어 진행한다.

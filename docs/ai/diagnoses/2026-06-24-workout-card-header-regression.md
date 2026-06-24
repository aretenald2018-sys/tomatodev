# 운동 카드 헤더 UI 회귀 진단

## 증상

- 운동 추가 직후 오늘 운동 카드에서 운동명이 좁은 폭에 갇혀 세로로 줄바꿈된다.
- 스크린샷 기준 `바벨 벤치프레스`가 정상적인 제목 폭을 받지 못하고 `바벨 벤 / 치프레 / 스`처럼 보인다.

## 재현 루프

- 코드 기준 재현:
  - `workout/exercises.js` 일반 운동 카드 렌더 구조 확인
  - `style.css` 일반 운동 카드 헤더 레이아웃 확인
- 회귀 방어:
  - `tests/workout-card-layout-css.test.js`

## 원인 가설과 판정

- 가설 1: picker 필터 CSS가 운동 카드 CSS에 새어 들어갔다.
  - 판정: 아님. 최근 picker CSS는 `#ex-picker-modal` 또는 `.ex-picker-*` 중심으로 scoped되어 있다.
- 가설 2: 운동 카드 헤더가 한 줄 flex이고 스파크라인 고정 폭 때문에 운동명 영역이 줄어든다.
  - 판정: 맞음. `.ex-sparkline-wrap`은 `min-width:176px`이고, 삭제 버튼도 고정 폭이다. 모바일 카드 폭에서 `.ex-block-name`이 남은 좁은 공간으로 밀린다.
- 가설 3: 운동명 자체에 강제 줄바꿈 문자가 저장됐다.
  - 판정: 근거 없음. 렌더는 `${ex?.name || entry.exerciseId}` 원문을 그대로 출력한다.

## 수정

- `#tab-workout .ex-block-header`에 `flex-wrap: wrap` 적용.
- `#tab-workout .ex-block-name`에 최소 폭과 `word-break: keep-all` 적용.
- `#tab-workout .ex-block-header .ex-sparkline-wrap`을 다음 줄 전체 폭으로 배치.
- 삭제 버튼의 `margin-left:auto` 상속을 `#tab-workout` 범위에서 제거.
- CSS 회귀 테스트 추가.

## 추가 하드닝

- CSS wrap만으로는 같은 헤더 컨테이너 안에 스파크라인이 남아 있어 구조적 재발 여지가 있었다.
- 일반 운동 카드 DOM에서 `${sparkline}`을 `ex-block-header` 밖으로 이동해 별도 `ex-block-trend` 행으로 렌더한다.
- 회귀 테스트에 DOM source check를 추가해 스파크라인이 헤더 안으로 다시 들어오면 실패하게 했다.

## 검증

- PASS: `node --test tests/workout-card-layout-css.test.js`
- PASS: `node --check workout/exercises.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

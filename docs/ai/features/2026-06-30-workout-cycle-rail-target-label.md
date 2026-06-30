# 운동 캘린더 사이클 레일 목표 라벨 축약

## 요청

운동 탭 월간 캘린더 좌측 사이클 목표값 라벨에서 `W1`부터 줄바꿈하고, 운동명 대신 목표 kg 정도만 작게 보여 높이가 너무 커지지 않게 한다.

## 그릴 결과

- 핵심 질문: 좌측 목표 라벨에 운동명까지 계속 노출해야 하는가?
- 답변/결정: 화면 라벨에는 `W1`과 `목표 50kg`처럼 주차와 목표 kg만 노출한다. 운동명, 트랙, reps 정보는 `title`/`aria-label`에 유지해 탭 대상과 설정 진입 맥락은 잃지 않는다.
- 남은 가정: 인증 계정이 없어 실제 사용자 데이터가 들어간 운동 탭 UI는 직접 조작하지 못할 수 있다. 이 경우 정적/회귀 테스트와 Dashboard3 배포 asset marker로 검증하고 `not verified yet`을 명시한다.

## Slice 1 — 레일 라벨을 주차/목표 kg 2줄로 압축

### 포함

- `render-calendar.js`에서 사이클 레일 item에 `weekLabel`, `targetLabel`을 분리해 만든다.
- 레일 버튼 HTML을 `W1`과 `목표 50kg` 두 줄 구조로 렌더한다.
- `style.css`에서 `.cal-cycle-branch`를 작은 2줄 라벨에 맞게 정렬하고 높이가 과하게 커지지 않도록 font/line-height/padding을 조정한다.
- `tests/workout-calendar-bottom-sheet.test.js`에 렌더/CSS marker 회귀 테스트를 갱신한다.
- `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- 사이클/웬들러 처방 계산 로직 변경.
- 목표 설정 시트 또는 성장보드 데이터 구조 변경.
- 날짜 셀, 하단 day sheet, 캘린더 스크롤/드래그 동작 변경.
- `www/` 직접 수정.
- `tomatofarm` remote 배포.

## 예상 변경 파일

- `render-calendar.js`
- `style.css`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/reviews/2026-06-30-workout-cycle-rail-target-label-review.md`

## 검증 계획

- `node --check render-calendar.js`
- `node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test --test-reporter=dot tests/*.test.js`
- `git diff --check`
- 커밋 후 `git push origin main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL marker 확인:
  - `render-calendar.js`의 `weekLabel`/`targetLabel`
  - `style.css`의 `.cal-cycle-branch-week`, `.cal-cycle-branch-target`
  - `sw.js`의 새 cache version

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-workout-cycle-rail-target-label.md` Slice 1을 실행한다.

## 실행 결과

- `render-calendar.js`에서 사이클 레일 item의 표시값을 `weekLabel`, `targetLabel`로 분리했다.
- 레일 버튼은 `cal-cycle-branch-week`와 `cal-cycle-branch-target` 두 줄로 렌더한다.
- 화면 표시 텍스트는 `W1`/`목표 50kg` 구조로 축약했고, 운동명/트랙/reps는 기존 `title`/`aria-label`에 유지했다.
- `style.css`에서 사이클 레일 버튼을 작은 2줄 라벨에 맞게 `font-size`, `line-height`, `min-height`, padding을 조정했다.
- `tests/workout-calendar-bottom-sheet.test.js`에 `weekLabel`, `targetLabel`, 2줄 span, CSS marker 검증을 추가했다.
- 후속 운동 기록 날짜 행 제거 변경과 같은 배포 묶음에서 `sw.js` `CACHE_VERSION` 최종값은 `tomatofarm-v20260630z05-workout-record-date-row`로 갱신했다.

검증:

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` — 16 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: Dashboard3 Pages 배포 검증 — `b01a336c8f56`, `tomatofarm-v20260630z05-workout-record-date-row`
- PASS: Dashboard3 Pages marker 직접 fetch — `sw.js`의 cache version, `render-calendar.js`의 `weekLabel`/`cal-cycle-branch-target`, `style.css`의 2줄 라벨 CSS 확인
- not verified yet: 인증 계정 실제 `운동 탭 -> 월간 캘린더 좌측 사이클 레일` UI flow 확인이 남아 있다.

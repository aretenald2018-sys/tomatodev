# 통계 근육 현출 및 운동 Picker UI 보정

## 상태

- 상태: `implemented_static_verified`
- 요청:
  1. 통계 화면의 파란색 보강 부위가 근육에 직접 현출되지 않고 오오라처럼 보여서, 붉은색처럼 직접 근육 위에 현출되게 한다.
  2. 운동 picker 분류 화면의 좌측 칩이 너무 크고 뚱뚱하므로 한 줄 안에 들어오게 작고 얇게 만든다.
  3. picker 상단 `커스텀` 탭을 삭제한다.
  4. picker 하단의 `슈퍼세트` 등 모드 탭/바를 삭제한다.
- 적용 트리거: `/grill-me`. 단, 스크린샷과 코드에서 답이 충분히 확인되어 추가 질문 없이 진행한다.

## 그릴 결과

- 결정 1: 파란색 보강 부위는 별도 glow가 아니라 붉은색과 동일한 이미지 합성 방식(`mix-blend-mode: color`)으로 처리한다. blur와 `screen` 합성을 제거해 근육 내부 착색처럼 보이게 한다.
- 결정 2: 좌측 rail 칩은 pill 카드가 아니라 compact list button으로 바꾼다. 이름과 count가 한 줄에 들어오도록 `flex` 레이아웃, 낮은 높이, 작은 font를 적용한다.
- 결정 3: 상단 탭은 분류/전체만 유지한다. 커스텀 종목은 검색 또는 종목 추가 흐름으로 접근 가능하므로 상단 탭에서는 제거한다.
- 결정 4: 하단 `슈퍼세트` 바 전체를 제거한다. 완료 버튼도 하단 고정 바에서 제거되므로 picker는 종목 선택 시 즉시 닫히는 기존 목록 흐름에 맞춘다.

## Slice 1: 스크린샷 기준 UI 보정

### 구현 범위

1. `style.css`에서 `.stats-fatigue-hotspot.is-under/is-low`의 별도 screen glow 규칙을 제거하고 blur를 낮춰 근육 직접 착색으로 조정한다.
2. `workout/exercises.js`의 category/list 상단 탭 렌더에서 `커스텀` 탭을 제거한다.
3. `workout/exercises.js`에서 category rail 칩 HTML을 한 줄 구조로 조정한다.
4. `style.css`에서 category rail 칩 크기/간격/폰트를 compact하게 줄인다.
5. `modals/ex-picker-modal.js`에서 하단 footer를 제거한다.
6. footer 제거 후 picker 완료 버튼 의존 코드가 무해하게 동작하는지 확인한다.
7. 캐시 대상 파일 변경이므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외 범위

- Picker 종목 선택 정책 재변경.
- 커스텀 종목 생성/수정 기능 제거.
- 통계 카드 정보 구조 재설계.

### 검증

1. `node --check workout/exercises.js; node --check render-stats.js; node --check sw.js`
2. Source-level UI 회귀 테스트 추가: blue hotspot이 screen glow를 쓰지 않음, custom 탭 렌더 없음, footer superset 없음, rail chip compact CSS 있음.
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
6. UI 직접 검증은 인증 화면에 막히면 `not verified yet`로 기록한다.

### 실행 결과

1. `style.css`의 통계 hotspot에서 blur와 파란색 전용 `screen` 합성을 제거해, 보강 부위도 붉은 부위처럼 이미지 위에 직접 색이 섞이게 했다.
2. `workout/exercises.js`의 상단 category 탭에서 `커스텀` 탭을 제거했다.
3. picker category 좌측 rail을 compact 한 줄 chip으로 줄였다.
4. `modals/ex-picker-modal.js`에서 하단 `슈퍼세트`/정보/완료 footer를 제거했다.
5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z32-stats-picker-ui-polish`로 올렸다.

### 실행 검증

1. PASS: `node --check workout/exercises.js; node --check render-stats.js; node --check modals/ex-picker-modal.js; node --check workout/timers.js; node --check workout/load.js; node --check utils/build-info.js; node --check sw.js`
2. PASS: `node --test tests/stats-picker-ui-polish.test.js tests/workout-active-session-recovery.test.js tests/workout-track-graph-delta.test.js tests/workout-test-mode-unified.test.js tests/stats-muscle-fatigue-insight.test.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `git diff --check`
5. not verified yet: Dashboard3 Pages 배포와 인증 후 UI 플로우 확인은 최종 배포 단계에서 수행한다.

## 다음 세션 시작 지시

`docs/ai/features/2026-06-24-stats-picker-ui-polish.md`의 Slice 1을 실행한다.

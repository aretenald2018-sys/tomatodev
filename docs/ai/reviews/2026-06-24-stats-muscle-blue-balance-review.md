# 통계탭 근육 활성 blue balance Slice 3 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-06-23-stats-muscle-fatigue-render.md` Slice 3
- 변경 파일:
  - `render-stats.js`
  - `style.css`
  - `sw.js`
  - `tests/stats-muscle-fatigue-insight.test.js`
  - `tests/workout-test-mode-unified.test.js`

## 결과

- PASS: 많이 쓴 부위는 `hot` red tint, 상대적으로 덜 쓴 부위는 `under`/`low` blue tint로 분리했다.
- PASS: 색만 보여주지 않고 `다음 운동 힌트`에서 보강 후보 1-2개와 `2-4세트 먼저` 행동을 제안한다.
- PASS: 요약 카드가 `집중 부위`, `보강 후보`, `총 볼륨`으로 바뀌어 사용자가 다음 운동 우선순위를 빠르게 읽을 수 있다.
- PASS: row 목록에는 `보강`/`낮음`/`집중`/`균형` badge와 세트 수, 상대 상태 문구가 함께 표시된다.
- PASS: 기존 운동 저장 스키마, Firestore 접근, 통계탭 다른 차트 계산은 변경하지 않았다.
- PASS: `render-stats.js`와 `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z29-stats-blue-balance`로 bump했다.

## 검증

- PASS: `node --check render-stats.js; node --check sw.js`
- PASS: `node --test tests/stats-muscle-fatigue-insight.test.js tests/workout-test-mode-unified.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포와 인증 계정 UI 클릭 검증은 배포 단계에서 진행한다.

## 잔여 리스크

- 상대 활성 기준은 기간 내 최고 활성 대비 비율이다. 절대 권장 세트 기준으로 부족/과다를 판단하려면 부위별 목표 세트 정책을 별도 Slice로 추가해야 한다.
- 배포 URL은 로그인 화면에 막힐 수 있어 실제 통계 카드의 red/blue 시각 균형과 줄바꿈은 인증 계정으로 확인이 필요하다.

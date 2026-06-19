# 운동 타이머 live elapsed 수정 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-19-workout-timer-live-elapsed.md`
- 변경 파일:
  - `workout/timers.js`
  - `sw.js`
  - `docs/ai/features/2026-06-19-workout-timer-live-elapsed.md`

## 결과

- 차단 이슈 없음.
- `workout/timers.js` 변경은 `workoutDuration`, 세트 payload, 사진 필드, Firebase day document 저장 구조를 바꾸지 않는다.
- active timer 설정 포인터(`_settings.active_timer`)는 기존 필드인 `startedAt`, `date`만 유지하며, date 값을 숫자 `{ y, m, d }`로 정규화한다.
- `workout/timers.js`가 `sw.js` `STATIC_ASSETS`에 포함되어 있고 `CACHE_VERSION`이 범프되어 캐시 규칙을 충족한다.

## 검증

- PASS: `node --check workout/timers.js`
- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 잔여 리스크

- 브라우저 UI flow는 not verified yet. 이 세션의 상위 지침상 장기 dev server를 새로 띄우지 않았으므로, 사용자가 로컬에서 `npm.cmd run dev` 실행 후 운동 탭 타이머 시작/세트 입력 흐름을 확인해야 한다.
- 별도 Node 실행 스텁은 `data.js`의 원격 `https:` import 체인으로 막혀 수행하지 못했다.

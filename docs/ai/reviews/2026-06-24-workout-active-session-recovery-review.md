# 운동 중 새로고침 세션 복구 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-active-session-recovery.md`
- 코드: `workout/timers.js`, `workout/load.js`, `workout/exercises.js`, `utils/build-info.js`, `sw.js`
- 테스트: `tests/workout-active-session-recovery.test.js`

## 결과

- Finding 없음.

## 확인 사항

1. 로컬 초안은 유저별 키를 사용하고, passive context에서는 기존 초안 또는 running timer가 없으면 새 초안을 만들지 않아 완료된 과거 운동을 업데이트 패널에서 진행 중 운동으로 오인하지 않는다.
2. 같은 날짜/회차 초안만 `loadWorkoutDate()`에 적용되므로 다른 날짜 편집 중인 세션이 섞이지 않는다.
3. `wtFinishWorkout()`은 저장 성공 후에만 active timer와 초안을 정리하므로 저장 실패 시 사용자가 다시 복구/종료할 수 있다.
4. 업데이트 버튼은 reload 직전에 `window.__wtPersistActiveDraft()`를 호출하고, 활성 초안이 있으면 기록 보존 문구를 표시한다.
5. `sw.js` 캐시 버전이 함께 갱신됐다.

## 검증

1. PASS: `node --check workout/timers.js; node --check workout/exercises.js; node --check workout/load.js; node --check utils/build-info.js; node --check sw.js`
2. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-track-graph-delta.test.js tests/workout-test-mode-unified.test.js tests/stats-muscle-fatigue-insight.test.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `git diff --check`
5. not verified yet: 인증 화면 때문에 실제 운동 중 새로고침 후 UI 복구와 리포트 진입은 배포 후 계정으로 확인해야 한다.

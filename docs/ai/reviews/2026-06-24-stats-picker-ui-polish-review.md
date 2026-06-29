# 통계 근육 현출 및 운동 Picker UI 보정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-stats-picker-ui-polish.md`
- 코드: `style.css`, `workout/exercises.js`, `modals/ex-picker-modal.js`, `sw.js`
- 테스트: `tests/stats-picker-ui-polish.test.js`, `tests/stats-muscle-fatigue-insight.test.js`

## 결과

- Finding 없음.

## 확인 사항

1. 파란 보강 hotspot은 더 이상 `screen` 합성을 쓰지 않고 공통 `mix-blend-mode: color`를 사용한다.
2. hotspot blur를 제거해 이미지 밖으로 퍼지는 오오라 효과를 줄였다.
3. picker category 상단 탭은 `분류`, `전체`만 렌더한다.
4. picker 하단 footer DOM에서 `슈퍼세트`, 정보 아이콘, 완료 버튼을 제거했다.
5. category 좌측 rail chip은 `min-height: 34px`, `font-size: 10.5px`, `white-space: nowrap`, `text-overflow: ellipsis`로 한 줄 compact 표시를 강제한다.
6. 서비스워커 캐시 버전이 함께 갱신됐다.

## 검증

1. PASS: `node --check workout/exercises.js; node --check render-stats.js; node --check modals/ex-picker-modal.js; node --check workout/timers.js; node --check workout/load.js; node --check utils/build-info.js; node --check sw.js`
2. PASS: `node --test tests/stats-picker-ui-polish.test.js tests/workout-active-session-recovery.test.js tests/workout-track-graph-delta.test.js tests/workout-test-mode-unified.test.js tests/stats-muscle-fatigue-insight.test.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `git diff --check`
5. not verified yet: 인증 화면 때문에 실제 통계/picker 화면은 배포 후 계정으로 확인해야 한다.

# 운영 운동기록 복원 및 overwrite 재발 방지 리뷰

## 대상

- 계획: `docs/ai/features/2026-06-26-workout-data-restore-write-guard.md`
- 커밋: `a0ef75d88948`
- 변경 파일:
  - `data/data-save.js`
  - `sheet.js`
  - `render-cooking.js`
  - `sw.js`
  - `scripts/restore-workout-from-pitr.mjs`
  - `tests/workout-save-mode-guard.test.js`
  - 캐시 버전 참조 테스트들
  - `docs/ai/features/2026-06-26-workout-data-restore-write-guard.md`
  - `docs/ai/NEXT_ACTION.md`

## 리뷰 결과

- 발견 이슈: 없음.
- `saveDay()` 기본값이 `merge`로 바뀌었고 `replace`는 `allowReplace:true` 없이는 차단된다.
- `sheet.js`와 `render-cooking.js`의 bare `saveDay()` 호출은 모두 명시 merge 저장으로 바뀌었다.
- `render-cooking.js`는 전체 cached day 객체가 아니라 식단 patch만 저장하므로 운동 필드를 다시 비울 경로가 사라졌다.
- `tests/workout-save-mode-guard.test.js`가 runtime `saveDay()` 호출의 merge mode를 고정한다.
- `sw.js` `CACHE_VERSION`은 `tomatofarm-v20260626z13-workout-save-merge-guard`로 bump됐고, 관련 캐시 버전 테스트들도 갱신됐다.
- `users/김_태우/workouts/2026-06-26` 복원은 PITR 원본에서 운동 도메인 필드만 `PATCH` updateMask로 적용했다. 식단/사진 식단 필드는 건드리지 않았다.

## 검증

- PASS: `node --check data/data-save.js; node --check sheet.js; node --check render-cooking.js; node --check sw.js; node --check tests/workout-save-mode-guard.test.js`
- PASS: `node --check scripts/restore-workout-from-pitr.mjs`
- PASS: `node --test tests/workout-save-mode-guard.test.js tests/workout-save.test.js tests/workout-sessions.test.js` — 11 tests passed.
- PASS: `node --test .\tests\*.test.js` — 549 tests passed.
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`.
- PASS: `git diff --check`.
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a0ef75d`.
- PASS: cache-bust HTTP marker 확인: `sw.js`, `data/data-save.js`, `render-cooking.js`, `sheet.js`.
- PASS: Firestore read-after-write 확인 — `김_태우 / 2026-06-26`은 exercises 5, workoutSessions 1, sets 31, `gymId`/`maxMeta` 복원.

## 잔여 리스크

- 인증 세션이 없어 배포 URL에서 실제 UI 클릭 flow는 직접 확인하지 못했다.
- `김_태우 / 2026-06-22`, `최_준수 / 2026-06-22`, `2026-06-25`, `2026-06-26`은 PITR에서 active workout source가 없어 상세 운동 기록으로 복원하지 않았다.
- `_weekly_ranking/current`는 식단까지 active로 세는 서버 함수 결과라 운동 상세 복원 기준으로 쓰면 안 된다.

## 결론

- 실행 범위는 계획과 일치한다.
- 재발 방지 코드와 `김_태우 / 2026-06-26` 상세 운동기록 복원은 검증 완료.
- 다음 상태는 `complete`.

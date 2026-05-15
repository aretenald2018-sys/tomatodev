# Exercise SSOT Final Review

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-05-15-exercise-ssot.md`
- ADR: `docs/adr/2026-05-15-exercise-ssot.md`
- 슬라이스:
  - Slice 1: 운동종목 카탈로그 seed migration
  - Slice 2: 삭제/참조 정합성 강화
  - Slice 3: 성장판 계획 SSOT 정리
  - Slice 4: 소비자 정리 및 브라우저 검증 준비

## 결과

- Blocker: 없음.
- 운동종목 카탈로그는 Firestore `users/{uid}/exercises`를 canonical store로 사용한다.
- `CONFIG.DEFAULT_EXERCISES`는 seed 완료 전 누락 기본 운동을 Firestore에 쓰는 template로만 사용한다.
- `settings/max_cycle`은 성장판 계획 canonical store다.
- `expert_preset.maxCycle`은 load migration/fallback과 cleanup 대상이며 신규 저장 경로에서는 제외된다.
- 운동종목 삭제는 연결된 성장판 벤치마크를 `exerciseId` 기준으로 정리한다.
- 변경 소비자 모듈은 ESM query `20260515v5`와 service worker cache `tomatofarm-v20260515z94-exercise-ssot-consumers`로 갱신했다.

## 검증

- `node --test tests/data.load-save.test.js`
- `node --test tests/calc.max.test.js`
- `node --test tests/workout-save.test.js tests/save-schema.test.js tests/workout-fixture.test.js`
- `node --check app.js`
- `node --check render-workout.js`
- `node --check workout-ui.js`
- `node --check workout/index.js`
- `node --check workout/load.js`
- `node --check workout/exercises.js`
- `node --check workout/expert.js`
- `node --check workout/expert/max.js`
- `git diff --check`

## 수동 검증 필요

- sandbox 장기 dev server 금지 규칙 때문에 실제 브라우저 UI는 아직 미검증이다.
- 로컬 터미널에서 `npm.cmd run dev` 실행 후 다음을 확인한다:
  - 기본 운동 삭제 후 새로고침해도 다시 나타나지 않음
  - 커스텀 운동 추가/수정/삭제가 Firestore 목록 기준으로 유지됨
  - 계획 조정 벤치마크 추가에 랫풀다운/RDL 등 등록 종목이 표시됨
  - 볼륨/강도 값 저장 후 새로고침해도 유지됨
  - 운동종목/기구 삭제 후 연결 벤치마크가 남지 않음

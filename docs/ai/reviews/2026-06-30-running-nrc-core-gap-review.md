# Running NRC Core Gap 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-30-running-nrc-core-gap.md`
- 구현 파일:
  1. `workout/running-session.js`
  2. `style.css`
  3. `sw.js`
  4. `tests/running-entry.test.js`
  5. cache version 기대값을 가진 테스트 파일들

## Findings

- 발견된 차단 이슈 없음.

## 확인 내용

- `목표 설정` placeholder toast가 제거되고 실제 goal sheet/action으로 연결됐다.
- 목표 타입은 `자유`, `거리 km`, `시간 분`만 지원하므로 Slice 1 범위를 넘지 않는다.
- Web Speech API 호출은 `speechSynthesis`/`SpeechSynthesisUtterance` 존재 여부를 확인한 뒤 실행하므로 미지원 브라우저에서 조용히 건너뛴다.
- 음성 cue는 시작, pause/resume, 1km split, 목표 halfway, 목표 완료, 종료 summary에 한정된다.
- `S.workout.runData` schema는 변경하지 않았다.
- `style.css`와 `workout/running-session.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` cache version을 `tomatofarm-v20260630z18-running-voice-goals`로 bump했다.

## 검증

1. PASS: `node --check workout/running-session.js; node --check sw.js`
2. PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/pwa-update-auto-reload.test.js`
3. PASS: 전체 테스트 — `node --test --test-reporter=dot $files`
4. PASS: `node scripts/verify-runtime-assets.mjs`
5. PASS: `git diff --check`
6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 82bd3d3` → `[deploy-verify] ok 82bd3d3f4de5 tomatofarm-v20260630z18-running-voice-goals static=233`
7. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ sw.js::tomatofarm-v20260630z18-running-voice-goals workout/running-session.js::audio-toggle workout/running-session.js::goal-save workout/running-session.js::SpeechSynthesisUtterance style.css::wt-run-goal-sheet style.css::wt-run-goal-progress`

## 남은 리스크

- 인증 세션이 없어 배포 URL에서 실제 `운동 탭 -> 런닝/조깅 -> 목표 설정 -> 시작 -> 음성 cue` 손 조작은 직접 확인해야 한다.
- Web Speech 음성 출력은 기기/브라우저의 TTS 지원과 사용자 음량 설정에 의존한다.

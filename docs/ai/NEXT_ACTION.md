# 다음 자동 액션

## 현재 상태

- 상태: `complete`
- 계획 문서: `docs/ai/features/2026-07-02-home-running-map-bubble-reliability.md`
- 리뷰 문서: `docs/ai/reviews/2026-07-02-home-running-map-bubble-reliability-review.md`
- 현재 단계: `홈 러닝 지도 말풍선 신뢰성 개선 Slice 1 Dashboard3 Pages 배포 검증 완료`
- 작업 브랜치: `deploy/tomatofarm-20260629`
- 마지막 완료: `커밋 ea65cb4 fix: harden home running map bubble fallback를 origin/main에 push했고 Dashboard3 Pages 배포/marker 검증을 완료했다.`
- 다음 액션: `인증 계정 실제 홈탭 러닝 지도 말풍선 UI flow 확인이 남아 있다.`
- 차단 사유: `없음.`

## 방금 계획/실행한 항목

- Home Running Map Bubble Reliability 계획:
  1. 요청: 홈 화면 라이프존 러닝 지도 말풍선이 타일/경로 없이 작은 점 하나만 보이는 문제를 코드로 개선한다.
  2. 진단: 실제 `_buildRunningMapBubbleData()`에는 `tiles/path/dot` 계산이 있으므로 `missing-map`뿐 아니라 `ready` 상태의 타일 로드 실패/1점 route도 원인으로 본다.
  3. 결정: Slice 1은 홈 말풍선에 진단 `data-*` 메타, tile load/error 상태, 명확한 fallback UI를 추가한다.
  4. 범위: `home/life-zone.js`, `style.css`, 관련 홈 러닝 지도 테스트, `sw.js` cache bump.
  5. 제외: GPS 수집/저장 schema/운동 상세 지도/provider 교체/홈 부분 업데이트 리팩터.
  6. 계획 문서: `docs/ai/features/2026-07-02-home-running-map-bubble-reliability.md`

- Home Running Map Bubble Reliability 실행:
  1. `home/life-zone.js`에서 `_buildRunningMapBubbleData()` 반환값에 provider/config/reason/tileCount/pointCount/hasPath 메타를 추가했다.
  2. `home/life-zone.js`에서 지도 말풍선 DOM에 `data-lz-running-map-*` 진단 속성을 추가했다.
  3. `home/life-zone.js`에서 VWorld tile 이미지 `load`/`error` 이벤트를 추적하고, 전체 실패 시 `is-tile-failed`와 `data-lz-running-map-tile-state="failed"`를 남긴다.
  4. `style.css`에 `waiting`/`missing-map`/`is-tile-failed` placeholder 배경과 tile-failed fallback 텍스트 표시를 추가했다.
  5. `tests/home-life-zone-npc-quest.test.js`와 cache marker 테스트를 갱신했다.
  6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z3-home-running-map-bubble`로 bump했다.
  7. PASS: `node --check home/life-zone.js; node --check sw.js`
  8. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js` - 43 tests passed
  9. PASS: `node scripts/verify-runtime-assets.mjs`
  10. PASS: `node --test --test-reporter=dot tests/*.test.js`
  11. PASS: `git diff --check`
  12. PASS: 구현 커밋 `ea65cb4 fix: harden home running map bubble fallback`를 `origin/main`에 push했다.
  13. PASS: Dashboard3 Pages 배포 검증 - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ ea65cb4` -> `[deploy-verify] ok ea65cb462d1f tomatofarm-v20260702z3-home-running-map-bubble static=236`
  14. PASS: Dashboard3 Pages marker 검증 - `sw.js` cache version, `home/life-zone.js` `lzRunningMapProvider`/`_bindRunningMapTileDiagnostics`/`is-tile-failed`, `style.css` `.lz-running-map-empty--tile-failed`/`.lz-running-map-bubble.is-tile-failed`
  15. not verified yet: 인증 계정 실제 홈탭 러닝 지도 말풍선 UI flow 확인은 아직 수행하지 않았다.

- Home Running Map Bubble Reliability 리뷰:
  1. 리뷰 문서: `docs/ai/reviews/2026-07-02-home-running-map-bubble-reliability-review.md`
  2. 결과: 문제 없음.
  3. 확인: 정상 `ready` 상태의 VWorld tile/path/current-dot 렌더 계약은 유지되고, fallback은 `waiting`/`missing-map`/전체 tile 실패 상태에만 표시된다.
  4. PASS: Dashboard3 Pages 배포/marker 검증 완료.
  5. 남은 확인: 인증 계정 실제 flow 확인은 아직 수행하지 않았다.

- Workout Cycle Rail Achieved Color 계획:
  1. 요청: 운동 탭 좌측 목표를 해당 주에 달성했을 때 더 채도 높은 파란색으로 칠한다.
  2. 결정: 기존 `workoutRecordsForBenchmarkWeek()` 기준으로 같은 벤치마크의 해당 주 best set이 목표 `kg/reps` 이상이면 달성으로 본다.
  3. 범위: `render-calendar.js` 달성 class, `style.css` 달성 색상, 회귀 테스트, `sw.js` cache bump.
  4. 제외: 성장보드 산식/데이터 모델, 하단 sheet 동작, 레일 레이아웃 변경.
  5. 계획 문서: `docs/ai/features/2026-07-02-workout-cycle-rail-achieved-color.md`

- Workout Cycle Rail Achieved Color 실행:
  1. `render-calendar.js`에 `_cycleRailGoalStatus()`를 추가해 주간 best set이 목표 `kg/reps` 이상이면 달성으로 판정한다.
  2. 달성한 좌측 목표 button에 `is-achieved` class와 title/aria 달성 문구를 추가했다.
  3. `style.css`에 `.cal-cycle-branch.is-achieved` 선명한 파란색 상태를 추가했다.
  4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z2-workout-rail-achieved-blue`로 bump했다.
  5. 관련 cache-version marker 테스트와 `tests/workout-calendar-bottom-sheet.test.js`를 갱신했다.
  6. PASS: `node --check render-calendar.js`
  7. PASS: `node --check sw.js`
  8. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 19 tests passed
  9. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
  10. PASS: `node --test --test-reporter=dot tests/*.test.js`
  11. PASS: `git diff --check`
  12. PASS: 구현 커밋 `242cf4b fix: highlight achieved workout rail goals`를 `origin/main`에 push했다.
  13. PASS: Dashboard3 Pages 배포 검증 - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 242cf4b` -> `[deploy-verify] ok 242cf4b8a0e8 tomatofarm-v20260702z2-workout-rail-achieved-blue static=236`
  14. PASS: Dashboard3 Pages marker 검증 - `sw.js` cache version, `render-calendar.js` `_cycleRailGoalStatus`/`workoutRecordsForBenchmarkWeek`/`is-achieved`, `style.css` `.cal-cycle-branch.is-achieved`/`background: #2f7df4`
  15. not verified yet: 인증 계정 실제 운동 탭 UI flow 확인 필요.

- Workout Cycle Rail Achieved Color 리뷰:
  1. 리뷰 문서: `docs/ai/reviews/2026-07-02-workout-cycle-rail-achieved-color-review.md`
  2. 결과: 문제 없음.
  3. 확인: 달성 상태는 `is-achieved` class/title/aria에만 추가되어 기존 레일 클릭/설정 진입/레이아웃을 바꾸지 않는다.
  4. 확인: `tests/`와 `sw.js`에 이전 cache version marker가 남아 있지 않다.

- Running Session Reload Recovery:
  1. 요청: 러닝 기록 중 앱이 백그라운드에서 리로드되면 저장 전 기록이 전부 사라지는 문제를 수정한다.
  2. 진단: live 러닝 상태는 `workout/running-session.js` 전역 `_session`에만 있고 저장 전 reload-safe draft가 없었다.
  3. 완료: user-scoped `tomatofarm_running_session_draft_<user>` localStorage draft 저장/복구를 추가했다.
  4. 완료: `pagehide`, `beforeunload`, `visibilitychange(hidden)`, route point, pause/resume/finish/goal save 시 draft를 갱신한다.
  5. 완료: `wtOpenRunningSession()`에서 유효한 draft를 progress/summary 화면으로 복원하고 저장 성공/명시 닫기 시 draft를 삭제한다.
  6. 완료: `normalizeRunningSessionDraft()` 테스트를 추가하고 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z1-running-session-reload-recovery`로 bump했다.
  7. PASS: `node --check workout/running-session.js; node --check sw.js`
  8. PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/workout-sessions.test.js`
  9. PASS: `node --test --test-reporter=dot tests/*.test.js`
  10. PASS: `node scripts/verify-runtime-assets.mjs`
  11. PASS: `git diff --check`
  12. 리뷰 문서: `docs/ai/reviews/2026-07-02-running-session-reload-recovery-review.md`
  13. 완료: 커밋 `384920f fix: preserve running session draft across reload`를 `origin/main`에 push했다.
  14. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 384920f` → `[deploy-verify] ok 384920f340c3 tomatofarm-v20260702z1-running-session-reload-recovery static=236`
  15. not verified yet: 배포 URL 브라우저 확인 결과 로그인 화면이 먼저 표시되고, 인증 없이 운동 탭 클릭 후 러닝 칩까지 도달하지 못했다.

- Home Consulting Room Visitor Sofa 실행:
  1. 요청: 현재 소파 앞에 서 있는 상담실장을 1인용 소파에 앉아 있는 구도로 바꾼다.
  2. 요청: 맞은편에는 현재 소파를 상담실장을 마주보는 형태로 배치한다.
  3. 요청: 10일 이상 미접속 유저 또는 신규유저가 방문하면 그 소파에 앉아 있는 회색 상의 방문자 스프라이트를 표시한다.
  4. 결정: 방문자는 전체 계정 중 임의 선정하지 않고 현재 로그인한 사용자의 `previousLastLoginAt`/`createdAt` 기준으로 판정한다.
  5. 결정: 베이스룸 원본은 직접 수정하지 않고 우측 하단 상담 코너 transparent overlay와 seated sprites로 덮는다.
  6. 범위: `app.js`, `home/life-zone.js`, `home/life-zone-state.js`, `style.css`, `sw.js`, 새 PNG 3개, 관련 테스트와 cache-version 테스트.
  7. 제외: 상담실장 모달 내용 변경, 베이스룸 원본 교체, 기존 actor 상태 우선순위 변경, Firestore schema 변경, `www/` 직접 수정.
  8. 완료: 새 RGBA PNG 3개를 생성했다: `consulting-room-sofas.png`, `consulting-chief-npc-seated-home.png`, `consulting-visitor-gray-shirt-home.png`.
  9. 완료: `app.js`에서 저장된 이전 `lastLoginAt` snapshot과 현재 사용자 정보를 라이프존 방문자 context로 전달했다.
  10. 완료: `home/life-zone-state.js`에 `resolveLifeZoneConsultingVisitor()`를 추가해 신규/10일 복귀/일반/guest 판정을 분리했다.
  11. 완료: `home/life-zone.js`와 `style.css`에 상담 소파 overlay, 앉은 상담실장, 조건부 방문자 layer를 추가했다.
  12. 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260701z3-consulting-room-visitor`로 bump하고 새 PNG 3개를 `STATIC_ASSETS`에 등록했다.
  13. PASS: `node --check app.js; node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
  14. PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js`
  15. PASS: `node --test tests/*.test.js` - 624 tests passed
  16. PASS: `node scripts/verify-runtime-assets.mjs`
  17. PASS: `git diff --check`
  18. PASS: 로컬 합성 미리보기 `C:\Users\USER\AppData\Local\Temp\tomato-consulting-room-preview-v2.png`에서 상담 코너 겹침을 확인했다.
  19. 리뷰 문서: `docs/ai/reviews/2026-07-02-home-consulting-room-visitor-sofa-review.md`
  20. 리뷰 결과: 문제 없음.
  21. 완료: 커밋 `fa2ea34 fix: add consulting room visitor sofa`를 `origin/main`에 push했다.
  22. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ fa2ea34` → `[deploy-verify] ok fa2ea340195d tomatofarm-v20260701z3-consulting-room-visitor static=236`
  23. PASS: Dashboard3 Pages marker 검증 — `sw.js::tomatofarm-v20260701z3-consulting-room-visitor`, `home/life-zone.js::consulting-visitor-gray-shirt-home.png`, `home/life-zone.js::setLifeZoneVisitContext`, `style.css::.lz-consulting-visitor`
  24. not verified yet: 인증 세션이 없어 실제 홈 탭에서 신규/10일 복귀 사용자 조건의 라이프존 UI flow는 직접 확인하지 못했다.

- Home Hero Life Zone Balance 계획:
  1. 요청: 홈 상단 히어로 카드는 지금보다 높이를 약 50% 줄인다.
  2. 요청: 라이프존 카드는 더 크게 보이게 한다.
  3. 확인: 히어로 카드는 `home/tomato.js` `renderTomatoCard()`의 `.tf-card > .tf-hero.tf-hero--gradient`다.
  4. 결정: 히어로 sub 줄을 제거하고, 토마토 규칙 버튼은 `.tf-hero-info-btn`으로 우측 상단에 유지한다.
  5. 결정: 토마토 SVG는 `72`에서 `44`로 줄이고, `.tf-hero` padding/count/unit 크기를 compact 값으로 낮춘다.
  6. 결정: 라이프존은 기존 좌표계를 유지하기 위해 `.lz-scene`을 `1672 / 1872`로 키우고 `.lz-world`를 `112%`로 확대한다.
  7. 제외: 라이프존 스프라이트/배경 자산 재생성, 홈 카드 순서 변경, 칼로리/체중 summary strip 제거, 운동 deck 미완료 작업.
  8. 계획 문서: `docs/ai/features/2026-07-01-home-hero-life-zone-balance.md`
  9. 완료: `home/tomato.js`에서 히어로 sub 줄을 제거하고 info button을 우측 상단으로 이동했다.
  10. 완료: `style.css`에서 히어로 compact 스타일과 라이프존 확대 스타일을 반영했다.
  11. 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260701z2-home-hero-life-zone-balance`로 bump했다.
  12. PASS: `node --check home/tomato.js; node --check sw.js`
  13. PASS: `node --test tests/home-hero-layout.test.js tests/home-life-zone-npc-quest.test.js` - 11 tests passed
  14. PASS: `node scripts/verify-runtime-assets.mjs`
  15. PASS: `git diff --check`
  16. PASS: `node --test --test-reporter=dot tests/*.test.js`
  17. 리뷰 문서: `docs/ai/reviews/2026-07-01-home-hero-life-zone-balance-review.md`
  18. 완료: 커밋 `da7b5c0 fix: rebalance home hero and life zone`를 `origin/main`에 push했다.
  19. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ da7b5c0` → `[deploy-verify] ok da7b5c0fe3c9 tomatofarm-v20260701z2-home-hero-life-zone-balance static=233`
  20. PASS: Dashboard3 Pages marker 검증 — `sw.js` cache version, `home/tomato.js` compact hero markers, `style.css` life-zone expand markers 확인
  21. not verified yet: 배포 URL 브라우저 확인 결과 로그인 화면이 먼저 표시되어 실제 인증 홈 탭 UI flow 확인은 아직 남아 있다.

- Home Life Zone Foot Nameplates 계획:
  1. 요청: 첨부 이미지에서 X 표시된 라이프존 카드 하단 캐릭터 상태칩을 삭제한다.
  2. 요청: 줍스/문정토마토/이재헌 닉네임은 씬 안에서 각 캐릭터 발밑에 배치하되 캐릭터를 가리지 않는다.
  3. 진단: X 표시 영역은 `home/life-zone.js`의 `lz-status-row`와 `_renderStatus()`가 만드는 `.lz-status-chip`이다.
  4. 진단: actor 이름표는 이미 DOM 텍스트지만 `_applyActorNameplatePosition()`이 위쪽 기준 좌표를 써서 발밑 배치와 어긋난다.
  5. 결정: 하단 status row를 제거하고, actor 이름표를 각 `.lz-actor` 내부 child로 이동해 CSS `top: 100%` 기준 발밑 배치로 바꾼다.
  6. 제외: 스프라이트/아트 자산 재생성, NPC 전구/모달 동작 변경, 라이프존 상태 판정 변경, 칼로리/체중 summary strip 제거.
  7. 계획 문서: `docs/ai/features/2026-07-01-home-life-zone-foot-nameplates.md`
  8. 완료: `home/life-zone.js`에서 `lz-status-row`와 `.lz-status-chip` 렌더링을 제거했다.
  9. 완료: `.lz-nameplate--actor`를 `.lz-actor` 내부에서 `top: 100%`로 발밑 배치했다.
  10. 완료: `style.css`의 상태칩 스타일을 삭제하고 `sw.js`를 `tomatofarm-v20260701z1-life-zone-foot-nameplates`로 bump했다.
  11. PASS: `node --check home/life-zone.js; node --check sw.js`
  12. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` - 29 tests passed
  13. PASS: `node scripts/verify-runtime-assets.mjs`
  14. PASS: `git diff --check`
  15. PASS: `node --test --test-reporter=dot tests/*.test.js`
  16. 리뷰 문서: `docs/ai/reviews/2026-07-01-home-life-zone-foot-nameplates-review.md`
  17. 완료: 커밋 `b37bce6 fix: place life zone names under actors`를 `origin/main`에 push했다.
  18. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b37bce6` → `[deploy-verify] ok b37bce6b88a5 tomatofarm-v20260701z1-life-zone-foot-nameplates static=233`
  19. PASS: Dashboard3 Pages marker 검증 — `sw.js` cache version, `home/life-zone.js` actor child nameplate marker, `style.css` foot-nameplate marker 확인
  20. not verified yet: 인증 세션이 없어 실제 홈 탭 라이프존 UI flow 확인은 아직 남아 있다.

- Workout Entry Bookmark Deck 계획:
  1. 요청: 운동 기록 카드가 아래로 계속 쌓이지 않고, 상단 번호 책갈피로 종목 간 이동하게 한다.
  2. 확인: 현재 `_renderExerciseList()`가 `S.workout.exercises.forEach`로 모든 종목 카드를 세로 렌더한다.
  3. 확인: 완료 후 접힘은 `entry.uiCollapsed`와 `세트 다시 보기` 버튼으로 동작한다.
  4. 결정: 오늘 운동 입력 리스트 `#wt-exercise-list`에만 단일 active 카드 deck을 적용한다.
  5. 결정: active index는 저장 schema가 아닌 모듈 UI 상태로 둔다.
  6. 결정: 마지막 미완료 세트의 primary button은 `운동 완료`로 표시하고, 누르면 해당 세트 완료 후 다음 카드로 이동한다.
  7. 제외: 캘린더 read card, 성장보드 내장 card, 데이터 schema 변경.
  8. 계획 문서: `docs/ai/features/2026-06-30-workout-entry-bookmark-deck.md`

- Running NRC Core Gap 계획:
  1. 요청: 기존 `런닝/조깅`을 Nike Run Club 핵심 기능 기준으로 조사하고 미구현 기능을 구현한다.
  2. 조사: NRC 핵심은 GPS/pace/distance 추적, Audio-Guided Runs, 목표/훈련 계획, 챌린지/성취, 친구 응원, shoe tagging이다.
  3. 확인: 현재 앱은 GPS route, pace/time/BPM, 지도, summary, save/share는 갖췄다.
  4. 갭: `목표 설정` 버튼은 toast placeholder이고, 음성 안내/목표 진행 cue가 없다.
  5. 결정: Slice 1은 러닝 세션 내부 `목표 설정`과 Web Speech 기반 한국어 음성 안내만 구현한다.
  6. 제외: Training Plans, Challenges, friend cheers, shoe tagging, 음악 연동, Firebase schema 추가.
  7. 계획 문서: `docs/ai/features/2026-06-30-running-nrc-core-gap.md`
  8. 완료: start 화면에 목표/음성 안내 상태 버튼을 추가했다.
  9. 완료: `목표 설정` sheet에서 자유/거리/시간 목표와 음성 안내 on/off를 저장한다.
  10. 완료: 진행 화면에 목표 진행률과 남은 목표를 표시한다.
  11. 완료: Web Speech API 기반 한국어 cue를 시작, pause/resume, 1km split, 목표 halfway, 목표 완료, 종료 summary에 연결했다.
  12. 완료: `sw.js` cache version을 `tomatofarm-v20260630z18-running-voice-goals`로 bump했다.
  13. PASS: `node --check workout/running-session.js; node --check sw.js`
  14. PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/pwa-update-auto-reload.test.js`
  15. PASS: 전체 테스트 — `node --test --test-reporter=dot $files`
  16. PASS: `node scripts/verify-runtime-assets.mjs`
  17. PASS: `git diff --check`
  18. 리뷰 문서: `docs/ai/reviews/2026-06-30-running-nrc-core-gap-review.md`
  19. 완료: 커밋 `82bd3d3 feat: add running voice guidance and goals`를 `origin/main`에 push했다.
  20. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 82bd3d3` → `[deploy-verify] ok 82bd3d3f4de5 tomatofarm-v20260630z18-running-voice-goals static=233`
  21. PASS: Dashboard3 Pages marker 검증 — `sw.js` cache version, `workout/running-session.js` `audio-toggle`/`goal-save`/`SpeechSynthesisUtterance`, `style.css` `wt-run-goal-sheet`/`wt-run-goal-progress` 확인
  22. not verified yet: 인증 세션이 없어 실제 `운동 탭 -> 런닝/조깅 -> 목표 설정 -> 시작 -> 음성 cue` UI flow는 직접 조작하지 못했다.

- Workout Picker Manual Cardio 계획:
  1. 요청: picker 분류 화면에 `유산소` 버튼을 추가한다.
  2. 결정: 기존 `런닝/조깅` GPS 진입은 유지하고, `유산소`는 속도 `km/h`와 시간 `분`을 수기 입력하는 별도 sheet로 연다.
  3. 결정: 새 top-level schema 대신 기존 `S.workout.runData`/러닝 저장 필드를 재사용한다.
  4. 범위: `workout/exercises.js`, `render-calendar.js`, `style.css`, 관련 테스트, `sw.js` cache version bump.
  5. 계획 문서: `docs/ai/features/2026-06-30-manual-cardio-picker.md`
  6. 완료: `workout/exercises.js`에 `유산소` tile, 수기 입력 sheet, `manual-cardio` 저장 payload를 추가했다.
  7. 완료: 저장 직전 헬스 회차 상태를 격리하고 저장 후 복원해 러닝 회차에 헬스 종목이 섞이지 않게 했다.
  8. 완료: `render-calendar.js` 상세 카드에 `manual-cardio` label/source와 `속도` metric을 추가했다.
  9. 완료: `style.css` 유산소 sheet 스타일과 `sw.js` `tomatofarm-v20260630z17-manual-cardio-picker` cache version을 반영했다.
  10. PASS: `node --check workout/exercises.js; node --check render-calendar.js; node --check sw.js`
  11. PASS: `node --test tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js tests/pwa-update-auto-reload.test.js`
  12. PASS: 전체 테스트 파일 묶음 — `node --test --test-reporter=dot @files`
  13. PASS: `node scripts/verify-runtime-assets.mjs`
  14. PASS: `git diff --check`
  15. 리뷰 문서: `docs/ai/reviews/2026-06-30-manual-cardio-picker-review.md`
  16. 완료: 커밋 `0574140 feat: add manual cardio picker entry`를 `origin/main`에 push했다.
  17. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0574140` → `[deploy-verify] ok 0574140da32f tomatofarm-v20260630z17-manual-cardio-picker static=233`
  18. PASS: Dashboard3 Pages marker 검증 — `sw.js` cache version, `workout/exercises.js` manual-cardio, `render-calendar.js` speedKmh, `style.css` cardio sheet marker 확인
  19. not verified yet: 인증 세션이 없어 실제 `운동 탭 -> + -> 유산소 -> 저장 -> 러닝 상세 카드` UI flow는 직접 조작하지 못했다.

- Workout Calendar Owned Scroll Root 계획:
  1. 요청: 운영 PWA에서 캘린더 드래그가 여전히 되지 않고 바텀시트 영역에서만 움직인다.
  2. 확인: PWA 설치/서비스워커 코드는 캘린더 터치를 직접 막지 않는다.
  3. 확인: navigation swipe는 세로 이동에서 tracking을 중단하고 `preventDefault()`를 호출하지 않는다.
  4. 확인: workout pull-back은 `data-wt-calendar-scroll-surface` 아래 터치를 예외 처리하므로 최신 marker가 반영된 상태에서는 캘린더 표면 touchmove를 직접 막지 않는다.
  5. 원인: 운동 캘린더 본문은 `overflow-y:auto`를 가진 독립 scroller가 아니고 body scroll에 의존한다. PWA WebView에서 fixed bottom sheet/tab bar/overscroll gesture와 섞여 body pan ownership이 실패한다.
  6. Slice 1 범위는 `#workout-calendar-root`를 owned scroll root로 승격하고 `render-calendar.js` scroll 저장/복원을 root scroller 기준으로 바꾸는 것이다.
  7. `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되므로 `sw.js` cache version을 함께 bump한다.
  8. 완료: `style.css`에서 `#tab-workout.wt-calendar-home-mode`를 viewport 화면으로 고정하고 `overflow:hidden`을 적용했다.
  9. 완료: `#workout-calendar-root`를 `overflow-y:auto`, `overscroll-behavior-y:contain`, `-webkit-overflow-scrolling:touch`, `touch-action:pan-y`를 가진 owned scroll root로 만들었다.
  10. 완료: `render-calendar.js`에서 `_workoutHomeScrollRoot()`를 추가하고 scroll 저장/복원을 root scroller 우선으로 변경했다.
  11. 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z16-workout-owned-scroll-root`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  12. PASS: `node --check render-calendar.js`
  13. PASS: `node --check sw.js`
  14. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js` — 24 tests passed
  15. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
  16. PASS: `git diff --check`
  17. PASS: `node --test --test-reporter=dot tests/*.test.js`
  18. 리뷰 문서: `docs/ai/reviews/2026-06-30-workout-calendar-owned-scroll-root-review.md`
  19. 완료: 커밋 `7445eef fix: give workout calendar an owned scroll root`를 `origin/main`과 `tomatofarm/main`에 push했다.
  20. PASS: Tomato Farm 운영계 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 7445eef` → `[deploy-verify] ok 7445eef535e6 tomatofarm-v20260630z16-workout-owned-scroll-root static=233`
  21. PASS: Tomato Farm 운영계 marker 검증 — `sw.js` cache version, owned scroll root CSS, root scroll 저장/복원 marker 확인
  22. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 7445eef` → `[deploy-verify] ok 7445eef535e6 tomatofarm-v20260630z16-workout-owned-scroll-root static=233`
  23. PASS: Dashboard3 Pages marker 검증 — `sw.js` cache version, owned scroll root CSS, root scroll 저장/복원 marker 확인
  24. not verified yet: 인증 세션이 없어 실제 모바일 PWA 손 조작 flow는 사용자가 확인해야 한다.

- PWA Calendar Backdrop Touch Fix 계획:
  1. 요청: 운영 PWA에서 캘린더 드래그가 여전히 되지 않고 바텀시트 영역에서만 움직인다.
  2. 진단: 운영 URL에는 최신 drag fix와 SW auto update marker가 반영되어 있어, stale SW 단독 원인 가능성은 낮아졌다.
  3. 진단: PWA 전용 JS가 캘린더 터치를 직접 막는 흐름은 보이지 않고, bar 상태의 투명 fixed backdrop이 `touch-action: none`으로 남는 점이 PWA/WebView 차이를 만들 가능성이 높다.
  4. Slice 1 범위는 bottom sheet backdrop을 full 상태에서만 활성화하고, bar 상태에서는 `hidden`/`display:none`으로 터치 협상에서 제외하는 것이다.
  5. `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되므로 `sw.js` cache version을 함께 bump한다.
  6. 완료: `render-calendar.js`에서 backdrop 렌더에 `backdropHiddenAttr`, `backdropAriaHidden`을 추가해 bar 상태를 `hidden`으로 렌더한다.
  7. 완료: `_applyWorkoutHomeSheetState()`가 sheet state 변경 시 backdrop `hidden`과 `aria-hidden`을 함께 동기화한다.
  8. 완료: `style.css`에서 backdrop 기본 상태를 `display:none`, `touch-action:auto`, full 상태를 `display:block`, `touch-action:none`으로 분리했다.
  9. 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z15-pwa-backdrop-touch`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  10. PASS: `node --check render-calendar.js; node --check sw.js`
  11. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/pwa-update-auto-reload.test.js` — 21 tests passed
  12. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
  13. PASS: `git diff --check`
  14. PASS: `node --test --test-reporter=dot tests/*.test.js`
  15. 리뷰 문서: `docs/ai/reviews/2026-06-30-pwa-calendar-backdrop-touch-fix-review.md`
  16. 완료: 커밋 `6415021 fix: disable calendar backdrop touch capture`를 `origin/main`과 `tomatofarm/main`에 push했다.
  17. PASS: Tomato Farm 운영계 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 6415021` → `[deploy-verify] ok 64150211994b tomatofarm-v20260630z15-pwa-backdrop-touch static=233`
  18. PASS: Tomato Farm 운영계 marker 검증 — `sw.js` cache version, `render-calendar.js` `backdropHiddenAttr`/`toggleAttribute('hidden', !expanded)`, `style.css` `.cal-workout-day-backdrop.is-full`/`touch-action: auto`
  19. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 6415021` → `[deploy-verify] ok 64150211994b tomatofarm-v20260630z15-pwa-backdrop-touch static=233`
  20. PASS: Dashboard3 Pages marker 검증 — `sw.js` cache version, `render-calendar.js` backdrop hidden marker, `style.css` backdrop marker
  21. not verified yet: 인증 세션이 없어 실제 모바일 PWA에서 `운동 탭 -> 캘린더 본문 세로 드래그` 손 조작은 사용자가 확인해야 한다.

- Production Stale SW Auto Update 완료:
  1. 요청: 개발계에서는 캘린더 드래그가 되는데 운영계에서는 동일 증상이 반복된다.
  2. 진단: 운영 direct asset marker에는 drag fix가 있으므로, 사용자 기기의 stale Service Worker/controller/cache가 구 asset을 유지하는 케이스를 우선 원인으로 봤다.
  3. 완료: `pwa-register.js`에 `APP_SW_AUTO_RELOAD_TIMEOUT_MS`, `_hasActiveWorkoutDraftForAppSWUpdate()`, `_autoApplyAppSWUpdate()`를 추가했다.
  4. 완료: 새 앱 SW가 설치/대기 상태가 되면 `tomato-app-ready` 이후 active workout draft가 없을 때 `SKIP_WAITING` + `controllerchange` 1회 reload를 실행한다.
  5. 완료: active workout draft가 있으면 자동 reload하지 않고 기존 업데이트 안내 버튼을 유지한다.
  6. 완료: `index.html`의 `pwa-register.js` query를 `20260630z14-sw-auto-update`로 갱신했다.
  7. 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z14-sw-auto-update`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  8. PASS: `node --check pwa-register.js; node --check sw.js`
  9. PASS: `node --test tests/pwa-update-auto-reload.test.js tests/workout-active-session-recovery.test.js` — 8 tests passed
  10. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
  11. PASS: `git diff --check`
  12. PASS: `node --test --test-reporter=dot tests/*.test.js`
  13. 완료: 커밋 `4c5ab9f fix: auto apply app service worker updates`를 `origin/main`에 push했다.
  14. not verified yet: Dashboard3 Pages workflow는 `deploy-pages` 단계 실패로 Dashboard3 URL이 이전 커밋 `acf69a2`를 반환한다.
  15. 완료: 운영계 `tomatofarm/main`에 커밋 `4c5ab9f`를 push했다.
  16. PASS: Tomato Farm 운영계 workflow success — run `28438825034`
  17. PASS: Tomato Farm 운영계 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 4c5ab9f` → `[deploy-verify] ok 4c5ab9f099af tomatofarm-v20260630z14-sw-auto-update static=233`
  18. PASS: 운영 marker 검증 — `sw.js` cache version, `index.html` `pwa-register.js?v=20260630z14-sw-auto-update`, `pwa-register.js` auto update markers, 기존 drag fix markers
  19. not verified yet: 실제 운영 기기 stale SW 자동 갱신 후 캘린더 드래그 UI flow 확인이 남아 있다.

- Workout Calendar Drag Surface Fix 완료:
  1. 요청: 운동 탭 캘린더가 바텀시트 영역에서 손가락을 움직일 때만 드래그되는 상황을 수정한다.
  2. 진단: 기존 `data-wt-calendar-scroll-surface`가 월간 grid에만 있어 헤더/요약/요일/좌측 레일/여백에서 시작한 touch가 전역 workout pull-back 제스처에 잡힐 수 있었다.
  3. 완료: `render-calendar.js`에서 운동 홈 surface wrapper에 `data-wt-calendar-scroll-surface`를 조건부로 추가했다.
  4. 완료: `style.css`에서 `.cal-workout-surface-home`에 `touch-action: pan-y`를 추가했다.
  5. 완료: 기존 bottom sheet pointer drag 제거 계약은 유지했고, grid-level 표식도 보존했다.
  6. 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z13-workout-calendar-drag-surface`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  7. PASS: `node --check render-calendar.js; node --check sw.js`
  8. PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js` — 24 tests passed
  9. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
  10. PASS: `git diff --check`
  11. PASS: `node --test --test-reporter=dot tests/*.test.js`
  12. 완료: 코드/문서 커밋 `041f878 fix: widen workout calendar drag surface`를 `origin/main`에 push했다.
  13. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 041f878` → `[deploy-verify] ok 041f878367c6 tomatofarm-v20260630z13-workout-calendar-drag-surface static=233`
  14. PASS: Dashboard3 Pages marker 검증 — `sw.js` cache version, `render-calendar.js` `scrollSurfaceAttr`/`data-wt-calendar-scroll-surface`, `style.css` `.cal-workout-surface-home`/`touch-action: pan-y`
  15. 완료: 운영계 `tomatofarm/main`에 커밋 `3120d0f`를 fast-forward push했다.
  16. PASS: Tomato Farm 운영계 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 3120d0f` → `[deploy-verify] ok 3120d0f20fae tomatofarm-v20260630z13-workout-calendar-drag-surface static=233`
  17. PASS: 운영계 marker 검증 — `sw.js` cache version, `render-calendar.js` `scrollSurfaceAttr`/`data-wt-calendar-scroll-surface`, `style.css` `.cal-workout-surface-home`/`touch-action: pan-y`
  18. not verified yet: 인증 세션이 없어 실제 `운동 탭 -> 캘린더 본문/요일/요약/좌측 레일에서 세로 드래그` UI flow는 직접 조작하지 못했다.

- Stale UI Code Prune 완료:
  1. 요청: 화면에 구현되어 실질적인 UI/동작 변화를 일으키는 코드만 남기고, 화면에 구현되지 않는 stale 관련 코드를 제거한다.
  2. 결정: 모든 `stale`/`legacy` 문자열 삭제가 아니라, 현재 DOM/route/event에서 미구현인 stale 잔재만 제거한다.
  3. 보존: 체중 미입력 stale UI, AI stale token, 저장 stale guard, legacy 데이터 migration/fallback은 실제 동작/데이터 보존이므로 유지한다.
  4. 완료: `wtOpenWorkoutRecord`, `setPeriod`, `.wt-record-back-btn` 예외, 운동 탭 날짜 row stale selector, 홈 농장 DOM/CSS/API/모듈을 제거했다.
  5. 완료: `WorkoutRecordScreen`/`WorkoutDetailScreen`, `pushWorkoutRecord()`, `pushWorkoutDetail()`, standalone `wt-exercise-detail-root`, `renderWorkoutExerciseDetail`, 관련 export/window 등록을 제거했다.
  6. 완료: `renderMaxGrowthPreview()`의 화면 미렌더 `recommendationHtml` 파라미터를 제거했다.
  7. 유지: `_renderWorkoutExerciseDetailCard()`는 현재 하단 시트 운동 카드 렌더러라 삭제하지 않았다.
  8. PASS: `node --check app.js; node --check data.js; node --check data/data-load.js; node --check render-stats.js; node --check render-workout.js; node --check sw.js; node --check workout/load.js; node --check workout/navigation-stack.js; node --check workout/exercises.js; node --check workout/index.js; node --check workout/expert/max-same-day-advice.js`
  9. PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js tests/workout-calendar-bottom-sheet.test.js tests/stats-overall-compact-summary.test.js tests/data.load-save.test.js tests/exercise-program-editor.test.js`
  10. PASS: `node --test tests/calc.max.test.js`
  11. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
  12. PASS: `node --test --test-reporter=dot @tests`
  13. PASS: `git diff --check`
  14. 리뷰 문서: `docs/ai/reviews/2026-06-30-stale-ui-code-prune-review.md`
  15. 완료: 코드/문서 커밋 `c98ec70 fix: prune stale ui code`를 `origin/main`에 push했다.
  16. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ c98ec70` → `[deploy-verify] ok c98ec70a4a1a tomatofarm-v20260630z12-stale-ui-prune static=233`
  17. 완료: 배포 기록 커밋 `c5fd880 docs: record stale ui prune deploy`를 `origin/main`에 push했다.
  18. PASS: Dashboard3 Pages 최종 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ c5fd880` → `[deploy-verify] ok c5fd880d243b tomatofarm-v20260630z12-stale-ui-prune static=233`
  19. 완료: 운영계 `tomatofarm/main`에도 `c5fd880`을 fast-forward push했다.
  20. PASS: Tomato Farm 운영계 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ c5fd880` → `[deploy-verify] ok c5fd880d243b tomatofarm-v20260630z12-stale-ui-prune static=233`
  21. PASS: 운영계 marker 검증 — `sw.js` cache version, `app.js::sheet:tab-open`, `workout/navigation-stack.js::CALENDAR: 'CalendarScreen'`, `index.html::wt-running-session-root`
  22. not verified yet: 인증 세션이 필요한 실제 UI 클릭 흐름은 배포 URL에서 직접 조작하지 않았다.

- Workout Record Route Remove 계획:
  1. 원인: `app.js`가 `pushWorkoutRecord()`와 `_setWorkoutSurface('record')`로 legacy record 화면을 아직 표시할 수 있다.
  2. 원인: `render-calendar.js`의 `_openWorkoutEditorForSession()` / `_loadWorkoutEditorForSession()`가 record route opener로 남아 있다.
  3. 원인: `index.html` 운동 탭의 legacy 날짜 row가 정적 DOM으로 남아 있다.
  4. Slice 1 범위는 record route push/render 제거, `wtOpenWorkoutRecord`의 day sheet redirect, calendar fallback 정리, legacy 날짜 row 제거, 테스트/cache bump다.
  5. 계획 문서: `docs/ai/features/2026-06-30-workout-record-route-remove.md`
  6. 완료: `app.js`에서 `pushWorkoutRecord` 기반 record route 렌더를 제거했다.
  7. 완료: `wtOpenWorkoutRecord` 호환 호출은 하단 시트 open으로 리다이렉트한다.
  8. 완료: `render-calendar.js`의 `_openWorkoutEditorForSession()` / `_loadWorkoutEditorForSession()`를 제거했다.
  9. 완료: 운동 탭의 legacy 날짜 row와 record back button DOM/CSS를 제거했다.
  10. 완료: `sw.js` cache version을 `tomatofarm-v20260630z11-record-route-removed`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  11. PASS: `node --check app.js`
  12. PASS: `node --check render-calendar.js`
  13. PASS: `node --check sw.js`
  14. PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-timer-summary-only.test.js tests/workout-card-layout-css.test.js`
  15. PASS: `node scripts/verify-runtime-assets.mjs`
  16. PASS: `node --test --test-reporter=dot tests/*.test.js`
  17. PASS: `git diff --check`
  18. 리뷰 문서: `docs/ai/reviews/2026-06-30-workout-record-route-remove-review.md`
  19. 완료: 코드/문서 커밋 `88b2e7e fix: remove workout record route UI`를 `origin/main`에 push했다.
  20. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 88b2e7e` → `[deploy-verify] ok 88b2e7eb9c5a tomatofarm-v20260630z11-record-route-removed static=234`
  21. PASS: Dashboard3 Pages marker 검증 — `sw.js` cache version, `app.js`의 `_redirectWorkoutRecordRouteToDaySheet`/`record:tab-redirect-sheet`, `render-calendar.js`의 sheet state loader marker 확인.
  22. not verified yet: 인증 세션이 없어 실제 모바일 UI에서 `운동 탭 -> 오늘 하단 시트 -> 편집하기` 흐름은 직접 클릭 확인하지 못했다.

- Workout Day Sheet Inline Edit Regression 계획:
  1. 원인: `render-calendar.js`의 하단 시트 헬스 카드 `편집하기`가 `_wtCalEditSession()`을 호출한다.
  2. 원인: `_editWorkoutHomeSession()`이 `_openWorkoutEditorForSession()`으로 기존 기록 편집 화면을 직접 연다.
  3. 결과: 사용자가 1화면 하단 시트에서 편집하려 할 때 2화면으로 빠져 타이머와 오늘 운동 기록 흐름이 분기된 것처럼 보인다.
  4. Slice 1 범위는 헬스 카드 inline edit mode, KG/REP/RIR/ROM 저장, 완료 토글, 세트 추가/삭제, 회귀 테스트, `sw.js` cache bump다.
  5. 계획 문서: `docs/ai/features/2026-06-30-workout-day-sheet-inline-edit-regression.md`
  6. 완료: `render-calendar.js`에서 하단 시트 헬스 카드 `편집하기`를 `_wtCalEditExerciseCard()` inline edit mode로 전환했다.
  7. 완료: stale `_wtCalEditSession()` 경로에서도 `_openWorkoutEditorForSession()`을 호출하지 않게 했다.
  8. 완료: inline edit mode에서 KG/REP/RIR/ROM 입력, 완료 토글, 세트 추가/삭제를 저장한다.
  9. 완료: `style.css`에 하단 시트 세트 입력/토글 스타일을 추가했다.
  10. 완료: `sw.js` cache version을 `tomatofarm-v20260630z10-day-sheet-inline-edit`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  11. PASS: `node --check render-calendar.js`
  12. PASS: `node --check sw.js`
  13. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-save-mode-guard.test.js`
  14. PASS: `node scripts/verify-runtime-assets.mjs`
  15. PASS: `node --test --test-reporter=dot tests/*.test.js`
  16. PASS: `git diff --check`
  17. 리뷰 문서: `docs/ai/reviews/2026-06-30-workout-day-sheet-inline-edit-regression-review.md`
  18. 완료: 코드/문서 커밋 `84de7cc fix: keep sheet card editing inline`을 `origin/main`에 push했다.
  19. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 84de7cc` → `[deploy-verify] ok 84de7cc152e2 tomatofarm-v20260630z10-day-sheet-inline-edit static=234`
  20. PASS: Dashboard3 Pages marker 검증 — `sw.js` cache version, `render-calendar.js`의 `_wtCalEditExerciseCard`/`sheet:edit-inline`, `style.css`의 inline edit input marker 확인.
  21. not verified yet: 인증 세션이 없어 실제 모바일 UI에서 `운동 탭 -> 오늘 하단 시트 full -> 종목 카드 편집하기 -> 세트 수정/추가/삭제` 클릭 흐름은 직접 확인하지 못했다.

- Workout Day Sheet Inline Add Timer 계획:
  1. 원인: `render-calendar.js`의 `+` 액션이 첫 빈 회차를 우선 target으로 잡고 `_loadWorkoutEditorForSession()`을 통해 `wtOpenWorkoutRecord()` route push를 수행한다.
  2. 원인: `workout/exercises.js` picker 선택 핸들러가 항상 기록 편집 화면 카드 포커스(`wtFocusWorkoutEntryCard`)로 후처리한다.
  3. 원인: 타이머 DOM은 `.workout-tab-content` 내부에 있고 캘린더 surface에서 해당 컨테이너가 숨김 처리되어 1화면에서 보이지 않는다.
  4. Slice 1 범위는 현재 회차 고정, route push 없는 날짜/회차 로드, picker afterSelect 후처리, 캘린더 surface timer bar 노출, 회귀 테스트, `sw.js` cache bump다.
  5. 계획 문서: `docs/ai/features/2026-06-30-workout-day-sheet-inline-add-timer.md`
  6. 완료: `render-calendar.js`에서 하단 시트 `+` target을 현재 gym 회차로 고정했다.
  7. 완료: `render-calendar.js`에 route push 없는 `_loadWorkoutStateForSheetSession()`과 시트 복귀 `_refreshWorkoutHomeAfterPickerSelect()`를 추가했다.
  8. 완료: `workout/exercises.js` picker가 `afterSelect` 콜백을 받을 수 있게 하고, 기본 기록 화면 포커스 동작은 유지했다.
  9. 완료: `style.css`에서 캘린더 surface의 `.workout-tab-content`는 타이머 바만 노출 가능하게 하고, 타이머를 회차 bar 위로 올렸다.
  10. 완료: `sw.js` cache version을 `tomatofarm-v20260630z08-day-sheet-inline-add-timer`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  11. PASS: `node --check render-calendar.js`
  12. PASS: `node --check workout/exercises.js`
  13. PASS: `node --check sw.js`
  14. PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-timer-summary-only.test.js` — 31 tests passed
  15. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  16. PASS: `node --test --test-reporter=dot tests/*.test.js`
  17. PASS: `git diff --check`
  18. 완료: 리뷰 문서 `docs/ai/reviews/2026-06-30-workout-day-sheet-inline-add-timer-review.md`를 작성했고 추가 수정 이슈는 없다.
  19. 완료: 코드/문서 커밋 `6fde447 fix: keep day sheet add inline`을 `origin/main`에 push했다.
  20. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 6fde447` → `[deploy-verify] ok 6fde447039f3 tomatofarm-v20260630z08-day-sheet-inline-add-timer static=234`
  21. PASS: Dashboard3 Pages marker 직접 fetch — `sw.js`, `render-calendar.js`, `workout/exercises.js`, `style.css` HTTP 200 및 `_loadWorkoutStateForSheetSession`, `workout-day-sheet`, `_pickerAfterSelect`, 캘린더 surface timer CSS marker 확인.
  22. not verified yet: 인증 세션이 없어 실제 모바일 UI에서 `운동 탭 -> 오늘 하단 시트 full -> + -> 종목 선택 -> 1화면에 카드 추가 및 타이머 하단 표시` 흐름은 직접 클릭 확인하지 못했다.

- Workout Record Scroll Regression 계획:
  1. `app.js`의 전역 workout pull-back gesture가 기록/상세 본문 스크롤을 가로채는지 우선 진단한다.
  2. 기록/상세 본문에서 시작한 touch gesture는 pull-back 대상에서 제외한다.
  3. 기록 화면 `.workout-tab-content`에는 `touch-action: pan-y`와 하단 고정 타이머 여유를 추가한다.
  4. 변경 범위는 `app.js`, `style.css`, `sw.js`, 관련 테스트, 문서로 제한한다.
  5. `app.js`, `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` cache version을 함께 bump한다.
  6. 완료: `app.js`에 `_isWorkoutRecordScrollTarget()`과 `_workoutPageScrollTop()`을 추가했다.
  7. 완료: 기록/상세 본문에서 시작한 touch gesture를 pull-back 대상에서 제외했다.
  8. 완료: `style.css`에서 기록 화면 본문 `touch-action: pan-y`, `overscroll-behavior-y: contain`, timer-open 하단 padding을 추가했다.
  9. 완료: `sw.js` cache version을 `tomatofarm-v20260630z07-workout-record-scroll`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  10. PASS: `node --check app.js`
  11. PASS: `node --check sw.js`
  12. PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js` — 10 tests passed
  13. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  14. PASS: `node --test --test-reporter=dot tests/*.test.js`
  15. PASS: `git diff --check`
  16. 완료: 리뷰 문서 `docs/ai/reviews/2026-06-30-workout-record-scroll-regression-review.md`를 작성했고 추가 수정 이슈는 없다.
  17. PASS: Dashboard3 Pages 배포 검증 — `ce243d72f73d`, `tomatofarm-v20260630z07-workout-record-scroll`
  18. PASS: Dashboard3 Pages marker 직접 fetch — `sw.js` cache version, `app.js`의 `_isWorkoutRecordScrollTarget`/`_workoutPageScrollTop`, `style.css`의 `touch-action: pan-y`/timer-open padding marker 확인
  19. not verified yet: 인증 계정 실제 `운동 탭 -> 기록 화면 -> 카드 리스트 세로 스크롤` UI flow 확인이 남아 있다.

- Workout Cycle Rail Exercise Name 계획:
  1. 좌측 사이클 목표 칩 첫 줄을 `W1 스모데드`처럼 주차 + 종목명으로 표시한다.
  2. 둘째 줄 `목표 75kg` 구조는 유지한다.
  3. 종목명은 `benchmark.short` 우선, 없으면 `benchmark.label`을 사용한다.
  4. 긴 종목명은 CSS ellipsis로 처리한다.
  5. 변경 범위는 `render-calendar.js`, `style.css`, `tests/workout-calendar-bottom-sheet.test.js`, `sw.js`와 문서로 제한한다.
  6. 완료: `render-calendar.js`에 `_cycleRailExerciseLabel()`과 `exerciseLabel`을 추가했다.
  7. 완료: 레일 칩 첫 줄을 `W1 + 종목명`, 둘째 줄을 `목표 kg`로 렌더한다.
  8. 완료: `style.css`에 `.cal-cycle-branch-head`, `.cal-cycle-branch-name` ellipsis 스타일을 추가했다.
  9. 완료: `sw.js` cache version을 `tomatofarm-v20260630z06-cycle-rail-exercise-name`으로 bump하고 cache marker 테스트 기대값을 갱신했다.
  10. PASS: `node --check render-calendar.js`
  11. PASS: `node --check sw.js`
  12. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` — 16 tests passed
  13. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  14. PASS: `node --test tests/workout-navigation-stack.test.js` — 5 tests passed
  15. PASS: `node --test --test-reporter=dot tests/*.test.js`
  16. PASS: `git diff --check`
  17. 완료: 리뷰 문서 `docs/ai/reviews/2026-06-30-workout-cycle-rail-exercise-name-review.md`를 작성했고 추가 수정 이슈는 없다.
  18. PASS: Dashboard3 Pages 배포 검증 — `a41a02546fcc`, `tomatofarm-v20260630z06-cycle-rail-exercise-name`
  19. PASS: Dashboard3 Pages marker 직접 fetch — `sw.js` cache version, `render-calendar.js`의 `exerciseLabel`/`cal-cycle-branch-name`, `style.css`의 `.cal-cycle-branch-name`/`text-overflow: ellipsis` 확인
  20. not verified yet: 인증 계정 실제 `운동 탭 -> 월간 캘린더 좌측 사이클 레일` UI flow 확인이 남아 있다.

- Workout Record Date Row Removal 계획:
  1. 운동 기록 화면에서만 `헬스 종목` 위 날짜 UI 행을 숨긴다.
  2. 월간 캘린더 홈과 식단 탭의 날짜 UI는 유지한다.
  3. `workout-tab-content` 상단 padding을 줄여 `헬스 종목`이 제거된 날짜 행 자리에서 시작하게 한다.
  4. 변경 범위는 `style.css`, `tests/workout-navigation-stack.test.js`, `sw.js`와 문서로 제한한다.
  5. `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` cache version을 함께 bump한다.
  6. 완료: `style.css`에서 기록 화면 날짜 행을 숨기고 본문 상단 padding을 `20px`로 줄였다.
  7. 완료: `tests/workout-navigation-stack.test.js`에 기록 모드 날짜 행 숨김/상단 padding marker를 추가했다.
  8. 완료: `sw.js` cache version을 `tomatofarm-v20260630z05-workout-record-date-row`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  9. PASS: `node --check sw.js`
  10. PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js` — 10 tests passed
  11. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  12. PASS: `node --test --test-reporter=dot tests/*.test.js`
  13. PASS: `git diff --check`
  14. 완료: 리뷰 문서 `docs/ai/reviews/2026-06-30-workout-record-date-row-removal-review.md`를 작성했고 추가 수정 이슈는 없다.
  15. PASS: Dashboard3 Pages 배포 검증 — `b01a336c8f56`, `tomatofarm-v20260630z05-workout-record-date-row`
  16. PASS: Dashboard3 Pages marker 직접 fetch — `style.css`의 `#tab-workout.wt-workout-record-mode > .workout-date-nav`, `padding-top: 20px`, `sw.js`의 cache version 확인
  17. not verified yet: 인증 계정 실제 `운동 탭 -> 날짜 선택 -> 운동 기록 화면 -> 헬스 종목 상단 표시` UI flow 확인이 남아 있다.

- Workout Cycle Rail Target Label 계획:
  1. 좌측 사이클 목표 라벨은 화면에서 운동명을 빼고 `W1`/`목표 50kg` 두 줄로 표시한다.
  2. 운동명, 트랙, reps 정보는 `title`/`aria-label`에 유지한다.
  3. 작은 font/line-height/padding으로 레일 높이가 과하게 커지지 않게 한다.
  4. 변경 범위는 `render-calendar.js`, `style.css`, `tests/workout-calendar-bottom-sheet.test.js`, `sw.js`와 문서로 제한한다.
  5. `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` cache version을 함께 bump한다.
  6. 완료: `render-calendar.js`에서 레일 item 표시값을 `weekLabel`, `targetLabel`로 분리했다.
  7. 완료: 레일 버튼을 `W1`/`목표 50kg` 두 줄 구조로 렌더하고, 운동명/트랙/reps는 `title`/`aria-label`에 유지했다.
  8. 완료: `style.css`에서 작은 2줄 라벨에 맞게 레일 버튼 font/line-height/padding을 조정했다.
  9. 완료: `tests/workout-calendar-bottom-sheet.test.js`에 2줄 라벨 marker를 추가했다.
  10. PASS: `node --check render-calendar.js`
  11. PASS: `node --check sw.js`
  12. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` — 16 tests passed
  13. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  14. PASS: `node --test --test-reporter=dot tests/*.test.js`
  15. PASS: `git diff --check`
  16. 완료: 리뷰 문서 `docs/ai/reviews/2026-06-30-workout-cycle-rail-target-label-review.md`를 작성했고 추가 수정 이슈는 없다.
  17. PASS: Dashboard3 Pages 배포 검증 — `b01a336c8f56`, `tomatofarm-v20260630z05-workout-record-date-row`
  18. PASS: Dashboard3 Pages marker 직접 fetch — `render-calendar.js`의 `weekLabel`, `cal-cycle-branch-target`, `sw.js`의 cache version 확인
  19. not verified yet: 인증 계정 실제 `운동 탭 -> 월간 캘린더 좌측 사이클 레일` UI flow 확인이 남아 있다.

- Tomato Farm 운영계 추가 배포:
  1. `tomatofarm/main`이 현재 HEAD의 조상인지 확인했다.
  2. `git push tomatofarm HEAD:main`으로 `4b8c004..c34da15` 범위를 운영계에 반영했다.
  3. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ c34da15` — `c34da15cf5d2`, `tomatofarm-v20260630z03-home-npc-bulb-hide`
  4. PASS: 운영계 marker 검증 — NPC 전구 숨김, 캘린더 터치 스크롤, 숫자 입력 keyboard UX marker 확인
  5. not verified yet: 인증 계정 실제 UI flow 확인은 남아 있다.

- Home NPC Bulb Hide 계획:
  1. 홈 라이프존에서 미란다와 상담실장의 전구 표시를 일단 숨긴다.
  2. 새 NPC 자산, 좌표, 이름표, 모달, 이벤트는 변경하지 않는다.
  3. 트레이너 전구는 그대로 유지한다.
  4. `style.css`에 미란다/상담실장 전구만 `display: none` 처리하고, `sw.js` cache version과 관련 테스트를 갱신한다.
  5. 완료: `style.css`에 미란다/상담실장 전구 전용 `display: none` 규칙을 추가했다.
  6. 완료: `sw.js` cache version을 `tomatofarm-v20260630z03-home-npc-bulb-hide`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  7. PASS: `node --check sw.js`
  8. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js tests/consulting-chief-quest-modal.test.js tests/trainer-quest-modal.test.js` — 24 tests passed
  9. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  10. PASS: `node --test --test-reporter=dot tests/*.test.js`
  11. PASS: `git diff --check`
  12. 완료: 리뷰 문서 `docs/ai/reviews/2026-06-30-home-npc-bulb-hide-review.md`를 작성했고 추가 수정 이슈는 없다.
  13. PASS: Dashboard3 Pages 배포 검증 — `6eca291ca93f`, `tomatofarm-v20260630z03-home-npc-bulb-hide`
  14. PASS: Dashboard3 Pages marker 검증 — `style.css`의 `.lz-miranda-npc .lz-npc-bulb`, `.lz-consulting-chief-npc .lz-npc-bulb`, `display: none`, `sw.js`의 cache version 확인
  15. not verified yet: 인증 계정 실제 홈 라이프존 화면에서 미란다/상담실장 전구가 사라진 상태 확인이 남아 있다.

- Workout Calendar Touch Scroll Fix 계획:
  1. 모바일 운동 캘린더 화면에서 월간 캘린더 영역을 시작점으로 아래 방향 스크롤하면 화면이 내려가지 않는 증상을 진단했다.
  2. 1순위 원인은 `app.js`의 전역 workout pull-back gesture가 캘린더 그리드 touchmove를 capture 단계에서 잡고 `preventDefault()`를 호출하는 흐름으로 판단했다.
  3. Slice 1 범위는 월간 캘린더 그리드 표식 추가, pull-back gesture 예외 처리, `touch-action: pan-y`, 회귀 테스트, `sw.js` cache bump로 제한한다.
  4. 제외 범위는 하단 day sheet drag/snap 재설계, 날짜 선택 정책 변경, 운동 상세 pull-back 제거, 저장 schema 변경, `www/` 수정, `tomatofarm` remote 배포다.
  5. 완료: `render-calendar.js` 월간 운동 캘린더 그리드에 `data-wt-calendar-scroll-surface` 표식을 추가했다.
  6. 완료: `app.js` 전역 workout pull-back gesture 차단 대상에 `[data-wt-calendar-scroll-surface]`를 추가했다.
  7. 완료: `style.css` `.cal-workout-month-grid`에 `touch-action: pan-y`를 추가했다.
  8. 완료: `sw.js` cache version을 `tomatofarm-v20260630z02-workout-calendar-scroll`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  9. PASS: `node --check app.js`
  10. PASS: `node --check render-calendar.js`
  11. PASS: `node --check sw.js`
  12. PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js` — 21 tests passed
  13. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  14. PASS: `node --test --test-reporter=dot tests/*.test.js`
  15. PASS: `git diff --check`
  16. 완료: 리뷰 문서 `docs/ai/reviews/2026-06-30-workout-calendar-touch-scroll-fix-review.md`를 작성했고 추가 수정 이슈는 없다.
  17. PASS: Dashboard3 Pages 배포 검증 — `320803395160`, `tomatofarm-v20260630z02-workout-calendar-scroll`
  18. PASS: Dashboard3 Pages marker 검증 — `app.js`의 `[data-wt-calendar-scroll-surface]`, `render-calendar.js`의 `data-wt-calendar-scroll-surface`, `style.css`의 `touch-action: pan-y`, `sw.js`의 cache version 확인
  19. not verified yet: 인증 계정 실제 캘린더 터치 스크롤 UI flow 확인이 남아 있다.

- Workout Number Input Keyboard UX 계획:
  1. 모바일 숫자 입력 포커스 시 브라우저 자동 scroll 보정으로 운동 카드가 살짝 이동하는 증상을 진단했다.
  2. 작은 입력 높이, 16px 미만 input font-size, focus scroll guard 부재, 일반/Max V2 inputmode 불일치를 주요 가설로 잡았다.
  3. Slice 1 범위는 `workout/exercises.js` focus scroll guard, 숫자 inputmode 정리, `style.css` input hit area 확대, 회귀 테스트, `sw.js` cache bump로 제한한다.
  4. 제외 범위는 운동 카드 전체 재설계, 저장 schema 변경, 캘린더 sheet drag/snap 변경, `www/` 수정, `tomatofarm` remote 배포다.
  5. 완료: `workout/exercises.js`에 `WORKOUT_NUMBER_INPUT_SELECTOR` focus scroll guard를 추가했다.
  6. 완료: 일반 세트 `kg`/`회` input에 `inputmode`를 추가했다.
  7. 완료: `style.css`에서 일반 세트 input과 Max V2 input hit area를 확대하고 keyboard focus 여유 공간을 추가했다.
  8. 완료: `sw.js` cache version을 `tomatofarm-v20260630z01-workout-number-input-ux`로 bump하고 cache marker 테스트 기대값을 갱신했다.
  9. PASS: `node --check workout/exercises.js`
  10. PASS: `node --check sw.js`
  11. PASS: `node --test tests/workout-card-layout-css.test.js tests/workout-navigation-stack.test.js` — 10 tests passed
  12. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  13. PASS: `node --test --test-reporter=dot tests/*.test.js`
  14. PASS: `git diff --check`
  15. 완료: 리뷰 문서 `docs/ai/reviews/2026-06-30-workout-number-input-keyboard-ux-review.md`를 작성했고 추가 수정 이슈는 없다.
  16. PASS: Dashboard3 Pages 배포 검증 — `7456942e8edda43a052e05c918a77b2914561524`, `tomatofarm-v20260630z01-workout-number-input-ux`
  17. PASS: Dashboard3 Pages marker 검증 — `WORKOUT_NUMBER_INPUT_SELECTOR`, `input.focus({ preventScroll: true })`, `#tab-workout .set-input`, `scroll-margin-bottom`, Max V2 input CSS marker 확인
  18. not verified yet: 인증 계정 실제 숫자 입력 키보드 UI flow 확인이 남아 있다.

## 방금 계획한 항목

- Home Consulting Chief NPC 계획:
  1. 홈 라이프존 우측 하단 소파/상담 라운지 영역에 `상담실장` NPC를 추가한다.
  2. 참고 이미지는 정확한 실존 인물 복제가 아니라 병원 상담실장 분위기, 강한 눈매/눈썹, 묶은 어두운 머리, 흰 가운 또는 검은 재킷 같은 식별 단서로 반영한다.
  3. 홈용 작은 투명 PNG와 모달용 큰 투명 PNG를 분리해 `assets/home/life-zone/ui/`에 저장한다.
  4. 기존 `life-zone:npc-quest` 이벤트, DOM 이름표, `npc-quest-bubble.png` 전구 패턴을 재사용한다.
  5. 수정 범위는 `home/life-zone.js`, `app.js`, `modal-manager.js`, `modals/consulting-chief-quest-modal.js`, `style.css`, `sw.js`, 관련 테스트와 새 PNG 자산으로 제한한다.
  6. 배포는 `origin/main` Dashboard3 Pages만 허용하고 운영계 `tomatofarm` remote는 사용하지 않는다.

- Home Consulting Chief NPC Slice 1:
  1. `assets/home/life-zone/ui/consulting-chief-npc-home.png`와 `consulting-chief-npc-modal.png`를 추가했다.
  2. `home/life-zone.js`에 우측 하단 `상담실장` NPC 버튼, 이름표, 전구, `consultingChief` 이벤트 detail을 추가했다.
  3. `modals/consulting-chief-quest-modal.js`와 `app.js`/`modal-manager.js` 분기를 추가했다.
  4. `style.css`에 홈 배치와 모달 캐릭터 크기 스타일을 추가했다.
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z29-consulting-chief-npc`로 갱신하고 새 모달/PNG를 `STATIC_ASSETS`에 등록했다.
  6. PASS: `node --check home/life-zone.js; node --check app.js; node --check modal-manager.js; node --check modals/consulting-chief-quest-modal.js; node --check sw.js`
  7. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js tests/miranda-quest-modal.test.js tests/trainer-quest-modal.test.js` — 24 tests passed
  8. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  9. PASS: `node --test tests/*.test.js` — 613 tests passed
  10. PASS: `git diff --check`
  11. PASS: Dashboard3 Pages 배포 검증 — `f6bc1679999f8c0d5bc9f2ddae802dc04c21bf1a`, `tomatofarm-v20260629z29-consulting-chief-npc`
  12. PASS: 배포 URL 직접 fetch — `index.html`, `sw.js`, `home/life-zone.js`, `modals/consulting-chief-quest-modal.js`, 홈/모달 PNG HTTP 200과 marker 확인
  13. 리뷰: `docs/ai/reviews/2026-06-29-home-consulting-chief-npc-review.md`
  14. not verified yet: in-app browser가 Dashboard3 페이지 로딩 확인에서 두 차례 timeout되어 실제 홈 화면 전구 클릭 flow는 직접 확인하지 못했다.

- Home Consulting Chief NPC Slice 2 계획:
  1. 사용자 제공 배포 화면에서 `상담실장` 홈 스프라이트가 우측 하단 방 경계 밖으로 내려가 보이는 회귀를 확인했다.
  2. 원인은 홈 자산이 `96x256` 세로형인데 CSS가 `width: 108 기준`, `top: 1284`로 커서 모바일 카드에서 하체가 공간 밖으로 내려가는 것이다.
  3. 새 자산 생성 없이 `style.css`의 좌표/폭만 줄이고, 캐시/테스트/문서를 갱신한다.
  4. 완료: `.lz-consulting-chief-npc`를 `left: 1338`, `top: 1260`, `width: 86 기준`으로 보정하고 clamp를 `28px-40px`로 줄였다.
  5. 완료: `sw.js` 캐시 버전을 `tomatofarm-v20260629z30-consulting-chief-fit`으로 bump했다.
  6. PASS: `node --check sw.js`
  7. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js` — 14 tests passed
  8. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  9. PASS: `node --test --test-reporter=dot tests/*.test.js`
  10. PASS: `git diff --check`
  11. PASS: 로컬 합성 미리보기에서 상담실장 스프라이트가 우측 하단 소파/테이블 공간 안쪽에 들어오는 것을 확인했다.
  12. not verified yet: 인증 세션이 없어 실제 배포 홈 화면에서 클릭 flow는 직접 시각 검증하지 못했다.

- Home Consulting Chief NPC Slice 3 계획:
  1. 사용자 피드백: Dashboard3 배포 화면에서 `상담실장` NPC가 여전히 크다.
  2. 원인: 모바일에서는 Slice 2의 `min-width: 28px`가 계속 적용되어 세로형 `96x256` 자산 높이가 약 `75px`로 남는다.
  3. 보정: 홈 전용 폭을 `clamp(18px, calc(56 / 1672 * 100%), 28px)`로 더 줄이고, 좌표/모달/다른 NPC는 건드리지 않는다.
  4. 완료: `style.css`에서 `.lz-consulting-chief-npc` 폭을 `clamp(18px, calc(56 / 1672 * 100%), 28px)`로 축소했다.
  5. 완료: `sw.js` 캐시 버전을 `tomatofarm-v20260629z31-consulting-chief-smaller`로 bump했다.
  6. PASS: `node --check sw.js`
  7. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js` — 14 tests passed
  8. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
  9. PASS: `node --test --test-reporter=dot tests/*.test.js`
  10. PASS: `git diff --check`
  11. PASS: 로컬 합성 미리보기에서 상담실장 스프라이트가 우측 하단 소파/테이블 공간 안쪽에 작게 배치되는 것을 확인했다.
  12. not verified yet: 인증 세션이 없어 실제 배포 홈 화면에서 클릭 flow는 직접 시각 검증하지 못했다.

- Home Life Zone Trainer Quest Bubble Offset 계획:
  1. `.lz-npc-quest`의 현재 `left:1084`, `top:824`, `width:168 기준` 배치가 모바일 축소 시 트레이너 얼굴과 겹치는 원인임을 확인했다.
  2. 전구를 새 자산 없이 기존 `npc-quest-bubble.png` DOM의 trainer 전용 offset으로 얼굴 우상단에 분리한다.
  3. 수정 범위는 `style.css`, `tests/home-life-zone-npc-quest.test.js`, `sw.js`, 리뷰/NEXT_ACTION 문서로 제한했다.

- Home Life Zone Trainer Quest Bubble Offset Slice 1:
  1. `style.css`에서 `.lz-npc-quest` `top`을 `792`로 올리고 폭을 `188 기준`으로 넓혔다.
  2. `.lz-npc-quest--trainer .lz-npc-bulb`에 `--lz-bulb-x: 62%`, `--lz-bulb-y: -72%`를 추가했다.
  3. reduced motion에서도 offset이 유지되도록 `.lz-npc-bulb` 기본 `transform`을 CSS 변수 기반으로 지정했다.
  4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z27-trainer-quest-bubble-offset`으로 갱신했다.
  5. 캐시 marker 회귀 테스트를 새 버전으로 갱신했다.
  6. PASS: `node --check home/life-zone.js; node --check sw.js`
  7. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/trainer-quest-modal.test.js` — 15 tests passed
  8. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  9. PASS: `node --test tests/*.test.js` — 608 tests passed
  10. PASS: `git diff --check`
  11. PASS: Dashboard3 Pages 배포 검증 — `tomatofarm-v20260629z27-trainer-quest-bubble-offset` 캐시 버전 확인
  12. PASS: Dashboard3 Pages marker 검증 — `style.css`의 trainer 전구 offset과 `sw.js` 캐시 버전 확인
  13. not verified yet: 인증 세션이 없어 실제 배포 홈 화면에서 트레이너 얼굴 겹침 UI flow는 직접 시각 확인하지 못했다.

- Home Life Zone Trainer Quest Bubble Offset Slice 2 계획:
  1. `--lz-bulb-x: 62%`가 전구를 오른쪽으로 밀어 요구사항과 다르게 보이는 원인임을 확인했다.
  2. `.lz-npc-quest--trainer .lz-nameplate { order: -1; }` 때문에 이름표가 전구보다 위에 나오는 문제를 확인했다.
  3. 목표 구조는 아래에서 위로 `트레이너 머리 -> 트레이너 이름표 -> 전구`다.

- Home Life Zone Trainer Quest Bubble Offset Slice 2:
  1. `.lz-npc-quest--trainer .lz-npc-bulb`를 `order: 0`, `--lz-bulb-x: 0px`, `--lz-bulb-y: 0px`으로 고정했다.
  2. `.lz-npc-quest--trainer .lz-nameplate`를 `order: 1`로 변경해 전구가 이름표 위에 오게 했다.
  3. `.lz-npc-quest` 폭을 `168 기준`으로 되돌려 트레이너 머리 중심선에서 벗어나지 않게 했다.
  4. 테스트에 `order: -1`과 `--lz-bulb-x: 62%` 재도입 금지를 추가했다.
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z28-trainer-quest-vertical-stack`으로 갱신했다.
  6. PASS: `node --check home/life-zone.js; node --check sw.js`
  7. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/trainer-quest-modal.test.js` — 15 tests passed
  8. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  9. PASS: `node --test tests/*.test.js` — 608 tests passed
  10. PASS: `git diff --check`
  11. PASS: Dashboard3 Pages 배포 검증 — `tomatofarm-v20260629z28-trainer-quest-vertical-stack` 캐시 버전 확인
  12. PASS: Dashboard3 Pages marker 검증 — `order: 1`, `order: 0`, `--lz-bulb-x: 0px`, `--lz-bulb-y: 0px` 확인
  13. not verified yet: 인증 세션이 없어 실제 홈 화면에서 픽셀 단위 시각 확인은 직접 수행하지 못했다.

## 직전 완료 요약

- Home Life Zone Running Stale Priority 계획:
  1. `resolveLifeZoneActivity()`가 `hasLifeZoneRunningActivity()`를 스냅샷보다 먼저 검사해 저장된 러닝 기록이 최신 점심 기록을 덮는 원인을 확인했다.
  2. 라이브 러닝만 최우선으로 두고, 저장된 러닝은 최신 활동 스냅샷 이후에 판정하도록 범위를 고정했다.
  3. 러닝 지도/스프라이트/좌표와 식단 저장 payload는 제외 범위로 고정했다.

- Home Life Zone Running Stale Priority Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-home-life-zone-running-stale-priority.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-home-life-zone-running-stale-priority-review.md`
  3. `home/life-zone-state.js`에서 라이브 러닝 판정 `hasLifeZoneActiveRunning()`을 추가했다.
  4. 홈 라이프존 상태 우선순위를 `라이브 러닝 -> 최신 활동 스냅샷 -> 저장 러닝 -> 운동 -> 식단 -> 업무`로 변경했다.
  5. `workout/save.js`에서 러닝 저장 시 `state: 'running'` 스냅샷을 남기도록 변경했다.
  6. 문정토마토 점심 스냅샷이 저장 러닝을 덮는 회귀 테스트를 추가했다.
  7. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z26-life-zone-running-priority`로 갱신했다.
  8. PASS: `node --check home/life-zone-state.js; node --check workout/save.js; node --check sw.js`
  9. PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/save-schema.test.js` — 95 tests passed
  10. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  11. PASS: `node --test tests/*.test.js` — 608 tests passed
  12. PASS: `git diff --check`
  13. PASS: Dashboard3 Pages 배포 검증 — `tomatofarm-v20260629z26-life-zone-running-priority` 캐시 버전 확인
  14. PASS: Dashboard3 Pages 마커 검증 — 라이브 러닝 우선순위, 스냅샷 우선순위, 러닝 저장 스냅샷 marker 확인

- Stats Performance Growth Blue 계획:
  1. `성장중` 판정 텍스트가 `var(--diet-ok)` 때문에 토마토 레드로 보이는 현상을 확인했다.
  2. 변경 범위를 `.stats-perf-row.is-growth .stats-perf-status b` 색상, `sw.js` 캐시 버전, 관련 회귀 테스트로 제한했다.
  3. 판정 로직, 표 구조, 데이터 집계는 제외 범위로 고정했다.

- Stats Performance Growth Blue Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-stats-performance-growth-blue.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-stats-performance-growth-blue-review.md`
  3. `style.css`에서 `.stats-perf-row.is-growth .stats-perf-status b` 색상을 `#2563eb`으로 변경했다.
  4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z25-stats-growth-blue`로 갱신했다.
  5. `tests/stats-exercise-performance.test.js`에 성장 판정 색상 회귀 검증을 추가했다.
  6. PASS: `node --check sw.js`
  7. PASS: `node --test tests/stats-exercise-performance.test.js tests/stats-overall-compact-summary.test.js` — 8 tests passed
  8. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  9. PASS: `node --test tests/*.test.js` — 606 tests passed
  10. PASS: `git diff --check`
  11. PASS: Dashboard3 Pages 배포 검증 — `tomatofarm-v20260629z25-stats-growth-blue` 캐시 버전 확인
  12. PASS: Dashboard3 Pages 마커 검증 — `style.css::.stats-perf-row.is-growth .stats-perf-status b { color: #2563eb; }`

- Stats Weekly Burned Calorie Render Fix Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-stats-weekly-burned-calorie-render-fix.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-stats-weekly-burned-calorie-render-fix-review.md`
  3. 주간 그래프 집계에서 식단 day와 workout day를 분리했다.
  4. 섭취칼로리는 식단 day, 운동칼로리는 원본 cache workout day로 계산한다.
  5. 하단 `운동 kcal` KPI도 원본 cache workout day 기준으로 계산한다.
  6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z24-stats-weekly-burned-fix`로 갱신했다.
  7. PASS: `node --check render-stats.js; node --check sw.js`
  8. PASS: `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js` — 14 tests passed
  9. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  10. PASS: `node --test tests/*.test.js` — 606 tests passed
  11. PASS: `git diff --check`
  12. PASS: Dashboard3 Pages 배포 검증 — `tomatofarm-v20260629z24-stats-weekly-burned-fix` 캐시 버전 확인
  13. not verified yet: 인증 계정 실제 UI에서 초록색 운동칼로리 선이 그려지는지 시각 확인이 남아 있다.

- Stats Weekly Calorie Aggregation Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-stats-weekly-calorie-aggregation.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-stats-weekly-calorie-aggregation-review.md`
  3. 전체통계와 트레이너 통계 모달의 건강지표 카드 제목을 `체중 & 주간 누적 칼로리 추이`로 변경했다.
  4. `_renderKcalWeightChart()`가 일별 섭취칼로리 대신 주 단위 누적 섭취칼로리와 주 단위 누적 운동칼로리를 표출하도록 바꿨다.
  5. 운동칼로리 집계는 `calcBurnedKcal(day, weightForBurn).total`을 사용한다.
  6. 별도 `월간 칼로리 리포트` 카드나 두 번째 그래프는 되살리지 않았다.
  7. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z23-stats-weekly-calories`로 갱신했다.
  8. PASS: `node --check render-stats.js; node --check sw.js`
  9. PASS: `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js` — 14 tests passed
  10. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  11. PASS: `node --test tests/*.test.js` — 606 tests passed
  12. PASS: `git diff --check`
  13. PASS: Dashboard3 Pages 배포 검증 — `tomatofarm-v20260629z23-stats-weekly-calories` 캐시 버전 확인
  14. PASS: 원격 `index.html`, `render-stats.js`, `sw.js` marker fetch — HTTP 200, 새 주간 누적 문자열과 캐시 버전 확인
  15. not verified yet: 인증 계정 실제 UI에서 Chart.js 렌더링 시각 확인이 남아 있다.

- Stats Health Calorie Report Flatten Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-stats-health-calorie-report-flatten.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-stats-health-calorie-report-flatten-review.md`
  3. `월간 칼로리 리포트` 하위 제목과 `calorie-month-chart` 두 번째 그래프를 제거했다.
  4. `calorie-month-summary`만 `체중 & 섭취칼로리 추이` 카드 내부에 남겼다.
  5. 트레이너 통계 모달도 같은 구조로 맞췄다.
  6. 별도 월간 차트 tracker `_calorieMonthCharts`와 Chart 생성 경로를 제거했다.
  7. 기존 월간 그래프의 운동칼로리 정보는 요약 KPI `운동`으로 보존했다.
  8. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z22-stats-health-calorie-flat`으로 갱신했다.
  9. PASS: `node --check render-stats.js; node --check sw.js`
  10. PASS: `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js` — 14 tests passed
  11. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  12. PASS: `node --test tests/*.test.js` — 606 tests passed
  13. PASS: `git diff --check`
  14. not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 UI 시각 확인이 남아 있다.

- Stats Health Calorie Card Merge Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-stats-health-calorie-card-merge.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-stats-health-calorie-card-merge-review.md`
  3. 전체통계의 `월간 칼로리 리포트`를 별도 `stats-calorie-report-block` 카드에서 제거했다.
  4. 월간 칼로리 차트/요약을 `체중 & 섭취칼로리 추이` 카드 내부 `stats-health-report` 하위 섹션으로 이동했다.
  5. 트레이너 통계 모달도 같은 구조로 맞췄다.
  6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z21-stats-health-calorie-merge`로 갱신했다.
  7. PASS: `node --check render-stats.js; node --check sw.js`
  8. PASS: `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js` — 14 tests passed
  9. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  10. PASS: `node --test tests/*.test.js` — 606 tests passed
  11. PASS: `git diff --check`
  12. not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 UI 시각 확인이 남아 있다.

- Trainer Stats Top Art + Home Map Scale Fix Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-trainer-stats-top-art-home-map-scale-fix.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-trainer-stats-top-art-home-map-scale-fix-review.md`
  3. 통계 모달 전용 트레이너 이미지를 본문 내부가 아니라 모달 상단 바깥 크롭 레이어로 재배치했다.
  4. 홈 러닝 지도 말풍선 전용 최대 zoom을 `12`로 낮춰 작은 말풍선에서도 더 넓은 동네 맥락을 보이게 했다.
  5. 운동 탭 러닝 결과 지도 파일은 수정하지 않고 홈 전용 계약만 변경했다.
  6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z20-trainer-top-map-zoom`으로 갱신했다.
  7. PASS: `node --check home/life-zone.js; node --check modals/trainer-quest-modal.js; node --check sw.js`
  8. PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js` — 41 tests passed
  9. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  10. PASS: `node --test tests/*.test.js` — 606 tests passed
  11. PASS: `git diff --check`
  12. not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 UI 시각 확인이 남아 있다.

- Home Running Map Zoom Scale Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-home-running-map-zoom-scale.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-home-running-map-zoom-scale-review.md`
  3. 홈 라이프존 러닝 지도 말풍선에 `RUNNING_MAP_HOME_MAX_ZOOM = 14`를 추가해 짧은 러닝/라이브 위치에서도 주변 동네 단위가 보이도록 했다.
  4. 운동 탭 러닝 결과 지도는 `workout/running-map.js`와 `renderRunningMap(... phase: 'detail')` 경로를 그대로 유지했다.
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z19-home-running-map-zoom`으로 갱신했다.
  6. PASS: `node --check home/life-zone.js; node --check sw.js`
  7. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/running-tracker.test.js tests/workout-calendar-bottom-sheet.test.js` — 41 tests passed
  8. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  9. PASS: `node --test tests/*.test.js` — 606 tests passed
  10. PASS: `git diff --check`
  11. PASS: Dashboard3 Pages 배포 검증을 통과했다. 최종 검증 커밋은 핸드오프에 기록한다.
  12. not verified yet: 인증 계정 실제 홈탭 지도 말풍선 시각 확인이 남아 있다.

- Trainer Health Miranda Visuals Slice 1-3:
  1. 계획: `docs/ai/features/2026-06-29-trainer-health-miranda-visuals.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-trainer-health-miranda-visuals-review.md`
  3. `assets/home/life-zone/ui/trainer-quest-stats-guide-trainer.png`를 추가해 통계 모달 우측에서 팔을 뻗어 안내하는 트레이너를 표시했다.
  4. 트레이너 말풍선 문구를 `회원님의 운동 성과를 함께 살펴보시죠!`로 변경하고 공유/복사 버튼을 제목 줄 옆으로 이동했다.
  5. 전체통계와 트레이너 통계 모달의 건강지표 영역을 `체중 & 섭취칼로리 추이`, `월간 칼로리 리포트` 카드로 롤백했다.
  6. `assets/home/life-zone/ui/miranda-npc-seated.png`를 새 imagegen 결과로 교체해 낮은 농도 선글라스, 보이는 눈매, 차가운 표정을 반영했다.
  7. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z18-trainer-health-miranda`로 갱신했다.
  8. PASS: `node --check modals/trainer-quest-modal.js; node --check modals/miranda-quest-modal.js; node --check render-stats.js; node --check sw.js`
  9. PASS: `node --test tests/trainer-quest-modal.test.js tests/miranda-quest-modal.test.js tests/stats-unified-health-chart.test.js tests/stats-overall-compact-summary.test.js tests/stats-exercise-performance.test.js` — 21 tests passed
  10. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  11. PASS: `node --test tests/*.test.js` — 606 tests passed
  12. PASS: `git diff --check`
  13. PASS: Dashboard3 Pages 배포 검증을 통과했다. 최종 검증 커밋은 핸드오프에 기록한다.
  14. PASS: 배포 URL의 `modals/trainer-quest-modal.js`, `render-stats.js`, `style.css`, `sw.js`, `miranda-npc-seated.png`, `trainer-quest-stats-guide-trainer.png`가 HTTP 200과 새 marker를 반환했다.
  15. not verified yet: 브라우저 플러그인이 Dashboard3 탭 로딩 및 탭 목록 조회에서 제한 시간에 걸려 실제 모달 클릭 흐름은 인증 계정 브라우저에서 직접 확인이 필요하다.

- Trainer Label Stats Leaning Asset Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-trainer-label-stats-leaning-asset.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-trainer-label-stats-leaning-asset-review.md`
  3. 홈 트레이너 이름표를 전구 위로 올려 얼굴을 덮지 않게 했다.
  4. imagegen built-in 경로로 통계 모달 전용 `assets/home/life-zone/ui/trainer-quest-leaning-trainer.png`를 추가했다.
  5. 새 PNG는 `1028x1086` RGBA이며, `sw.js` `STATIC_ASSETS`에 등록했다.
  6. 트레이너 통계 화면에서는 `trainer-quest-sheet--stats`로 기존 전신 stage를 숨기고 compact padding을 적용해 통계 정보가 상단부터 시작한다.
  7. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z15-trainer-leaning-modal`로 갱신했다.
  8. PASS: `node --check modals/trainer-quest-modal.js; node --check home/life-zone.js; node --check sw.js`
  9. PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js` — 19 tests passed
  10. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
  11. PASS: `node --test tests/*.test.js` — 603 tests passed
  12. PASS: `git diff --check`
  13. PASS: Dashboard3 배포 검증
  14. PASS: 배포된 `sw.js`, `modals/trainer-quest-modal.js`, `style.css` marker 검증
  15. not verified yet: 인증 세션이 없는 브라우저에서는 실제 홈탭과 트레이너 통계 모달 시각 상태를 직접 클릭 검증하지 못했다.

- Home Life Zone Overlay Alignment Fix Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-home-life-zone-overlay-alignment-fix.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-home-life-zone-overlay-alignment-fix-review.md`
  3. 트레이너 전구 버튼을 실제 트레이너 정수리 위 좌표로 이동했다.
  4. 미란다 전구는 트레이너 전구와 같은 원본 비율을 쓰고, 애니메이션이 절대 위치 `transform`을 덮어쓰지 않도록 CSS 변수를 적용했다.
  5. 미란다 이름표를 캐릭터 위로 올렸다.
  6. 러닝 actor 슬롯을 하단 트랙 원근에 맞춰 중앙/좌측/우측 차등 크기로 조정했다.
  7. 홈 지도 말풍선은 실제 지도 타일/경로/현재점/동 단위 라벨을 유지하고, 작은 말풍선에서 지도 내용을 가리던 `VWorld` attribution은 숨겼다.
  8. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z14-life-zone-alignment`로 갱신했다.
  9. PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
  10. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/miranda-quest-modal.test.js tests/running-entry.test.js` — 41 tests passed
  11. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=859`
  12. PASS: `node --test tests/*.test.js` — 603 tests passed
  13. PASS: `git diff --check`
  14. PASS: Dashboard3 배포 검증
  15. PASS: 배포된 `sw.js`, `style.css`, `home/life-zone-state.js` marker 검증
  16. not verified yet: 인증 세션이 없는 브라우저에서는 실제 홈탭 라이프존 시각 상태를 직접 클릭 검증하지 못했다.

- NPC Asset Workflow Rules 계획:
  1. 계획: `docs/ai/features/2026-06-29-npc-asset-workflow-rules.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-npc-asset-workflow-rules-review.md`
  3. `docs/ai/NPC_ASSET_WORKFLOW.md`를 추가해 홈 배치용 스프라이트, 모달용 아트에셋, 필요 시 NPC 전용 공간/소품 overlay를 기본 산출물 계약으로 고정했다.
  4. 홈탭 기존 좌표계/공간/각도/사이즈 기준, 도형/스티커형 결과 폐기, imagegen 프롬프트, PNG 후처리, DOM 이름표/전구/모달 바인딩 규칙을 정리했다.
  5. `AGENTS.md`에 NPC/라이프존 캐릭터/전구/모달 아트 요청 시 `docs/ai/NPC_ASSET_WORKFLOW.md`를 먼저 읽도록 필수 진입 규칙을 추가했다.
  6. 검증: `git diff --check`, `rg -n "NPC_ASSET_WORKFLOW|NPC|라이프존 캐릭터" AGENTS.md docs/ai/NPC_ASSET_WORKFLOW.md docs/ai/NEXT_ACTION.md`.

- Home Miranda Fashion Corner Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-home-miranda-fashion-corner.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-home-miranda-fashion-corner-review.md`
  3. `assets/home/life-zone/ui/miranda-fashion-corner.png`를 추가해 좌측 하단 기존 집기 영역 위에 옷 행거, 의상, 선반, 거울 스프라이트를 배치했다.
  4. `home/life-zone.js`에 `lz-miranda-corner` overlay를 추가하고, 미란다 NPC는 기존 이벤트/이름표 구조를 유지했다.
  5. `style.css`에서 패션 코너 좌표와 미란다 좌표를 조정해 미란다가 러닝트랙보다 아래쪽에 표시되도록 했다.
  6. `sw.js` `STATIC_ASSETS`에 새 PNG를 등록하고 `CACHE_VERSION`을 `tomatofarm-v20260629z13-home-miranda-fashion-corner`로 갱신했다.
  7. 검증: `node --check home/life-zone.js; node --check sw.js`, `node --test tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js`, `node --test tests/*.test.js`, `node scripts/verify-runtime-assets.mjs`, `git diff --check`.

- Stats Overall Deep Unification Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-stats-overall-deep-unification.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-stats-overall-deep-unification-review.md`
  3. `index.html`에서 `전체통계`/`심층통계` 탭과 `#stats-deep-panel`을 제거하고, 전체통계에 기간 프리셋과 `stats-workout-analysis`를 추가했다.
  4. `render-stats.js`에서 `_renderDeepStats()`, `switchStatsView`, `trainer-quest-deep-stats` 경로를 제거하고 `_renderWorkoutAnalysis()`로 통합했다.
  5. 운동 완료 인사이트의 `계획 이행률`, `계획 대비 볼륨`, `완료 세트`를 선택 기간 기준 통계로 흡수했다.
  6. `workout/index.js`에서 운동 저장 후 `window.insightsOpen(sessionKey)` 자동 호출을 제거했다.
  7. 중복 방지를 위해 부위별 운동량/보강 후보는 기존 `근육 피로도` 카드에만 남기고 `운동 분석`에는 별도 부위별 운동량 카드를 두지 않았다.
  8. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z9-stats-unified-overall`로 갱신했다.
  9. PASS: `node --check render-stats.js; node --check workout/index.js; node --check sw.js`
  10. PASS: `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/trainer-quest-modal.test.js tests/workout-timer-summary-only.test.js` — 24 tests passed
  11. PASS: `node --test tests/*.test.js` — 596 tests passed
  12. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=855`
  13. PASS: `git diff --check`
  14. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 794fc9343096a7f26a4f08814fbcded2250e49b5` — `[deploy-verify] ok 794fc9343096 tomatofarm-v20260629z9-stats-unified-overall static=226`
  15. PASS: deployed marker fetch — `index.html`, `render-stats.js`, `workout/index.js`, `sw.js` 모두 HTTP 200 및 새 통계 통합 marker 확인.
  16. not verified yet: 인증 세션이 없어 실제 `더보기/통계 탭 -> 기간 버튼 -> 운동 분석` UI 클릭 흐름은 인증 계정에서 확인 필요.

- Home Running Motion Map Clarity Slice 1:
  1. 계획: `docs/ai/features/2026-06-29-home-running-motion-map-clarity.md`
  2. 리뷰: `docs/ai/reviews/2026-06-29-home-running-motion-map-clarity-review.md`
  3. 기존 옆방향 러닝 스프라이트를 3/4 정면 제자리 조깅 2프레임 스프라이트로 교체했다.
  4. 러닝 actor CSS에서 좌우 이동/회전 없이 발 접지점 기준 vertical bob과 frame swap만 남겼다.
  5. 러닝 슬롯을 기존 홈트랙 하단부로 내리고, 홈 지도 말풍선에 `방이동 · 송파구` 형식의 위치 라벨을 추가했다.
  6. 러닝 라이브 경로 중심점이 생기면 VWorld reverse geocode를 백그라운드로 수행해 홈 라벨을 갱신한다.
  7. PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check workout/running-session.js`
  8. PASS: `python -m py_compile scripts/process-life-zone-running-sprites.py`
  9. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js` — 34 tests passed
  10. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=857`
  11. PASS: `node --test` — 594 tests passed
  12. PASS: `git diff --check`
  13. not verified yet: in-app browser에서 Dashboard3 배포 페이지 네비게이션이 70초 제한을 초과해 실제 홈탭 라이프존 시각 flow는 직접 확인하지 못했다.

- Running Result Map Tab Motion Slice 1:
  1. `render-calendar.js`에서 운동 상세 탭을 `1회차`, `2회차`, `러닝`으로 변경하고 러닝 탭을 헬스 세션과 분리했다.
  2. 러닝 상세 카드는 가짜 격자 지도와 중복 chip을 제거하고 `renderRunningMap` 실제 지도 셸에 GPS route를 표시한다.
  3. `workout/running-session.js`에서 러닝 저장 session index를 `2`로 고정하고 VWorld reverse geocode 동 단위 위치 라벨을 저장한다.
  4. phone/watch bridge sensor hook으로 고도, 심박, 케이던스를 수집할 수 있게 하고 미수집 값은 `--`로 표시한다.
  5. 홈 라이프존 러닝 actor를 기존 스프라이트 기반 작은 제자리 러닝 모션으로 조정했다.
  6. 리뷰: `docs/ai/reviews/2026-06-29-running-result-map-tab-motion-review.md`
  7. PASS: `node --check workout/running-session.js; node --check render-calendar.js; node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
  8. PASS: `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/home-life-zone-npc-quest.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js` — 42 tests passed
  9. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=857`
  10. PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test $tests` — 594 tests passed
  11. PASS: `git diff --check`
  12. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ cb7cf08ad4812bec572efdd304591db1d91caf8f` — `[deploy-verify] ok cb7cf08ad481 tomatofarm-v20260629z7-running-map-tab-motion static=226`
  13. PASS: deployed marker fetch — `sw.js`, `render-calendar.js`, `workout/running-session.js`, `style.css` 모두 새 러닝 탭/지도/센서/홈 모션 marker 포함.
  14. not verified yet: 브라우저 탭 로딩이 60초 제한을 초과해 실제 `운동 탭 -> 러닝 탭 -> 러닝 시작/완료/저장 -> 상세 카드 지도` UI flow는 직접 확인하지 못했다.

- Trainer Quest Glass Squircle Slice 1:
  1. `modals/trainer-quest-modal.js` 말풍선 타자 간격을 `28ms`에서 `56ms`로 늦췄다.
  2. `style.css`에 `.trainer-quest-modal` 전용 glass overlay를 추가하고 `.trainer-quest-sheet`를 흰색 반투명 glass panel로 변경했다.
  3. 선택지는 어두운 직사각 패널에서 독립된 rounded squircle glass 버튼 stack으로 변경했고, 폭을 `min(236px, calc(50vw - 12px))`로 제한했다.
  4. 선택지 label은 TDS 작은 텍스트 토큰(`tds-st13`, `tds-w-semi`)을 사용한다.
  5. `tests/trainer-quest-modal.test.js`에서 이전 회색 TDS sheet/어두운 메뉴/빠른 타자 계약을 제거하고 새 계약을 검증한다.
  6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z6-trainer-glass-squircle`로 bump했다.
  7. 리뷰: `docs/ai/reviews/2026-06-29-trainer-quest-glass-squircle-review.md`
  8. PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js`
  9. PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js` — 13 tests passed
  10. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=855`
  11. PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 591 tests passed
  12. PASS: `git diff --check`
  13. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 4113ac7` — `[deploy-verify] ok 4113ac78c443 tomatofarm-v20260629z6-trainer-glass-squircle static=226`
  14. PASS: deployed marker fetch — `index.html`, `sw.js`, `modals/trainer-quest-modal.js`, `style.css` all returned HTTP 200 and contained the expected glass/squircle/typing markers.
  15. not verified yet: 자동 브라우저가 배포 페이지 로딩 제한시간을 넘겨 실제 홈탭 트레이너 모달 클릭 flow는 직접 확인하지 못했다.

- Running Save Detail Card Slice 1:
  1. 커밋: `e2e3955f42294edc4c6271ba8d3072710d04faec`
  2. 러닝 요약 저장 후 `window.wtOpenWorkoutDaySheet`로 해당 날짜/회차 캘린더 상세 시트를 바로 연다.
  3. 상세 시트 러닝 항목을 `wt-running-read-card`로 렌더하고 거리/시간/평균 페이스/칼로리/고도/케이던스/GPS 요약만 표출한다.
  4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z4-running-save-detail-card`로 bump했다.
  5. PASS: `node --check app.js; node --check workout/running-session.js; node --check render-calendar.js; node --check sw.js`
  6. PASS: `node --test tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
  7. PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 590 tests passed
  8. PASS: `node scripts/verify-runtime-assets.mjs` — `refs=853`
  9. PASS: `git diff --check`
  10. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e2e3955f42294edc4c6271ba8d3072710d04faec`
  11. PASS: deployed markers — `sw.js::tomatofarm-v20260629z4-running-save-detail-card`, `app.js::window.wtOpenWorkoutDaySheet = openWorkoutDaySheetFromAction`, `workout/running-session.js::action: 'running:save-detail'`, `render-calendar.js::wt-running-read-card`, `render-calendar.js::평균 페이스`, `style.css::.wt-running-metric-grid`
  12. not verified yet: 인증 계정이 없어 실제 `러닝 시작 -> 완료 -> 저장 -> 상세 시트` 터치 flow는 배포 페이지에서 직접 조작하지 못했다.

- Home Life Zone Trainer Label + CSS Motion Slice 1:
  1. `home/life-zone.js`에서 actor image에 `lz-actor--pose-${slot.pose}` class를 추가했다.
  2. `style.css`에서 `트레이너` 이름표를 하단 y 좌표로 내렸다.
  3. `workout-lat`, `workout-bench`, `workout-squat` pose class에 작은 CSS transform 애니메이션을 추가했다.
  4. `prefers-reduced-motion: reduce`에서는 해당 애니메이션을 끈다.
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z8-home-life-zone-motion`으로 갱신했다.
  6. 리뷰: `docs/ai/reviews/2026-06-27-home-life-zone-workout-animation-review.md`
  7. PASS: `node --check home/life-zone.js; node --check sw.js`
  8. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
  9. PASS: `node --test tests/*.test.js` — 552 tests passed
  10. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=834`
  11. PASS: `git diff --check`
  12. 회귀 수정: `npc-quest-bubble.png`를 다시 렌더하되 `.lz-npc-bulb` crop으로 전구 말풍선만 보이게 했다.
  13. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z10-home-npc-bulb-restore`로 갱신하고 `npc-quest-bubble.png`를 `STATIC_ASSETS`에 복구했다.
  14. 회귀 수정: `.lz-npc-bulb` 표시 폭을 50%로 줄이고 트레이너 overlay를 머리 위 좌표로 올렸다.
  15. actor 이름표 y 계산을 스프라이트 하단 기준에서 `slot.y - 6` 머리 위 기준으로 바꿨다.
  16. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z13-home-overhead-labels`로 갱신했다.
  17. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
  18. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
  19. WARN: `node --test tests/*.test.js` — 553 tests 중 552 pass, `tests/workout-picker-gym-rail.test.js` 1건 fail. 이번 홈 라이프존 변경 범위와 무관하다.
  20. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` — deployed `tomatofarm-v20260627z13-home-overhead-labels`
  21. PASS: deployed markers — `Math.max(24, Number(slot.y) - 6)`, `top: calc(850 / 1672 * 100%)`, `width: 50%`, `transform: translate(-50%, -100%)`, `.lz-npc-bulb`
  22. not verified yet: 인증 세션이 없어 실제 홈 탭 라이프존 UI flow는 직접 조작 미완료
  23. 진행 중: 트레이너 overlay를 `top: calc(760 / 1672 * 100%)`로 올리고, 랫풀다운은 actor 래퍼의 `::after` 클립 레이어에만 `lz-workout-lat-pull`을 적용했다.
  24. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z14-home-trainer-lat-motion`으로 갱신했다.
  25. PASS: `node --check home/life-zone.js; node --check sw.js`
  26. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
  27. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
  28. PASS: `git diff --check`
  29. WARN: `node --test tests/*.test.js` — 553 tests 중 552 pass, `tests/workout-picker-gym-rail.test.js` 1건 fail. 이번 홈 라이프존 변경 범위와 무관하다.
  30. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 2094a548e1ab4e9d3b3d3f55889a63bdfc7ad9db` — deployed `tomatofarm-v20260627z14-home-trainer-lat-motion`
  31. PASS: deployed markers — `actorElement.style.setProperty('--lz-sprite-url'`, `top: calc(760 / 1672 * 100%)`, `.lz-actor--pose-workout-lat::after`, `clip-path: inset(25% 4% 38% 14%)`, `background-image: var(--lz-sprite-url)`, `translate(-1.2%, 2.8%)`
  32. not verified yet: 인증 세션이 없어 실제 홈 탭 라이프존 UI flow는 직접 조작 미완료

## 이번 실행 검증

- 계획 완료: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 14
- 구현 완료: `render-calendar.js` suppression guard/toggle aria sync, `sw.js` cache marker
- 리뷰 완료: `docs/ai/reviews/2026-06-27-workout-calendar-sheet-suppress-guard-review.md`
- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js` — 19 tests passed
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 552 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 1a46c473abc3b3b7a55ae76611dfe682a3494548`
  - 결과: `[deploy-verify] ok 1a46c473abc3 tomatofarm-v20260627z5-sheet-suppress-guard static=219`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260627z5-sheet-suppress-guard" "render-calendar.js::WORKOUT_HOME_SHEET_MIN_SUPPRESS_MOVE_PX = 4" "render-calendar.js::if (targetState !== prevState) _suppressWorkoutHomeSheetClick()" "render-calendar.js::querySelectorAll('[data-wt-sheet-toggle]')" "render-calendar.js::data-wt-sheet-main data-wt-sheet-toggle"`
- not verified yet: 인증 계정 실제 바텀시트 터치 UI flow는 직접 확인 필요

## 리뷰 대상

- `docs/ai/features/2026-06-27-wendler-program-ssot-diagnosis.md`
- Firestore `users/김_태우/settings/test_board_v2` read-only 결과
- read-only 후보 patch 기록

## 직전 실행 검증

- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/exercise-program-editor.test.js` — 3 tests passed
- PASS: `node --test .\tests\*.test.js` — 528 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 66bf22b`
  - 결과: `[deploy-verify] ok 66bf22bb1564 tomatofarm-v20260625z66-wendler-calendar-density static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260625z66-wendler-calendar-density" "workout/exercises.js::ex-program-calendar-row" "style.css::position: static" "style.css::min-height: 24px"`
- not verified yet: 인증 계정이 없어 `운동 탭 -> 종목 수정 -> 웬들러 -> 시작 주 캘린더 선택 -> 저장` 실제 UI flow는 직접 저장 확인 미완료

## 현재 실행 검증

- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/workout-test-mode-unified.test.js tests/test-v2.board-core.test.js` — 43 tests passed
- PASS: `node --test .\tests\*.test.js` — 531 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `docs/ai/reviews/2026-06-26-exercise-program-wendler-recommendation-priority-review.md`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 36be474`
  - 결과: `[deploy-verify] ok 36be47482068 tomatofarm-v20260626z4-wendler-recommendation-priority static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z4-wendler-recommendation-priority" "workout/exercises.js::const programEntry = _buildProgramPickerExerciseEntry(ex)" "workout/exercises.js::buildMaxPickerExerciseEntry({"`
- not verified yet: 인증 계정이 없어 실제 모바일 UI에서 `추천 종목 · 선택 헬스장 -> 웬들러 설정 종목 추가` 클릭 플로우는 직접 확인 필요

## 완료한 작업

- 계획 파일: `docs/ai/features/2026-06-25-life-zone-npc-quest-bubble.md`
- 변경 파일:
  1. `assets/home/life-zone/ui/npc-quest-bubble.png`
  2. `home/life-zone.js`
  3. `style.css`
  4. `sw.js`
  5. `scripts/validate-life-zone-assets.py`
  6. `tests/home-life-zone-npc-quest.test.js`
  7. `docs/ai/features/2026-06-25-life-zone-npc-quest-bubble.md`
  8. `docs/ai/reviews/2026-06-25-life-zone-npc-quest-bubble-review.md`

- 실행 검증:
  1. PASS: `python scripts/validate-life-zone-assets.py`
  2. PASS: `node --check home/life-zone.js; node --check sw.js`
  3. PASS: `node --test tests/home-life-zone-npc-quest.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `node --test .\tests\*.test.js` — 518 tests passed
  6. PASS: `git diff --check`
  7. 리뷰: `docs/ai/reviews/2026-06-25-life-zone-npc-quest-bubble-review.md`
  8. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ bb8bf7e`
  9. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260625z59-life-zone-npc-quest" "home/life-zone.js::npc-quest-bubble.png" "home/life-zone.js::life-zone:npc-quest" "sw.js::assets/home/life-zone/ui/npc-quest-bubble.png"`
  10. PASS: 배포 URL의 `assets/home/life-zone/ui/npc-quest-bubble.png`가 HTTP 200, `192x258`, RGBA alpha `(0, 255)`, corner alpha 0으로 내려오며 로컬 파일과 SHA-256이 일치

## 이전 완료 흐름

- 계획 파일: `docs/ai/features/2026-06-25-workout-calendar-add-fab-click-fix.md`
- 변경 파일:
  1. `render-calendar.js`
  2. `style.css`
  3. `sw.js`
  4. `tests/workout-calendar-bottom-sheet.test.js`
  5. `tests/workout-empty-picker-density.test.js`
  6. cache version 참조 테스트들
  7. `docs/ai/features/2026-06-25-workout-calendar-add-fab-click-fix.md`
  8. `docs/ai/NEXT_ACTION.md`

- 실행 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-navigation-stack.test.js`
  3. PASS: `node --test .\tests\*.test.js` — 515 tests passed
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e119fca1e0398b56406dcaa729cc7c37469cd861`
  7. PASS: 배포 자산 마커에서 z58 cache, `_bindWorkoutHomeSheetActions`, `data-wt-day-add-session`, `_addWorkoutHomeSession(key)`, `touch-action: manipulation` 확인
  8. not verified yet: 인증 계정 실제 UI flow 확인 필요

## 이전 실행 기록

- 계획 파일: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md`
- 완료한 Slice 12:
  1. `render-calendar.js`에서 full sheet scroll lock과 sheet body touch boundary guard를 추가한다.
  2. full 상태의 아래 방향 drag release가 항상 `bar` 끝점으로 정착하도록 닫힘 latch를 강화한다.
  3. `style.css`에 full sheet scroll-lock과 내부 scroller momentum 정책을 추가한다.
  4. `tests/workout-calendar-bottom-sheet.test.js`에 scroll ownership/source contract 테스트를 추가한다.
  5. `sw.js` `CACHE_VERSION`을 bump한다.

- Slice 12 검증:
  1. PASS: `node --check app.js; node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
  3. PASS: 영향권 테스트 38개
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: 전체 Node 테스트 514개
  6. PASS: `git diff --check`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ d23ca4cd775936b4acdb53d662d7c71c8d22b8c2`
  8. PASS: 배포 asset marker에 `wt-workout-sheet-scroll-lock`, `WORKOUT_HOME_SHEET_DRAG_HARD_CLOSE_PX = 8`, `_bindWorkoutHomeSheetScrollGuard`, `[data-wt-day-sheet]`, z57 cache marker 반영
  9. not verified yet: 인증 계정 실제 UI flow 확인 필요

- Slice 12 리뷰:
  - `docs/ai/reviews/2026-06-25-workout-calendar-sheet-scroll-lock-review.md`

- 완료한 Slice 11:
  1. 운동탭 활성 상태에만 `body.wt-workout-tab-active` class 적용.
  2. 운동탭 활성 상태에서 root overscroll/pull-to-refresh 체인 차단.
  3. 최상단 아래 방향 touch gesture를 `handleWorkoutBack({ action: 'pull:back' })` 경로로 흡수.
  4. nested scroll 영역이 아직 위로 스크롤될 수 있으면 gesture를 가로채지 않도록 조건 추가.
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z56-workout-pull-back`로 bump.
  6. 진단/리뷰 문서 작성.

- 검증:
  1. PASS: `node --check app.js; node --check sw.js`
  2. PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
  3. PASS: `node --test .\tests\*.test.js` — 513 tests passed
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a8461e8`
  7. PASS: 배포 URL asset marker에서 z56 cache, `initWorkoutPullBackGesture`, `action: 'pull:back'`, `body.wt-workout-tab-active` 확인

## 직전 완료 흐름

- 계획 파일: `docs/ai/features/2026-06-25-workout-navigation-stack-redesign.md`
- 완료한 Slice 1-6:
  1. `workout/navigation-stack.js` 추가: `CalendarScreen`, `WorkoutRecordScreen`, `WorkoutDetailScreen` route stack, saved state, PWA history snapshot.
  2. `render-calendar.js` 바텀시트 상태를 navigation state와 동기화하고 record 진입을 `wtOpenWorkoutRecord()`로 교체.
  3. `app.js` 운동 탭 surface를 `calendar/record/detail`로 확장하고 record/detail 상태 보존 렌더 연결.
  4. `workout/exercises.js` detail screen 렌더와 운동 카드 detail 진입 추가.
  5. Capacitor `backButton` hook과 browser `popstate` 기반 PWA back 복원 추가.
  6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z44-workout-nav-stack`로 bump하고 새 runtime asset을 precache에 추가.

- 검증:
  1. PASS: `node --check app.js render-calendar.js workout/navigation-stack.js workout/exercises.js workout/index.js`
  2. PASS: `node --check workout/load.js; node --check render-workout.js; node --check sw.js`
  3. PASS: `node --test .\tests\*.test.js` — 512 tests passed
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ ad707121d63019be2f2f5bae181c89ce53fbd460`
     - 결과: `[deploy-verify] ok ad707121d630 tomatofarm-v20260625z44-workout-nav-stack static=215`
  7. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "workout/navigation-stack.js::WORKOUT_ROUTES" "app.js::enableWorkoutPwaHistory" "render-calendar.js::wtOpenWorkoutRecord" "index.html::wt-exercise-detail-root" "sw.js::tomatofarm-v20260625z44-workout-nav-stack"`

- 리뷰:
  - `docs/ai/reviews/2026-06-25-workout-navigation-stack-redesign-review.md`

- 남은 수동 확인:
  1. 배포 URL에서 인증 계정으로 `운동 탭 -> 날짜 클릭 -> BottomSheet -> 운동 진입 -> 운동 상세 -> Android/PWA back 순서` 확인.

## 이전 실행 기록

- 계획 파일: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md`
- 완료한 Slice 1:
  1. 운동 홈 월간 렌더에서 기존 `.cal-workout-day-bar`를 헤더로 쓰는 `.cal-workout-day-sheet` 렌더
  2. 날짜 클릭/오늘 상세/닫기 상태 전환을 하단 시트 기준으로 정리
  3. 날짜 클릭 시 `bar -> full`로 올라오는 애니메이션 적용
  4. 시트 handle pointer drag로 `bar`/`mid`/`full` 상태 전환 구현
  5. sheet 내부 상세 본문과 회차/session action bar CSS 조정
  6. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 1 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 3d76b141d0a47b4d60af24e5fc07e147269808f9`
  7. PASS: 배포 URL 브라우저 접근 시 최신 앱이 열리고 로그인 화면이 표시되는 것을 확인
  8. not verified yet: 로그인 화면에 막혀 인증 계정의 `운동 탭 -> 날짜 탭 -> 하단 시트 표시 -> handle 위/아래 드래그 -> + 버튼` UI flow 직접 조작은 미완료

- 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-review.md`

- 완료한 Slice 2:
  1. 접힌 sheet 높이를 절반 수준으로 줄이고 한 행 compact bar로 조정
  2. 좌측 위 화살표에 glow/pulse affordance 추가
  3. 날짜/화살표 영역 drag hit area 허용, `오늘`/`루틴` action만 drag 제외
  4. drag 후 click이 상태를 되돌리지 않도록 suppress guard 추가
  5. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 2 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0f061f103c69150688c80e284ce5b53ae54c601a`
  7. not verified yet: 인증 계정 실제 drag UI flow 확인 필요

- Slice 2 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-compact-review.md`

- 다음 Slice 3:
  1. 위 방향 drag/key step을 거리와 무관하게 `full`로 정착
  2. 아래 방향 drag/key step은 `bar`로 접기
  3. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신
  4. 정적 검증, 리뷰, Dashboard3 Pages 배포 검증

- Slice 3 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-full-open-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a65721dbb3e6423206d505118ead185c7c6f2926`
  8. PASS: 배포 URL HTTP 200, `sw.js` cache version `tomatofarm-v20260624z37-workout-day-sheet-full-open`, `render-calendar.js` full 전이/`12px` threshold 확인
  9. not verified yet: 로그인 화면에 막혀 인증 계정 실제 drag UI flow 확인 필요

- Slice 3 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-full-open-review.md`

- 다음 Slice 4:
  1. 드래그 후 click suppression을 1회성 boolean에서 timestamp window 방식으로 변경
  2. suppression window 동안 여러 지연 click을 모두 무시
  3. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신
  4. 정적 검증, 리뷰, Dashboard3 Pages 배포 검증

- Slice 4 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-drag-lock-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 684c6fc2025dbf20f3be4c52ab14b41cc6528831`
  8. not verified yet: 로그인 화면에 막혀 인증 계정 실제 drag UI flow 확인 필요

- Slice 4 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-drag-lock-review.md`

- 다음 Slice 5:
  1. drag release target을 거리/속도 기반 snap resolver로 결정
  2. `bar`에서 위 방향은 쉽게 열고, `full`에서 아래 방향은 의도적 제스처에서만 접기
  3. 열린 상태의 동일 날짜 탭 no-op 처리
  4. sheet grip affordance와 열린 상태 arrow pulse 정리
  5. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 5 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-snap-ux-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b872a13e4f24c3460df45e1ef01e553728602709`
  8. not verified yet: 로그인 화면에 막혀 인증 계정 실제 drag UI flow 확인 필요

- Slice 5 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-snap-ux-review.md`

- 다음 Slice 6:
  1. `bar` 상태에서 drag 가능한 전체 확장 거리의 10% threshold 계산
  2. 위로 10%를 넘으면 drag preview를 즉시 full 높이로 표시
  3. release snap도 동일한 10% 기준으로 full 선택
  4. 아래 방향 속도만으로 닫히지 않도록 collapse는 `max(220px, dragTravel * 0.35)` 거리 기준으로 제한
  5. 작은 pointer move 뒤 release가 snap 기준 미만이어도 후속 click이 header toggle로 오인되지 않게 suppress
  6. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 6 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-open-10pct-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ d6606731f076a0ba8540c6b2b82d6f570e2417f0`
  8. PASS: 배포 URL의 `build-info.json`, `sw.js`, `render-calendar.js`가 `d6606731f076`, z40 cache, 10% open ratio, `hasMoved` click suppression, velocity-close 제거를 반환
  9. not verified yet: 로그인 화면에 막혀 인증 계정 실제 drag UI flow 확인 필요

- Slice 6 리뷰:
  - `docs/ai/reviews/2026-06-24-workout-calendar-bottom-sheet-open-10pct-review.md`

- 다음 Slice 7:
  1. open threshold를 full 확장 거리 기준에서 접힌 bar 높이 기준 10%로 변경
  2. `bar`에서 위 방향 drag가 threshold를 넘으면 `openLatched` 고정
  3. release snap에서 `openLatched`가 true면 무조건 `full` 선택
  4. `full` 시작 drag는 latch하지 않아 큰 아래 drag로 닫기 유지
  5. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 7 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-open-latch-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ bda8fd26b49e731fc43807844b737ed155fa7ed6`
  8. PASS: 배포 URL의 `build-info.json`, `sw.js`, `render-calendar.js`가 `bda8fd26b49e`, z41 cache, bar-height 10% open threshold, `openLatched`, velocity-close 제거를 반환
  9. not verified yet: 로그인 화면에 막혀 인증 계정 실제 drag UI flow 확인 필요

- Slice 7 리뷰:
  - `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-open-latch-review.md`

- 다음 Slice 8:
  1. full sheet 높이에 상단 clearance를 적용해 날짜/오늘/루틴 헤더가 앱 상단 아래로 드러나게 변경
  2. 열린 상태 화살표를 파란 아래 방향 affordance로 변경
  3. 하단 회차 bar의 연필 편집 버튼 제거
  4. `+` 운동 추가 버튼을 우측 하단 floating button으로 복구
  5. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 8 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-fab-reveal-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 1fca224816f59b9bce1257bcf2c652d4dd065fcd`
  8. PASS: 배포 URL의 `render-calendar.js`, `style.css`, `sw.js`가 `wt-day-fab`, `WORKOUT_HOME_SHEET_FULL_CLEARANCE_PX`, `--wt-day-sheet-full-clearance: 112px`, `wt-sheet-arrow-pulse-down`, z42 cache marker를 반환
  9. not verified yet: 로그인 화면에 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet full/open-close/add` UI flow 확인 필요

- Slice 8 리뷰:
  - `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-fab-reveal-review.md`

- 다음 Slice 9:
  1. drag release snap을 raw pointer 좌표가 아니라 clamp된 preview 이동량 기준으로 변경
  2. full 시작 아래 방향 drag에 `closeLatched` 추가
  3. close threshold를 handle drag에 맞는 작은 거리로 조정
  4. 회귀 테스트와 `sw.js` `CACHE_VERSION` 갱신

- Slice 9 검증:
  1. PASS: `node --check render-calendar.js; node --check sw.js`
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-drag-settle-review.md`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ da94c74f943735f54c04ef74199da060c3939c26`
  8. PASS: 배포 URL의 `render-calendar.js`, `sw.js`가 `closeLatched`, `lastDragY`, `const dy = lastDragY`, z43 cache marker를 반환
  9. not verified yet: 로그인 화면에 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet drag up/down settle` UI flow 확인 필요

- Slice 9 리뷰:
  - `docs/ai/reviews/2026-06-25-workout-calendar-bottom-sheet-drag-settle-review.md`

- 이전 계획 파일: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`
- 완료한 Slice 4:
  1. picker 목록 상태에서 상단 탭을 `분류 + 부위 탭` 구조로 동적 렌더링
  2. 목록 내부 `필터 적용` 배너와 부위/헬스장 필터 스택 제거
  3. 목록 상단에 `최근`/`빈도`/`이름` 정렬과 `전체`/`즐겨찾기`/`커스텀` 범위 컨트롤 추가
  4. 캐시 기반 `총 n번, n일 전` 메타와 정렬 통계 추가
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z16-picker-filter-layout`로 bump

- 검증:
  1. PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
  2. PASS: `node scripts/verify-runtime-assets.mjs`
  3. PASS: `git diff --check`
  4. PASS: `docs/ai/reviews/2026-06-24-exercise-picker-filter-layout-review.md`
  5. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 9594418`
  6. not verified yet: 로그인 화면에 막혀 운동 picker 필터 UI 클릭 흐름은 인증 계정으로 확인 필요

- 완료한 Slice 5:
  1. `style.css`에서 오늘 운동 카드 헤더가 줄바꿈 가능한 레이아웃이 되도록 수정
  2. 운동명 최소 폭과 `word-break: keep-all` 적용
  3. 스파크라인을 헤더 다음 줄 전체 폭으로 이동
  4. `tests/workout-card-layout-css.test.js` 회귀 테스트 추가
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z17-workout-card-header`로 bump

- Slice 5 검증:
  1. PASS: `node --test tests/workout-card-layout-css.test.js`
  2. PASS: `node --check sw.js`
  3. PASS: `node scripts/verify-runtime-assets.mjs`
  4. PASS: `git diff --check`
  5. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ c682986`
  6. PASS: 배포 URL의 `style.css`에 카드 헤더 회귀 수정 CSS가 포함된 것을 확인
  7. not verified yet: 로그인 화면에 막혀 운동 추가 후 카드 UI 클릭 흐름은 인증 계정으로 확인 필요

- Slice 5 추가 하드닝:
  1. `workout/exercises.js` 일반 운동 카드 DOM에서 `${sparkline}`을 `ex-block-header` 밖으로 이동
  2. `style.css`에 `ex-block-trend` 행 스타일 추가
  3. `tests/workout-card-layout-css.test.js`에 DOM source check 추가
  4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z18-workout-card-trend-row`로 bump
  5. PASS: `node --check workout/exercises.js; node --check sw.js; node --test tests/workout-card-layout-css.test.js`
  6. PASS: `node scripts/verify-runtime-assets.mjs`
  7. PASS: `git diff --check`
  8. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ f44e832`
  9. PASS: 배포 URL의 `workout/exercises.js`, `style.css`, `sw.js`에 DOM 분리와 z18 캐시 버전 반영 확인

- 완료한 Slice 6:
  1. `modals/ex-picker-modal.js`에 picker footer와 `#ex-picker-done` 추가
  2. `workout/exercises.js` row 선택 handler에서 즉시 닫기 제거
  3. 선택된 row는 `already`/`✓`로 표시하고 완료 버튼 활성화
  4. `tests/ex-picker-selection-flow.test.js` 추가
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z19-picker-staged-done`으로 bump

- Slice 6 검증:
  1. PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
  2. PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-card-layout-css.test.js`
  3. PASS: `node scripts/verify-runtime-assets.mjs`
  4. PASS: `git diff --check`
  5. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 3de3708`
  6. PASS: 배포 URL의 `modals/ex-picker-modal.js`, `workout/exercises.js`, `sw.js`에 `ex-picker-done`, `_syncPickerDoneButton`, `tomatofarm-v20260624z19-picker-staged-done` 반영 확인
  7. not verified yet: 배포 브라우저는 로그인 화면에 막혀 `운동 탭 -> + -> 가슴 -> row tap -> picker 유지 -> 완료` UI 클릭 흐름은 인증 계정으로 확인 필요
- 완료한 Slice 3:
  1. `assets/workout/muscles/*.png` 8개를 `384x288` RGBA 투명 PNG로 교체
  2. 기존 파일명/경로 유지
  3. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z15-sharp-muscle-assets`로 bump
  4. `docs/ai/reviews/2026-06-24-exercise-picker-assets-sharp-review.md` 작성

- 검증:
  1. PASS: PNG 8개 크기 `384x288`, 모드 `RGBA`, 모서리 alpha 0 확인
  2. PASS: `node --check sw.js`
  3. PASS: `node scripts/verify-runtime-assets.mjs`
  4. PASS: `git diff --check`
  5. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 562a572`
  6. PASS: 배포 URL의 `assets/workout/muscles/*.png` 8개가 모두 `384x288` RGBA 파일로 내려오는 것을 확인
  7. not verified yet: 로그인 화면에 막혀 운동 picker 분류 화면의 시각 상태는 인증 계정으로 확인 필요

- 이전 완료 흐름:
  - 계획 파일: `docs/ai/features/2026-06-23-stats-muscle-fatigue-render.md`
- 완료한 Slice 2:
  1. `render-stats.js` 근육 활성 기간을 `주별`/`월별`로 제한
  2. 활성 부위만 렌더링하고, 다색 그룹 색상 대신 붉은색 단일 intensity 값 적용
  3. `style.css` 근육 활성 카드 레이아웃/텍스트 가시성 복구
  4. `sw.js` `CACHE_VERSION` bump
  5. `workoutSessions` 기반 다회차 운동 기록도 근육 활성 계산에 반영
  6. 정적 검증 및 리뷰 완료

- 검증:
  1. PASS: `node --check render-stats.js`
  2. PASS: `node --check sw.js`
  3. PASS: red-only source check — `render-stats.js`에 이전 다색 hex 및 `일별` 출력 없음
  4. PASS: `node scripts/verify-runtime-assets.mjs`
  5. PASS: `git diff --check`
  6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e2f2a99`
  7. PASS: 배포된 `render-stats.js`에 `getWorkoutSessions`, red tint, 활성 부위 빈 상태 문구가 있고 `label: '일별'`은 없음
  8. not verified yet: 로그인 화면에 막혀 더보기 → 통계 → 운동 활성 부위 카드 UI 클릭 흐름은 인증 계정으로 확인 필요

- 함께 배포된 이전 Slice:
  1. `docs/ai/features/2026-06-24-exercise-picker-category-entry.md` Slice 2 우하단 `+` 직접 picker 진입
  2. 첨부 이미지 기반 `assets/workout/muscles/*.png` 추가
  3. picker 분류 타일 이미지 자산 적용 및 `sw.js` `CACHE_VERSION` bump

- 완료한 Slice 1:
  1. `modals/ex-picker-modal.js` 상단 구조를 전체 화면형 검색/탭/추가 버튼 레이아웃으로 변경
  2. `workout/exercises.js`에 picker view 상태, 분류 화면, 부위 타일 drilldown, 전체/커스텀 목록 전환 추가
  3. `style.css`에 전체 화면 picker, 탭, 부위 그리드, 모바일 레이아웃 스타일 추가
  4. `sw.js` `CACHE_VERSION` bump

- 검증:
  1. PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
  2. PASS: `node scripts/verify-runtime-assets.mjs`
  3. PASS: `git diff --check`
  4. PASS: `docs/ai/reviews/2026-06-24-exercise-picker-category-entry-review.md`
  5. not verified yet: Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` 필요
  6. not verified yet: 운동 탭 → 오늘 운동 화면 → 우측 하단 `+` → 분류 첫 화면 → 부위 타일 선택 → 해당 부위 운동 목록 → 운동 추가 UI flow는 배포 URL에서 확인 필요

## 이전 흐름 요약

- 이전 홈 라이프존 Slice 9:
  1. `home/life-zone-state.js`에 actor owner id 후보와 `readAccountId` 추가
  2. `home/life-zone.js`에서 이웃 actor의 오늘 문서를 owner id 후보로 읽도록 보정
  3. 방금 입력한 기록이 바로 반영되도록 라이프존 actor 상태 캐시 비활성화
  4. `tests/home-life-zone-state.test.js`에 줍스 식단-only 상태 회귀 테스트 추가
  5. `sw.js` `CACHE_VERSION` bump
  6. `docs/ai/reviews/2026-06-23-home-life-zone-diet-read-review.md` 작성

- 방금 완료한 Slice 8:
  1. `home/life-zone-state.js`에서 `workoutDuration > 0`을 운동 활동으로 판정
  2. `tests/home-life-zone-state.test.js`에 운동 시간만 입력된 날의 라이프존 회귀 테스트 추가
  3. `sw.js` `CACHE_VERSION` bump
  4. `docs/ai/reviews/2026-06-23-home-life-zone-duration-review.md` 작성

- 방금 완료한 Slice 7:
  1. `style.css` `.lz-speech` 배경을 반투명 흰색으로 변경
  2. `style.css` `.lz-speech`에 `backdrop-filter` 추가
  3. `sw.js` `CACHE_VERSION` bump

- 방금 완료한 Slice 6:
  1. `home/life-zone-state.js`에 운동/식단/업무 말풍선 문구 생성 로직 추가
  2. `home/life-zone.js`에서 actor sprite 위 말풍선 렌더링 추가
  3. `style.css`에 `.lz-speech` 스타일 추가
  4. `tests/home-life-zone-state.test.js`에 대근육/식단 말풍선 테스트 추가
  5. `sw.js` `CACHE_VERSION` bump
  6. `docs/ai/reviews/2026-06-23-home-life-zone-speech-review.md` 작성

- 방금 완료한 Slice 5:
  1. `scripts/make-life-zone-base-alpha.py`에서 anti-aliased outline 생성으로 변경
  2. `assets/home/life-zone/base-room-alpha.png` 재생성
  3. `style.css` `.lz-base`를 `image-rendering:auto`로 변경
  4. `docs/pixel-life-zone-mockup.html` base preview 렌더링 변경
  5. `scripts/validate-life-zone-assets.py` outline 검증 기준 변경
  6. `sw.js` `CACHE_VERSION` bump
  7. `docs/ai/reviews/2026-06-23-home-life-zone-soft-border-review.md` 작성

- 방금 완료한 Slice 3:
  1. `home/hero.js`에서 랭킹 렌더링 대상을 상위 5명으로 제한
  2. `sw.js` `CACHE_VERSION` bump
  3. `docs/ai/reviews/2026-06-23-home-ranking-top5-review.md` 작성

- 방금 완료한 Slice 2:
  1. `home/hero.js`에서 랭킹 참가자 소스를 전체 계정으로 변경
  2. 누적/주간 모두 전체 계정의 기록을 읽어 계산
  3. `sw.js` `CACHE_VERSION` bump
  4. `docs/ai/reviews/2026-06-23-home-ranking-all-accounts-review.md` 작성

- 방금 완료한 Slice:
  1. `index.html`에서 함께 축하해요 카드와 길드 카드를 제거하고 랭킹 UI를 `랭킹`/`누적·주간`으로 변경
  2. `home/index.js`에서 공용 축하 카드와 홈 길드 카드 렌더 호출 제거
  3. `home/hero.js`에서 랭킹 상태를 `cumulative/weekly`로 전환하고 선택값 저장
  4. `sw.js` `CACHE_VERSION` bump
  5. `docs/ai/reviews/2026-06-23-home-ranking-cleanup-review.md` 작성

## 이전 완료 항목

- 계획 파일: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 방금 완료한 Slice 0:
  1. `assets/home/life-zone/base-room.png`
  2. `assets/home/life-zone/sprites/*.png` 27개
  3. `assets/home/life-zone/manifest.json`
  4. `scripts/process-life-zone-sprites.py`
  5. `docs/pixel-life-zone-mockup.html`
- 방금 완료한 Slice 1:
  1. `home/life-zone-state.js`
  2. `home/life-zone.js`
  3. `home/tomato.js`
  4. `style.css`
  5. `sw.js`
  6. `tests/home-life-zone-state.test.js`
  7. `assets/home/life-zone/base-room-alpha.png`
  8. `scripts/make-life-zone-base-alpha.py`
- 다음 실행 후보:
  1. 계정 id 고정 매핑: `줍스`, `문정토마토`, `이재헌`의 실제 account id를 roster에 반영
  2. Slice 4: 저장 시점 activity snapshot으로 "방금 올림/방금 운동함" 최근성 반영
  3. 운동 모션 실험: lat pulldown 2프레임 sprite를 만들고 낮은 비용의 frame animation으로 검증

## 보류 중 (이전 흐름)

- `docs/ai/features/2026-06-23-pixel-life-zone-mockup.md` — bitmap 생성/정적 검증 완료, HTTP/UI 시각 검증은 not verified yet.
- `docs/ai/features/2026-06-12-test-mode-simplify-wendler.md` — v1 개편 실행 완료(커밋 2922b64까지), 리뷰 미수행. **v2 구현으로 v1은 동결 상태** — 해당 리뷰는 폐기 권장.
- `docs/ai/features/2026-06-20-calendar-workout-tab.md` — Slice 1 구현, 리뷰, tomatofarm 원격 배포 완료. 후속 Slice 2는 로컬 정적 검증 완료, 브라우저 UI 플로우는 not verified yet.
- `docs/ai/features/2026-06-20-growth-board-wendler-default-history.md` — 로컬 정적 검증 완료, 브라우저 UI 플로우는 not verified yet.

## 상태값

- `idle`: 진행 중인 자동 액션 없음
- `needs_user_decision`: 사용자 결정이 필요함
- `ready_for_execution`: 다음 실행 슬라이스를 바로 진행
- `ready_for_review`: 직전 실행 결과를 바로 리뷰
- `ready_for_fix`: 리뷰에서 발견된 문제만 바로 수정
- `complete`: 현재 계획 완료

## 자동 진행 규칙

- 세션 시작 시 이 파일을 먼저 읽는다.
- 사용자가 "계속", "다음", "진행", "리뷰해", "해줘"처럼 짧게 말하면 이 파일의 `다음 액션`을 실행한다.
- 사용자가 새로운 요청을 명시하면 새 요청이 우선한다. 단, 기존 대기 액션과 충돌하면 어느 흐름을 계속할지 한 번만 확인한다.
- 계획 세션 종료 후 차단 질문이 없으면 `ready_for_execution`으로 갱신한다.
- 실행 세션 종료 후 `ready_for_review`로 갱신한다.
- 리뷰 세션 종료 후 문제가 있으면 `ready_for_fix`, 문제가 없고 다음 슬라이스가 있으면 `ready_for_execution`, 모든 슬라이스가 끝났으면 `complete`로 갱신한다.
- 다음 프롬프트나 리뷰 프롬프트를 사용자에게 복붙하라고 요구하지 않는다. 필요한 프롬프트 내용은 계획 문서와 이 파일에 남기고 에이전트가 직접 읽어 진행한다.

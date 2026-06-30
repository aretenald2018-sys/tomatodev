# Running NRC Core Gap 계획

## 요청

- 기존 `런닝/조깅` 기능을 Nike Run Club 핵심 기능 기준으로 확인한다.
- 구현되지 않은 부분이 있으면 구현한다.
- 사용자가 예로 든 `음성안내`를 우선 확인한다.

## 조사 요약

- Nike 공식 NRC 페이지는 Audio-Guided Runs, 코치 음성, 목표 달성, 성취 축하를 핵심 경험으로 설명한다.  
  출처: https://www.nike.com/nrc-app
- App Store 설명은 GPS route, pace, distance, elevation, heart rate, 목표 진행, Training Plans, Guided Runs, in-run audio cheers, challenges, badges/trophies, shoe tagging을 주요 기능으로 나열한다.  
  출처: https://apps.apple.com/us/app/nike-run-club-running-coach/id387771637
- Google Play 설명은 route mapping, running speed, GPS, elevation, heart rate, 목표 진행, virtual coach, challenges/community를 주요 기능으로 설명한다.  
  출처: https://play.google.com/store/apps/details?hl=en_US&id=com.nike.plusgps

## 현재 구현 상태

- 이미 있음:
  1. GPS 기반 route point 수집과 거리 계산
  2. 실시간 pace/BPM/time 표시
  3. 지도 preview/live/summary 렌더링
  4. pause/resume/finish/save/share
  5. summary의 distance, pace, duration, calories, elevation, heart rate, cadence
  6. 러닝 저장 데이터와 캘린더 상세 카드 연동
- 갭:
  1. `목표 설정` 버튼이 있지만 현재 `목표 설정은 준비 중이에요` toast만 표시한다.
  2. `음성 안내` 또는 Web Speech 기반 pace/distance cue가 없다.
  3. 목표 진행률, halfway/goal-complete cue가 없다.
  4. NRC의 Training Plans, Challenges, audio cheers, shoe tagging은 별도 데이터 모델과 콘텐츠가 필요한 큰 기능이다.

## 그릴 결과

- 질문: 이번 슬라이스에서 NRC 기능을 어디까지 따라갈 것인가?
- 결정: 이미 화면에 버튼이 있는 `목표 설정`과 사용자가 명시한 `음성 안내`만 구현한다.
- 결정: 새 서버 데이터 모델은 만들지 않고 running session 내부 상태로만 처리한다.
- 결정: Guided Runs의 코치 콘텐츠 라이브러리는 만들지 않는다. 대신 거리/시간 이벤트에 맞춰 한국어 음성 cue를 제공한다.
- 남은 가정: 인증 세션이 없어 배포 URL에서 실제 러닝 UI 클릭 flow는 직접 조작하지 못할 수 있다.

## Slice 1 범위

- `workout/running-session.js`
  1. start 화면에서 목표 상태와 음성 안내 toggle을 표시한다.
  2. `목표 설정` sheet를 추가하고 `자유`, `거리 km`, `시간 분` 목표를 저장한다.
  3. 진행 화면에 목표 진행률 bar와 남은 목표 텍스트를 표시한다.
  4. Web Speech API가 있으면 시작, 일시정지, 재개, 1km split, 목표 halfway, 목표 완료, 종료 summary를 한국어로 안내한다.
  5. Web Speech API가 없거나 사용자가 음성 안내를 끄면 조용히 동작한다.
- `style.css`
  1. 목표/음성 옵션, 목표 sheet, 진행률 UI 스타일을 추가한다.
- `tests/running-entry.test.js`
  1. 목표 버튼 placeholder 제거, 음성 안내 helper, 목표 sheet/action, 진행률 UI marker를 회귀 테스트한다.
- `sw.js`
  1. `workout/running-session.js`와 `style.css`가 `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 bump한다.

## Slice 1 제외

- Nike Guided Runs 수준의 코치 콘텐츠 라이브러리
- Training Plans
- Challenges, badges, friend audio cheers, live sharing
- Shoe tagging
- 음악 연동
- Firebase schema 추가

## 검증 계획

1. `node --check workout/running-session.js; node --check sw.js`
2. `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/pwa-update-auto-reload.test.js`
3. 전체 테스트: `node --test --test-reporter=dot @files`
4. `node scripts/verify-runtime-assets.mjs`
5. `git diff --check`
6. `origin/main` push 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
7. Dashboard3 Pages asset marker에서 cache version, `audio-toggle`, `goal-save`, `SpeechSynthesisUtterance` 확인

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-running-nrc-core-gap.md`의 Slice 1만 실행한다. 목표 설정과 음성 안내를 `workout/running-session.js`에 추가하고, `style.css`, `tests/running-entry.test.js`, `sw.js`만 필요한 범위에서 수정한다.

## 실행 결과

- 완료: start 화면에 목표/음성 안내 상태 버튼을 추가했다.
- 완료: `목표 설정` sheet에서 자유/거리/시간 목표와 음성 안내 on/off를 저장한다.
- 완료: 진행 화면에 목표 진행률과 남은 목표를 표시한다.
- 완료: Web Speech API 기반 한국어 cue를 시작, pause/resume, 1km split, 목표 halfway, 목표 완료, 종료 summary에 연결했다.
- 완료: `sw.js` cache version을 `tomatofarm-v20260630z18-running-voice-goals`로 bump했다.
- 리뷰: `docs/ai/reviews/2026-06-30-running-nrc-core-gap-review.md`

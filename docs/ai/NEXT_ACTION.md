# 다음 자동 액션

## 현재 상태

- 상태: `complete`
- 계획 문서: `docs/ai/features/2026-06-23-home-life-zone-card.md` (홈탭 라이프존 카드 개편)
- 현재 단계: `execution/review/deploy in progress — lite 운영 repo 반영`
- 마지막 완료: `refactor repo에서 홈 라이프존 카드, actor 상태 말풍선, 랭킹 정리, 라이프존 asset과 회귀 테스트를 lite 운영 repo에 반영했다.`
- 다음 액션: `정적 검증과 빌드 후 관련 변경만 커밋하고 tomatofarm main에 push한 다음 배포 URL을 검증한다.`
- 차단 사유: `not verified yet. 정적 검증, 빌드, push, 배포 URL 검증이 남아 있다.`

## 다음 실행 대상

- 완료 파일: `index.html` · `style.css` · `home/hero.js` · `home/index.js` · `home/tomato.js` · `home/life-zone.js` · `home/life-zone-state.js` · `assets/home/life-zone/**` · `tests/home-life-zone-state.test.js` · `sw.js` · `docs/ai/features/2026-06-23-home-life-zone-card.md` · `docs/ai/features/2026-06-23-home-ranking-cleanup.md` · `docs/ai/features/2026-06-23-pixel-life-zone-mockup.md` · `docs/ai/reviews/2026-06-23-home-life-zone-*.md` · `docs/ai/reviews/2026-06-23-home-ranking-*.md`
- 검증 완료:
  1. PASS: `node --check workout/test-v2/board-core.js`
  2. PASS: `node --check workout/test-v2/board-render.js`
  3. PASS: `node --check workout/test-v2/onboarding.js`
  4. PASS: `node --check workout/test-v2/entry.js`
  5. PASS: `node --check workout/index.js`
  6. PASS: `node --check render-workout.js`
  7. PASS: `node --check app.js`
  8. PASS: `node --check sw.js`
  9. PASS: `node --test tests/test-v2.board-core.test.js` — 31개 통과
  10. PASS: `git diff --check`
  11. not verified yet: 배포 URL HTTP 200과 성장 보드 실제 UI flow는 안전한 배포 커밋/푸시가 막혀 확인하지 못했다.

## 보류 중 (이전 흐름)

- `docs/ai/features/2026-06-12-test-mode-simplify-wendler.md` — v1 개편 실행 완료(커밋 2922b64까지), 리뷰 미수행. **v2 구현으로 v1은 동결 상태** — 해당 리뷰는 폐기 권장.
- `docs/ai/features/2026-06-20-calendar-workout-tab.md` — Slice 1 구현, 리뷰, tomatofarm 원격 배포 완료. 후속 Slice 2는 로컬 정적 검증 완료, 브라우저 UI 플로우는 not verified yet.

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

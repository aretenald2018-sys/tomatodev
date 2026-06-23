# 다음 자동 액션

## 현재 상태

- 상태: `complete`
- 계획 문서: `docs/ai/features/2026-06-23-stats-muscle-fatigue-render.md` (통계 탭 근육 피로도 렌더 보강)
- 현재 단계: `review complete — Slice 1 통계 탭 근육 피로도 카드 추가 및 운영 반영`
- 마지막 완료: `첨부 스크린샷의 인체 렌더링을 추출해 통계 탭 상단에 근육 피로도 카드로 추가하고, 일별/주별/월별 버튼 전환과 서비스워커/운영 빌드 반영을 완료했다.`
- 다음 액션: `없음. 배포 검증까지 완료.`
- 차단 사유: `없음. 단, 로컬 계정에 최근 30일 운동 기록이 없어 실제 데이터 기반 색 오버레이가 켜진 상태는 시각 검증하지 못했다.`

## 다음 실행 대상

- 완료 파일: `assets/stats/muscle-fatigue-body.png` · `index.html` · `render-stats.js` · `style.css` · `sw.js` · `scripts/copy-www.js` · `build-info.json` · `docs/ai/features/2026-06-23-stats-muscle-fatigue-render.md` · `docs/ai/reviews/2026-06-23-stats-muscle-fatigue-render-review.md`
- 방금 완료한 Slice 1:
  1. `assets/stats/muscle-fatigue-body.png`에 첨부 스크린샷의 인체 렌더링 추출
  2. `index.html` 통계 탭 상단에 `#stats-muscle-fatigue` 카드 컨테이너 추가
  3. `render-stats.js`에 1/7/30일 근육 피로도 집계와 `일별/주별/월별` 버튼 바인딩 추가
  4. `style.css`에 근육 피로도 카드/인체 오버레이/라이트 테마 예외 스타일 추가
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260623z10-stats-muscle-fatigue`로 bump하고 새 이미지 precache 추가
  6. `scripts/copy-www.js`가 `assets` 폴더를 운영 산출물에 복사하도록 보강
  7. `docs/ai/reviews/2026-06-23-stats-muscle-fatigue-render-review.md` 작성
- 검증 완료:
  1. PASS: `node --check render-stats.js`
  2. PASS: `node --check sw.js`
  3. PASS: `node --check scripts/copy-www.js`
  4. PASS: `git diff --check`
  5. PASS: `http://localhost:5500` HTTP 200 및 기존 로컬 로그인 세션에서 통계 탭 카드 렌더 확인
  6. PASS: `일별/주별/월별` 버튼 클릭 시 활성 상태와 헤딩 변경 확인
  7. PASS: `http://localhost:5502` clean worktree 서버 HTTP 200 및 `assets/stats/muscle-fatigue-body.png` HTTP 200
  8. PASS: `npm.cmd run build`
  9. PASS: `build-info.json`, `sw.js`, `www/sw.js` 캐시 버전 `tomatofarm-v20260623z10-stats-muscle-fatigue` 일치
  10. PASS: `www/assets/stats/muscle-fatigue-body.png` 생성 확인
  11. PASS: `git push tomatofarm main`
  12. PASS: 운영 URL HTTP 200 및 원격 `sw.js` 캐시 버전 확인

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

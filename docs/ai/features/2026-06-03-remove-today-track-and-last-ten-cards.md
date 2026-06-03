# 테스트모드 오늘 트랙/마지막 10분 보강 카드 제거

## 요청

Discord `devreq_discord_1511554847399481458`에서 운동 탭 테스트모드 성장판 화면의 `오늘 트랙` 카드와 `마지막 10분 보강` 카드를 제거해 달라는 요청이 들어왔다.

## 그릴 결과

- 질문: 제거 범위가 카드 전체인지, 카드 안의 안내 문구만인지?
- 답변/결정: 첨부 스크린샷과 요청 문구가 카드명을 직접 지정하므로 두 카드 전체를 렌더링하지 않는다.
- 남은 가정: 상단 hero의 작은 `오늘 트랙` 점수와 벤치마크별 볼륨/강도 전환은 별도 기능이므로 유지한다.

## Slice 1: 성장판 화면 카드 제거

수정 대상:

- `workout/expert/max-cycle-render.js`
  - `renderMaxCycleDashboard()`에서 `wt-v4-track-card` 섹션을 제거한다.
  - `renderMaxCycleDashboard()`에서 `wt-v4-last-ten` 보강 placeholder를 제거한다.
  - `trackLabel`은 상단 score 표시를 위해 유지한다.
- `tests/calc.max.test.js`
  - 성장판 대시보드 HTML에 `wt-v4-track-card`, `마지막 10분 보강`, `wt-v4-last-ten`이 없는지 확인하는 회귀 테스트를 추가/갱신한다.
- `sw.js`
  - `workout/expert/max-cycle-render.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

하지 않을 것:

- `www/` 직접 수정.
- 벤치마크별 행 내부의 볼륨/강도 전환 버튼 제거.
- 오늘 부위 변경/종목 추가 버튼 제거.
- 데이터 모델, Firebase 저장 로직, 운동 기록 로직 변경.

검증:

- `git diff --check`
- `node --check workout/expert/max-cycle-render.js`
- `node --check sw.js`
- `node --test tests/calc.max.test.js`
- 실제 UI 검증은 프로젝트 규칙상 Codex 세션에서 장기 dev server를 시작하지 않으므로 사용자 로컬 터미널에서 `npm.cmd run dev` 후 `운동 탭 -> 테스트모드 성장판 화면`에서 수행한다.

## 다음 세션 프롬프트

`docs/ai/features/2026-06-03-remove-today-track-and-last-ten-cards.md`의 Slice 1을 실행하고, 실행 후 리뷰 문서를 작성한다.

## 실행 결과

- `workout/expert/max-cycle-render.js`: `renderMaxCycleDashboard()`에서 `wt-v4-track-card`와 `wt-v4-last-ten` 블록을 제거했다. 상단 hero score의 작은 `오늘 트랙` 표시는 유지했다.
- `tests/calc.max.test.js`: 성장판 대시보드 HTML에 `wt-v4-track-card`, `data-action="set-max-track"`, `마지막 10분 보강`, `wt-v4-last-ten`이 없는지 확인하는 회귀 테스트를 추가했다.
- `sw.js`: 정적 캐시 대상 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260603-remove-track-last-ten-cards`로 bump했다.

## 실행 검증

- PASS: `git diff --check`
- PASS: `node --check workout/expert/max-cycle-render.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/calc.max.test.js` (`56` tests)
- not verified yet: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 미추적 mockup 참조(`mockups/poc/*`, `mockups/trio-renewal/shared.css`) 때문에 실패했다. 이번 변경 파일 누락과 직접 관련된 실패는 아니다.
- not verified yet: 실제 모바일 UI 플로우는 프로젝트 규칙상 Codex 세션에서 장기 dev server를 시작하지 않아 로컬 브라우저로 수행하지 않았다.

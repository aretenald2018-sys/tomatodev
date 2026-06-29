# 트레이너 퀘스트 게임 메뉴 재작성 Slice 9 리뷰

## 대상

- 계획 문서: `docs/ai/features/2026-06-28-trainer-quest-modal-seated-character.md` Slice 9
- 변경 대상: `modals/trainer-quest-modal.js`, `style.css`, `sw.js`, 관련 회귀 테스트

## 리뷰 결과

- 발견 사항: 없음.

## 점검 내용

- 기존 전구 클릭 첫 화면 메뉴 클래스(`trainer-quest-menu`, `trainer-quest-choice`, `trainer-quest-choice-caret`)는 실제 `modals/trainer-quest-modal.js`와 `style.css`에서 제거됐다.
- 새 메뉴는 `trainer-quest-game-menu` 단일 패널 안에 3개 `trainer-quest-game-option`이 들어가는 구조라, 전체 행을 큰 박스로 쓰지 않고 좌측 일부 영역만 사용한다.
- 통계 보기/닫기 버튼은 시트 내부 `stopPropagation()`과 충돌하지 않도록 기존처럼 직접 click handler가 유지된다.
- 게임식 외형을 적용하되 텍스트는 `var(--font-sans)`와 TDS font size/weight token을 유지해 앱 타이포와 충돌하지 않는다.
- `style.css`와 `modals/trainer-quest-modal.js`가 `sw.js` `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`이 `tomatofarm-v20260628z18-trainer-game-menu`로 갱신됐다.

## 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js; node --test tests/trainer-quest-modal.test.js` — 6 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 583 tests passed
- PASS: `git diff --check`

## 남은 리스크

- 배포 페이지의 인증 세션이 없으면 `홈 -> 라이프존 트레이너 전구 -> 게임 메뉴` 실제 클릭/시각 flow는 직접 확인하기 어렵다. Dashboard3 Pages asset marker와 인증 계정 수동 확인으로 보완한다.

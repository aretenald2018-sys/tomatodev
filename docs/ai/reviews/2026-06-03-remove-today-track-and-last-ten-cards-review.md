# 테스트모드 오늘 트랙/마지막 10분 보강 카드 제거 리뷰

## 범위

- 계획 문서: `docs/ai/features/2026-06-03-remove-today-track-and-last-ten-cards.md`
- 슬라이스: `Slice 1: 성장판 화면 카드 제거`
- 변경 파일: `workout/expert/max-cycle-render.js`, `tests/calc.max.test.js`, `sw.js`, `docs/ai/features/2026-06-03-remove-today-track-and-last-ten-cards.md`, `docs/ai/NEXT_ACTION.md`

## Findings

차단 이슈 없음.

## 확인 내용

- `renderMaxCycleDashboard()`의 카드 본문에서 `wt-v4-track-card`와 `wt-v4-last-ten` 렌더링이 제거됐다.
- 상단 hero score의 작은 `오늘 트랙` 표시는 유지되어 현재 트랙 요약 정보가 완전히 사라지지는 않는다.
- 벤치마크 행 내부 `set-max-benchmark-track` 버튼은 유지되어 개별 벤치마크 볼륨/강도 조정 기능을 건드리지 않는다.
- `workout/expert/max-cycle-render.js`는 `sw.js` `STATIC_ASSETS`에 포함되며, `CACHE_VERSION` bump가 함께 반영됐다.
- Firestore/data.js 저장 경로나 운동 기록 payload는 변경하지 않았다.

## 검증

- PASS: `git diff --check`
- PASS: `node --check workout/expert/max-cycle-render.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/calc.max.test.js` (`56` tests)
- not verified yet: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 미추적 mockup 참조(`mockups/poc/*`, `mockups/trio-renewal/shared.css`) 때문에 실패했다. 이번 변경 파일 누락과 직접 관련된 실패는 아니다.
- not verified yet: 실제 모바일 UI 플로우는 프로젝트 규칙상 Codex 세션에서 장기 dev server를 시작하지 않아 로컬 브라우저로 수행하지 않았다.

## 결론

요청 범위에 맞게 성장판 화면의 `오늘 트랙` 카드와 `마지막 10분 보강` 카드 제거가 완료됐다. 배포 후 `https://aretenald2018-sys.github.io/tomatofarm/`에서 운동 탭 테스트모드 성장판 화면에 두 카드가 보이지 않는지 확인한다.

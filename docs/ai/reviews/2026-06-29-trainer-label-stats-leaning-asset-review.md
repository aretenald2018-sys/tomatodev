# 트레이너 이름표와 통계 모달 기대기 자산 개선 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-29-trainer-label-stats-leaning-asset.md`
- 변경 파일: `assets/home/life-zone/ui/trainer-quest-leaning-trainer.png`, `modals/trainer-quest-modal.js`, `style.css`, `sw.js`, 관련 테스트 파일, `docs/ai/NEXT_ACTION.md`

## 결론

- 발견 이슈: 없음
- 상태: `complete`

## 확인 내용

1. 홈 트레이너 이름표는 `.lz-npc-quest--trainer .lz-nameplate`에서 `order: -1`로 전구 위에 올라가며, 트레이너 얼굴 영역을 덮지 않는다.
2. 새 모달용 자산은 기존 홈 스프라이트를 확대하지 않고 별도 PNG로 추가됐다.
3. 새 자산은 `1028x1086`, PNG `colorType: 6` RGBA이며, `sw.js`에 런타임 자산으로 등록됐다.
4. 통계 화면에서는 `trainer-quest-sheet--stats`가 적용되어 기존 전신 stage가 숨겨지고, 통계 헤더가 sheet 상단 padding부터 시작한다.
5. 기대기 자산은 stats 화면 안에서만 렌더되며, glass overlay가 하단부를 덮어 모달 뒤에 가려진 시각 구조를 만든다.
6. `event.stopPropagation()`이 있는 sheet 구조에서 새 버튼이나 inline handler를 추가하지 않았다.

## 검증

1. PASS: `node --check modals/trainer-quest-modal.js; node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js` — 19 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
4. PASS: `node --test tests/*.test.js` — 603 tests passed
5. PASS: `git diff --check`
6. PASS: Dashboard3 배포 검증
7. PASS: 배포된 `sw.js`, `modals/trainer-quest-modal.js`, `style.css` marker 검증

## 남은 리스크

- 인증 세션이 없는 브라우저에서는 실제 홈탭과 트레이너 통계 모달 시각 상태를 직접 클릭 검증하지 못했다. 배포 asset/style marker는 확인했으므로, 인증 계정에서는 홈탭 트레이너 전구와 `내 운동 통계 살펴보기` 화면을 수동 확인한다.

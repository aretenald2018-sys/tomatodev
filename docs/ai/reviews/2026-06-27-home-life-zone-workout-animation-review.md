# 홈 라이프존 트레이너 라벨/운동 애니메이션 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-27-home-life-zone-workout-animation.md`
- Slice: Label Placement + CSS Motion

## 리뷰 결과

- Blocking issue 없음.
- 전역 CSS reset, layout root, header/nav, 운동 탭 CSS는 수정하지 않았고 라이프존 섹션의 scoped rule만 변경했다.
- `트레이너` 이름표는 기존 얼굴 근처 중심 배치에서 하단 y 좌표로 내려갔다.
- actor image에는 slot pose 기반 class만 추가되어 상태 판정/스프라이트 경로/말풍선/이름표 데이터 흐름을 건드리지 않는다.
- 운동 애니메이션은 새 sprite asset 없이 `transform`만 사용하며, amplitude가 작아 기존 absolute slot 배치를 크게 흔들지 않는다.
- `prefers-reduced-motion: reduce` guard가 있어 접근성 모션 감소 설정에서는 정지한다.
- `style.css`와 `home/life-zone.js`가 `STATIC_ASSETS` 대상이므로 `sw.js` cache marker 갱신과 cache marker 테스트 갱신이 포함됐다.

## 검증

- PASS: `node --check home/life-zone.js; node --check sw.js`
- PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js` — 19 tests passed
- PASS: `node --test tests/*.test.js` — 552 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=834`
- PASS: `git diff --check`

## 남은 확인

- not verified yet: Dashboard3 Pages 배포 검증은 커밋 후 실행 필요.
- not verified yet: 인증 계정 홈 탭에서 실제 트레이너 라벨 위치와 운동 pose animation 시각 확인 필요.

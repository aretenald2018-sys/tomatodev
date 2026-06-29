# 홈 미란다 공간 스프라이트 및 러닝 프레임 수정 리뷰

## 리뷰 결과

- 발견된 차단 이슈: 없음
- 계획 범위 이탈: 없음
- 캐시 누락: 없음

## 확인한 내용

1. 홈 공간용 미란다 자산을 `assets/home/life-zone/ui/miranda-npc-home.png`로 별도 생성했다.
2. 모달용 큰 자산 `miranda-npc-seated.png`는 유지하고, 홈 라이프존에서는 작은 `142x256` 투명 PNG만 사용한다.
3. 홈 미란다 위치를 카드 하단 바깥이 아니라 기존 방 내부 좌측 하단 좌표로 옮겼다.
4. `lz-scene` 비율을 다시 `1672 / 1672`로 되돌려 하단 빈 확장 영역에 캐릭터가 걸치지 않게 했다.
5. 러닝 중복 렌더는 화면전환 JS가 아니라 CSS 스프라이트 프레임 전환 방식이 원인이었다.
6. `steps(2, end)`를 제거하고 `0%/49.999%`는 첫 프레임, `50%/100%`는 둘째 프레임만 보이도록 명시 키프레임으로 바꿨다.
7. `sw.js`에 새 홈 스프라이트를 등록하고 `CACHE_VERSION`을 `tomatofarm-v20260629z11-home-sprite-running-frame`으로 bump했다.

## 검증

1. PASS: `node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js` — 12 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
4. PASS: `node --test tests/*.test.js` — 601 tests passed
5. PASS: `git diff --check`

## 남은 리스크

- 정적/배포 검증은 가능하지만, 인증 세션이 없으면 실제 홈탭에서 미란다 배치와 러닝 모션이 사용자 계정 데이터로 보이는 최종 시각 상태는 사용자의 로그인 세션에서 확인해야 한다.

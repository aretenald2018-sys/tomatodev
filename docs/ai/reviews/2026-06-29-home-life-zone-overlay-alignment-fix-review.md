# 홈 라이프존 오버레이 정렬 보정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-29-home-life-zone-overlay-alignment-fix.md`
- 변경 파일: `style.css`, `home/life-zone-state.js`, `sw.js`, `tests/home-life-zone-npc-quest.test.js`, `tests/home-life-zone-state.test.js`, 캐시 버전 기대값 테스트들

## 결론

- 발견 이슈: 없음
- 상태: `complete`

## 확인 내용

1. 트레이너 전구 좌표가 기존 상단 부유 위치가 아니라 트레이너 머리 위 기준 좌표로 이동했다.
2. 미란다 전구는 트레이너와 같은 전구 PNG를 쓰며, CSS 변수 기반 `transform`으로 애니메이션 중에도 절대 위치가 유지된다.
3. 미란다 이름표는 캐릭터 아래가 아니라 캐릭터 위에 표시된다.
4. 러닝 actor 슬롯은 동일 크기 3개 배치가 아니라 하단 트랙 원근에 맞춰 차등 크기로 고정됐다.
5. 홈 지도 말풍선은 실제 지도 타일/경로/현재점/동 단위 라벨을 유지하고, 작은 말풍선에서 지도 정보를 가리던 `VWorld` 표기는 숨긴다.
6. `STATIC_ASSETS` 영향 파일 변경에 맞춰 `sw.js` 캐시 버전과 테스트 기대값을 같이 갱신했다.

## 검증

1. PASS: `node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/miranda-quest-modal.test.js tests/running-entry.test.js` — 41 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=859`
4. PASS: `node --test tests/*.test.js` — 603 tests passed
5. PASS: `git diff --check`

## 남은 리스크

- 배포 후 인증 세션이 없는 브라우저에서는 실제 홈탭 라이프존 시각 상태를 직접 클릭 검증하지 못할 수 있다. 이 경우 배포 asset marker와 인증 계정 수동 확인 흐름을 분리해 보고한다.

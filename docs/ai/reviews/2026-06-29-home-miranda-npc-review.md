# 홈 라이프존 미란다 NPC 추가 리뷰

## 리뷰 결과

- 발견된 차단 이슈: 없음
- 계획 범위 이탈: 없음
- 캐시 누락: 없음

## 확인한 내용

1. `assets/home/life-zone/ui/miranda-npc-seated.png`는 `imagegen`으로 재생성했고, 검은 선글라스와 더 나이 든 은발 편집장 인상이 반영되어 있다.
2. 홈 라이프존은 기존 `1672x1672` 좌표계를 `lz-world`에 유지하고, `lz-scene`만 하단으로 조금 확장해 기존 캐릭터/운동기구 위치가 흔들리지 않게 했다.
3. 미란다 NPC는 홈탭 좌측 하단에 캐릭터 이미지, 전구 상호작용, `미란다` 이름표를 함께 렌더한다.
4. `life-zone:npc-quest` 이벤트는 트레이너와 미란다를 분기하며, 미란다는 `openMirandaQuestModal()`로 별도 모달을 연다.
5. 미란다 모달은 트레이너 모달의 glass/dialogue 스타일을 재사용하고, 내부 버튼은 직접 바인딩해 sheet의 `stopPropagation()` 영향을 받지 않는다.
6. 새 모달 파일과 PNG는 `sw.js` `STATIC_ASSETS`에 등록했고 `CACHE_VERSION`을 `tomatofarm-v20260629z10-home-miranda-npc`로 bump했다.

## 검증

1. PASS: `node --check home/life-zone.js; node --check app.js; node --check modals/miranda-quest-modal.js; node --check modal-manager.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/trainer-quest-modal.test.js tests/miranda-quest-modal.test.js` — 18 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=857`
4. PASS: `node --test tests/*.test.js` — 601 tests passed
5. PASS: `git diff --check`

## 남은 리스크

- 배포 전 로컬 정적 검증은 완료했다. 인증 세션이 없으면 실제 홈탭에서 미란다 전구 클릭 후 모달이 열리는 UI 흐름은 사용자의 로그인 세션에서 최종 확인해야 한다.

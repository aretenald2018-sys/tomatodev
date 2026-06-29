# 트레이너 이름표와 통계 모달 기대기 자산 개선

## 상태

- 상태: `complete`
- 요청일: 2026-06-29
- 트리거: `/diagnose` — 홈 NPC 이름표가 얼굴을 가리고, 트레이너 통계 모달 자산이 본문을 밀어내는 UI 깨짐
- 적용 문서: `docs/ai/NPC_ASSET_WORKFLOW.md`
- 적용 스킬: `imagegen`

## 사용자 지적

1. 홈탭에서 `트레이너` 이름표가 트레이너 얼굴을 가리지 않아야 한다.
2. 트레이너 통계 화면은 기존 전신 앉은 자산 대신, 상반신이 앞 모달에 기대고 하반신은 모달 뒤에 가려진 것처럼 보이는 별도 아트에셋을 써야 한다.
3. 새 자산으로 확보한 공간을 이용해 통계 정보는 모달 상단 맨 위부터 표기해야 한다.

## NPC 체크리스트 답변

1. 홈 위치: 기존 트레이너는 라이프존 우측 중앙 카운터 뒤, `1672x1672` 홈 좌표계의 기존 NPC 위치를 유지한다.
2. 겹침: 이름표가 얼굴을 가리는 것이 문제이므로, 전구/이름표 stack을 트레이너 정수리 위에 두되 이름표가 얼굴 아래로 내려오지 않게 분리한다.
3. 홈 배치용 스프라이트와 모달용 아트에셋: 홈 스프라이트는 변경하지 않고, 모달 통계 화면용 별도 PNG를 추가한다.
4. NPC 전용 공간/소품 overlay: 이번 변경에는 필요 없다.
5. 자세와 시선: 통계 모달용 새 자산은 기존 트레이너와 같은 정면 시선, 검은 민소매 트레이닝복, 반픽셀/애니메이션 화풍을 유지한다.
6. 크기 기준: 기존 모달 전신 자산은 `1080x1456` RGBA다. 새 통계 전용 자산은 상반신 중심으로 만들고 CSS에서 기존 모달 폭보다 작게 배치해 본문과 겹치지 않게 한다.
7. 이름표/전구: 홈 이름표와 전구는 DOM 구조를 유지하고 이미지에 굽지 않는다.
8. `STATIC_ASSETS`: 새 PNG, `style.css`, `modals/trainer-quest-modal.js`, 테스트, `sw.js`가 영향 대상이다.
9. 캐시: `sw.js` `CACHE_VERSION` bump가 필요하다.
10. 완료 증거: Dashboard3 URL에서 배포 커밋 확인, 새 PNG/좌표/style marker 확인, 관련 테스트 및 전체 테스트 통과.

## Slice 1 범위

### 구현

1. 홈 트레이너 이름표가 얼굴을 덮지 않도록 `.lz-npc-quest` 내부 이름표를 전구 아래가 아니라 전구 위쪽/독립 위치로 조정한다.
2. imagegen으로 `assets/home/life-zone/ui/trainer-quest-leaning-trainer.png`를 새로 만든다.
3. 트레이너 통계 화면에서만 새 기대기 자산을 사용하도록 모달 마크업/CSS를 변경한다.
4. 통계 화면이 기존 전신 캐릭터 높이만큼 상단 padding을 낭비하지 않도록 `trainer-quest-stats` 전용 상단 배치를 조정한다.
5. 새 PNG를 `sw.js` `STATIC_ASSETS`에 등록하고 cache marker를 bump한다.
6. 테스트에 새 PNG header, cache marker, 통계 전용 자산 마크업과 상단 padding 회귀를 추가한다.

### 비범위

- 홈 트레이너 스프라이트 자체 재생성
- 미란다 모달 변경
- 통계 데이터 구조 변경
- 새 모달 플로우 추가

## 검증

## 실행 결과

1. 홈 트레이너 이름표는 전구 위로 올라가 얼굴을 덮지 않게 했다.
2. imagegen built-in 경로로 통계 모달 전용 `trainer-quest-leaning-trainer.png`를 생성했다.
3. 크로마키 제거 후 `1028x1086` RGBA PNG로 저장하고 `sw.js` `STATIC_ASSETS`에 등록했다.
4. 트레이너 통계 화면 진입 시 sheet에 `trainer-quest-sheet--stats` 클래스를 붙여 기존 전신 stage를 숨기고, 상단 padding을 `14px 16px 18px`로 줄였다.
5. 새 기대기 자산은 통계 화면에서만 sheet 상단 뒤쪽 레이어로 표시되고, sheet glass overlay가 하단부를 가려 모달 뒤에 있는 것처럼 보이게 했다.
6. `sw.js` 캐시 버전을 `tomatofarm-v20260629z15-trainer-leaning-modal`로 갱신했다.

## 검증

1. PASS: `node --check modals/trainer-quest-modal.js; node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/miranda-quest-modal.test.js` — 19 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
4. PASS: `node --test tests/*.test.js` — 603 tests passed
5. PASS: `git diff --check`
6. PASS 예정: Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행 프롬프트

없음. Slice 1을 같은 세션에서 구현한다.

# 홈 라이프존 상담실장 NPC 추가

## 상태

- 상태: `implemented`
- 요청일: 2026-06-29
- 실행 슬라이스: Slice 1 하나로 완료

## 사용자 요청

이미지 참고해서 누가봐도 이 사람인 것을 알 수 있도록 `상담실장`이라는 NPC를 만든다. 스프라이트 구현 위치는 홈 라이프존 우측 하단 부분이다. Dashboard3에만 배포하고 운영계 `tomatofarm`에는 배포하지 않는다.

## 이해한 내용

- 목표: 홈 라이프존 우측 하단 상담/라운지 영역에 `상담실장` NPC를 추가하고, 전구 클릭 시 전용 대화 모달을 연다.
- 비목표: 운영계 `tomatofarm` remote 배포, 기존 트레이너/미란다 기능 변경, 베이스룸 전체 재생성, Firestore 데이터 구조 변경.
- 사용자 흐름: 홈탭 라이프존 진입 -> 우측 하단 `상담실장` 이름표/전구 확인 -> 전구 또는 NPC 클릭 -> 상담실장 대화 모달 열림.
- 데이터 가정: NPC는 정적 UI/자산 변경이며 사용자 데이터 저장은 필요 없다.
- 열려 있는 질문: 없음. 사용자가 위치와 배포 대상을 명시했고, 구현 방식은 기존 NPC 패턴으로 결정 가능하다.

## 그릴 결과

- 적용 트리거: `/grill-me`
- 핵심 질문: 참고 이미지의 실제 인물을 어느 수준으로 반영할 것인가?
- 추천 답변: 프로젝트 `NPC_ASSET_WORKFLOW.md`에 따라 특정 실존 인물의 정확한 얼굴 복제가 아니라, 참고 이미지의 역할/분위기/식별 단서를 살린 원본 NPC로 만든다.
- 사용자 답변: 명시 답변 없음. 사용자는 “누가봐도 이 사람” 수준의 강한 식별감을 요청했다.
- 확정된 결정: 직접 복제는 피하되, 뒤로 묶은 어두운 머리, 강한 눈썹/눈매, 둥근 얼굴형, 병원 상담실장 분위기, 흰 가운 또는 검은 재킷, 자신감 있는 상담 포즈를 조합해 `상담실장`으로 즉시 읽히게 만든다.
- 남은 가정: 인증 세션이 없으면 배포 후 홈 UI 클릭 flow는 Dashboard3 Pages에서 정적/자산 검증까지 수행하고, 실제 로그인 홈 화면 시각 확인은 `not verified yet`으로 남길 수 있다.

## NPC 아트 워크플로 체크리스트

1. 홈 위치: 기존 1672x1672 라이프존 기준 우측 하단 소파/상담 라운지 영역. 초기 후보 좌표는 `left: 1378`, `top: 1318`, `width: 112` 기준으로 잡고, 소파/책장/화분과 겹침을 시각 확인해 조정한다.
2. 겹침: 우측 하단 소파와 상담 코너를 배경 소품으로 활용한다. 트레이너 카운터, 러닝트랙, 미란다 좌측 하단 코너와는 분리한다.
3. 홈/모달 아트: 홈 배치용 작은 투명 PNG와 모달용 큰 반신/상반신 투명 PNG를 각각 만든다. 홈 스프라이트를 모달에서 확대하지 않는다.
4. 전용 공간/소품 overlay: 기존 우측 하단 소파/테이블이 상담 공간으로 충분하므로 별도 overlay는 Slice 1에서 만들지 않는다.
5. 시선/자세: 홈 스프라이트는 방 원근에 맞춰 좌상단 또는 중앙 쪽을 바라보는 앉은/서 있는 자세로 배치한다.
6. 크기 기준: 미란다 홈 NPC `78px 기준 폭`, 트레이너 전구 버튼 `168px 기준 폭`과 비교해 상담실장 홈 스프라이트는 `100-120px 기준 폭` 범위에서 우측 하단 소파와 읽히게 한다.
7. 이름표/전구: 이름은 이미지에 굽지 않고 DOM `lz-nameplate--npc`로 표시한다. 전구는 기존 `npc-quest-bubble.png`를 재사용한다.
8. `STATIC_ASSETS`: 새 PNG, 새 모달 JS, `home/life-zone.js`, `style.css`, `app.js`, `modal-manager.js`가 캐시 영향권이다.
9. `CACHE_VERSION`: `sw.js` `STATIC_ASSETS` 추가/수정과 함께 반드시 bump한다.
10. 완료 증거: Dashboard3 Pages `https://aretenald2018-sys.github.io/dashboard3/`가 배포 commit과 새 캐시 버전/자산을 반환하고, 홈 라이프존 우측 하단에서 `상담실장` NPC가 보이며 전용 모달이 열리는 상태다.

## 결정 기록

- 결정: 기존 트레이너/미란다 NPC 구조를 확장해 세 번째 NPC `consultingChief`를 추가한다.
- 이유: `life-zone:npc-quest` 이벤트, `modal-manager.js`, DOM 이름표/전구 패턴이 이미 안정적으로 검증되어 있어 새 구조를 만들 필요가 없다.
- 되돌릴 수 있는가: 가능. 새 자산, 새 모달, `app.js` 분기, `home/life-zone.js` 버튼, CSS, 테스트, `sw.js` 등록을 제거하면 된다.

## 실행 슬라이스

### 슬라이스 1: 상담실장 NPC와 모달 추가

- 목표: 홈 라이프존 우측 하단에 상담실장 NPC를 추가하고 전구 클릭으로 전용 모달을 연다.
- 범위:
  1. imagegen built-in 경로로 홈용 `consulting-chief-npc-home.png`, 모달용 `consulting-chief-npc-modal.png`를 생성한다.
  2. 크로마키 제거 후 RGBA 투명 PNG로 `assets/home/life-zone/ui/`에 저장한다.
  3. `home/life-zone.js`에 상담실장 버튼, 이름표, 전구, `life-zone:npc-quest` detail을 추가한다.
  4. `app.js`의 `modalByNpc`에 `consultingChief` 분기를 추가한다.
  5. `modals/consulting-chief-quest-modal.js`를 추가하고 `modal-manager.js`에 등록한다.
  6. `style.css`에 우측 하단 상담실장 배치와 모달 캐릭터 크기 스타일을 추가한다.
  7. `sw.js` `STATIC_ASSETS`와 `CACHE_VERSION`을 갱신한다.
  8. 회귀 테스트에 DOM 구조, 이벤트 분기, 모달 등록, PNG header, 캐시 등록을 추가한다.
- 예상 수정 파일:
  - `assets/home/life-zone/ui/consulting-chief-npc-home.png`
  - `assets/home/life-zone/ui/consulting-chief-npc-modal.png`
  - `home/life-zone.js`
  - `app.js`
  - `modal-manager.js`
  - `modals/consulting-chief-quest-modal.js`
  - `style.css`
  - `sw.js`
  - `tests/home-life-zone-npc-quest.test.js`
  - `tests/consulting-chief-quest-modal.test.js`
  - `docs/ai/NEXT_ACTION.md`
- 수정하지 말 것:
  - `www/`
  - 운영계 `tomatofarm` remote
  - 기존 트레이너/미란다 대화 내용과 통계 기능
  - 러닝/운동/식단 상태 판정
  - Firebase/data 저장 계층
- 구현 메모:
  - imagegen 프롬프트는 “실존 인물 정확 복제”가 아니라 “참고 이미지의 병원 상담실장 분위기와 식별 단서를 가진 원본 NPC”로 작성한다.
  - 이미지 안 텍스트, 로고, 말풍선, UI 카드, 배경 장식은 금지한다.
  - 모달 sheet 내부 클릭은 직접 바인딩하고 새 inline `onclick`은 만들지 않는다.
  - Dashboard3 배포만 허용한다. `origin/main` push 후 `verify:deploy`를 사용하고, `tomatofarm` remote는 사용하지 않는다.
- 검증 방법:
  1. `node --check home/life-zone.js; node --check app.js; node --check modal-manager.js; node --check modals/consulting-chief-quest-modal.js; node --check sw.js`
  2. `node --test tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js tests/miranda-quest-modal.test.js tests/trainer-quest-modal.test.js`
  3. `node scripts/verify-runtime-assets.mjs`
  4. `git diff --check`
  5. 커밋 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 완료 증거:
  - 새 PNG 두 개가 RGBA PNG이며 `sw.js`에 등록되어 있다.
  - Dashboard3 Pages에서 새 commit과 `CACHE_VERSION`이 확인된다.
  - 배포 URL 홈 라이프존 우측 하단에 `상담실장` 이름표/전구/NPC가 보이고, 클릭 시 상담실장 모달이 열린다.
- 다음 세션 시작 프롬프트: `docs/ai/features/2026-06-29-home-consulting-chief-npc.md` Slice 1을 구현한다. 홈 라이프존 우측 하단 상담 코너에 상담실장 NPC를 추가하고, 전구 클릭 시 상담실장 모달이 열리게 하며 Dashboard3에만 배포한다.

## 실행 결과

1. imagegen built-in 경로로 홈용 `consulting-chief-npc-home.png`와 모달용 `consulting-chief-npc-modal.png`를 생성했다.
2. 크로마키 제거와 알파 검증을 거쳐 홈 자산은 `96x256`, 모달 자산은 `1074x1485` RGBA PNG로 저장했다.
3. `home/life-zone.js`에 우측 하단 `상담실장` NPC 버튼, DOM 이름표, 전구, `consultingChief` 이벤트 detail을 추가했다.
4. `app.js`, `modal-manager.js`, `modals/consulting-chief-quest-modal.js`에 상담실장 전용 모달 경로를 추가했다.
5. `style.css`에 우측 하단 홈 배치와 모달 캐릭터 크기 스타일을 추가했다.
6. `sw.js` `STATIC_ASSETS`에 새 모달/PNG를 등록하고 `CACHE_VERSION`을 `tomatofarm-v20260629z29-consulting-chief-npc`로 bump했다.
7. `tests/consulting-chief-quest-modal.test.js`를 추가하고 기존 NPC/캐시 테스트를 갱신했다.

## 실행 검증

1. PASS: `node --check home/life-zone.js; node --check app.js; node --check modal-manager.js; node --check modals/consulting-chief-quest-modal.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js tests/miranda-quest-modal.test.js tests/trainer-quest-modal.test.js` — 24 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
4. PASS: `node --test tests/*.test.js` — 613 tests passed
5. PASS: `git diff --check`
6. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ f6bc1679999f8c0d5bc9f2ddae802dc04c21bf1a` — `[deploy-verify] ok f6bc1679999f tomatofarm-v20260629z29-consulting-chief-npc static=234`
7. PASS: 배포 URL 직접 fetch — `index.html`, `sw.js`, `home/life-zone.js`, `modals/consulting-chief-quest-modal.js`, `consulting-chief-npc-home.png`, `consulting-chief-npc-modal.png`가 HTTP 200을 반환했고 JS marker가 확인됐다.
8. not verified yet: in-app browser가 Dashboard3 페이지 로딩 확인에서 두 차례 timeout되어, 배포된 홈 화면에서 `상담실장` 전구를 실제 클릭해 모달이 열리는 UI flow는 직접 확인하지 못했다.

## Slice 2: 홈 배치 크기/좌표 보정

## 진단

사용자 제공 배포 화면에서 `상담실장` 홈 스프라이트가 우측 하단 방 경계 밖으로 내려가 보인다. 원인은 홈 스프라이트 원본이 `96x256`의 세로형 비율인데 `.lz-consulting-chief-npc`가 `width: 108 기준`, `top: 1284`로 배치되어 모바일 카드 축소 시 하체가 우측 하단 소파/러그 공간보다 아래로 길게 내려가기 때문이다.

## 보정 범위

1. `style.css`에서 `.lz-consulting-chief-npc`의 좌표를 우측 하단 소파 안쪽으로 옮긴다.
2. 홈 스프라이트 폭 기준을 `108`에서 `86`으로 줄이고, CSS clamp도 함께 줄인다.
3. `tests/home-life-zone-npc-quest.test.js`의 좌표/크기 회귀 계약을 갱신한다.
4. `sw.js` `CACHE_VERSION`을 bump한다.
5. `docs/ai/NEXT_ACTION.md`와 리뷰 문서를 갱신한다.

## 제외

- 새 imagegen 자산 생성
- 모달용 상담실장 아트 크기 변경
- 트레이너/미란다/러닝트랙 배치 변경
- 운영계 `tomatofarm` remote 배포

## Slice 2 검증

1. `node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. 로컬 합성 미리보기로 우측 하단 방 경계 안쪽 배치 확인
6. Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## Slice 2 실행 결과

1. `.lz-consulting-chief-npc` 기준 좌표를 `left: 1368`, `top: 1284`에서 `left: 1338`, `top: 1260`으로 옮겨 우측 하단 소파/테이블 공간 안쪽에 맞췄다.
2. 홈 스프라이트 폭 기준을 `108`에서 `86`으로 줄이고 clamp를 `34px-52px`에서 `28px-40px`로 줄였다.
3. 홈 전용 위치만 보정했고, 상담실장 모달 아트와 다른 NPC 배치는 변경하지 않았다.
4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z30-consulting-chief-fit`으로 bump했다.
5. `tests/home-life-zone-npc-quest.test.js`의 좌표/크기/캐시 계약을 새 보정값으로 갱신했다.

## Slice 2 실행 검증

1. PASS: `node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js` — 14 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
4. PASS: `node --test --test-reporter=dot tests/*.test.js`
5. PASS: `git diff --check`
6. PASS: 로컬 합성 미리보기 `C:\Users\USER\AppData\Local\Temp\tomato-consulting-chief-fit-preview.png`에서 상담실장 스프라이트가 우측 하단 방 경계 안쪽에 들어오는 것을 확인했다.
7. not verified yet: 인증 세션이 없어 실제 배포 홈 화면에서 상담실장 NPC 클릭 flow는 직접 시각 검증하지 못했다.

## Slice 3: 홈 스프라이트 추가 축소

## 진단

사용자가 Dashboard3 배포 화면 기준으로 여전히 `상담실장` NPC가 크다고 피드백했다. Slice 2에서 기준 폭은 `86`으로 낮췄지만 모바일 카드에서는 `min-width: 28px`가 적용되어 원본 비율 `96x256` 때문에 표시 높이가 약 `75px`까지 남는다. 세로형 전신 자산이라 같은 폭이어도 미란다처럼 앉은 자산보다 훨씬 커 보인다.

## 보정 범위

1. `.lz-consulting-chief-npc` 홈 전용 폭을 `clamp(18px, calc(56 / 1672 * 100%), 28px)`로 낮춘다.
2. 좌표는 Slice 2의 우측 하단 소파/테이블 공간 기준을 유지하고, 다른 NPC와 모달 아트는 변경하지 않는다.
3. `sw.js` `CACHE_VERSION`을 bump하고 캐시 버전 테스트를 갱신한다.
4. `tests/home-life-zone-npc-quest.test.js`의 상담실장 폭 계약을 새 값으로 고정한다.

## Slice 3 검증

1. `node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `node --test --test-reporter=dot tests/*.test.js`
5. `git diff --check`
6. Dashboard3 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## Slice 3 실행 결과

1. `.lz-consulting-chief-npc` 홈 전용 폭을 `clamp(28px, calc(86 / 1672 * 100%), 40px)`에서 `clamp(18px, calc(56 / 1672 * 100%), 28px)`로 추가 축소했다.
2. 모바일에서 강제 적용되던 최소 폭을 `28px`에서 `18px`로 낮춰, 세로형 `96x256` 홈 스프라이트의 표시 높이를 약 `75px`에서 약 `48px` 수준으로 줄였다.
3. 좌표는 Slice 2의 `left: 1338`, `top: 1260`을 유지했고, 모달용 상담실장 아트와 다른 NPC 배치는 변경하지 않았다.
4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z31-consulting-chief-smaller`로 bump했다.
5. `tests/home-life-zone-npc-quest.test.js`와 캐시 버전 테스트들을 새 값으로 갱신했다.

## Slice 3 실행 검증

1. PASS: `node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js` — 14 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
4. PASS: `node --test --test-reporter=dot tests/*.test.js`
5. PASS: `git diff --check`
6. PASS: 로컬 합성 미리보기 `C:\Users\USER\AppData\Local\Temp\tomato-consulting-chief-z31_56-preview.png`에서 상담실장 스프라이트가 우측 하단 소파/테이블 공간 안쪽에 작게 배치되는 것을 확인했다.
7. not verified yet: 인증 세션이 없어 실제 배포 홈 화면에서 상담실장 NPC 클릭 flow는 직접 시각 검증하지 못했다.

## 리뷰 세션 프롬프트

이 계획 문서와 직전 실행 세션의 변경 파일을 읽고 버그, 회귀, 누락된 테스트, 오래된 캐시/서비스워커 이슈, UX 깨짐을 우선 리뷰한다. 리뷰 중에는 새 기능을 구현하지 않는다.

## NEXT_ACTION.md 업데이트

- 현재 상태: `complete`
- 다음 자동 상태: `complete`
- 다음 액션: `없음`
- 차단 질문: 없음

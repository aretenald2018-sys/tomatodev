# 트레이너 퀘스트 모달 상단 착석 캐릭터

## 그릴 결과

- 핵심 질문: 파란색으로 표시한 백드롭 영역에는 어떤 자세의 트레이너가 가장 자연스러운가?
- 결정: 흰색 모달 상단 모서리를 의자처럼 사용해 성인 남성 트레이너가 화면 이용자를 바라보며 걸터앉은 픽셀아트 자산을 추가한다.
- 톤: 기존 라이프존 트레이너와 유사한 픽셀아트, 매력적인 피트니스 트레이너 느낌은 살리되 노출이나 선정성은 피한다.
- 남은 가정: 기존 저장 자산에 해당 포즈가 없으므로 새 투명 PNG를 생성해 프로젝트 자산으로 저장한다.

## 실행 슬라이스 1

### 목표

트레이너 전구 버튼으로 열리는 `trainer-quest-modal`의 흰색 시트 상단 경계에 상반신/착석 포즈의 트레이너 픽셀아트를 배치한다.

### 포함 범위

- `assets/home/life-zone/ui/`에 투명 배경 트레이너 착석 PNG 추가
- `modals/trainer-quest-modal.js`에 장식 이미지 마크업 추가
- `style.css`에 모달 시트 상단 배치, 반응형 크기, 포인터 이벤트 차단 스타일 추가
- `tests/trainer-quest-modal.test.js`에 이미지/스타일/SW asset 회귀 테스트 추가
- `sw.js` `STATIC_ASSETS` 등록 및 `CACHE_VERSION` bump

### 제외 범위

- 퀘스트 목록 기능 구현
- 통계 모달 내부 데이터 구조 변경
- 홈 라이프존 배경/스프라이트 교체
- 모달 열기/닫기 로직 리팩터링

### 검증

- `node --check modals/trainer-quest-modal.js; node --check sw.js`
- `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 검증:
  - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
  - deployed markers: 새 cache version, 새 이미지 경로, `.trainer-quest-seated-character`, `data-trainer-quest-character`

## 상태

- 2026-06-28: 계획 작성 완료.
- 2026-06-28: Slice 1 구현 완료.

## Slice 1 구현 기록

- `assets/home/life-zone/ui/trainer-quest-seated-trainer.png`: built-in image generation + chroma-key removal로 투명 PNG 트레이너 착석 자산을 추가했다.
- `modals/trainer-quest-modal.js`: 퀘스트 모달 시트 내부 최상단에 `data-trainer-quest-character` 장식 이미지를 추가했다.
- `style.css`: `.trainer-quest-seated-character`를 시트 상단 경계에 absolute 배치하고, 시트 상단 padding을 확보해 손/다리가 흰 모달 영역에 걸쳐도 헤더를 가리지 않게 했다.
- `sw.js`: 새 PNG asset을 `STATIC_ASSETS`에 등록하고 `CACHE_VERSION`을 `tomatofarm-v20260628z9-trainer-modal-seated-character`로 bump했다.
- `tests/trainer-quest-modal.test.js` 및 cache marker 테스트들: 새 이미지/스타일/SW 등록과 cache version을 검증하도록 갱신했다.

## 로컬 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js` — 10 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=849`
- PASS: `node --test @tests` — 580 tests passed
- PASS: `git diff --check`
- PASS: PNG alpha validation — `size=(1080, 1456)`, `mode=RGBA`, `alpha=(0, 255)`

## Dashboard3 Pages 검증

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ baf98b3` — `[deploy-verify] ok baf98b3b27d5 tomatofarm-v20260628z9-trainer-modal-seated-character static=223`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ ...` — `sw.js`, `modals/trainer-quest-modal.js`, `style.css`에서 새 cache, 새 이미지 경로, `.trainer-quest-seated-character` marker 확인
- PASS: `curl.exe ... trainer-quest-seated-trainer.png?codex-bust=baf98b3` — `HTTP 200`, `image/png`, `803246 bytes`
- not verified yet: 배포 페이지 브라우저 세션이 로그인 전 상태라 홈 라이프존/트레이너 전구가 렌더되지 않아 실제 클릭 UI flow는 확인하지 못했다.

## Slice 2 요청

- 사용자 피드백: 캐릭터가 하얀색 모달에 더 명확히 걸쳐앉아야 하며, `무엇을 도와드릴까요?`는 모달 헤더가 아니라 트레이너의 말풍선으로 빠져야 한다.
- 결정: 기존 PNG는 유지하고, 모달 내부에 `trainer-quest-stage`를 만들어 말풍선 `h2`와 착석 캐릭터를 한 묶음으로 배치한다.

## Slice 2 구현 기록

- `modals/trainer-quest-modal.js`: `trainer-quest-title`을 `.trainer-quest-speech` 말풍선 `h2`로 이동하고, 헤더 내부 질문 문구를 제거했다.
- `style.css`: `.trainer-quest-stage`, `.trainer-quest-speech`, `.trainer-quest-speech::after`를 추가하고 캐릭터 좌표를 낮춰 흰 시트 상단에 걸쳐앉는 배치로 조정했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z10-trainer-speech-bubble`로 bump했다.
- `tests/trainer-quest-modal.test.js`: 질문 문구가 말풍선에 있고 헤더에는 없는지, 새 stage/speech 스타일이 있는지 검증한다.

## Slice 2 로컬 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js` — 10 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=849`
- PASS: `node --test @tests` — 580 tests passed
- PASS: `git diff --check`

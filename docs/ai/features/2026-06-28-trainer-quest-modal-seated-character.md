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

## Slice 2 Dashboard3 Pages 검증

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ cc38a2c` — `[deploy-verify] ok cc38a2cb91ac tomatofarm-v20260628z10-trainer-speech-bubble static=223`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ ...` — `sw.js`, `modals/trainer-quest-modal.js`, `style.css`에서 새 cache, `trainer-quest-speech`, `trainer-quest-stage`, 말풍선 문구, 착석 좌표 marker 확인
- PASS: `curl.exe ... trainer-quest-seated-trainer.png?codex-bust=cc38a2c` — `HTTP 200`, `image/png`, `803246 bytes`
- not verified yet: 배포 페이지 브라우저 세션이 로그인 전 상태라 홈 라이프존/트레이너 전구가 렌더되지 않아 실제 클릭 UI flow는 확인하지 못했다.

## Slice 3 요청

- 트레이너 전구가 깜빡거리게 해서 클릭을 유도한다.
- 퀘스트 모달 안의 `PT / 트레이너 / X` 헤더 행은 기능성이 없으므로 삭제한다.
- `무엇을 도와드릴까요?` 말풍선 문구는 포켓몬스터 NPC 대화처럼 빠른 타이핑 효과로 표시한다.

## Slice 3 계획

- `style.css`: `.lz-npc-bulb`에 깜빡임/광원 animation을 추가하고 `prefers-reduced-motion`에서는 끈다.
- `modals/trainer-quest-modal.js`: 헤더 행을 제거하고, 말풍선 텍스트를 `data-trainer-quest-speech-text` 원문과 별도 span으로 분리해 열릴 때 타이핑한다.
- `tests/trainer-quest-modal.test.js`, `tests/home-life-zone-npc-quest.test.js`: 헤더 제거, 타이핑 로직, 전구 animation을 회귀 테스트한다.
- `sw.js`: cache version bump.

## Slice 3 구현 기록

- `style.css`: `.lz-npc-bulb`에 `lz-npc-bulb-blink` animation을 추가해 전구가 어두워졌다 밝아지며 노란 glow가 생기도록 했다. `prefers-reduced-motion: reduce`에서는 전구와 커서 animation을 끈다.
- `modals/trainer-quest-modal.js`: `PT / 트레이너 / X` 헤더 행과 죽은 close button binding을 제거했다. 모달은 기존처럼 backdrop/ESC로 닫힌다.
- `modals/trainer-quest-modal.js`: 말풍선 텍스트를 `data-trainer-quest-speech-value` span으로 분리하고, 모달 open 시 `28ms` 간격으로 한 글자씩 채우는 NPC 대화 타이핑 효과를 추가했다.
- `style.css`: 말풍선 폭을 고정해 타이핑 중 말풍선 크기가 흔들리지 않게 했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z11-trainer-npc-cue`로 bump했다.

## Slice 3 로컬 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js` — 11 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=849`
- PASS: `node --test @tests` — 581 tests passed
- PASS: `git diff --check`

## Slice 3 Dashboard3 Pages 검증

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e2beb4d` — `[deploy-verify] ok e2beb4d26429 tomatofarm-v20260628z11-trainer-npc-cue static=223`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ ...` — `sw.js`, `modals/trainer-quest-modal.js`, `style.css`에서 새 cache, 전구 blink, NPC typing marker 확인
- not verified yet: 배포 페이지 브라우저 세션이 로그인 전 상태라 홈 라이프존/트레이너 전구 클릭 UI flow는 확인하지 못했다.

## Slice 4 요청

- 사용자 피드백: 모달 첫 화면이 첨부 이미지처럼 선택지 네모 3개로 보여야 하며, 트레이너 다리 밑 공백이 너무 크다.

## Slice 4 계획

- `modals/trainer-quest-modal.js`: 첫 화면의 섹션형 목록을 3개 선택 타일(`퀘스트`, `통계`, `닫기`)로 교체하고, 닫기 선택지를 직접 바인딩한다.
- `style.css`: 선택 타일을 3열 grid로 만들고, `.trainer-quest-sheet` 상단 padding을 줄여 신발 아래 선택지까지의 빈 공간을 압축한다.
- `tests/trainer-quest-modal.test.js`: 섹션형 목록이 사라지고 선택 타일 UI와 축소된 padding이 유지되는지 회귀 테스트한다.
- `sw.js`: cache version bump.

## Slice 4 구현 기록

- `modals/trainer-quest-modal.js`: 기존 섹션형 `완료가능한 퀘스트`/`기타` 목록을 제거하고, 첫 화면을 `퀘스트`, `통계`, `닫기` 3개 선택 타일로 교체했다. 헤더 X가 없는 상태에서도 `닫기` 타일로 모달을 닫을 수 있게 직접 handler를 바인딩했다.
- `style.css`: `.trainer-quest-menu`를 3열 grid로 바꾸고 `.trainer-quest-choice` 타일 스타일을 추가했다. `.trainer-quest-sheet` 상단 padding을 `clamp(218px, 46vw, 260px)`에서 `clamp(148px, 33vw, 184px)`로 줄여 트레이너 신발 아래 공백을 압축했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z12-trainer-choice-grid`로 bump했다.
- `tests/trainer-quest-modal.test.js` 및 cache marker 테스트들: 새 선택 타일 구조, 축소된 padding, z12 cache marker를 검증하도록 갱신했다.

## Slice 4 로컬 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js` — 11 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=849`
- PASS: `node --test @tests` — 581 tests passed
- PASS: `git diff --check`

## Slice 5 요청

- 사용자 피드백: 홈 라이프존 트레이너 전구가 너무 빨리 깜빡이며, 트레이너 머리 위가 아니라 왼쪽 위에 떠 있는 느낌이다.
- 사용자 요청: `기타 / 내 운동 통계` 행 오른쪽에 공유하기/복사하기 아이콘을 추가하고, 통계 데이터를 JSON으로 공유 앱 또는 클립보드에 내보낼 수 있게 한다.
- 사용자 요청: 전구 클릭 첫 화면 선택지는 TDS 카드가 아니라 게임 대화 선택지처럼 보여야 하며, `퀘스트를 수락합니다(향후 구현예정)`, `내 운동 통계 살펴보기`, `닫기` 세 직사각형 선택 상자로 구성한다.

## Slice 5 계획

- `style.css`: `.lz-npc-quest` 좌표를 트레이너 머리 위로 보정하고 `.lz-npc-bulb` blink duration을 늦춘다.
- `modals/trainer-quest-modal.js`: 첫 화면 선택지를 게임 대화형 문구로 교체하고, 통계 헤더 오른쪽에 공유/복사 아이콘 버튼을 추가하며, 버튼 클릭을 직접 바인딩한다.
- `style.css`: 첫 화면 선택지를 어두운 반투명/불투명 직사각형 상자로 바꿔 첨부 이미지의 게임 선택지 느낌을 낸다.
- `render-stats.js`: 트레이너 통계 화면에서 쓰는 집계값을 JSON export payload로 재사용 가능하게 만든다.
- `tests/trainer-quest-modal.test.js`, `tests/home-life-zone-npc-quest.test.js`, `tests/stats-overall-compact-summary.test.js`: 버튼, export 함수, 전구 좌표/속도, cache version을 회귀 테스트한다.
- `sw.js`: cache version bump.

## Slice 5 구현 기록

- `modals/trainer-quest-modal.js`: 전구 클릭 첫 화면 선택지를 `퀘스트를 수락합니다(향후 구현예정)`, `내 운동 통계 살펴보기`, `닫기` 세 개의 게임 대화형 선택 상자로 교체했다.
- `modals/trainer-quest-modal.js`: 통계 화면 헤더 오른쪽에 공유/복사 아이콘 버튼을 추가했다. 공유는 Web Share API로 JSON 텍스트를 전달하고, 미지원 환경에서는 클립보드 복사로 fallback한다.
- `render-stats.js`: 트레이너 통계 화면의 전체 요약, 체성분, 영양, 통합 건강 그래프, 근육 피로도, 볼륨 기록, 4주 트레이너 분석을 `tomatofarm.trainerStats.v1` JSON payload로 내보내는 export 함수를 추가했다.
- `style.css`: 선택지를 어두운 반투명 직사각형 메뉴로 바꾸고, 전구 좌표를 트레이너 머리 위로 보정했으며 blink duration을 `2.4s`로 늦췄다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z13-trainer-game-export`로 bump했다.
- 테스트: 선택지 문구/스타일, 공유/복사 버튼, JSON export 함수, 전구 좌표/속도, cache marker 회귀 테스트를 갱신했다.

## Slice 5 로컬 검증

- PASS: `node --check modals/trainer-quest-modal.js; node --check render-stats.js; node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/stats-overall-compact-summary.test.js` — 16 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 583 tests passed
- PASS: `git diff --check`

## Slice 6 요청

- 사용자 피드백: 반투명/불투명 느낌은 선택지 박스만이 아니라 흰색 모달 자체도 약간 회색조로 뒷면이 살짝 보이게 해야 한다.
- 사용자 요청: 선택지 폰트는 현재 과장된 게임 느낌이 아니라 원래 TDS 타이포를 참고해 적용한다.

## Slice 6 계획

- `style.css`: `.trainer-quest-sheet` 배경을 순백에서 반투명 회색조로 바꾸고 `backdrop-filter`를 적용한다.
- `style.css`: `.trainer-quest-choice` 텍스트를 `var(--font-sans)`, TDS size/weight token, `text-shadow: none`으로 조정한다.
- `tests/trainer-quest-modal.test.js`: 회색 반투명 시트와 TDS 타이포 마커를 회귀 테스트한다.
- `sw.js`: `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 cache version을 bump한다.

## Slice 6 구현 기록

- `style.css`: `.trainer-quest-sheet`에 `rgba(242, 244, 247, .86)` 배경, 상단 흰색 border, blur/saturate backdrop filter를 적용해 배경이 약하게 비치는 회색조 시트로 바꿨다.
- `style.css`: 선택지 버튼과 텍스트에 `var(--font-sans)`, `var(--tds-t5-size, 14px)`, `var(--tds-w-bold, 700)`, `var(--tds-t5-lh, 20px)`를 적용하고 텍스트 그림자를 제거했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z14-trainer-sheet-glass`로 bump했다.
- 테스트: 시트 배경/blur, TDS 타이포, cache marker 검증을 추가했다.

## Slice 6 로컬 검증

- PASS: `node --check sw.js; node --test tests/trainer-quest-modal.test.js` — 6 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 583 tests passed
- PASS: `git diff --check`

## Slice 7 요청

- 사용자 피드백: 트레이너 무릎 밑 시트 영역이 여전히 흰색처럼 보인다.
- 사용자 요청: 상반신 배경처럼 흐린 회색조로 처리하되 모달 경계만 구분되게 한다.

## Slice 7 계획

- `style.css`: `.trainer-quest-sheet` 배경을 더 어두운 회색 반투명 그라데이션으로 낮추고 blur를 조금 강화한다.
- `style.css`: 상단 경계는 은은한 border와 shadow만 남겨 시트와 배경의 구분을 유지한다.
- `tests/trainer-quest-modal.test.js`: 새 회색조 배경, blur, cache marker를 회귀 테스트한다.
- `sw.js`: `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 cache version을 bump한다.

## Slice 7 구현 기록

- `style.css`: `.trainer-quest-sheet` 배경을 `rgba(203, 208, 216, .84)`에서 `rgba(213, 217, 224, .86)`로 이어지는 회색조 그라데이션으로 바꿨다.
- `style.css`: `backdrop-filter`를 `blur(16px) saturate(.86)`으로 조정하고, 상단 경계는 `border-top`과 얇은 shadow로만 구분되게 했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z16-trainer-sheet-muted`로 bump했다.

## Slice 8 요청

- 사용자 요청: 선택지는 첨부 이미지의 좌측 하단처럼 하단 좌측 일부 영역까지만 네모상자로 처리한다.
- 사용자 요청: 전체 행을 네모 상자로 쓰지 않는다.

## Slice 8 계획

- `style.css`: `.trainer-quest-menu` 자체 폭을 제한하고 왼쪽 정렬한다.
- `style.css`: `.trainer-quest-choice` 높이와 padding을 줄여 좌측 하단 게임 메뉴 같은 슬림한 선택지로 만든다.
- `tests/trainer-quest-modal.test.js`: 메뉴 폭 제한, 왼쪽 margin, 축소된 선택지 높이/padding, cache marker를 회귀 테스트한다.
- `sw.js`: `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 cache version을 bump한다.

## Slice 8 구현 기록

- `style.css`: `.trainer-quest-menu`에 `width: min(360px, 72vw)`와 `margin: 0 auto 0 8px`를 적용해 전체 폭이 아니라 좌측 일부 폭만 사용하게 했다.
- `style.css`: `.trainer-quest-choice`를 `min-height: 40px`, `padding: 8px 12px`로 줄여 선택지 박스가 슬림하게 보이도록 했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z17-trainer-menu-left`로 bump했다.

## Slice 7-8 로컬 검증

- PASS: `node --check sw.js; node --test tests/trainer-quest-modal.test.js` — 6 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 583 tests passed
- PASS: `git diff --check`

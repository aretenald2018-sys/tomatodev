# 도트 라이프존 HTML 목업

## 요청

- 참고 이미지처럼 도트/아이소메트릭 느낌의 공간 이미지를 HTML mockup으로 만든다.
- 화면을 대략 3등분해 왼쪽은 운동존, 가운데는 식사존, 오른쪽은 업무존으로 구성한다.
- 운동존에는 벤치프레스, 랫풀다운, 스쿼트 머신이 보여야 한다.
- 식사존에는 아일랜드 테이블과 도시락/샐러드를 먹는 자리가 보여야 한다.
- 업무존에는 사무실 컴퓨터와 의자에 앉아 일하는 자리가 보여야 한다.
- 사용자가 바라보고 조작하는 카메라 각도와 정밀도는 첨부한 아이소메트릭 픽셀아트 이미지와 같아야 한다.

## 그릴 결과

- 핵심 질문: 실제 앱 화면에 넣을 컴포넌트인가, 독립 시안인가?
- 답변/결정: 사용자가 `HTML MOCKUP`을 요청했으므로 앱 코드가 아닌 `docs/` 아래 독립 HTML 시안으로 만든다.
- 남은 가정: 공간 방향은 왼쪽에서 오른쪽으로 `운동 -> 식사 -> 업무` 순서로 배치한다.

## 실행 범위

1. `docs/pixel-life-zone-mockup.html`을 새로 만든다.
2. 초기 시안은 인라인 CSS/SVG만 사용해 외부 의존성 없이 열리는 mockup으로 만든다.
3. 서비스워커 `STATIC_ASSETS`에 포함하지 않으므로 `sw.js` 캐시 버전은 변경하지 않는다.

## 제외 범위

- 실제 앱 라우팅, 탭, PWA 캐시, Firebase 데이터 흐름은 건드리지 않는다.
- `www/` 산출물은 수정하지 않는다.
- 초기 시안에서는 이미지 생성 도구로 별도 bitmap asset을 만들지 않는다. 단, 전문 픽셀아트 품질이 필요하다는 사용자 피드백이 있으면 생성 bitmap asset을 HTML에 연결한다.

## 검증 계획

- `git diff --check`
- 가능하면 로컬 dev server에서 `/docs/pixel-life-zone-mockup.html` HTTP 200을 확인한다.
- 이 세션에서 dev server를 시작하지 못하면 `not verified yet`으로 남기고, 사용자가 일반 터미널에서 실행할 명령을 제공한다.

## 실행 슬라이스

- Slice 1: 독립 HTML mockup 1개를 추가하고, 도트 공간 구성이 요청한 세 존과 핵심 오브젝트를 모두 포함하는지 리뷰한다. `completed`
- Slice 2: 기존 벡터풍 도트 목업을 2:1 아이소메트릭 저해상도 픽셀 캔버스 방식으로 재작성해, 레퍼런스와 같은 카메라 각도와 오브젝트 밀도를 맞춘다. `completed`
- Slice 3: 코드로 그린 픽셀풍 목업을 폐기하고, `imagegen`으로 전문 픽셀아트 원화 bitmap을 생성한 뒤 HTML에서 해당 PNG를 표시한다. `completed`

## Slice 2 보정 기준

- 화면은 낮은 내부 해상도 캔버스를 CSS로 확대하고 `image-rendering: pixelated`를 적용한다.
- 바닥은 2:1 다이아몬드 타일 격자로 깔아 아이소메트릭 카메라를 먼저 읽히게 한다.
- 큰 라벨/구획선은 줄이고, 레퍼런스처럼 벽 간판, 기구, 사람, 소품을 작은 픽셀 단위로 촘촘히 배치한다.
- 3등분은 시각적으로 `왼쪽 운동존`, `가운데 식사존`, `오른쪽 업무존`으로 읽히되 방 하나 안에 자연스럽게 통합한다.

## 실행 결과

- `docs/pixel-life-zone-mockup.html`을 추가했다.
- 왼쪽 1/3에는 벤치프레스, 랫풀다운, 스쿼트 머신을 배치했다.
- 가운데 1/3에는 아일랜드 식사대, 도시락, 샐러드, 식사하는 사람과 스툴을 배치했다.
- 오른쪽 1/3에는 컴퓨터 데스크, 모니터, 의자에 앉아 일하는 사람을 배치했다.
- `sw.js`의 `STATIC_ASSETS` 대상 파일을 수정하지 않아 `CACHE_VERSION`은 변경하지 않았다.
- Slice 2에서 큰 SVG 도형 기반 목업을 512x256 저해상도 `canvas` 기반 목업으로 교체했다.
- 바닥을 2:1 다이아몬드 타일로 깔고, CSS `image-rendering: pixelated`로 확대해 레퍼런스와 같은 카메라 각도를 우선했다.
- 큰 구획 라벨 대신 벽 간판, 작은 스프라이트, 소품, 기구를 촘촘하게 배치해 레퍼런스에 가까운 밀도로 보정했다.
- Slice 3에서 `imagegen` built-in tool로 Aseprite 스타일의 완성 픽셀아트 bitmap을 생성했다.
- 생성 원본은 `C:\Users\USER\.codex\generated_images\019ef32c-cfaa-7ac3-9370-5bc75842e3f6\ig_04835a630e0285e5016a3a2d9d06808191be4653fd59997e68.png`에 두고, 프로젝트용 사본을 `docs/assets/pixel-life-zone-aseprite-style.png`로 복사했다.
- `docs/pixel-life-zone-mockup.html`은 캔버스 드로잉 대신 생성 PNG를 `img`로 표시한다.

## 검증 결과

- PASS: `git diff --check` (core.autocrlf의 CRLF 변환 경고만 출력)
- PASS: `rg`로 `벤치프레스`, `랫풀다운`, `스쿼트 머신`, `아일랜드`, `샐러드`, `컴퓨터 업무석`, `운동존`, `식사존`, `업무존` 포함 확인
- PASS: `node -e`로 HTML 내 inline script 1개 문법 확인
- PASS: `rg`로 `canvas`, `image-rendering: pixelated`, `drawBenchPress`, `drawLatPulldown`, `drawSquatMachine`, `drawLunchIsland`, `drawOffice` 포함 확인
- PASS: 생성 PNG를 `view_image`로 시각 확인했다.
- PASS: `docs/pixel-life-zone-mockup.html`에서 `./assets/pixel-life-zone-aseprite-style.png` 참조 확인
- not verified yet: 5500/5501에 응답 중인 로컬 dev server가 없어 HTTP 200 검증은 수행하지 못했다.
- not verified yet: in-app browser에서 현재 `file://` 탭 제목은 새 제목으로 확인했지만, reload/evaluate/screenshot은 URL 정책상 차단되어 실제 브라우저 시각 검증은 수행하지 못했다.

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-06-23-pixel-life-zone-mockup.md`의 Slice 1을 실행하고 리뷰한다.

# 도트 라이프존 HTML 목업 리뷰

## 변경 파일

- `docs/pixel-life-zone-mockup.html`
- `docs/assets/pixel-life-zone-aseprite-style.png`
- `docs/ai/features/2026-06-23-pixel-life-zone-mockup.md`
- `docs/ai/NEXT_ACTION.md`

## 리뷰 결과

- 문제 없음.
- 독립 HTML 목업으로 추가되어 앱 라우팅, Firebase, PWA 캐시, `www/` 산출물에 영향이 없다.
- Slice 2에서 기존 벡터풍 도트 목업을 512x256 내부 해상도의 `canvas` 기반 픽셀 목업으로 재작성했다.
- CSS `image-rendering: pixelated`와 2:1 다이아몬드 타일 바닥을 사용해 첨부 레퍼런스와 같은 아이소메트릭 카메라 각도를 우선했다.
- Slice 3에서 코드 드로잉 방식의 품질 한계를 인정하고, `imagegen` built-in tool로 전문 픽셀아트 원화 bitmap을 생성해 HTML에서 표시하도록 바꿨다.
- 화면은 왼쪽 `운동존`, 가운데 `식사존`, 오른쪽 `업무존`으로 읽히되, 큰 구획선 대신 벽 간판/소품/가구 배치로 방 하나처럼 통합되어 있다.
- 운동존에는 `벤치프레스`, `랫풀다운`, `스쿼트 머신`이 모두 포함되어 있다.
- 식사존에는 `아일랜드 식사대`, `도시락`, `샐러드`, 식사하는 사람과 스툴이 포함되어 있다.
- 업무존에는 컴퓨터 데스크, 모니터, 의자에 앉아 일하는 사람이 포함되어 있다.
- 생성 bitmap은 `docs/assets/pixel-life-zone-aseprite-style.png`에 저장했고, HTML은 `./assets/pixel-life-zone-aseprite-style.png`를 참조한다.
- `sw.js` `STATIC_ASSETS`에 포함된 파일을 수정하지 않았으므로 캐시 버전 범프는 필요 없다.

## 검증

1. PASS: `git diff --check` — core.autocrlf의 CRLF 변환 경고만 출력.
2. PASS: `node -e`로 HTML 내 inline script 1개 문법 확인.
3. PASS: `rg`로 `canvas`, `image-rendering: pixelated`, 핵심 오브젝트, 주요 draw 함수 포함 확인.
4. PASS: 생성 PNG를 `view_image`로 시각 확인했다.
5. PASS: `docs/pixel-life-zone-mockup.html`에서 `./assets/pixel-life-zone-aseprite-style.png` 참조 확인.
6. PARTIAL: in-app browser의 현재 탭 제목이 `아이소메트릭 픽셀 라이프존 목업`으로 확인되었다.
7. not verified yet: in-app browser의 `file://` reload/evaluate/screenshot이 URL 정책상 차단되어 실제 브라우저 시각 검증은 수행하지 못했다.
8. not verified yet: 이 세션 지침상 장기 dev server를 시작하지 않았으므로 `/docs/pixel-life-zone-mockup.html` HTTP 200 검증은 수행하지 못했다.

## 로컬 확인 방법

- 일반 터미널에서 `npm.cmd run dev`를 실행한다.
- dev server가 출력한 주소에서 `/docs/pixel-life-zone-mockup.html` 경로를 연다.
- 기대 상태: HTTP 200, 전문 픽셀아트 원화처럼 보이는 2:1 아이소메트릭 방 하나가 왼쪽 운동존/가운데 식사존/오른쪽 업무존으로 보이고 각 존의 핵심 오브젝트가 보인다.

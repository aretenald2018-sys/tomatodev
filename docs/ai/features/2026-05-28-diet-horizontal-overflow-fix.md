# 식단 탭 가로 밀림 오류 수정 계획

## 요청

- Discord 요청: `devreq_discord_1509437096316637225`
- 사용자 메시지: `아까 말한 토마토 화면 오류 수정해줘`
- 이전 첨부 스크린샷 증상: 식단 탭에서 본문이 왼쪽으로 밀리고 오른쪽에 빈 회색 영역이 생김.

## 진단

스크린샷에서는 상단/하단 fixed 네비게이션은 정상 위치인데 본문만 왼쪽으로 밀려 있다. 이는 탭 전환 상태 자체보다 본문 안의 긴 콘텐츠가 문서 전체 가로 스크롤을 만들고, 모바일에서 그 스크롤 위치가 오른쪽으로 이동한 상태와 일치한다.

우선순위 가설:

1. 식단 탭의 음식 칩(`.meal-food-chip`) 안 긴 음식명/그램 텍스트가 flex min-content 폭을 줄이지 못해 가로 오버플로를 만든다.
2. `html/body`에 전역 `overflow-x: hidden` 방어가 없어 패널 내부 오버플로가 문서 전체 가로 스크롤로 드러난다.
3. 모바일 스와이프 탭 전환 중 `touchcancel`이 발생하면 임시 transform이 남아 유사한 밀림을 만들 수 있다.

## 실행 슬라이스

### Slice 1: 식단 탭 가로 오버플로 방어

수정 범위:

- `styles/components.css`
- `style.css`
- `navigation.js`
- `sw.js`

구현:

- 문서 전체와 탭 패널이 가로 스크롤 위치를 만들지 않도록 `overflow-x` 방어를 추가한다.
- 식단 음식 칩과 이름 영역이 컨테이너 안에서 줄어들고 말줄임 처리되도록 `min-width: 0`, `max-width: 100%`, `text-overflow`를 추가한다.
- 모바일 스와이프 취소 시 임시 패널 스타일을 정리한다.
- `STATIC_ASSETS`에 포함된 파일 변경이므로 `sw.js` `CACHE_VERSION`을 범프한다.

제외:

- 식단 UX 구조 변경, 버튼 재배치, 데이터 저장 로직 변경은 하지 않는다.

## 검증

- `node --check navigation.js`
- `npm.cmd test`
- Puppeteer로 실제 CSS를 로드한 모바일 폭 레이아웃에서 긴 음식 칩을 주입하고 `document.documentElement.scrollWidth <= window.innerWidth` 확인
- 로컬 UI 검증은 사용자 터미널에서 `npm.cmd run dev` 실행 후 식단 탭에서 긴 음식명이 있는 끼니를 열어 본문이 좌우로 밀리지 않는지 확인

## 실행 결과

- `styles/components.css`: `html/body`와 `.tab-panel`에 가로 스크롤 방어를 추가했다.
- `style.css`: 식단 음식 칩과 이름 영역이 모바일 폭 안에서 줄어들고 말줄임 되도록 수정했다.
- `navigation.js`: 모바일 스와이프 `touchcancel` 시 임시 패널 스타일을 정리하도록 보강했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260528z3-diet-overflow-fix`로 범프했다.

## 검증 결과

- PASS: `node --check navigation.js`
- PASS: `node --check sw.js`
- PASS: `node --test` with `rg --files tests | *.test.js` 목록, 371개 통과
- PASS: Puppeteer 모바일 폭 360px에서 긴 음식 칩 주입 후 `documentElement.scrollWidth=360`, `body.scrollWidth=360`
- 참고: `node --test tests`는 현재 Node가 디렉터리 인자를 테스트 묶음으로 확장하지 못해 실패했고, 파일 목록 전달 방식으로 대체했다.

## 상태

- Slice 1: reviewed

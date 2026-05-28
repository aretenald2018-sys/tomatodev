# 모바일 세로 드래그 스크롤 복구 계획

## 요청

- Discord `devreq_discord_1509525199475703899`
- 요청자: 피노
- 증상: 모바일 환경에서 하단으로 드래그가 안됨

## 진단

최근 `fix(diet): prevent horizontal overflow`에서 문서 전체 가로 오버플로를 막기 위해 `html, body`에 `overflow-x: hidden`이 추가됐다. Chromium 모바일 프로브에서는 일반 세로 스크롤이 재현되지는 않았지만, iOS Safari/PWA 계열에서는 `body`가 overflow 컨테이너가 되면 세로 팬 제스처가 끊기거나 하단으로 밀리지 않는 회귀가 생길 수 있다.

반증 가능한 가설:

1. `body`의 `overflow-x: hidden`이 모바일 브라우저에서 세로 스크롤 컨테이너 계산을 흔든다.
2. `.tab-panel`의 가로 오버플로 방어는 필요하지만, 세로 스크롤까지 막을 이유는 없다.
3. 탭 스와이프 JS는 세로 이동이 우세하면 추적을 중단하고 `preventDefault()`를 호출하지 않으므로 1차 원인은 CSS overflow일 가능성이 높다.
4. `body.wt-modal-scroll-lock`은 모달 전용 상태라, 모달이 열린 상태가 아니라면 본문 스크롤 문제의 1차 원인이 아니다.

## 결정

- 가로 오버플로 방어는 유지한다.
- `body`는 세로 스크롤 가능한 루트로 명시한다.
- 지원 브라우저에서는 `overflow-x: clip`을 사용해 가로 스크롤바를 만들지 않고, 미지원 환경은 기존 `hidden` 방어를 유지한다.
- `.tab-panel`도 세로 스크롤을 막지 않도록 `overflow-y: visible`을 명시한다.
- `styles/components.css`는 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js`의 `CACHE_VERSION`을 함께 올린다.

## 실행 슬라이스

### Slice 1: 모바일 루트 스크롤 CSS 보정

수정 대상:

- `styles/components.css`
- `sw.js`
- `docs/ai/NEXT_ACTION.md`

포함:

- `body`에 `overflow-y: auto`와 `-webkit-overflow-scrolling: touch` 추가
- `@supports (overflow: clip)`에서 `html/body/.tab-panel`의 가로 overflow를 `clip`으로 전환
- `.tab-panel`에 `overflow-y: visible` 명시
- `CACHE_VERSION` 범프

제외:

- 탭 스와이프 구조 변경
- 운동 세트/퀘스트/탭 순서 드래그 기능 변경
- 식단 가로 오버플로 말줄임 규칙 변경

검증:

- 모바일 뷰포트에서 긴 콘텐츠를 주입한 뒤 터치 드래그로 `window.scrollY`가 증가하는지 확인
- 모바일 뷰포트에서 `documentElement.scrollWidth <= innerWidth` 유지 확인
- `node --check`가 필요한 JS 변경은 없음
- 배포 후 `https://aretenald2018-sys.github.io/tomatofarm/`에서 `sw.js`의 새 `CACHE_VERSION` 확인

## 실행 결과

- `styles/components.css`: `body`의 세로 스크롤을 명시하고, 세로 overscroll 잠금을 풀었다. `.tab-panel`은 세로 overflow를 visible로 유지한다.
- `styles/components.css`: 지원 브라우저에서 `html/body/.tab-panel`의 가로 overflow를 `clip`으로 전환하는 방어를 추가했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260528z5-mobile-scroll-fix`로 올렸다.

검증 결과:

- PASS: Puppeteer 모바일 CSS 프로브에서 터치 드래그 후 `window.scrollY`가 `0 -> 507`로 증가했다.
- PASS: 같은 프로브에서 `documentElement.scrollWidth=398`, `innerWidth=398`으로 가로 오버플로가 생기지 않았다.
- PASS: `git diff --check`
- BLOCKED: `node scripts/verify-runtime-assets.mjs`는 기존 미추적 mockup 참조(`mockups/trio-renewal/shared.css`) 때문에 실패했다. 이번 변경 파일과 직접 관련 없음.

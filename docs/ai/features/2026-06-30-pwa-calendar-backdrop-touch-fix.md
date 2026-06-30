# PWA Calendar Backdrop Touch Fix

## 배경

- 요청: 운영 PWA에서 운동 캘린더 드래그가 여전히 되지 않고, 바텀시트 영역에서 손가락을 움직일 때만 동작한다.
- 직전 배포 상태: 운영 URL에는 `tomatofarm-v20260630z14-sw-auto-update`, `data-wt-calendar-scroll-surface`, `.cal-workout-surface-home { touch-action: pan-y; }`가 반영되어 있다.
- 추가 진단: PWA 전용 JS 분기는 설치 배너/서비스워커 등록에 가깝고 캘린더 터치를 직접 막지 않는다. 대신 운동 캘린더 하단 시트의 투명 fixed backdrop이 bar 상태에서도 DOM에 남아 있으며 기본 CSS가 `touch-action: none`이다.

## 가설

Android Chrome 일반 브라우저에서는 `pointer-events: none`인 투명 fixed backdrop이 터치 대상에서 사실상 빠질 수 있지만, standalone PWA/WebView에서는 fixed 레이어와 `touch-action: none`이 gesture negotiation에 남아 배경 캘린더의 세로 pan을 방해할 수 있다.

## Slice 1

1. `render-calendar.js`에서 bottom sheet backdrop을 full 상태에서만 활성화한다.
2. bar 상태 backdrop은 `hidden` 속성으로 DOM 상호작용과 접근성 트리에서 제외한다.
3. `style.css`에서 backdrop 기본 상태를 `display: none`, `touch-action: auto`, `overscroll-behavior: auto`로 바꾸고, full 상태에서만 `display: block`, `pointer-events: auto`, `touch-action: none`을 적용한다.
4. 기존 full sheet 배경 입력 차단은 유지한다.
5. `tests/workout-calendar-bottom-sheet.test.js`에 bar backdrop 비활성/hidden 계약을 추가한다.
6. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z15-pwa-backdrop-touch`로 bump하고 cache marker 테스트 기대값을 갱신한다.

## 제외 범위

- 바텀시트 drag/snap 기능 재도입
- 캘린더 날짜 선택 정책 변경
- 전역 workout pull-back gesture 제거
- `manifest.json` display mode 변경
- `www/` 직접 수정

## 검증

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node --test tests/workout-calendar-bottom-sheet.test.js tests/pwa-update-auto-reload.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `git diff --check`
6. `node --test --test-reporter=dot tests/*.test.js`
7. 운영계 push 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
8. 운영 URL 직접 marker 확인: `sw.js` cache version, `render-calendar.js` backdrop `hidden`, `style.css` backdrop full-only touch-action


# Tomato Farm 운영계 추가 배포 기록

## 요청

Dashboard3에 반영된 현재 상태를 운영계 `tomatofarm`에도 배포한다.

## 배포 대상

- 원격: `tomatofarm`
- 브랜치: `main`
- URL: `https://aretenald2018-sys.github.io/tomatofarm/`
- 배포 기준 커밋: `c34da15cf5d2`
- 포함된 최근 변경:
  - 운동 숫자 입력 키보드 UX 개선
  - 운동 캘린더 월간 영역 터치 스크롤 개선
  - 미란다/상담실장 전구 표시 숨김

## 확인한 사항

- `tomatofarm/main`은 현재 HEAD의 조상이라 운영계 전용 미반영 커밋을 덮어쓰지 않는 fast-forward push였다.
- `git push tomatofarm HEAD:main`으로 `4b8c004..c34da15` 범위를 운영계에 반영했다.

## 검증

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ c34da15`
  - 결과: `c34da15cf5d2`, `tomatofarm-v20260630z03-home-npc-bulb-hide`, `static=234`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ ...`
  - `sw.js::tomatofarm-v20260630z03-home-npc-bulb-hide`
  - `style.css::.lz-miranda-npc .lz-npc-bulb,`
  - `style.css::.lz-consulting-chief-npc .lz-npc-bulb`
  - `style.css::display: none`
  - `app.js::[data-wt-calendar-scroll-surface]`
  - `workout/exercises.js::WORKOUT_NUMBER_INPUT_SELECTOR`
- not verified yet: 인증 계정 실제 UI에서 숫자 입력 키보드, 캘린더 터치 스크롤, 홈 라이프존 미란다/상담실장 전구 미표시를 직접 시각 확인하는 flow는 남아 있다.

## 결정

- 운영계 `tomatofarm` 배포는 완료됐다.

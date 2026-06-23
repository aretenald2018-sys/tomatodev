# 운동탭 날짜 상세 Slice 3 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-23-workout-tab-calendar-home.md`
- 실행 범위: Slice 3 — 날짜 상세 화면
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `workout/sessions.js`
  - `sw.js`

## 결론

치명적 문제는 발견하지 못했다. 운동탭 홈에서 날짜를 누르면 기존 캘린더 모달 대신 운동탭 root 안의 날짜 상세 화면으로 전환된다.

## 확인한 내용

- 기존 캘린더 탭의 `_openWorkoutDay()` 모달 경로는 유지된다.
- 운동탭 홈 전용 `_openWorkoutHomeDay()`는 상세 view state로 전환한다.
- 기록 있는 날은 날짜 헤더, `자유 운동`, 시간/세트/볼륨 요약, 접기/펼치기 운동 카드, 회차 탭, 편집 버튼, `+` 버튼을 렌더한다.
- 기록 없는 날은 회차 라벨, 빈 상태, 안내 문구, 회차 탭, `+` 버튼을 렌더한다.
- 기존 top-level 날짜 기록은 `workout/sessions.js`의 호환 helper로 `1회차`처럼 읽는다.
- 삭제/내보내기/종목 삭제는 Slice 5에서 실제 액션으로 연결될 placeholder로 분리했다.
- `workout/sessions.js`가 신규 런타임 import가 되었으므로 `sw.js` `STATIC_ASSETS`에 등록하고 `CACHE_VERSION`을 bump했다.

## 검증

- `node --check render-calendar.js`
- `node --check workout/sessions.js`
- `node --check sw.js`
- `git diff --check`
- 결과: 통과. CRLF 변환 경고만 출력됨.

## not verified yet

브라우저 클릭/시각 플로우는 not verified yet이다. 날짜 클릭 후 상세 화면 전환, 카드 접기/펼치기, 빈 상태 레이아웃은 브라우저에서 수동 확인이 필요하다.

## 잔여 리스크

- `node scripts/verify-runtime-assets.mjs`는 현재 untracked 파일을 실패로 보고한다. 이번 Slice 3에서 추가한 `workout/sessions.js`도 커밋 전까지 이 목록에 포함된다.
- 실제 회차별 저장/삭제/내보내기/루틴 연결은 다음 Slice 4~5 범위다.

# 운동탭 캘린더 디자인 Slice 2 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-23-workout-tab-calendar-home.md`
- 실행 범위: Slice 2 — 캘린더 디자인 재작업
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `docs/ai/features/2026-06-23-workout-tab-calendar-home.md`
  - `docs/ai/NEXT_ACTION.md`

## 결론

치명적 문제는 발견하지 못했다. 운동탭 홈 캘린더는 기존 7열 카드 그리드에서 주 단위 행, 좌측 주차 레일, 얇은 셀 라인, 작은 운동 라벨 막대, 하단 선택 날짜 바 구조로 전환되었다.

## 확인한 내용

- `render-calendar.js`는 `surface === 'workout-home'`일 때만 새 월간 그리드를 사용한다. 캘린더 탭의 기존 운동 모드는 기존 flat grid 렌더를 유지한다.
- 주차 레일은 ISO 주차, 해당 주의 운동 시간, 해당 주의 세트 수를 계산해 표시한다.
- 선택 날짜가 현재 월 밖이면 오늘 또는 해당 월 1일로 보정된다.
- 날짜 클릭은 선택 상태를 갱신하고 기존 운동 요약 모달을 연다. 전체 날짜 상세 화면은 계획상 Slice 3 범위로 남아 있다.
- `루틴` 버튼은 잘못된 상세 모달 연결 대신 placeholder handler로 분리되어 Slice 5에서 실제 루틴 액션으로 교체할 수 있다.
- `style.css`는 운동탭 홈 전용 selector로 얇은 그리드와 하단 선택 바를 덮어써서, 캘린더 탭의 일반 점수 캘린더 스타일을 직접 변경하지 않는다.
- `style.css`, `render-calendar.js`는 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`이 bump되었다.

## 검증

- `node --check render-calendar.js`
- `node --check sw.js`
- `git diff --check`
- `npm.cmd run dev`
- `GET http://localhost:5500/index.html`
- 결과: 정적 검증은 모두 통과. dev server는 기존 healthy 서버 `http://localhost:5500`을 재사용했고 HTTP 200을 반환했다. CRLF 변환 경고만 출력됨.

## not verified yet

브라우저 UI 클릭/시각 플로우는 not verified yet이다. 현재 노출된 도구에 브라우저 클릭/스크린샷 제어가 없고 repo에도 Playwright가 없어, 하단 `운동` 탭, 월 이동, 오늘 이동, 날짜 선택, 360px/768px 폭에서의 텍스트 겹침 여부는 수동 확인이 필요하다.

## 잔여 리스크

- `node scripts/verify-runtime-assets.mjs`는 기존 untracked runtime assets가 `sw.js`에 참조되어 실패한다. 이번 Slice 2의 새 파일 누락은 아니다.
- 두 번째 참고 이미지의 상단 앱바 아이콘 구성은 이번 범위가 아니며, 현재는 기존 월 이동/오늘 버튼 구조를 유지한다.
- 세 번째/네 번째 참고 이미지의 날짜 상세 화면과 회차 저장 모델은 각각 Slice 3, Slice 4 범위로 남아 있다.

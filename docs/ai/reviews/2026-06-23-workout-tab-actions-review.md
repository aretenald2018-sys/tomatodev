# 운동탭 캘린더 홈 Slice 5 리뷰

## 범위

- 계획 문서: `docs/ai/features/2026-06-23-workout-tab-calendar-home.md`
- 실행 슬라이스: Slice 5 — 내보내기/루틴 액션 정리
- 리뷰 대상:
  - `render-calendar.js`
  - `data/data-load.js`
  - `data/data-pure.js`
  - `workout/save.js`
  - `tests/data.load-save.test.js`
  - `sw.js`

## 결론

- 차단 이슈 없음.
- 날짜 상세의 placeholder 액션은 실제 동작으로 연결됐다.
- 회차 삭제/운동 삭제/활동 삭제는 `workoutSessions`와 top-level 집계를 함께 갱신하며, `saveDay(..., { mode: 'merge' })`를 사용해 식단/사진 필드를 보존한다.
- 삭제 저장 시 기존 운동 저장 경로와 같이 끼니 성공 플래그도 재계산하도록 보강했다.
- 편집 화면에서도 기존 일반/프로/테스트/성장보드 진입 카드는 기본 숨김 처리되어, 운동탭 첫 경험이 예전 모드 선택으로 돌아가지 않는다.

## 확인한 사항

1. `render-calendar.js`
   - `내보내기`는 선택 회차를 텍스트로 구성하고 Web Share API 또는 clipboard fallback으로 처리한다.
   - `삭제`는 선택 회차만 제거하고, 마지막 회차 삭제 시 빈 `1회차`와 빈 top-level 운동 집계를 남긴다.
   - 운동 카드 삭제는 렌더링된 필터 인덱스가 아니라 원본 `session.exercises` 인덱스를 사용한다.
   - 활동 카드 삭제는 `running/swimming/cf/stretching/timer`별 필드를 명시적으로 초기화한다.
   - `+`는 첫 빈 회차를 우선 열고, 없으면 다음 회차를 연다.
   - `루틴`은 선택 날짜/회차를 편집 상태로 로드한 뒤 기존 루틴 추천 진입점으로 연결한다.

2. 데이터 호환
   - `data/data-load.js`의 트윈 계정 병합 필드에 `workoutSessions`가 포함됐다.
   - `data/data-pure.js`는 top-level 집계가 없는 `workoutSessions` 전용 문서도 활성 기록으로 판정한다.
   - `workout/save.js`는 회차 저장 시 날짜 파싱을 명시적으로 처리한다.

3. 캐시
   - `sw.js`의 `STATIC_ASSETS` 대상 변경이 있었고 `CACHE_VERSION`이 `tomatofarm-v20260623-workout-calendar-actions`로 bump됐다.

## 검증

- PASS: `node --check app.js`
- PASS: `node --check render-calendar.js`
- PASS: `node --check workout/load.js`
- PASS: `node --check workout/save.js`
- PASS: `node --check workout/save-schema.js`
- PASS: `node --check workout/state.js`
- PASS: `node --check workout/sessions.js`
- PASS: `node --check data/data-load.js`
- PASS: `node --check data/data-pure.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/save-schema.test.js tests/workout-sessions.test.js tests/data.load-save.test.js`
- PASS: `git diff --check`
- PASS: `npm.cmd run dev` — 기존 healthy 서버 `http://localhost:5500` 재사용
- PASS: `GET http://localhost:5500/index.html` — HTTP 200, `workout-calendar-root` 포함
- PASS: 브라우저에서 하단 `운동` 탭 클릭 시 운동 캘린더 홈, 월간 그리드, 주차 레일, 하단 선택 날짜 바 표시 확인
- PASS: 기록 없는 날짜 상세에서 빈 상태, 회차 탭, `+` 버튼 표시 확인
- PASS: `+` 클릭 후 편집 화면에서 기존 모드 선택 카드가 숨김 처리됨 확인
- BLOCKED: `node scripts/verify-runtime-assets.mjs`
  - 기존 untracked runtime assets와 신규 `workout/sessions.js`가 커밋 전 상태라 실패한다.
- not verified yet: 현재 로그인 데이터에 최근 6개월 운동 기록이 없어 기록 있음 상세 카드/삭제/내보내기 실클릭은 확인하지 못했다.

## 남은 수동 확인

1. 하단 `운동` 탭 진입 시 월간 운동 캘린더가 첫 화면인지 확인한다.
2. 운동 기록이 있는 날짜 데이터로 세 번째 참고 이미지 형태의 날짜 상세가 보이는지 확인한다.
3. 상세 화면에서 `내보내기`, `루틴`, `삭제`, 운동 카드 삭제, 활동 카드 삭제가 예상대로 동작하는지 확인한다.

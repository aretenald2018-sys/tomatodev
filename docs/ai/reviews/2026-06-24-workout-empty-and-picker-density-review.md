# 빈 운동 화면 및 피커 목록 밀도 조정 리뷰

## 대상

- 계획: `docs/ai/features/2026-06-24-workout-empty-and-picker-density.md`
- 구현 커밋: `28a718cc59c2dc3c5985cb6f4aba28321dcb63e0`
- 배포 URL: `https://aretenald2018-sys.github.io/dashboard3/`

## 변경 파일

- `render-calendar.js`
- `workout/exercises.js`
- `style.css`
- `sw.js`
- `tests/workout-empty-picker-density.test.js`
- `tests/workout-test-mode-unified.test.js`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/features/2026-06-24-workout-empty-and-picker-density.md`

## 리뷰 결과

- 빈 운동 상세 화면의 floating `.wt-day-fab` DOM을 제거하고, `+`를 `.wt-day-sessionbar` 내부 `.wt-day-add-inline` 버튼으로 넣었다.
- 빈 화면 안내 문구는 새 위치에 맞게 `하단 + 버튼으로 추가해보세요`로 바꿨다.
- 덤벨 아이콘, 안내문, 보조 설명, session bar padding/gap/font-size를 줄여 한 화면 밀도를 높였다.
- 피커의 `오늘 벤치마크 ... + 같은 부위 추가 종목 ...` 안내 배너는 렌더하지 않도록 막았다.
- 운동명은 `white-space: normal`, `overflow: visible`, `text-overflow: clip`으로 바꿔 `...` 처리 없이 전체 표시되게 했다.
- 긴 운동명 공간 확보를 위해 피커 이름 폰트, 기록 메타, 우측 badge/action, 부위 이미지와 thumbnail 크기를 줄였다.
- `style.css` 변경에 대한 전용 `tds-reviewer` sub-agent는 현재 도구 정책상 사용자가 직접 sub-agent 위임을 요청하지 않아 실행하지 못했다. 대신 CSS/DOM 계약 테스트와 전체 테스트를 통과시켰다.

## 검증

- `node --check render-calendar.js`
- `node --check workout/exercises.js`
- `node --test tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js tests/workout-test-mode-unified.test.js`
  - 11개 통과
- `node --test tests/*.test.js`
  - 471개 통과
- `npm.cmd run verify:assets`
  - `[runtime-assets] ok refs=814`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 28a718cc59c2dc3c5985cb6f4aba28321dcb63e0`
  - `[deploy-verify] ok 28a718cc59c2 tomatofarm-v20260624z23-empty-picker-density static=210`
- 배포 파일 직접 확인
  - `sw.js` HTTP 200, `tomatofarm-v20260624z23-empty-picker-density` 포함
  - `render-calendar.js` HTTP 200, `wt-day-add-inline` 포함 및 `wt-day-fab` 미포함
  - `workout/exercises.js` HTTP 200, `_renderPickerBenchmarkScope`가 빈 문자열 반환 및 벤치마크 안내 문구 미포함
  - `style.css` HTTP 200, inline add/운동명 full display/compact thumbnail 마커 포함 및 `.wt-day-fab` 미포함

## 잔여 리스크

- 실제 로그인 계정의 모바일 브라우저에서 빈 운동 화면과 피커를 직접 조작하는 검증은 인증 데이터가 필요해 진행하지 않았다. 배포 소스와 테스트 계약은 해당 UI 렌더 경로를 검증한다.

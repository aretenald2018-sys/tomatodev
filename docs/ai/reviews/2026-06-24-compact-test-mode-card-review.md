# 테스트모드 운동 카드 압축 리뷰

## 대상

- 계획: `docs/ai/features/2026-06-24-compact-test-mode-card.md`
- 구현 커밋: `0807859934cc0d8b3ab534c653902a0752d8d073`
- 배포 URL: `https://aretenald2018-sys.github.io/dashboard3/`

## 변경 파일

- `workout/exercises.js`
- `style.css`
- `sw.js`
- `tests/workout-card-layout-css.test.js`
- `tests/workout-test-mode-unified.test.js`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/features/2026-06-24-compact-test-mode-card.md`

## 리뷰 결과

- 직전 볼륨 요약은 `직전 {트랙} {날짜} · {세트 요약}` 단일 행으로 바뀌었고, 긴 내용은 가로 스크롤/툴팁으로 보존된다.
- 테스트모드 세트 행은 KG/REP/RIR/ROM%/완료/삭제/드래그를 한 줄 그리드로 렌더한다.
- 카드 padding, gap, 계획 영역, 그래프, 세트 행, 액션 버튼 높이가 compact 값으로 축소됐다.
- `set-rom-range` 슬라이더 의존은 제거됐고 `set-rom-input` 이벤트로 ROM 저장 기능을 유지한다.
- `style.css` 변경에 대한 전용 `tds-reviewer` sub-agent는 현재 도구 정책상 사용자가 직접 sub-agent 위임을 요청하지 않아 실행하지 못했다. 대신 CSS 계약 테스트와 전체 테스트를 통과시켰다.

## 검증

- `node --check workout/exercises.js`
- `node --test tests/workout-card-layout-css.test.js tests/workout-test-mode-unified.test.js tests/calc.max.test.js`
  - 65개 통과
- `node --test tests/*.test.js`
  - 468개 통과
- `npm.cmd run verify:assets`
  - `[runtime-assets] ok refs=814`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0807859934cc0d8b3ab534c653902a0752d8d073`
  - `[deploy-verify] ok 0807859934cc tomatofarm-v20260624z21-compact-test-card static=210`
- 배포 파일 직접 확인
  - `sw.js` HTTP 200, `tomatofarm-v20260624z21-compact-test-card` 포함
  - `workout/exercises.js` HTTP 200, `ex-max-v2-last-text`, `ex-max-v2-rom-field`, `set-rom-input` 포함
  - `style.css` HTTP 200, compact row grid 및 single-row last volume 스타일 포함

## 잔여 리스크

- 실제 사용자 계정의 운동 탭에서 종목 추가 후 카드가 모바일 화면에서 체감 60% 높이인지까지는 로그인 데이터가 필요해 직접 클릭 검증하지 않았다. 배포 파일과 테스트 계약은 해당 UI가 렌더될 소스 경로를 검증한다.

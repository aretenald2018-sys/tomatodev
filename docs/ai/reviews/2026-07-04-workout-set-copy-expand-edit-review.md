# 운동 세트 복사 추가와 우측 펼침 편집 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-04-workout-set-copy-expand-edit.md`
- 실행 슬라이스: Slice 1 `세트 복사 추가와 우측 펼침 편집`
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `tests/*` cache marker assertion 파일
  - `docs/ai/NEXT_ACTION.md`

## 결과

- 판정: PASS
- 범위: 계획된 Slice 1 안에서 구현됨
- 남은 제약: 인증 세션이 없어 운영 URL의 실제 운동 카드 내부 클릭 flow는 자동 브라우저로 끝까지 행사하지 못할 수 있다. 이 경우 최종 handoff에 `not verified yet`과 blocker를 명시한다.

## 계획 대비 확인

1. PASS: `+` 행은 직전 세트의 사용자 입력값 `kg`, `reps`, `rir`, `romPct`, `setType`을 복사한다.
2. PASS: `done`, `completedAt`, `exerciseCompletedAt`, Wendler/프로그램 처방 meta는 새 수동 세트에 복사하지 않는다.
3. PASS: 세트 행은 기본 요약형으로 렌더되고, 우측 `toggle-set-editor` action으로 해당 행의 편집 패널만 열린다.
4. PASS: 새 펼침 버튼은 `aria-expanded`와 한국어 `aria-label`을 가진다.
5. PASS: 기존 완료 토글, 삭제, 종목 완료 marker, 입력 focus 보존 경로를 유지했다.
6. PASS: `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260704z1-workout-set-copy-expand`로 bump했다.

## 검증

1. PASS: `node --check render-calendar.js && node --check sw.js && node --check tests/workout-calendar-bottom-sheet.test.js`
2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 31 pass
3. PASS: `node --test tests/workout-card-layout-css.test.js tests/workout-calendar-bottom-sheet.test.js` - 37 pass
4. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=879`
5. PASS: `git diff --check`
6. PASS: `node --test tests/*.test.js` - 693 pass

## 리뷰 메모

- `omo:visual-qa`와 `omo:review-work` 지침은 확인했다.
- 현재 subagent 도구는 사용자가 명시적으로 병렬 에이전트를 요청한 경우에만 spawn이 허용되어, review-work의 5-agent 병렬 리뷰와 visual QA의 2-oracle 리뷰는 실행하지 않았다.
- 사용자 제공 1~3번 참고 이미지는 픽셀 클론 대상이 아니라 UX 방향으로 적용했다. 이번 변경은 휴식 타이머, 광고, 상단 운동 지표를 포함하지 않는다.
- 운영 Pages 배포 뒤에는 `verify:deploy`, deployed marker 검증, 로그인 화면 로드/console smoke를 별도로 수행한다.

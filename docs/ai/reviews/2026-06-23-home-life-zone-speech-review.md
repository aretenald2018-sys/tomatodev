# 홈 라이프존 actor 말풍선 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 실행 범위: Slice 6 — 라이프존 actor 말풍선
- 변경 파일:
  - `home/life-zone-state.js`
  - `home/life-zone.js`
  - `style.css`
  - `sw.js`
  - `tests/home-life-zone-state.test.js`
  - `docs/ai/features/2026-06-23-home-life-zone-card.md`

## 결론

치명적 문제는 발견하지 못했다. actor 상태별 말풍선 문구가 순수 로직으로 생성되고, 홈 라이프존 장면 위에 actor별 말풍선이 렌더링된다.

## 확인한 내용

- 운동 기록이 있으면 `MOVEMENTS`와 기록된 `muscleId/muscleIds/movementId`를 기준으로 대근육만 추린다.
- 대근육 label은 `가슴`, `등`, `하체`, `어깨` 중심으로 표출한다. `둔근`은 `하체`로 묶는다.
- `등/이두/복근`처럼 소근육/복근이 섞이면 `오늘 등 완료`로 표시된다.
- `가슴/등`이면 `오늘 가슴/등 완료`로 표시된다.
- 운동 대근육을 찾지 못했지만 운동 기록은 있으면 `오늘 운동 완료`로 fallback한다.
- 식단 기록은 아침, 점심, 저녁, 간식 순서 중 가장 뒤쪽에 기록된 식사를 기준으로 `아침냠냠`, `점심냠냠`, `저녁냠냠`, `간식냠냠`을 표시한다.
- 아무 기록이 없거나 읽을 수 없는 actor는 `다른 일 하는중`으로 표시된다.
- `home/life-zone.js`는 sprite와 별도로 `.lz-speech` div를 actor layer에 추가한다.
- `style.css`에는 말풍선 본문과 꼬리 스타일, 작은 화면용 크기 보정을 추가했다.
- `style.css`, `home/life-zone.js`, `home/life-zone-state.js`, `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 `tomatofarm-v20260623-life-zone-speech`로 bump했다.

## 검증

- `node --check .\home\life-zone-state.js`
- `node --check .\home\life-zone.js`
- `node --check .\home\tomato.js`
- `node --check .\home\hero.js`
- `node --check .\sw.js`
- `node --test .\tests\home-life-zone-state.test.js`
  - 결과: 7개 테스트 통과
- `python .\scripts\validate-life-zone-assets.py`
  - 결과: `validated base=1672x941, sprites=27`
- `STATIC_ASSETS` 파일 존재 검사
  - 결과: `static assets exist: 191`
- `git diff --check`
  - 결과: 통과. CRLF 변환 경고만 출력됨.

## not verified yet

브라우저 UI 플로우는 not verified yet이다. 정상 터미널에서 `npm.cmd run dev` 실행 후 홈탭 라이프존 카드에서 말풍선 위치와 겹침 여부를 확인해야 한다.

## 잔여 리스크

- 실제 홈 카드 폭에서 말풍선이 가구나 다른 actor를 가릴 수 있다. 필요하면 slot별 bubble offset을 `manifest.json`에 추가해 미세 조정한다.
- 운동 기록에 대근육 정보가 저장되지 않은 과거 데이터는 `오늘 운동 완료`로 fallback된다.

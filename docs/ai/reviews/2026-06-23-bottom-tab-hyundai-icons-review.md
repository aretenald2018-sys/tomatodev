# 하단 탭바 현대 아이콘 개편 리뷰

- 대상 계획: `docs/ai/features/2026-06-23-bottom-tab-hyundai-icons.md`
- 대상 Slice: Slice 1 — 하단 탭바 현대 아이콘 적용
- 리뷰 일자: 2026-06-23

## 리뷰 결과

치명적 문제는 발견하지 못했다.

- `index.html`의 홈/식단/운동/캘린더/더보기 탭바 이모지가 현대 SVG 기반 `nav-icon-*` 마크업으로 교체됐다.
- `app.js`에서 role 동기화 시 다시 주입되는 더보기/admin-only 버튼도 같은 마크업을 사용한다.
- `navigation.js`의 더보기 동적 탭과 탭 설정 모달도 이모지 문자열 대신 아이콘 span을 만든다.
- `styles/components.css`는 SVG mask와 `currentColor`를 사용하므로 비활성/활성 색상이 기존 토마토 primary 상태와 함께 동작한다.
- `more-menu-item tab-btn` 조합에서 탭바의 column flex가 섞이지 않도록 더보기 항목은 row 방향으로 고정했다.
- `sw.js` `CACHE_VERSION`을 bump했고 새 `assets/nav-icons/*.svg` 9개를 `STATIC_ASSETS`에 추가했다.

## 검증

- PASS: `node --check app.js`
- PASS: `node --check navigation.js`
- PASS: `node --check sw.js`
- PASS: `STATIC_ASSETS`의 `assets/nav-icons/*.svg` 9개 존재 확인
- PASS: `git diff --check`
- PASS: `npm.cmd run dev` — 기존 healthy 서버 `http://localhost:5500` 재사용
- PASS: HTTP 200 — `http://localhost:5500`
- PASS: 브라우저 DOM/시각 확인
  - 하단 탭바 홈/식단/운동/캘린더/더보기 아이콘 mask URL 계산 확인
  - 하단 탭바 텍스트에서 기존 탭 이모지 제거 확인
  - 홈/식단/운동/캘린더 좌표 클릭 시 각 버튼과 패널 active 전환 확인
  - 더보기 좌표 클릭 시 시트 display `flex` 확인
  - 더보기 시트 통계/요리/토마토어드민/탭 설정 항목의 아이콘 mask와 row 방향 확인
  - 탭 설정 모달의 식단/운동/통계 항목도 `nav-icon-*` 클래스로 렌더 확인

## 잔여 리스크

- 현대 아이콘 팩에 헬스/덤벨 전용 아이콘이 없어 운동 탭은 `ic_walking_regular_24px.svg`를 사용했다. 의미가 약하다고 느껴지면 같은 팩 안에서 `heart` 또는 `power` 계열로 교체할 수 있다.
- 하위 에이전트 `tds-reviewer` 위임은 현재 세션의 sub-agent 도구 정책상 사용자가 직접 요청한 경우에만 가능하므로 수행하지 못했고, 변경 diff와 브라우저 결과를 기준으로 수동 리뷰했다.

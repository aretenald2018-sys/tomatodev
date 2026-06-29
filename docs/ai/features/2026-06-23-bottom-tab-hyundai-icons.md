# 하단 탭바 현대 아이콘 개편 계획

## 요청

사용자가 캡처로 표시한 하단 탭바의 이모지 아이콘을 `C:\Users\USER\Desktop\hyundai design\Hyudnai_UI_Icon_Regular_v1.0.1\Hyudnai_UI Icon_Regular_v1.0.1` 안의 현대 UI 아이콘 에셋을 최대한 사용해 개편한다.

대상 UI:

- 하단 고정 탭바: 홈, 식단, 운동, 캘린더, 더보기
- 더보기 시트 안의 보조 탭/설정 항목
- 탭 설정이나 동적 탭 이동으로 더보기 시트에 들어간 항목

## 그릴 결과

- 핵심 질문: 이모지의 귀여운 톤을 유지할지, 현대 아이콘 팩 기준의 선형 UI 톤으로 정리할지?
- 답변/결정: 사용자가 "디자인 에셋을 최대한" 쓰고 싶다고 했으므로 현대 24px Regular SVG 중심의 선형 UI 톤으로 정리한다.
- 남은 가정: 운동 전용 덤벨/헬스 아이콘은 현대 팩에서 확인되지 않았으므로 `ic_walking_regular_24px.svg` 또는 `ic_heart_regular_24px.svg` 중 앱 맥락에 덜 어색한 후보를 사용한다. 실행 중 실제 시각 확인 후 더 나은 후보가 있으면 같은 현대 팩 안에서만 교체한다.

## 현재 구조 관찰

- `index.html`의 `#tab-nav`가 홈/식단/운동/캘린더/더보기 버튼을 직접 렌더한다.
- `app.js`의 `_syncNavigationForCurrentRole()`이 더보기 버튼과 admin-only 더보기 버튼 HTML을 이모지로 다시 주입한다.
- `navigation.js`의 `ALL_CONFIGURABLE_TABS`와 `applyVisibleTabs()`가 더보기 시트의 동적 탭을 이모지 텍스트로 만든다.
- 탭바 스타일은 `styles/components.css`의 `.bottom-tabs`, `.tab-btn`, `.tab-icon`, `.more-menu-item`에 있다.
- `index.html`, `app.js`, `navigation.js`, `styles/components.css`는 `sw.js`의 `STATIC_ASSETS`에 포함되어 있으므로 수정 시 `CACHE_VERSION` bump가 필요하다.

## 아이콘 후보

- 홈: `24/ic_home_regular_24px.svg`
- 식단: `24/ic_restaurant_regular_24px.svg`
- 운동: 1순위 `24/ic_walking_regular_24px.svg`, 대안 `24/ic_heart_regular_24px.svg`
- 캘린더: `24/ic_calendar_regular_24px.svg` 또는 `24/ic_schedule_regular_24px.svg`
- 더보기: `24/ic_more_horizontal_regular_24px.svg`
- 통계: `24/ic_analysis_regular_24px.svg` 또는 `24/ic_statement_regular_24px.svg`
- 요리: `24/ic_cafe_regular_24px.svg` 또는 `24/ic_restaurant_regular_24px.svg`
- 관리자: `24/ic_settings_regular_24px.svg` 또는 `24/ic_profile_regular_24px.svg`
- 탭 설정: `24/ic_settings_regular_24px.svg`

## 권장 구현 방향

- 현대 SVG 원본에서 필요한 파일만 앱 내부 `assets/nav-icons/`로 복사한다.
- 탭바/더보기 UI에서는 이모지 텍스트 대신 `span.tab-icon`에 `data-icon` 또는 modifier class를 주고 CSS로 SVG를 렌더한다.
- SVG 원본이 `stroke="#1F2023"`로 고정되어 있으므로 색상 상태를 안정적으로 맞추기 위해 다음 중 하나를 선택한다.
  - 권장: SVG를 CSS `mask`로 쓰고 `background-color: currentColor`로 비활성/활성 색상을 제어한다.
  - 대안: 복사본 SVG의 stroke를 `currentColor`로 바꿔 inline/object 없이도 색상 상속을 검토한다.
- 활성 탭은 현재 토마토 primary를 유지하되 이모지 색감 대신 선형 아이콘, 굵은 라벨, 얇은 상단/아이콘 주변 강조로 상태를 보이게 한다.
- 탭 높이 60px, 라벨 10px, safe-area padding은 유지해 기존 레이아웃을 흔들지 않는다.

## 구현 슬라이스

### Slice 1 — 하단 탭바 현대 아이콘 적용

- 상태: 2026-06-23 실행 및 리뷰 완료.
- 수정 대상:
  - `index.html`
  - `app.js`
  - `navigation.js`
  - `styles/components.css`
  - `sw.js`
  - `assets/nav-icons/*.svg`
- 할 일:
  1. 현대 아이콘 팩에서 필요한 24px SVG만 `assets/nav-icons/`로 복사한다.
  2. `index.html`의 하단 탭바 이모지를 아이콘 클래스/데이터 기반 마크업으로 교체한다.
  3. `app.js`의 더보기/admin-only 버튼 HTML도 같은 아이콘 마크업으로 맞춘다.
  4. `navigation.js`의 동적 더보기 항목 생성 로직을 텍스트 이모지에서 아이콘+라벨 DOM 생성으로 바꾼다.
  5. `styles/components.css`에서 `.tab-icon`과 `.more-menu-item` 아이콘 스타일을 SVG mask/currentColor 기반으로 정리한다.
  6. `STATIC_ASSETS` 변경 파일과 새 아이콘 파일을 반영하고 `CACHE_VERSION`을 bump한다.
- 제외 범위:
  - 홈/운동/식단/캘린더 각 탭 내부 UI 개편
  - 탭 순서/가시성 설정 기능 변경
  - 현대 아이콘 팩 전체 복사
  - `www/` 직접 수정
- 검증:
  - `npm.cmd run dev`
  - dev server URL에서 HTTP 200 확인
  - 홈, 식단, 운동, 캘린더, 더보기 탭을 각각 클릭해 아이콘/라벨/활성 색상/탭 전환 확인
  - 더보기 시트에서 통계, 요리, 탭 설정, admin-only 상태가 이모지 없이 아이콘+라벨로 표시되는지 확인
  - 모바일 폭에서 라벨 줄바꿈/겹침이 없는지 확인

### Slice 1 결과

- 현대 24px Regular SVG 9개를 `assets/nav-icons/`에 복사했다.
- 하단 탭바와 더보기 시트의 이모지 아이콘을 `tab-icon nav-icon-*` 마크업으로 교체했다.
- `styles/components.css`에서 SVG mask/currentColor 기반 아이콘 렌더링과 활성 탭 강조를 추가했다.
- `navigation.js`의 동적 더보기 항목과 탭 설정 모달도 같은 아이콘 마크업을 사용한다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260623-bottom-tab-hyundai-icons`로 bump하고 새 아이콘 자산을 `STATIC_ASSETS`에 추가했다.
- 검증 완료:
  - `node --check app.js`
  - `node --check navigation.js`
  - `node --check sw.js`
  - `STATIC_ASSETS`의 `assets/nav-icons/*.svg` 9개 존재 확인
  - `git diff --check`
  - `npm.cmd run dev` 재사용 URL `http://localhost:5500`
  - HTTP 200 확인
  - 브라우저에서 홈/식단/운동/캘린더/더보기 클릭, 더보기 시트, 탭 설정 모달 아이콘 표시 확인

## 리스크와 대응

- 현대 아이콘 팩에 운동 전용 아이콘이 없을 수 있다.
  - 대응: `ic_walking`을 기본으로 쓰고, 실제 화면에서 운동 의미가 약하면 `ic_heart` 또는 `ic_power1`로 교체한다.
- SVG 원본 stroke가 고정색이라 CSS 색상 전환이 안 될 수 있다.
  - 대응: CSS mask 방식을 우선 사용한다.
- `navigation.js` 동적 더보기 항목은 현재 `textContent`로 한 줄 생성한다.
  - 대응: DOM 노드를 만들어 아이콘 span과 라벨 span을 분리한다.
- `STATIC_ASSETS` 포함 파일을 수정하게 된다.
  - 대응: `sw.js` `CACHE_VERSION` bump와 새 아이콘 자산 등록을 같은 Slice에 포함한다.

## 결정

- 사용자 요청은 구체적이고 실행 가능하므로 Slice 1을 승인된 실행 범위로 간주한다.
- 이번 계획 세션에서는 앱 코드를 수정하지 않는다.

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-06-23-bottom-tab-hyundai-icons.md`의 Slice 1을 실행한다. 현대 아이콘 팩에서 필요한 24px SVG만 `assets/nav-icons/`로 복사하고, 하단 탭바/더보기 시트/동적 탭 항목의 이모지 아이콘을 현대 SVG 기반 아이콘으로 교체한다. `index.html`, `app.js`, `navigation.js`, `styles/components.css` 또는 새 정적 자산을 수정하면 `sw.js` `CACHE_VERSION`을 함께 bump하고, `npm.cmd run dev`로 HTTP 200 및 홈/식단/운동/캘린더/더보기 클릭 플로우를 확인한다.

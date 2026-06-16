# 성장 보드 카드 클릭 범위 수정 계획

## 요청

- Discord `devreq_discord_1516256070543085648`
- 제보: `성장보드 클릭이 안됨`
- 첨부 화면: 운동 탭의 운동 방식 목록에서 `성장 보드` 카드가 보이며, `열기` CTA가 카드 우측에 있음.

## 진단 결과

- 로컬 `http://localhost:5500`에서 운동 탭 진입 후 재현했다.
- `window.tm2OpenBoard`는 정상 등록되어 있고, `열기` CTA 좌표를 클릭하면 `#tm2-sheets.tm2-open`이 열렸다.
- 같은 카드의 하단 메타 영역(`계획표 · 중장기 조망 · 칸 색칠`)을 실제 포인터 좌표로 클릭하면 열리지 않았다.
- 원인은 `workout/expert.js`의 운동 방식 카드에서 상단 `.wt-mode-entry-main` 버튼에만 inline `onclick`이 있고, 하단 `.wt-mode-entry-meta`는 버튼 밖에 있어 카드 전체가 클릭 가능해 보이는 UI와 실제 hit target이 불일치하는 것이다.

## 실행 Slice 1

### 목표

- `성장 보드` 카드를 포함한 운동 방식 카드 전체 영역을 같은 액션으로 열리게 한다.
- 기존 `일반모드`, `프로모드`, `테스트모드` 클릭 동작은 유지한다.

### 변경 대상

- `workout/expert.js`
  - 운동 방식 카드에 `data-mode-action`을 부여한다.
  - `renderExpertTopArea()`에서 카드 렌더 직후 직접 click handler를 바인딩한다.
  - inline `onclick` 의존을 제거해 카드 상단/하단 어디를 눌러도 동일 액션이 실행되게 한다.
- `sw.js`
  - `workout/expert.js`가 `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 범프한다.

### 하지 않을 일

- 성장 보드 내부 온보딩/보드 로직 변경 없음.
- 테스트모드 v1/v2 데이터 모델 변경 없음.
- `www/` 산출물 직접 수정 없음.

### 검증

1. `node --check workout/expert.js`
2. `node --check sw.js`
3. `npm.cmd run dev` 또는 `node scripts/dev-start.mjs`로 실제 URL 확인
4. `http://localhost:5500` HTTP 200 확인
5. Puppeteer 모바일 뷰에서 운동 탭 진입 후:
   - `성장 보드` 카드 하단 메타 영역 클릭
   - `#tm2-sheets.tm2-open`이 열리는지 확인
   - `열기` CTA도 계속 열리는지 확인

## 상태

- Slice 1 실행 완료
- `workout/expert.js`에서 운동 방식 카드 전체 클릭 위임을 추가하고 inline `onclick` 의존을 제거했다.
- `workout/expert.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260616z1-growth-board-card-click`로 범프했다.
- 검증 완료:
  1. `node --check workout/expert.js`
  2. `node --check sw.js`
  3. `npm.cmd run dev` 출력 URL `http://localhost:5500`
  4. Puppeteer 모바일 뷰: `http://localhost:5500` HTTP 200
  5. 운동 탭 → 성장 보드 카드 하단 메타 영역 클릭 시 `#tm2-sheets.tm2-open`
  6. 운동 탭 → 성장 보드 `열기` CTA 클릭 시 `#tm2-sheets.tm2-open`

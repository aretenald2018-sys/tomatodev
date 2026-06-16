# 성장 보드 카드 클릭 범위 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-16-growth-board-card-click.md`
- 변경 파일:
  - `workout/expert.js`
  - `sw.js`
  - `docs/ai/features/2026-06-16-growth-board-card-click.md`
  - `docs/ai/NEXT_ACTION.md`

## 결과

- 차단 이슈 없음.
- `workout/expert.js` 변경은 운동 방식 카드 렌더링/클릭 바인딩에 국한되어 있고, 성장 보드 내부 로직이나 저장 경로를 건드리지 않았다.
- 기존 inline `onclick` 문자열 대신 `#expert-top-area`에 한 번만 위임 핸들러를 붙이는 구조라, 렌더 재실행 시 핸들러가 중복 누적되지 않는다.
- `성장 보드` 액션은 `window.tm2OpenBoard`가 없을 경우 `./test-v2/entry.js`를 직접 import한 뒤 다시 호출하므로 모듈 로드 순서에도 더 견고하다.
- `workout/expert.js`가 `sw.js` `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION` 범프가 함께 들어갔다.

## 검증

- 통과: `node --check workout/expert.js`
- 통과: `node --check sw.js`
- 통과: `npm.cmd run dev` → `http://localhost:5500`
- 통과: Puppeteer 모바일 뷰에서 `http://localhost:5500` HTTP 200
- 통과: 운동 탭 → 성장 보드 카드 하단 메타 영역 클릭 → `#tm2-sheets.tm2-open`
- 통과: 운동 탭 → 성장 보드 `열기` CTA 클릭 → `#tm2-sheets.tm2-open`

## 남은 리스크

- 저장소에 이번 요청 전부터 존재한 미커밋 변경이 여러 개 있어, 배포 커밋에는 이번 요청 파일만 선별 포함해야 한다.

# 캘린더 운동탭 리뷰

## 리뷰 대상

- `render-calendar.js`
- `style.css`
- `sw.js`
- `docs/ai/features/2026-06-20-calendar-workout-tab.md`
- `docs/ai/NEXT_ACTION.md`

## 결과

- 발견된 코드 이슈: 없음
- 데이터 저장 구조 변경 없음. 기존 `workouts/{date}` 문서의 운동 필드만 읽는다.
- `render-calendar.js`는 새 `calc/volume.js` import를 추가했으며, 해당 파일은 이미 `sw.js` `STATIC_ASSETS`에 포함되어 있다.
- `style.css`와 `render-calendar.js`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION` 범프가 포함되어 있다.
- 사용자 입력 기반 운동명/메모/세트 텍스트는 새 운동 상세 렌더 경로에서 `_esc()`로 이스케이프한다.

## 검증

1. PASS: `node --check render-calendar.js`
2. PASS: `node --check sw.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `git diff --check`
5. PASS: 기존 실행 중인 `http://localhost:5500/index.html` HTTP 200 확인
6. not verified yet: 브라우저에서 하단 `캘린더` 버튼 클릭 후에도 활성 탭이 `home`에 머물고 `#calendar-root`가 비어 있어 실제 캘린더 UI 플로우는 확인하지 못했다.

## 남은 리스크

- 브라우저에서 `캘린더 → 운동` 탭 전환과 운동 기록 날짜 클릭 모달은 아직 직접 확인하지 못했다. 현재 로컬 페이지에서는 캘린더 하단 탭 클릭이 홈에서 전환되지 않는다.

## 배포 확인

- PASS: `git push tomatofarm main` — `8188d7f..ad1169f`
- PASS: `node scripts/verify-deploy.mjs https://aretenald2018-sys.github.io/tomatofarm/ d06e5b523882`
- PASS: 원격 `/` HTTP 200, `build-info.json` shortCommit `d06e5b523882`, `sw.js` 캐시 버전 `tomatofarm-v20260620z7-growth-board-wendler-rom-calendar-workout-tab`

# 운동 picker 부위 아트 선명도 개선 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`
- Slice: `Slice 3: 부위 아트 자산 선명도 개선`
- 변경 파일:
  - `assets/workout/muscles/abs.png`
  - `assets/workout/muscles/back.png`
  - `assets/workout/muscles/bicep.png`
  - `assets/workout/muscles/chest.png`
  - `assets/workout/muscles/glute.png`
  - `assets/workout/muscles/lower.png`
  - `assets/workout/muscles/shoulder.png`
  - `assets/workout/muscles/tricep.png`
  - `sw.js`
  - `docs/ai/features/2026-06-24-exercise-picker-category-entry.md`

## 결과

- PASS: 차단 이슈 없음.

## 확인 내용

- 기존 screenshot crop 기반 136x100 PNG를 고해상도 생성 contact sheet 기반 384x288 RGBA PNG로 교체했다.
- 8개 자산 모두 투명 배경이며, 네 모서리 alpha 값이 0이다.
- 기존 파일명과 경로를 유지해 `workout/exercises.js` 경로 변경이 필요 없다.
- `sw.js`의 `STATIC_ASSETS`에 이미 등록된 파일을 교체했으므로 `CACHE_VERSION`을 `tomatofarm-v20260624z15-sharp-muscle-assets`로 bump했다.

## 검증

- PASS: `node --check sw.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: PNG 8개 크기 `384x288`, 모드 `RGBA`, 투명 corner 확인
- not verified yet: Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` 필요
- not verified yet: 배포 URL에서 운동 picker 분류 화면의 부위 이미지 선명도 시각 확인 필요

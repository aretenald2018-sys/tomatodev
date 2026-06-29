# 트레이너 통계 상단 아트 및 홈 러닝 지도 배율 수정 리뷰

## 리뷰 결과

문제 없음.

## 변경 확인

- `style.css`
  - 통계 모달 전용 트레이너 이미지를 더 위로 이동했다.
  - 컨테이너 높이와 `overflow: hidden`을 적용해 하반신이 본문 통계 영역으로 내려오지 않게 했다.
  - 말풍선도 캐릭터 위치에 맞춰 상단으로 이동했고, 통계 헤더의 우측 여백은 실제 제목/아이콘 사용에 맞게 줄였다.

- `home/life-zone.js`
  - 홈탭 러닝 지도 말풍선 전용 zoom 상한을 `14`에서 `12`로 낮췄다.
  - 운동 탭 러닝 결과 지도 파일은 수정하지 않았다.

- `sw.js`
  - 정적 자산 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260629z20-trainer-top-map-zoom`으로 갱신했다.

## 검증

- PASS: `node --check home/life-zone.js`
- PASS: `node --check modals/trainer-quest-modal.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js` — 41 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 606 tests passed
- PASS: `git diff --check`

## 남은 위험

- 인증 세션이 없는 자동 브라우저에서는 실제 통계 모달 클릭 화면과 홈탭 말풍선 시각 상태를 직접 조작 검증하지 못한다.
- Dashboard3 Pages 배포 후 정적 마커와 배포 커밋 검증이 필요하다.

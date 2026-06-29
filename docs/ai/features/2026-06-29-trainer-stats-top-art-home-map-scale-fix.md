# 트레이너 통계 상단 아트 및 홈 러닝 지도 배율 수정 계획

## 배경

사용자 확인 결과 두 가지 회귀가 남아 있다.

1. 트레이너 통계 모달 전용 아트가 카드 안쪽으로 내려와 본문 콘텐츠와 겹친다. 하반신이 잘리더라도 캐릭터는 모달 위쪽 레이어에 있어야 한다.
2. 홈탭 러닝 지도 말풍선이 사용자가 제시한 운동 탭 GPS 예시보다 지나치게 확대되어 위치 맥락이 보이지 않는다. 운동 탭 러닝 결과 지도와 별개로 홈 말풍선만 더 넓은 동네 배율을 써야 한다.

## 목표

- 통계 모달의 트레이너 이미지를 모달 내부 본문이 아니라 모달 상단 바깥 레이어로 올린다.
- 하반신은 필요 시 크롭하고, 상단 통계 정보가 바로 읽히도록 콘텐츠 침범을 줄인다.
- 홈탭 러닝 지도 말풍선의 VWorld 타일 zoom 상한을 더 낮춰 동네 단위 도로/역/행정구역 맥락이 보이도록 한다.
- 운동 탭 러닝 결과 지도 배율/상세 렌더링 경로는 건드리지 않는다.

## 실행 슬라이스

1. `style.css`
   - `.trainer-quest-stats-guide-character`를 위쪽으로 이동한다.
   - 캐릭터 컨테이너에 고정 높이와 `overflow: hidden`을 적용해 하단부가 카드 본문으로 내려오지 않게 한다.
   - 말풍선과 제목/아이콘 줄이 캐릭터와 과도하게 겹치지 않도록 통계 헤더 여백을 재조정한다.

2. `home/life-zone.js`
   - 홈 전용 `RUNNING_MAP_HOME_MAX_ZOOM` 값을 더 낮춰 홈 말풍선 지도만 넓은 배율로 렌더링한다.
   - `workout/running-map.js`는 수정하지 않아 운동 탭 결과 지도와 분리된 상태를 유지한다.

3. 캐시/테스트
   - `sw.js` `CACHE_VERSION`을 갱신한다.
   - 홈 지도 zoom 계약, 통계 모달 캐릭터 배치 계약, 서비스워커 캐시 마커 테스트를 갱신한다.

## 검증

- `node --check home/life-zone.js`
- `node --check modals/trainer-quest-modal.js`
- `node --check sw.js`
- `node --test tests/trainer-quest-modal.test.js tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test tests/*.test.js`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 비범위

- 새 NPC/트레이너 아트 이미지 생성.
- 운동 탭 러닝 상세 지도 렌더링 변경.
- 홈 말풍선 자체 크기 확대.

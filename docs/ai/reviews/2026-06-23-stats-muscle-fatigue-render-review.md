# 통계 탭 근육 피로도 렌더 리뷰

## 리뷰 결과

- 결론: 승인 가능.
- 중대 이슈: 없음.
- 잔여 리스크: 로컬 로그인 계정에 최근 30일 운동 기록이 없어 실제 데이터 기반 색 오버레이가 켜진 상태는 시각 검증하지 못했다. 빈 상태, 인체 렌더 이미지, `일별/주별/월별` 버튼 전환, 서비스워커/빌드 산출물은 확인했다.

## 확인한 변경

1. `assets/stats/muscle-fatigue-body.png`
   - 첨부 스크린샷의 전면/후면 인체 렌더링만 추출한 정적 이미지.
2. `index.html`
   - `stats-overall-panel` 최상단에 `#stats-muscle-fatigue` 카드 컨테이너 추가.
3. `render-stats.js`
   - 최근 1/7/30일 기준 대근육 그룹별 세트/볼륨/활성 점수 계산.
   - `일별`, `주별`, `월별` 버튼 직접 바인딩.
   - 활성 근육은 인체 이미지 위 hotspot으로 렌더.
4. `style.css`
   - 어두운 근육 피로도 카드, 인체 이미지, 버튼, 요약/행 스타일 추가.
   - 라이트 테마의 `.stats-block` 오버라이드가 새 카드 배경을 덮지 않도록 예외 추가.
5. `sw.js`
   - `CACHE_VERSION`을 `tomatofarm-v20260623z10-stats-muscle-fatigue`로 갱신.
   - `./assets/stats/muscle-fatigue-body.png` precache 추가.
6. `scripts/copy-www.js`
   - 운영/Capacitor 산출물에 `assets` 폴더가 복사되도록 추가.

## 검증

1. PASS: `node --check render-stats.js`
2. PASS: `node --check sw.js`
3. PASS: `node --check scripts/copy-www.js`
4. PASS: `git diff --check`
5. PASS: `http://localhost:5500` HTTP 200 및 기존 로컬 로그인 세션에서 통계 탭 카드 렌더 확인
6. PASS: `일별/주별/월별` 버튼 클릭 시 활성 상태와 헤딩이 변경됨
7. PASS: `http://localhost:5502` clean worktree 서버 HTTP 200 및 `assets/stats/muscle-fatigue-body.png` HTTP 200
8. PASS: `npm.cmd run build`
9. PASS: `build-info.json`, `sw.js`, `www/sw.js` 캐시 버전이 `tomatofarm-v20260623z10-stats-muscle-fatigue`로 일치
10. PASS: `www/assets/stats/muscle-fatigue-body.png` 생성 확인
11. PASS: `git push tomatofarm HEAD:main` — `6342c13..7d8ab9b`
12. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 8769e744b2b4` — `static=192`

## 운영 확인 기준

- URL: `https://aretenald2018-sys.github.io/tomatofarm/`
- 기대 상태:
  1. HTTP 200
  2. `/sw.js`에서 `tomatofarm-v20260623z10-stats-muscle-fatigue` 확인
  3. 통계 탭 상단에 `근육 피로도` 카드가 보임
  4. `일별/주별/월별` 버튼 클릭 시 활성 버튼이 바뀜

## 배포 결과

- `tomatofarm/main`: `7d8ab9b`
- 앱 빌드 기준 커밋: `8769e744b2b4`
- 캐시 버전: `tomatofarm-v20260623z10-stats-muscle-fatigue`
- 운영 검증: PASS

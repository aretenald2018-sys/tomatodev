# 라이프존 방문자 닉네임 표시 배포 리뷰

## 대상

- 신규/장기미접속 회원이 라이프존 상담실 방문자로 표시될 때 닉네임이 누락되는 문제.
- `tomatofarm/main` 최신본(`333b6fb`) 기준으로 적용.

## 변경

- `home/life-zone-state.js`
  - 계정 표시명 helper를 추가했다.
  - `resolveLifeZoneConsultingVisitor()`가 `displayName`을 반환하게 했다.
- `home/life-zone.js`
  - 상담실 방문자 아래에 `.lz-nameplate--visitor` 닉네임 라벨을 렌더링한다.
  - `오늘의 라이프존` 제목에 방문자 닉네임을 함께 표시한다.
- `style.css`
  - 방문자 이름표와 긴 제목 줄바꿈/수축 스타일을 추가했다.
- `tests/home-life-zone-state.test.js`
  - 신규/복귀/현재 방문자 표시명과 표시명 fallback 테스트를 추가했다.
- `sw.js`
  - `CACHE_VERSION`을 `tomatofarm-v20260702z18-life-zone-visitor-name`으로 bump했다.

## 검증

- PASS: `node --check home/life-zone-state.js`
- PASS: `node --check home/life-zone.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/home-life-zone-state.test.js` — 22개 통과
- PASS: `git diff --check`

## 배포 검증 예정

- `git push tomatofarm main`
- `https://aretenald2018-sys.github.io/tomatofarm/` HTTP 200
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
- 홈탭 라이프존 DOM에서 `.lz-title`과 `.lz-nameplate--visitor`가 방문자 닉네임을 포함하는지 확인.

# localhost 5500 dev server 진단

## 증상

- `http://localhost:5500`가 응답하지 않았다.
- `npm.cmd run dev`를 실행해도 서버가 유지되지 않았다.

## 원인

- `package.json`의 `dev` 스크립트가 `bash scripts/dev-start.sh`를 실행했다.
- 현재 Windows PowerShell 환경에서 `bash`를 찾을 수 없어 dev server launcher가 즉시 종료됐다.

## 수정

- `package.json`의 `dev` 스크립트를 `node scripts/dev-start.mjs`로 교체했다.
- `scripts/dev-start.mjs`를 추가해 5500부터 5510까지 건강한 서버 재사용 또는 빈 포트 선택을 처리하게 했다.
- `scripts/static-dev-server.mjs`를 추가해 프로젝트 루트를 직접 정적 서빙하게 했다.
- `AGENTS.md`, `CLAUDE.md`의 dev server 설명을 새 Node launcher 기준으로 갱신했다.

## 검증

- `node --check scripts/dev-start.mjs`
- `node --check scripts/static-dev-server.mjs`
- `npm.cmd run dev`
- `http://localhost:5500/` HTTP 200 확인
- 인앱 브라우저에서 `http://localhost:5500/`의 제목 `토마토 키우기`, `#stats-overall-panel`, `#stats-metadata-summary` 확인

# localhost 5500 dev server 수정 리뷰

## 리뷰 대상

- `package.json`
- `scripts/dev-start.mjs`
- `scripts/static-dev-server.mjs`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/ai/features/2026-06-09-dev-server-direct-run-rule.md`
- `docs/ai/diagnoses/2026-06-09-localhost-5500-dev-server.md`

## 결과

- 발견된 차단 이슈 없음.
- `npm.cmd run dev`가 더 이상 `bash`를 요구하지 않는다.
- 새 launcher는 건강한 Tomato 서버를 재사용하고, 포트가 점유된 경우 다음 포트로 이동한다.
- 정적 서버는 프로젝트 루트의 `index.html`을 `/`와 `/index.html`에서 모두 제공한다.

## 검증

- `node --check scripts/dev-start.mjs`: 통과
- `node --check scripts/static-dev-server.mjs`: 통과
- `npm.cmd run dev`: `URL: http://localhost:5500` 출력
- `http://localhost:5500/`: HTTP 200, `토마토 키우기` 포함
- `http://localhost:5500/index.html`: HTTP 200, `토마토 키우기` 포함
- 인앱 브라우저: 제목 `토마토 키우기`, `#stats-overall-panel`, `#stats-metadata-summary` 확인

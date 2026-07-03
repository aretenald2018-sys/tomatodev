# 2026-07-03 운영계 전용 배포 규칙 정리

## 상태

- 상태: `implemented`
- 요청: Dashboard3 쪽 배포/검증을 기본 경로에서 빼고, 운영계만 배포하게 설정한다.

## 결정

- 기본 배포/검증 대상은 Tomato Farm 운영계 `https://aretenald2018-sys.github.io/tomatofarm/`로 고정한다.
- Dashboard3 배포는 사용자가 명시적으로 Dashboard3를 요청한 경우에만 허용한다.
- 에이전트 진입 규칙, Claude 컨텍스트, npm 배포 스크립트가 같은 운영계 기준을 가리키게 한다.

## 구현

- `AGENTS.md`: Dashboard3 강제 배포 규칙을 운영계 배포 규칙으로 교체했다.
- `CLAUDE.md`: 절대 규칙, Dev Server 배포 검증 설명, go 워크플로우를 운영계 기준으로 교체했다.
- `package.json`: `deploy:production` 명령을 추가했다.
- `scripts/deploy-production.mjs`: 운영계 push/verify/marker 검증 스크립트를 추가했다.
- `scripts/deploy-dashboard3.mjs`: `ALLOW_DASHBOARD3_DEPLOY=1`이 없으면 기본 실행을 막는다.

## 검증

- `node --check scripts/deploy-production.mjs scripts/deploy-dashboard3.mjs`
- `npm.cmd run deploy:dashboard3`가 기본 상태에서 차단되는지 확인
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`로 운영계 배포 확인

# Dev Server 직접 실행 규칙 변경 계획

## 요청 원문

그 규칙자체를 바꿔서 직접 항상 실행한다고 바꿔놔

## 이해한 내용

- 목표: Codex/Claude 세션이 dev server가 필요한 검증에서 `npm.cmd run dev`를 직접 실행하도록 프로젝트 규칙을 바꾼다.
- 비목표: 앱 코드 변경, dev server 실제 실행, 배포, 포트 kill 정책 변경은 하지 않는다.
- 사용자 흐름: 이후 기능/UX 변경이 있으면 에이전트가 프로젝트 루트에서 `npm.cmd run dev`를 실행하고, HTTP 200과 실제 UI 플로우를 확인한다.
- 데이터 가정: `scripts/dev-start.mjs`가 포트 충돌/헬시 서버 재사용을 처리하고, `scripts/static-dev-server.mjs`가 루트 정적 파일을 서빙한다.
- 열려 있는 질문: 없음. 사용자가 규칙 변경을 직접 지시했다.

## 그릴 결과

- 적용 트리거: `/grill-me`
- 핵심 질문: 직접 실행 규칙을 어디까지 강하게 둘 것인가?
- 추천 답변: dev server가 필요한 검증에서는 에이전트가 직접 `npm.cmd run dev`를 실행하되, 검증 완료 주장은 HTTP 200과 UI 흐름 확인 뒤에만 한다.
- 사용자 답변: `직접 항상 실행`
- 확정된 결정: `AGENTS.md`와 `CLAUDE.md`의 사용자 실행 안내/샌드박스 실행 금지 문구를 직접 실행 원칙으로 교체한다.
- 남은 가정: 장기 실행 서버는 `dev-start.mjs`의 idempotent 동작을 신뢰하고, 포트/URL/PID 또는 확인 가능한 증거를 보고한다.

## 결정 기록

- 결정: 프로젝트 규칙의 dev server 기본값을 `User-run`에서 `Agent-run`으로 바꾼다.
- 이유: 사용자 요구가 “에이전트가 직접 검증을 위해 서버를 띄우는 것”이기 때문이다.
- 되돌릴 수 있는가: 가능. 해당 문구만 되돌리면 된다.

## 실행 슬라이스

### 슬라이스 1: Dev Server 직접 실행 규칙 반영

- 목표: `AGENTS.md`와 `CLAUDE.md`에 에이전트 직접 실행 규칙을 명시한다.
- 범위:
  - `AGENTS.md` dev server bullet 교체
  - `CLAUDE.md` Dev Server 섹션 제목/본문/검증 문구 교체
  - `CLAUDE.md` go 워크플로우 3번을 에이전트 직접 실행 기준으로 교체
- 예상 수정 파일:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `docs/ai/NEXT_ACTION.md`
  - `docs/ai/features/2026-06-09-dev-server-direct-run-rule.md`
- 수정하지 말 것:
  - 앱 소스
  - `www/`
  - dev-start script
- 검증 방법:
  - `rg -n "User-run|직접 시작하지|사용자 로컬 터미널|npm.cmd run dev" AGENTS.md CLAUDE.md`
  - `git diff --check`
- 완료 증거:
  - 금지 문구가 사라지고 직접 실행 원칙이 남는다.
  - 검증 완료 조건은 HTTP 200 + UI flow로 유지된다.

## 리뷰 세션 프롬프트

이 계획 문서와 변경 파일을 읽고 직접 실행 규칙이 일관되게 반영됐는지, 오래된 사용자 실행/샌드박스 금지 문구가 남아 충돌하지 않는지 리뷰한다.

## NEXT_ACTION.md 업데이트

- 계획 세션 종료 상태: 계획 완료
- 다음 자동 상태: `ready_for_execution`
- 다음 액션: `docs/ai/features/2026-06-09-dev-server-direct-run-rule.md`의 슬라이스 1을 실행한다.
- 차단 질문: 없음

## 실행 결과

- 실행 슬라이스: `Slice 1: Dev Server 직접 실행 규칙 반영`
- 변경 파일:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `docs/ai/features/2026-06-09-dev-server-direct-run-rule.md`
  - `docs/ai/NEXT_ACTION.md`
- 구현 요약:
  - `AGENTS.md`에서 Codex/sandbox dev server 직접 실행 금지 문구를 제거하고, 필요 시 Codex가 `npm.cmd run dev`를 직접 실행하도록 바꿨다.
  - `CLAUDE.md`의 Dev Server 섹션을 `User-run`에서 `Agent-run`으로 바꿨다.
  - 후속 수정에서 `package.json`의 `dev` 명령을 `bash scripts/dev-start.sh`에서 Windows 호환 `node scripts/dev-start.mjs`로 교체했다.
  - `go` 워크플로우의 로컬 확인 단계도 에이전트 직접 실행 기준으로 바꿨다.
  - 검증 완료 조건은 HTTP 200과 대상 UI flow 확인으로 유지했다.
- 검증:
  - `rg -n "User-run|직접 시작하지|샌드박스에서 시작|사용자 로컬 터미널|사용자가 일반 로컬|사용자가 서버를 실행|Do not start a long-lived|sandbox-started|Codex/sandbox" AGENTS.md CLAUDE.md` 결과 없음
  - `rg -n "Dev Server|npm.cmd run dev|Agent-run|직접 실행|HTTP 200|not verified yet" AGENTS.md CLAUDE.md`에서 새 직접 실행 문구 확인
  - `git diff -- AGENTS.md CLAUDE.md docs/ai/features/2026-06-09-dev-server-direct-run-rule.md --check` 통과

# Dev Server 직접 실행 규칙 변경 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-09-dev-server-direct-run-rule.md`
- 슬라이스: `Slice 1: Dev Server 직접 실행 규칙 반영`
- 변경 파일:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `docs/ai/features/2026-06-09-dev-server-direct-run-rule.md`
  - `docs/ai/NEXT_ACTION.md`

## 발견 사항

- 차단 이슈 없음.
- `AGENTS.md`의 금지 문구는 직접 실행 원칙으로 교체됐다.
- `CLAUDE.md`의 `Dev Server (User-run)` 섹션은 `Dev Server (Agent-run)`으로 교체됐다.
- `go` 워크플로우도 사용자 로컬 터미널 실행이 아니라 에이전트 직접 실행으로 바뀌었다.
- 검증 완료 조건은 HTTP 200과 대상 UI flow 확인으로 남아 있어 검증 정직성 규칙과 충돌하지 않는다.
- `python -m http.server` 직접 실행 금지, 수동 `taskkill` 금지는 유지되어 기존 프로세스 안전 규칙과 충돌하지 않는다.

## 검증

- 명령:
  - `rg -n "User-run|직접 시작하지|샌드박스에서 시작|사용자 로컬 터미널|사용자가 일반 로컬|사용자가 서버를 실행|Do not start a long-lived|sandbox-started|Codex/sandbox" AGENTS.md CLAUDE.md`
  - `rg -n "Dev Server|npm.cmd run dev|Agent-run|직접 실행|HTTP 200|not verified yet" AGENTS.md CLAUDE.md`
  - `git diff -- AGENTS.md CLAUDE.md docs/ai/features/2026-06-09-dev-server-direct-run-rule.md --check`
- URL 또는 사용자 흐름: 해당 없음
- 기대 증거: 오래된 사용자 실행/샌드박스 금지 문구 없음, 직접 실행 문구 있음
- 실제 결과: 기대와 일치

## 결정

- 통과: 예
- 수정 필요: 없음
- 후속 계획 필요: 없음

## NEXT_ACTION.md 업데이트

- 리뷰 종료 상태: 리뷰 완료
- 다음 자동 상태: `complete`
- 다음 액션: 없음
- 차단 사유: 없음

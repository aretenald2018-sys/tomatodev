# 2026-07-03 운영계 전용 배포 규칙 리뷰

## 결과

- Findings: 없음

## 확인

- 기본 문서 규칙이 `dashboard3`가 아니라 `tomatofarm` 운영계 URL을 가리킨다.
- 기본 배포 명령은 `npm.cmd run deploy:production`이다.
- 기존 `deploy:dashboard3`는 명시 승인 환경변수 없이 실행되지 않는다.

## 잔여 위험

- 과거 기록 문서에는 Dashboard3 배포 이력이 남아 있지만, 상단 진입 규칙과 현재 컨텍스트 규칙이 운영계 우선으로 덮어쓴다.

# Dashboard3 배포 명령 하드닝

## 요청

- 커밋/푸시/PowerShell 관련 실수가 반복되어 배포 속도가 떨어지는 문제의 원인을 찾고 해결한다.

## 진단

### 증상

- 배포 직후 `verify:deploy`를 수동 실행하면 GitHub Pages가 아직 이전 커밋을 서빙해 mismatch가 자주 발생한다.
- `npm.cmd run verify:deploy -- ... HEAD`처럼 ref 문자열을 넣으면 `verify-deploy.mjs`가 이를 git ref로 해석하지 않고 literal `HEAD`로 비교해 실패한다.
- 배포 자산 마커 확인을 `node -e "..."`로 PowerShell에서 직접 실행하면 quote escaping이 깨져 검증 명령 자체가 실패한다.
- `npm.cmd run verify:assets`는 `build-info.json`을 로컬 현재 커밋으로 갱신해 작업트리에 생성물 변경을 남긴다. 이후 커밋 대상 확인과 문서-only 커밋 배포 검증이 느려진다.

### 근본 원인

1. 배포 절차가 `git push`, 커밋 해시 계산, Pages 반영 대기, 원격 검증, 자산 마커 확인으로 나뉘어 있고 각 단계를 사람이 PowerShell 명령으로 조립한다.
2. `verify-deploy.mjs`는 `<expected-commit>`를 단순 문자열로만 취급해 `HEAD`, `HEAD~1`, branch 같은 git ref를 처리하지 못한다.
3. 자산 마커 확인용 정적 검증이 스크립트화되어 있지 않아 shell quoting에 취약한 `node -e`를 반복 사용한다.
4. 로컬 자산 검증이 생성물인 `build-info.json`을 수정하지만, 배포 전후 cleanup 책임이 명령에 내장되어 있지 않다.

## 실행 Slice 1

### 목표

PowerShell quoting과 수동 해시 입력을 배포 경로에서 제거하고, Dashboard3 배포를 한 명령으로 `push -> Pages 대기 -> deploy verify -> 마커 확인 -> build-info cleanup`까지 수행하게 한다.

### 변경 범위

- `scripts/verify-deploy.mjs`
  - expected commit 인자가 git ref이면 실제 SHA로 resolve한다.
  - 커밋 mismatch도 재시도 루프 안에서 처리해 Pages 반영 지연을 한 명령 안에서 기다린다.
- 신규 `scripts/verify-deployed-markers.mjs`
  - URL과 `path::marker` 인자만 받아 배포 자산 문자열을 검증한다.
  - `node -e` 사용을 제거한다.
- 신규 `scripts/deploy-dashboard3.mjs`
  - `origin/main` push.
  - 현재 `HEAD` SHA resolve.
  - `verify-deploy.mjs` 호출.
  - 기본 Dashboard3 핵심 마커 검증.
  - 로컬 `build-info.json`이 변경됐으면 원래 tracked 상태로 복구.
- `package.json`
  - `deploy:dashboard3`, `verify:deployed-markers` 스크립트 추가.
- `tests/`
  - ref resolve, marker 검증 스크립트 존재, deploy script가 PowerShell 인라인 검증을 대체하는지 정적 테스트 추가.

### 제외

- GitHub Actions workflow 구조 변경.
- 앱 런타임 코드 변경.
- 서비스워커 캐시 버전 변경.
- 자동 커밋 생성 기능. 커밋 메시지 판단은 여전히 작업 단위별로 사람이 한다.

## 검증

1. `node --check scripts/verify-deploy.mjs`
2. `node --check scripts/verify-deployed-markers.mjs`
3. `node --check scripts/deploy-dashboard3.mjs`
4. `node --test tests/deploy-command-hardening.test.js`
5. `node --test tests/*.test.js`
6. `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ HEAD`
7. `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::CACHE_VERSION"`

## 실행 결과

- `scripts/verify-deploy.mjs`
  - `HEAD` 같은 git ref를 실제 SHA로 resolve하도록 변경했다.
  - stale Pages 커밋 mismatch와 `build-info.json`/`sw.js` cache mismatch를 동일한 wait loop에서 재시도하도록 변경했다.
- `scripts/verify-deployed-markers.mjs`
  - 배포 URL과 `path::marker` 입력으로 원격 자산 문자열을 검증하는 전용 스크립트를 추가했다.
  - PowerShell `node -e` inline 검증을 대체한다.
- `scripts/deploy-dashboard3.mjs`
  - tracked dirty tree 확인, generated `build-info.json` 복구, `git push origin HEAD:main`, 배포 검증, 기본 마커 검증을 한 명령으로 묶었다.
- `package.json`
  - `deploy:dashboard3`
  - `verify:deployed-markers`
  - 위 두 스크립트를 추가했다.
- 로컬 검증:
  - PASS: `node --check scripts/verify-deploy.mjs`
  - PASS: `node --check scripts/verify-deployed-markers.mjs`
  - PASS: `node --check scripts/deploy-dashboard3.mjs`
  - PASS: `node --test tests/deploy-command-hardening.test.js`
  - PASS: `node --test tests/*.test.js` — 480개 통과
  - PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ HEAD`
  - PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::CACHE_VERSION" "app.js::initBuildInfoSurface"`
  - PASS: `git diff --check`
- 배포 검증:
  - 최초 `575e277` 실행에서 `stdio: 'inherit'` 명령 반환값 `null`에 `.trim()`을 호출하는 wrapper 버그를 발견했다.
  - `e80cc17`에서 `run()`이 inherited stdio의 `null` 출력을 안전하게 처리하도록 수정했다.
  - PASS: `npm.cmd run deploy:dashboard3`
  - 배포 결과: `[deploy-dashboard3] ok e80cc17e74ee tomatofarm-v20260624z24-picker-gym-rail`
  - PASS: 수정 후 `node --test tests/*.test.js` — 480개 통과

## 사용 명령

- 배포 완료까지 한 번에 실행:
  - `npm.cmd run deploy:dashboard3`
- 배포된 자산 마커만 확인:
  - `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-"`

## 다음 실행 프롬프트

`docs/ai/features/2026-06-24-dashboard3-deploy-command-hardening.md` Slice 1을 구현하고 Dashboard3 배포 명령을 실제로 검증한다.

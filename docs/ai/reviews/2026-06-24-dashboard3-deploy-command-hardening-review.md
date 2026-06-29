# Dashboard3 배포 명령 하드닝 리뷰

## 대상

- 계획: `docs/ai/features/2026-06-24-dashboard3-deploy-command-hardening.md`
- 구현 커밋:
  - `575e2773a579` (`chore: harden dashboard3 deploy command`)
  - `e80cc17e74ee` (`fix: handle inherited deploy command output`)
- 변경 파일:
  - `scripts/verify-deploy.mjs`
  - `scripts/verify-deployed-markers.mjs`
  - `scripts/deploy-dashboard3.mjs`
  - `package.json`
  - `tests/deploy-command-hardening.test.js`
  - `docs/ai/features/2026-06-24-dashboard3-deploy-command-hardening.md`
  - `docs/ai/NEXT_ACTION.md`

## 결과

- 블로킹 이슈: 없음.

## 확인 내용

- `verify-deploy.mjs`는 `HEAD` 같은 git ref를 `git rev-parse`로 실제 SHA로 해석한다.
- Pages가 아직 이전 커밋을 서빙하는 상황은 commit mismatch에서 즉시 실패하지 않고 `VERIFY_DEPLOY_RETRIES`/`VERIFY_DEPLOY_DELAY_MS` 기반 wait loop로 처리한다.
- `verify-deployed-markers.mjs`는 `path::marker` 입력을 받아 원격 자산 문자열을 검증한다. PowerShell `node -e` 인라인 검증 경로를 대체한다.
- `deploy-dashboard3.mjs`는 tracked dirty tree를 확인하고 generated `build-info.json`을 복구한 뒤 `git push origin HEAD:main`, deploy verify, marker verify를 순서대로 실행한다.
- 최초 실행에서 `stdio: 'inherit'` 반환값 `null` 처리 누락이 발견됐고, `e80cc17`에서 `run()` 반환 처리를 수정했다. 해당 경로는 테스트에 추가됐다.

## 검증

- PASS: `node --check scripts/verify-deploy.mjs`
- PASS: `node --check scripts/verify-deployed-markers.mjs`
- PASS: `node --check scripts/deploy-dashboard3.mjs`
- PASS: `node --test tests/deploy-command-hardening.test.js`
- PASS: `node --test tests/*.test.js` — 480개 통과
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ HEAD`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::CACHE_VERSION" "app.js::initBuildInfoSurface"`
- PASS: `npm.cmd run deploy:dashboard3`
  - `[deploy-dashboard3] ok e80cc17e74ee tomatofarm-v20260624z24-picker-gym-rail`

## 남은 리스크

- `deploy:dashboard3`는 자동 커밋 생성은 하지 않는다. 변경사항 커밋은 여전히 별도 단계다.
- untracked 파일은 차단하지 않는다. 첨부 이미지 폴더 같은 작업 외 파일은 push 대상이 아니므로 의도된 동작이다.

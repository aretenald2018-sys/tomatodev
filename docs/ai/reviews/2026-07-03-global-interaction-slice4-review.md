# 2026-07-03 전역 상호작용 결합 완화 Slice 4 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-global-interaction-decoupling-refactor.md`
- 변경 파일:
  1. `workout/expert/max.js`
  2. `tests/max-auxiliary-modal-actions.test.js`
  3. `sw.js`
  4. cache marker 테스트

## 결론

- 차단 이슈: 없음
- 판단: Max 보조 modal의 close/save/history/delete action이 `data-max-modal-action`과 modal-local delegate로 이동해, lazy module HTML이 전역 함수 문자열에 직접 의존하는 표면이 줄었다.

## 확인한 위험

1. Max V4 plan sheet capture 규칙 회귀
   - 확인 결과: `#max-v4-sheet .wt-v4-sheet` 본체와 `_handleMaxV4SheetClick` capture binding은 건드리지 않았다.
   - 남은 `onclick=` 2개는 기존 V4 sheet shell overlay/sheet에만 존재한다.

2. 보조 modal backdrop click이 inner sheet click을 닫는 회귀
   - 확인 결과: `_bindMaxModalActions()`는 `target === modal`일 때만 backdrop close handler를 실행한다.
   - sheet 내부의 일반 click은 닫히지 않고, action 버튼만 `data-max-modal-action`으로 처리한다.

3. 클렌징 modal의 기록 수정/삭제 action payload 손실
   - 확인 결과: 각 row 버튼에 `data-ex-id`를 직접 렌더하고, handler가 `control.getAttribute('data-ex-id')`를 사용한다.

4. lazy module 전역 함수 inline 호출 회귀
   - 확인 결과: 테스트모드 시작 카드의 일반모드 복귀는 `data-action="switch-normal-view"`로 host delegate에서 실행하고, 미니 온보딩 닫기는 기존 `[data-close-max-ob]` root delegate를 사용한다.

## 남은 위험

1. Max V4 sheet shell의 overlay/sheet inline handler 2개는 남아 있다.
   - 판정: 이번 slice 범위 밖. 기존 `event.stopPropagation()` 전제와 plan sheet capture binding 규칙을 유지하기 위해 별도 V4 shell slice에서 처리한다.

2. 운영 UI click flow는 인증 화면에 막혔다.
   - 판정: 배포 후 marker와 앱 로드 상태는 확인했다. 실제 Max modal click은 로그인 화면이 운동 탭 hit target을 덮어 인증 세션에서 후속 확인해야 한다.

## 검증

1. PASS: `node --check workout/expert/max.js; node --check sw.js; node --check tests/max-auxiliary-modal-actions.test.js`
2. PASS: `node --test tests/max-auxiliary-modal-actions.test.js tests/max-wendler.test.js tests/max-settle.test.js tests/workout-test-mode-unified.test.js tests/workout-save-mode-guard.test.js tests/pwa-update-auto-reload.test.js` - 44 pass
3. PASS: `node --test tests/*.test.js` - 681 pass
4. PASS: `git diff --check`
5. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
6. INFO: `npm.cmd run deploy:production`은 `e6ed405b5000a3ff01f4ec481b1d34d555eecaf5` push 후 Pages가 이전 커밋을 보고 실패했다. push 자체는 성공했다.
7. INFO: 수동 workflow run `28654996300`도 GitHub Pages 내부 오류 `Deployment failed, try again later.`로 실패했다.
8. PASS: 수동 workflow run `28655128179` 성공.
9. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ e6ed405b5000a3ff01f4ec481b1d34d555eecaf5`
10. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260703z16-max-aux-modal-actions workout/expert/max.js::_bindMaxModalActions workout/expert/max.js::data-max-modal-action workout/expert/max.js::switch-normal-view "tests/max-auxiliary-modal-actions.test.js::remaining Max inline handlers"`
11. PASS: 운영 URL in-app browser 로드 - title `토마토 키우기`, URL `https://aretenald2018-sys.github.io/tomatofarm/`, console error 0건
12. not verified yet: 실제 Max UI click flow는 로그인 화면이 운동 탭 hit target을 덮어 인증 없이 열 수 없었다. `#tab-nav [data-tab="workout"]` center hit target이 `#login-screen`이었다.

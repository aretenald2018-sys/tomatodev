# 홈 라이프존 상담실 방문자 소파 연출 리뷰

## 대상

- 계획: `docs/ai/features/2026-07-01-home-consulting-room-visitor-sofa.md`
- 변경 파일:
  - `app.js`
  - `home/life-zone.js`
  - `home/life-zone-state.js`
  - `style.css`
  - `sw.js`
  - `assets/home/life-zone/ui/consulting-room-sofas.png`
  - `assets/home/life-zone/ui/consulting-chief-npc-seated-home.png`
  - `assets/home/life-zone/ui/consulting-visitor-gray-shirt-home.png`
  - `tests/home-life-zone-state.test.js`
  - `tests/home-life-zone-npc-quest.test.js`
  - cache marker 테스트 파일들

## 리뷰 결과

문제 없음.

1. 상담 코너 구도
   - 기존 베이스룸 원본은 수정하지 않고 `consulting-room-sofas.png` overlay로 우측 하단 상담 소파 구도만 덮는다.
   - 상담실장은 `consulting-chief-npc-seated-home.png`로 교체되어 기존 standing sprite 대신 seated sprite가 렌더된다.
   - 방문자는 배경 연출용 `span[data-lz-consulting-visitor]`로 렌더되며, 조건 불일치 시 `hidden` 상태라 일반 유저 UI에 노출되지 않는다.

2. 방문자 판정
   - `app.js`가 초기화 초기에 저장된 이전 `lastLoginAt` snapshot인 `previousLastLoginAt`과 현재 사용자 정보를 `setLifeZoneVisitContext()`로 전달한다.
   - `resolveLifeZoneConsultingVisitor()`는 guest를 제외하고, 10일 이상 미접속은 `returning`, 이전 로그인 없음 또는 7일 이내 생성 계정은 `new`, 그 외는 `null`로 판정한다.
   - 판정 로직은 순수 함수 테스트로 신규/복귀/일반/guest 케이스를 고정했다.

3. 캐시/자산
   - `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260701z3-consulting-room-visitor`로 bump됐다.
   - 새 PNG 3개가 `STATIC_ASSETS`에 등록되어 있고, PNG header 테스트가 `colorType: 6` RGBA를 확인한다.
   - `www/`와 베이스룸 원본은 수정하지 않았다.

## 검증

1. PASS: `node --check app.js; node --check home/life-zone.js; node --check home/life-zone-state.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-state.test.js tests/home-life-zone-npc-quest.test.js tests/consulting-chief-quest-modal.test.js`
3. PASS: `node --test tests/*.test.js` - 624 tests passed
4. PASS: `node scripts/verify-runtime-assets.mjs`
5. PASS: `git diff --check`
6. PASS: 로컬 합성 미리보기 `C:\Users\USER\AppData\Local\Temp\tomato-consulting-room-preview-v2.png`에서 상담 코너 겹침을 확인했다.

## 남은 확인

1. 배포 전 상태: 개발계 배포 커밋/푸시와 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` 검증이 필요하다.
2. not verified yet: 인증 세션이 없어 실제 홈 탭에서 신규/10일 복귀 사용자 조건의 라이프존 UI flow는 직접 확인하지 못했다.

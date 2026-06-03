# 종목추가 모달 오늘 부위 사전필터

## 요청

- Discord 요청: `devreq_discord_1511555042195542096`
- 요청자: 피노
- 내용: 종목추가 모달에서 오늘 고른 부위만 사전필터링해서 보여준다. 예를 들어 등 하는 날에는 가슴 카테고리를 숨긴다.

## 그릴 결과

- 질문: “숨긴다”의 범위가 목록만인지, 상단 부위 탭까지인지가 핵심이다.
- 결정: 첨부 화면에 `전체/가슴/어깨/등` 탭이 보이고 요청 예시가 “가슴카테고리는 숨기는 식”이므로, 오늘 선택 부위 밖의 부위 탭과 그룹 목록을 모두 숨긴다.
- 근거: 현재 `workout/exercises.js`의 Max 피커는 `S.workout.maxMeta.selectedMajors`로 후보 풀을 좁히지만, 모달 UI는 `전체` 상태와 가용 부위 탭을 그대로 노출할 수 있다.
- 가정: “오늘 고른 부위”는 Max 모드의 `S.workout.maxMeta.selectedMajors`를 뜻한다. 선택 부위가 없거나 Max 피커 풀이 없으면 기존 전체 피커 동작을 유지한다.

## 실행 슬라이스

### Slice 1: Max 종목 피커의 오늘 부위 스코프 고정

- 대상 파일:
  - `workout/exercises.js`
  - `sw.js` (`workout/exercises.js`가 `STATIC_ASSETS`에 포함되어 캐시 버전 범프 필요)
- 구현:
  - 오늘 선택 부위 집합을 major 기준으로 정규화하는 helper를 추가한다.
  - Max 벤치마크 피커에서 선택 부위가 있으면 raw pool과 부위 탭을 그 부위 집합으로 제한한다.
  - 같은 상황에서 `전체` 탭은 “오늘 부위 전체” 의미로만 동작하게 유지하고, 필터 초기화도 오늘 부위 밖으로 풀리지 않게 한다.
  - 빠른 종목 추가의 기본 부위는 오늘 선택 부위 첫 항목을 사용한다.
- 범위 밖:
  - Max 성장판/벤치마크 생성 로직 변경
  - 일반 모드 피커나 헬스장 필터 정책 변경
  - 스타일 재설계

## 검증 계획

- `node --check workout/exercises.js sw.js`
- `node scripts/verify-runtime-assets.mjs`
- UI 검증 흐름: `npm.cmd run dev`를 로컬 일반 터미널에서 실행 후 운동 탭 → Max 모드에서 오늘 부위를 `등`으로 선택 → `+ 종목 추가` 모달을 열어 `가슴` 탭/그룹이 보이지 않고 `등` 후보만 보이는지 확인한다.

## 상태

- 계획 세션 완료.
- Slice 1 실행 완료.
- 구현 요약:
  - `workout/exercises.js`에서 Max 종목 피커 raw pool을 오늘 선택 major 부위로 제한했다.
  - 상단 부위 필터와 그룹 렌더링도 오늘 선택 major 부위만 사용하게 했다.
  - `+ 종목 추가` 기본 부위를 오늘 선택 major 첫 항목으로 지정했다.
  - `workout/exercises.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 갱신했다.
- 검증:
  - PASS: `node --check workout/exercises.js; node --check sw.js`
  - not verified yet: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 미추적 mockup 참조(`mockups/poc/*`, `mockups/trio-renewal/shared.css`) 때문에 실패했다. 이번 변경 파일 누락과 직접 관련된 실패는 아니다.
  - not verified yet: 로컬 dev server가 `127.0.0.1:5500/5501/5502/3000/3001/3002`에서 실행 중이지 않아 모달 UI 플로우는 직접 확인하지 못했다.
- 다음 단계: review session.
- 리뷰:
  - PASS: `docs/ai/reviews/2026-06-03-exercise-picker-today-muscle-prefilter-review.md`

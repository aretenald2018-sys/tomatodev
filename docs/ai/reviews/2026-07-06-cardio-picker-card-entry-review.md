# 유산소 picker 리스트 및 카드형 입력 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-06-cardio-picker-card-entry.md`
- 요청: `런닝/조깅`, `유산소` 버튼을 기존 운동 추가 UI와 맞추고, `유산소` 하위 운동 리스트와 한국어 입력 sheet를 통해 기존 운동 카드/캐러셀 시스템에 유산소 카드를 추가한다.

## 구현 요약

1. `workout/exercises.js`
   - `유산소` activity tile을 하위 리스트 view로 연결했다.
   - 기본 종목은 `트레드밀 러닝`, `스텝머신`, `실내 자전거`, `로잉`, `인도어 사이클링`, `리컴번트 바이크` 6개로 고정했다.
   - 하위 종목 선택 시 `칼로리(kcal)`, `거리(km)`, `속도(km/h)`, `랩/반복` 입력 sheet를 열고, 저장 시 `cardio:` exercise id를 가진 `S.workout.exercises` 엔트리를 추가/갱신한다.
   - 추가 후 기존 `afterSelect`/`wtFocusWorkoutEntryCard()` 경로를 사용해 새 카드 캐러셀 포커스를 유지한다.

2. `render-calendar.js`, `calc.js`, `workout/save.js`, `workout/sessions.js`
   - 날짜 시트, 운동 상세, kcal 계산, 저장 정리, 실제 운동 세션 판정에서 cardio 엔트리를 보존하고 표시한다.
   - 유산소 상세 카드에는 kcal, 거리, 속도, 랩/반복을 한국어 라벨로 표시한다.

3. `style.css`
   - `런닝/조깅`, `유산소` activity tile figure와 하위 리스트, 유산소 카드, 상세 카드 스타일을 기존 picker/card 시스템에 맞춰 보정했다.

4. `sw.js`
   - `CACHE_VERSION`을 `tomatofarm-v20260706z8-cardio-picker-card`로 bump했다.

## 검증

1. PASS: `node --check workout/exercises.js`
2. PASS: `node --check render-calendar.js`
3. PASS: `node --check workout/save.js`
4. PASS: `node --check workout/sessions.js`
5. PASS: `node --check calc.js`
6. PASS: `node --test tests/running-entry.test.js tests/calc.score.test.js` - 74 pass.
7. PASS: `node --test tests/*.test.js` - 715 pass.
8. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=882`.
9. LSP diagnostics: TypeScript language server was unavailable and installation was declined, so this lane was not run.
10. PASS: `npm.cmd run deploy:production` - pushed `ef60f8672fe8` to `origin/main`.
11. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ ef60f8672fe8` - `[deploy-verify] ok ef60f8672fe8 tomatofarm-v20260706z8-cardio-picker-card static=242`.
12. PASS: deployed marker verification confirmed the cardio picker catalog, row selector, Korean input ids, read-card CSS, list CSS, and service worker cache marker are present on Pages.
13. BLOCKED: production in-app browser rendered `#login-screen` with no `currentUser`; the actual click flow cannot be completed without user login, creating external Firebase test data, or bypassing auth.

## 리뷰 결과

- Goal/constraint: PASS. 유산소 리스트, 한국어 입력, 기존 운동 카드/캐러셀 추가, cache bump 요구를 충족한다.
- Code quality: PASS. 새 저장 타입은 `cardio:` prefix와 `entry.cardio` payload로 경계를 분리했고, 기존 exercise array/save/card 흐름을 재사용한다.
- Security: PASS. 새 네트워크, 권한, secret, 외부 dependency는 없다. 입력값은 숫자/텍스트 카드 데이터로만 저장된다.
- QA: PARTIAL. 정적/단위/통합 테스트, 배포 검증, 배포 marker 검증은 통과했다. 최종 운영 UI flow는 로그인된 브라우저 세션에서만 직접 확인할 수 있다.

## 남은 운영 확인

1. 사용자가 in-app browser에서 로그인한다.
2. 배포 URL에서 운동 추가 picker 진입 -> `유산소` -> `스텝머신` -> 입력 저장 -> 새 유산소 카드 캐러셀 포커스를 확인한다.
3. 확인 후 이 리뷰의 QA 상태를 PASS로 갱신한다.

## 2026-07-06 후속 리뷰: picker 위계/이미지 Slice 2-3

### 리뷰 대상

- 계획: `docs/ai/features/2026-07-06-cardio-picker-card-entry.md` Slice 2, Slice 3
- 요청:
  1. `런닝/조깅`, `유산소`가 다른 근육 부위 렌더링처럼 보이게 하거나 전신 렌더링으로 맞춘다.
  2. `유산소` 상단탭을 다른 헬스 종목과 다른 사일로로 처리하지 않는다.
  3. 유산소 하위 종목별 이미지는 회색 톤 실제 기구/운동 제스처로 렌더링한다.
  4. `최근/빈도/이름` 필터 CSS는 기존 picker 스타일로 유지하고, row 오른쪽 기구명 chip은 표시하지 않는다.

### 구현 요약

1. `workout/exercises.js`
   - `data-picker-activity` 기반 타일을 제거하고 `PICKER_BODY_CATEGORIES`로 `런닝/조깅`, `유산소`를 category/muscle tile primitive에 통합했다.
   - cardio view 상단탭은 `분류`, 근육 탭, `런닝/조깅`, `유산소`를 같은 `ex-picker-tab` 계층으로 렌더링한다.
   - 활성 `유산소` 탭은 `scrollIntoView({ inline: 'center' })`로 모바일에서도 보이게 했다.
   - `CARDIO_PICKER_EXERCISES`에 종목별 image asset을 연결하고, cardio row는 `ex-picker-cardio-figure`를 우선 렌더링한다.
   - 이미지 로드 실패 시 기존 전신 `ex-picker-body-figure` fallback으로 대체한다.
   - picker row의 `로잉 머신`, `좌식 자전거` 등 기구명 chip은 제거했다.

2. `assets/workout/`
   - `assets/workout/muscles/full-body.png`를 추가해 런닝/유산소 category tile의 전신 렌더링에 사용한다.
   - `assets/workout/cardio/*.png` 6개를 추가했다: `rowing`, `recumbent-bike`, `step-machine`, `stationary-bike`, `indoor-cycling`, `treadmill-running`.
   - 이미지는 built-in `image_gen` contact sheet를 생성한 뒤 로컬에서 crop/chroma-key 제거/alpha PNG 후처리했다.

3. `style.css`
   - 전신/body category figure와 cardio row figure 크기를 row/tile 안에 고정했다.
   - cardio row grid를 이미지 + 텍스트 2열로 유지해 우측 detail chip 공간을 제거했다.
   - `최근/빈도/이름`은 기존 `.ex-picker-list-toolbar` / `.ex-picker-sort-btn` text-button CSS를 유지한다.

4. `sw.js`, tests
   - `CACHE_VERSION`을 `tomatofarm-v20260706z10-cardio-picker-images`로 bump했다.
   - `STATIC_ASSETS`에 full-body와 6개 cardio PNG를 추가했다.
   - `tests/workout-picker-cardio-hierarchy.test.js`를 추가하고 `tests/running-entry.test.js` 계약을 갱신했다.
   - cache marker 테스트들을 새 cache version으로 갱신했다.

### 검증

1. PASS: RED/GREEN `tests/workout-picker-cardio-hierarchy.test.js` - `.omo/evidence/exercise-picker-cardio/red-green-hierarchy-test.txt`.
2. PASS: cardio image asset validation - `.omo/evidence/exercise-picker-cardio/cardio-image-assets-validation.json`, alpha PNG, nonblank, green-key 잔여 0.
3. PASS: browser QA 375x812 - `.omo/evidence/exercise-picker-cardio/browser-category-after.json`, `picker-category-after.png`, `picker-cardio-after.png`.
4. PASS: browser QA JSON - `rowAssets` 6개 unique, `metaChipCount=0`, sort button `borderWidth=0px`, active `유산소` tab visible.
5. PASS: `node --check workout/exercises.js`.
6. PASS: `node --check sw.js`.
7. PASS: focused tests - `tests/workout-picker-cardio-hierarchy.test.js`, `tests/running-entry.test.js`, `tests/stats-picker-ui-polish.test.js`, `tests/workout-empty-picker-density.test.js`.
8. PASS: `node --test tests/*.test.js`.
9. PASS: `npm.cmd run verify:assets`.

### 리뷰 결과

- Goal/constraint: PASS. 위계 통합, 전신/category 렌더링, 종목별 회색 이미지, 필터 CSS 회복, 기구명 chip 제거 요구를 충족한다.
- Code quality: PASS. 기존 picker/list primitive를 재사용했고, 이미지 실패 fallback은 row 내부에 국한된다.
- Security: PASS. 새 네트워크 호출, 권한, 사용자 데이터 경로는 없다.
- QA: PASS for local/static/browser harness. Production Pages 배포 검증은 최종 커밋 후 수행한다.
- Slop/overfit/programming coverage: PASS. `.omo/evidence/cardio-picker-implementation-code-review.md`에서 `omo:remove-ai-slops` 관점(과적합 테스트, 삭제-only 테스트, implementation-mirroring, 불필요한 복잡도, scope drift)과 `omo:programming` 관점(최소 변경, 테스트 품질, 경계 준수)을 별도 검토했다. production code blocker는 없고, `tests/workout-picker-cardio-hierarchy.test.js`의 source-shape assertion은 browser/screenshot evidence 및 실제 렌더 경로 QA로 보강할 잔여 LOW risk로 기록했다.

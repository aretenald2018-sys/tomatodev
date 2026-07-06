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

## 리뷰 결과

- Goal/constraint: PASS. 유산소 리스트, 한국어 입력, 기존 운동 카드/캐러셀 추가, cache bump 요구를 충족한다.
- Code quality: PASS. 새 저장 타입은 `cardio:` prefix와 `entry.cardio` payload로 경계를 분리했고, 기존 exercise array/save/card 흐름을 재사용한다.
- Security: PASS. 새 네트워크, 권한, secret, 외부 dependency는 없다. 입력값은 숫자/텍스트 카드 데이터로만 저장된다.
- QA: PARTIAL. 정적/단위/통합 테스트는 통과했다. 최종 운영 UI flow는 배포 후 `https://aretenald2018-sys.github.io/tomatofarm/`에서 직접 확인해야 한다.

## 남은 운영 확인

1. `npm.cmd run deploy:production`
2. `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
3. 배포 URL에서 운동 추가 picker 진입 -> `유산소` -> `스텝머신` -> 입력 저장 -> 새 유산소 카드 캐러셀 포커스를 확인한다.

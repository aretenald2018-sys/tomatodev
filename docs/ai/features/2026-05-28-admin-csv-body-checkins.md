# 관리자 CSV 일일 체중 기록 누락 수정 계획

## 요청

- Discord 요청 `devreq_discord_1509445909984055366`
- 증상: 토마토 CSV에 일일 체중 기록이 나오지 않는다는 제보 확인 후, 실제 오류이면 수정하고 배포한다.

## 진단 결과

- 실제 오류가 존재한다.
- 체중 기록은 `users/{uid}/body_checkins` 컬렉션에 `date`, `weight`, `bodyFatPct`, `note` 형태로 저장된다.
- 관리자 데이터 로더 `render-admin.js`는 최근 30일 `workouts`만 수집하고 `body_checkins`를 수집하지 않는다.
- `admin/admin-export.js`의 `exportDailyActivity()`는 `date`, `dau`, `exerciseUsers`, `dietUsers`, `coreLoopUsers`만 CSV로 내보내므로 체중 기록이 CSV에 포함될 경로가 없다.

## 범위

### Slice 1: 관리자 CSV 체중 기록 포함

수정 대상:

- `render-admin.js`
- `admin/admin-export.js`
- `sw.js`

구현:

- 관리자 코어 데이터 로딩 시 최근 30일 `body_checkins`를 사용자별로 수집한다.
- 일일 CSV에 체중 기록 집계와 사람이 읽을 수 있는 일별 기록 문자열을 추가한다.
- 전체 CSV 내보내기에 상세 체중 기록 CSV를 추가한다.
- `sw.js`의 `STATIC_ASSETS`에 포함된 파일을 수정하므로 `CACHE_VERSION`을 bump한다.

하지 않을 것:

- Firebase 저장 구조 변경
- 사용자 체크인 입력 UX 변경
- `www/` 산출물 직접 수정
- unrelated dirty worktree 정리

## 검증 계획

- `node --check render-admin.js`
- `node --check admin/admin-export.js`
- `node --check sw.js`
- fixture로 `exportDailyActivity()`와 `exportBodyCheckins()`가 체중 기록 컬럼/파일을 생성하는지 확인
- 로컬 UI 검증은 장기 dev server를 Codex에서 띄우지 않고, 사용자 실행 명령과 검증 기준을 남긴다.

## 다음 실행

`Slice 1: 관리자 CSV 체중 기록 포함`을 실행한다.

## 실행 결과

- `render-admin.js`가 최근 30일 `users/{uid}/body_checkins`를 읽어 `bodyCheckinMap`, `bodyCheckins`를 관리자 데이터에 포함한다.
- `admin/admin-export.js`의 일일 CSV에 `weightCheckins`, `weightCheckinUsers`, `avgWeightKg`, `weightRecords` 컬럼을 추가했다.
- 전체 CSV 내보내기에 상세 체중 기록 파일 `tomatofarm_body_checkins_YYYY-MM-DD.csv`를 추가했다.
- `render-admin.js`, `admin/admin-export.js`가 `sw.js` `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION`을 `tomatofarm-v20260528z2-admin-csv-body-checkins`로 올렸다.

## 검증 결과

- 통과: `node --check render-admin.js`
- 통과: `node --check admin/admin-export.js`
- 통과: `node --check sw.js`
- 통과: fixture 기반 `exportDailyActivity()` / `exportBodyCheckins()` CSV 생성 검사
- not verified yet: Codex 세션에서 장기 dev server를 띄우지 않는 프로젝트 규칙 때문에 실제 브라우저 관리자 화면 다운로드 플로우는 사용자 로컬 터미널에서 확인해야 한다.

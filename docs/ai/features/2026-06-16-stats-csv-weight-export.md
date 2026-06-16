# 통계 CSV 몸무게 누락 수정 계획

## 상태

- 요청 ID: `devreq_discord_1516254571842900030`
- 요청자: 피노
- 상태: 완료
- 유형: 버그 수정 (`/diagnose`)

## 요청 요약

통계 CSV export에서 몸무게가 찍히지 않는다는 제보를 처리한다.

## 진단 결과

### 재현 루프

- 기존 산출물 `exports/tomatofarm_kim_taewoo_daily_to_2026-05-31.csv`를 검사했다.
- 결과: 전체 `71`행 중 `weight_kg`가 채워진 행은 `21`행, 빈 행은 `50`행이었다.
- 첫 누락 행: `2026-03-22`

### 원인 가설과 판정

1. `body_checkins` 자체가 저장되지 않는다.
   - 기각: `feature-checkin.js`는 `saveBodyCheckin({ date, weight, bodyFatPct })`로 저장하고, 샘플 `body_checkins` CSV에는 체중 값이 존재한다.
2. 어드민 CSV가 `body_checkins`를 읽지 않는다.
   - 기각: `render-admin.js`는 `users/{uid}/body_checkins`를 조회하고, `admin/admin-export.js`는 Daily/All CSV에 체중 컬럼을 포함한다.
3. 통계용 기록 export의 daily CSV가 체크인 당일 체중만 `weight_kg`에 쓰고, 체크인 없는 기록일에는 가장 최근 체중을 이어 쓰지 않는다.
   - 채택: `scripts/export-kim-taewoo-records.mjs`의 `dailyRows`는 `checkin.weight`만 사용한다. 같은 스크립트의 combined rows에는 `effective_weight_kg`가 있지만 daily CSV에는 없다.

## 실행 슬라이스

### Slice 1: daily CSV 체중 채움 보정

- `scripts/export-kim-taewoo-records.mjs`에서 체중 값 추출 헬퍼를 추가한다.
- 같은 날 체크인이 있으면 그 값을 `weight_kg`에 쓴다.
- 같은 날 체크인이 없으면 해당 날짜 이전의 최신 체크인을 `effective_weight_kg`로 계산하고, daily CSV의 `weight_kg`에도 채운다.
- daily CSV에 `weight_source_id`를 추가해 어떤 체크인을 사용했는지 확인 가능하게 한다.
- 기존 combined rows의 `effective_weight_kg`, `same_day_weights_kg`, `weight_source_id`도 같은 헬퍼를 사용해 필드명 변형에 더 견고하게 만든다.

### 제외 범위

- 앱 UI 변경
- Firestore 데이터 수정
- 관리자 콘솔 레이아웃 변경
- 분석 보고서 내용 변경

## 검증 계획

- `node --check scripts/export-kim-taewoo-records.mjs`
- 기존 CSV fixture로 daily CSV 누락 케이스를 재현한 뒤, 수정 로직에서 `weight_kg`가 최근 체크인 체중으로 채워지는지 Node 스모크 검증
- 가능하면 `node scripts/export-kim-taewoo-records.mjs 김_태우 "김_태우(guest)" 2026-05-31 kim_taewoo`를 실행해 새 daily CSV의 `weight_kg` 누락 수가 줄었는지 확인

## 실행 결과

- `scripts/export-kim-taewoo-records.mjs`에 체크인 체중 alias 헬퍼와 carry-forward 계산을 추가했다.
- daily CSV의 `weight_kg`는 같은 날 체크인이 있으면 해당 값을 쓰고, 없으면 이전 최신 체크인 체중을 쓴다.
- daily CSV 마지막 컬럼에 `weight_source_id`를 추가했다.
- combined rows의 `effective_weight_kg`, `same_day_weights_kg`, `weight_source_id`도 같은 헬퍼를 사용한다.

## 검증 결과

- `node --check scripts/export-kim-taewoo-records.mjs` 통과.
- `node scripts/export-kim-taewoo-records.mjs 김_태우 "김_태우(guest)" 2026-05-31 kim_taewoo` 실행 통과.
- 새 `exports/tomatofarm_kim_taewoo_daily_to_2026-05-31.csv`는 71행 중 `weight_kg` 66행이 채워졌다.
- 남은 빈 날짜 5개는 `2026-03-22`~`2026-03-26`이며, 첫 체크인 `2026-03-27` 이전이라 참조 가능한 체중 출처가 없다.

## 다음 세션

완료됐다. 후속 요청이 없으면 기존 보류 중인 테스트모드 v2 리뷰 흐름을 별도 세션에서 이어갈 수 있다.

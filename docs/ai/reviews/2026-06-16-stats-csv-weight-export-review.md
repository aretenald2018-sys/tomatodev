# 통계 CSV 몸무게 누락 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-16-stats-csv-weight-export.md`
- 변경: `scripts/export-kim-taewoo-records.mjs`
- 재생성 산출물: `exports/tomatofarm_kim_taewoo_*_to_2026-05-31.csv`

## 검증

- 문법 검사: `node --check scripts/export-kim-taewoo-records.mjs` 통과.
- 실제 export: `node scripts/export-kim-taewoo-records.mjs 김_태우 "김_태우(guest)" 2026-05-31 kim_taewoo` 통과.
- CSV 확인: 표준 CSV 파서 기준 daily CSV 71행 중 `weight_kg` 66행 채움, `weight_source_id` 66행 채움.
- 빈 날짜: `2026-03-22`~`2026-03-26`. 첫 체크인 `2026-03-27` 이전이라 채울 수 있는 체중 출처가 없다.

## 발견 사항

- 차단 이슈 없음.
- 변경은 통계 export 스크립트에 한정되어 앱 UI, Firestore 쓰기 경로, 서비스 워커 캐시에는 영향이 없다.
- `exports/`는 생성 산출물이며, 이번 검증에서 2026-05-31 기준 파일들이 다시 생성됐다.

## 결론

계획한 Slice 1은 완료됐다. daily CSV의 몸무게 누락은 체크인 이후 날짜 기준으로 해소됐다.

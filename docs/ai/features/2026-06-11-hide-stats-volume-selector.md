# 통계 종목 선택 칩 미표출 계획

## 요청

- Discord 요청 ID: `devreq_discord_1514507586240774166`
- 요청자: `피노`
- 원문: `파란부분 통계에서 미표출하게 바꿀것`
- 첨부 이미지 기준 파란 표시 영역: 통계 탭 `종목별 볼륨 추이 (kg × 횟수 × 세트)` 상단의 운동 종목 칩 목록

## 그릴 결과

- 핵심 질문: 파란 표시 영역이 통계 상단의 운동 종목 칩 목록인지?
- 확인: 첨부 이미지와 `render-stats.js`의 `_renderVolumeSection()`을 대조한 결과, `vol-selector`에 렌더링되는 종목별 버튼 목록이다.
- 결정: 통계 화면에서 `vol-selector` 칩 목록만 렌더링하지 않는다.
- 남은 가정: 기존 차트와 최근 기록 표는 유지한다. 선택 UI가 사라져도 기존 `_selectedExerciseId` 또는 첫 기록 종목으로 기본 표시한다.

## 실행 슬라이스

1. `render-stats.js`에서 `_renderVolumeSection()`의 종목 버튼 목록 렌더링을 제거한다.
2. `render-stats.js`가 `sw.js`의 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 함께 범프한다.
3. 로컬에서 통계 탭을 열어 HTTP 200과 종목 칩 미표출, 차트/최근 기록 유지 여부를 확인한다.
4. 배포 경로를 확인해 가능한 경우 배포하고 배포 URL에서 동일하게 검증한다.

## 비범위

- 종목별 볼륨 차트 삭제
- 최근 기록 표 삭제
- 심층통계 로직 변경
- 운동 기록 데이터 모델 변경

## 예상 변경 파일

- `render-stats.js`
- `sw.js`
- `docs/ai/NEXT_ACTION.md`
- 리뷰가 필요한 경우 `docs/ai/reviews/2026-06-11-hide-stats-volume-selector-review.md`

## 검증 기준

- 로컬 dev 서버 URL이 HTTP 200을 반환한다.
- 통계 탭의 `종목별 볼륨 추이` 블록에서 운동명 칩 목록이 보이지 않는다.
- 같은 블록에서 차트 canvas와 최근 기록 표는 계속 렌더링된다.
- `sw.js`의 `CACHE_VERSION`이 새 값으로 변경되어 캐시 갱신 조건을 만족한다.

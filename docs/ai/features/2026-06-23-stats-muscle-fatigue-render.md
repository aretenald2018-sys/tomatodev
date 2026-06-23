# 통계 탭 근육 피로도 렌더 보강

## 그릴 결과

- 핵심 질문: 첨부 스크린샷의 인체 렌더링을 어떻게 반영할 것인가?
- 결정: 스크린샷에서 전면/후면 인체 렌더만 잘라 정적 에셋으로 추가하고, 앱 데이터로 계산한 활성 근육을 그 위에 반투명 색상 오버레이로 표시한다.
- 결정: 스크린샷의 슬라이더는 구현하지 않는다. 대신 `일별`, `주별`, `월별` 버튼을 제공하고 클릭한 기간 기준으로 근육 활성도를 다시 계산한다.
- 결정: 기존 통계 탭의 `전체통계` 첫 화면 상단에 `근육 피로도` 섹션을 추가한다.
- 남은 가정: "운영계 반영 및 배포"는 기존 규칙대로 `tomatofarm` 원격 push와 GitHub Pages URL 확인으로 처리한다.

## 목표

첨부 이미지에 있는 통계 정보 중 현재 통계 탭에 없는 첫 화면형 근육 피로도 정보를 추가한다. 인체 렌더링은 첨부 이미지에서 추출한 에셋을 사용하고, 사용자는 `일별/주별/월별` 중 하나를 눌러 해당 기간에 활성화된 대근육을 색상으로 확인한다.

## Slice 1: 통계 탭 근육 피로도 카드 추가 및 운영 반영

변경 범위:

1. `assets/stats/muscle-fatigue-body.png`
2. `index.html`
3. `render-stats.js`
4. `style.css`
5. `sw.js`
6. `scripts/copy-www.js`
7. `docs/ai/NEXT_ACTION.md`
8. `docs/ai/reviews/2026-06-23-stats-muscle-fatigue-render-review.md`

하지 않을 것:

- 새 데이터 저장 필드나 Firestore 직접 호출을 추가하지 않는다.
- `www/` 산출물을 직접 수정하지 않는다.
- 첨부 이미지의 슬라이더 UI를 구현하지 않는다.
- 기존 통계 차트의 의미나 계산 방식을 리팩터링하지 않는다.

## 검증 계획

1. `node --check render-stats.js`
2. `node --check sw.js`
3. `git diff --check`
4. `npm.cmd run dev` 후 실제 URL에서 HTTP 200 확인
5. 통계 탭 진입 후 `근육 피로도` 카드가 보이고 `일별/주별/월별` 클릭 시 활성 버튼과 근육 오버레이가 바뀌는지 확인
6. `npm.cmd run build`로 운영 산출물 갱신
7. `git push tomatofarm main` 후 `https://aretenald2018-sys.github.io/tomatofarm/` HTTP 200 및 원격 `sw.js` 캐시 버전 확인

## 상태

- 2026-06-23: Slice 1 구현, 리뷰, `tomatofarm/main` 배포 및 운영 검증 완료.

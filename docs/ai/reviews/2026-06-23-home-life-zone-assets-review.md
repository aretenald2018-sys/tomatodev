# 홈탭 라이프존 아트 에셋 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 실행 범위: Slice 0 — 아트 에셋/슬롯 준비
- 변경 파일:
  - `assets/home/life-zone/base-room.png`
  - `assets/home/life-zone/manifest.json`
  - `assets/home/life-zone/sprites/*.png`
  - `assets/home/life-zone/sprites/source/*`
  - `scripts/process-life-zone-sprites.py`
  - `scripts/validate-life-zone-assets.py`
  - `docs/pixel-life-zone-mockup.html`
  - `docs/ai/NEXT_ACTION.md`

## 결론

치명적 문제는 발견하지 못했다. 동시 상태 배치를 위해 운동/식사/업무 각각 3개 슬롯을 갖는 base room, 9 pose sheet, 27개 actor sprite, slot manifest가 준비되었다.

## 확인한 내용

- `줍스`, `문정토마토`, `이재헌`은 같은 기본 캐릭터의 나시 색상만 빨강/파랑/초록 계열로 파생되었다.
- 운동 상태는 `workout-lat`, `workout-bench`, `workout-squat` 3개 슬롯으로 분산 가능하다.
- 식사 상태는 `diet-left`, `diet-center`, `diet-right` 3개 의자 슬롯으로 분산 가능하다.
- 업무 상태는 `office-upper`, `office-center`, `office-lower` 3개 업무 슬롯으로 분산 가능하다.
- `manifest.json`에는 base 크기, actor 목록, 상태별 슬롯 좌표와 sprite pose가 들어 있다.
- `docs/pixel-life-zone-mockup.html`은 단일 PNG가 아니라 base image + actor sprite overlay 방식으로 갱신되었다.

## 검증

- `python -m py_compile .\scripts\process-life-zone-sprites.py .\scripts\validate-life-zone-assets.py`
- `python -m json.tool .\assets\home\life-zone\manifest.json`
- `python .\scripts\validate-life-zone-assets.py`
  - 결과: `validated base=1672x941, sprites=27`
- `git diff --check`
  - 결과: 통과

## 잔여 리스크

- 브라우저 자동화에서 `file://` URL 접근이 정책으로 차단되어 mockup UI 클릭/시각 검증은 not verified yet이다.
- 실제 홈탭 카드 크기에서는 slot 좌표와 sprite scale을 미세 조정해야 할 수 있다. Slice 1에서 브라우저 dev server 기반으로 확인해야 한다.
- 실제 데이터 연결 전까지는 `줍스/문정토마토/이재헌`의 account id 매핑이 확정되지 않았다. Slice 2 전에 결정해야 한다.

## 다음 권장 액션

Slice 1에서 `assets/home/life-zone/manifest.json`을 기준으로 홈탭 `오늘의 칼로리/체중` 카드 위치를 라이프존 카드로 교체한다. 기존 칼로리/체중 정보는 카드 하단 compact summary로 이관한다.

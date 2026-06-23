# 홈 라이프존 외곽선 품질 보정 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-23-home-life-zone-card.md`
- 실행 범위: Slice 5 — 라이프존 base 외곽선 품질 보정
- 변경 파일:
  - `assets/home/life-zone/base-room-alpha.png`
  - `scripts/make-life-zone-base-alpha.py`
  - `scripts/validate-life-zone-assets.py`
  - `style.css`
  - `docs/pixel-life-zone-mockup.html`
  - `sw.js`
  - `docs/ai/features/2026-06-23-home-life-zone-card.md`

## 결론

치명적 문제는 발견하지 못했다. 홈 카드 축소 표시에서 거칠게 보이던 base room 외곽선은 smoothed mask 기반의 얇은 anti-aliased 갈색 outline으로 교체되었고, base 이미지는 브라우저 기본 보간으로 표시되도록 바뀌었다.

## 확인한 내용

- `scripts/make-life-zone-base-alpha.py`의 기존 `add_crisp_outline()`을 제거하고 `add_refined_outline()`로 교체했다.
- 새 outline은 정리된 alpha mask에서 얇은 crisp ring과 부드러운 soft ring을 합성한다.
- `assets/home/life-zone/base-room-alpha.png`를 재생성했다.
- `style.css`의 `.lz-base`는 `image-rendering:auto`로 변경했다.
- actor sprite의 `.lz-actor`는 기존처럼 `pixelated/crisp-edges`를 유지한다.
- `docs/pixel-life-zone-mockup.html`의 base preview도 `image-rendering:auto`로 맞췄다.
- `scripts/validate-life-zone-assets.py`는 단색 outline 픽셀 수가 아니라, anti-aliased 갈색 계열 outline 픽셀을 검사한다.
- `style.css`, `sw.js`, `assets/home/life-zone/base-room-alpha.png`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 `tomatofarm-v20260623-life-zone-soft-border`로 bump했다.

## 검증

- `python -m py_compile .\scripts\make-life-zone-base-alpha.py .\scripts\validate-life-zone-assets.py`
- `python .\scripts\validate-life-zone-assets.py`
  - 결과: `validated base=1672x941, sprites=27`
- `node --check .\home\life-zone.js`
- `node --check .\home\hero.js`
- `node --check .\home\index.js`
- `node --check .\home\tomato.js`
- `node --check .\sw.js`
- `node --test .\tests\home-life-zone-state.test.js`
  - 결과: 5개 테스트 통과
- `STATIC_ASSETS` 파일 존재 검사
  - 결과: `static assets exist: 191`
- `git diff --check`
  - 결과: 통과. CRLF 변환 경고만 출력됨.

## 시각 확인

- `C:\Users\USER\AppData\Local\Temp\life-zone-soft-border-preview.png`로 흰 배경 합성 preview를 생성해 확인했다.
- 바닥 하단과 벽 외곽의 단색 두꺼운 톱니가 줄고, 갈색 라인이 더 얇고 자연스럽게 보인다.

## not verified yet

브라우저 UI 플로우는 not verified yet이다. 정상 터미널에서 `npm.cmd run dev` 실행 후 홈탭 라이프존 카드에서 외곽선이 실제 카드 폭에서도 부드럽게 보이는지 확인해야 한다.

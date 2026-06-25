# 라이프존 확장 아트 에셋 리뷰

## 결론

- 결과: 이슈 없음
- 범위: `docs/ai/features/2026-06-25-life-zone-expanded-art-asset.md` Slice 1

## 확인 내용

- `assets/home/life-zone/base-room.png`와 `base-room-alpha.png`가 `1672x1672`로 교체됐다.
- `base-room-alpha.png`는 RGBA이며 네 모서리 alpha가 `0`이다.
- `manifest.json`, `home/life-zone.js`, `style.css`, `docs/pixel-life-zone-mockup.html`이 새 높이 기준을 사용한다.
- 기존 actor slot 좌표 값은 유지하고 y축 분모만 새 캔버스 높이로 바꿔, 상단 방의 기존 캐릭터 배치가 세로 확장 때문에 늘어지지 않게 했다.
- `sw.js`의 `STATIC_ASSETS` 대상 파일 변경에 맞춰 `CACHE_VERSION`을 bump했다.

## 검증

1. PASS: `python scripts/validate-life-zone-assets.py`
2. PASS: `node --check home/life-zone.js; node --check sw.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `git diff --check`
5. PASS: `assets/home/life-zone/base-room-alpha.png` 시각 확인 및 corner alpha 확인

## 남은 리스크

- 배포 URL에서 로그인 후 실제 홈 카드의 actor overlay와 말풍선 위치를 인증 계정으로 확인해야 한다.
- 이 체크아웃 규칙에 따라 최종 검증은 Dashboard3 Pages 배포 후 수행한다.

## 추가 수정 리뷰

- 사용자 실기기에서 기존 이미지 URL 캐시가 남아 신규 배경이 보이지 않고 actor 위치만 새 기준으로 계산되는 문제가 확인됐다.
- 수정: 앱 렌더 경로를 `base-room-expanded-alpha.png`로 변경해 기존 `base-room-alpha.png` 캐시와 분리했다.
- 수정: `sw.js` `STATIC_ASSETS`에 새 expanded 파일 2개를 추가하고 cache version을 `z51`로 bump했다.
- 확인 필요: Dashboard3 Pages 배포 후 `base-room-expanded-alpha.png`가 HTTP 200, `1672x1672`, RGBA alpha 포함으로 내려오는지 확인한다.

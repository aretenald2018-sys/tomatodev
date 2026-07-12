# 리팩토링 이후 기능 소유권

## 의존 방향

`UI/controller → domain service/pure model → data.js facade → data/data-api.js → repository → Firebase adapter` 순서만 허용한다. UI와 기능 모듈은 Firebase SDK나 `data/data-core.js`를 직접 import하지 않는다.

## 기능별 owner와 공개 경계

| 기능 | owner | 공개 경계 |
|---|---|---|
| 앱 shell·탭·overlay | `app/`, `navigation.js`, `app.js` | tab registry, overlay stack, `app:*` events |
| 운동 세션·세트 | `workout/` | `render-workout.js` facade와 명시적 module exports |
| 러닝·Wear | `workout/running-*`, `workout/wear-*` | running model/route store, versioned Wear payload |
| 식단·영양·사진 | `diet/`, `feature-nutrition.js`, `workout/ai-estimate.js` | canonical nutrition model, photo store, diet save schema |
| 홈·소셜 | `home/` | read models, action services, scoped UI binders |
| 캘린더·통계 | `calendar/`, `stats/`, `render-calendar.js`, `render-stats.js` | pure selectors/read models + render entrypoints |
| 관리자 | `admin/`, `render-admin.js` | admin repository API와 lazy render entrypoint |
| 데이터 | `data/`, `data.js` | `data.js` compatibility facade; 구현은 `data/` 내부 |
| 정적 runtime | `runtime-assets.js`, `sw.js`, `scripts/copy-www.js` | canonical asset manifest + cache namespace |
| 서버 알림 | `functions/services/`, `functions/lib/` | trigger → service → provider |

## 저장 schema와 호환성

- workout/diet/shared payload key는 `workout/save-schema.js`가 소유한다.
- 저장은 merge가 기본이며 replace는 명시적 승인 없이는 사용하지 않는다.
- `bPhoto`, `lPhoto`, `dPhoto`, `sPhoto`, `workoutPhoto`, 러닝 route/ref, 세트 meta를 round-trip에서 보존한다.
- 영양 항목은 canonical model로 계산하고 legacy 필드는 serializer가 함께 유지한다.
- Phone↔Wear payload는 version과 상한 검증을 통과한 뒤에만 저장한다.

## 변경·migration·rollback

1. schema 변경과 대형 UI 이동은 같은 배포에 섞지 않는다.
2. legacy reader를 먼저 배포하고, writer 전환 뒤 production read-back을 확인한다.
3. Firebase migration은 dry-run, 영향 수, backup/rollback hook을 제공해야 한다.
4. 코드 rollback은 해당 `origin/main` 커밋 revert 후 재배포하고 `verify:deploy`로 커밋을 확인한다.
5. runtime asset 변경은 `CACHE_VERSION`을 함께 올려 구 cache와 새 module graph가 섞이지 않게 한다.

## 허용 전역

비즈니스 기능 전역은 허용하지 않는다. 남는 전역은 Capacitor/Wear/PWA update·service-worker bridge 또는 `__` 접두사의 로컬 진단 도구뿐이며, 정확한 목록은 architecture test에서 관리한다.

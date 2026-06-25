// Service Worker for Dashboard3 (Life Streak)
// 오프라인 캐싱 및 PWA 기능 제공

// 캐시 버전: 타임스탬프 기반 자동 생성 — 파일 수정 시 SW 자동 업데이트
// (SW 파일 내용이 1바이트라도 바뀌면 브라우저가 새 SW로 인식)
const CACHE_VERSION = 'tomatofarm-v20260625z48-workout-sheet-drag-final-dy';
const RUNTIME_CACHE = 'dashboard3-runtime';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './build-info.json',
  './style.css',
  './styles/tokens.css',
  './styles/components.css',
  './firebase-messaging-sw.js',
  './assets/nav-icons/admin.svg',
  './assets/nav-icons/calendar.svg',
  './assets/nav-icons/cooking.svg',
  './assets/nav-icons/diet.svg',
  './assets/nav-icons/home.svg',
  './assets/nav-icons/more.svg',
  './assets/nav-icons/settings.svg',
  './assets/nav-icons/stats.svg',
  './assets/nav-icons/workout.svg',
  './assets/stats/muscle-fatigue-body.png',
  './assets/workout/muscles/abs.png',
  './assets/workout/muscles/back.png',
  './assets/workout/muscles/bicep.png',
  './assets/workout/muscles/chest.png',
  './assets/workout/muscles/glute.png',
  './assets/workout/muscles/lower.png',
  './assets/workout/muscles/shoulder.png',
  './assets/workout/muscles/tricep.png',
  // 코어 모듈
  './app.js',
  './app.js?v=20260620z27-selected-scope',
  './app.js?v=20260625z47-workout-record-card-standard',
  './data.js',
  './calc.js',
  './config.js',
  './ai.js',
  './ai/llm-core.js',
  './ai/muscles.js',
  './ai/diet-rec.js',
  './ai/nutrition.js',
  './ai/equipment.js',
  './ai/routine.js',
  './ai/meal-artifact-filter.js',
  './ai/meal-estimate.js',
  './modal-manager.js',
  // 렌더 모듈
  './render-home.js',
  './home/index.js',
  './home/utils.js',
  './home/hero.js',
  './home/guild-card.js',
  './home/welcome-back.js',
  './home/today-summary.js',
  './home/weekly-streak.js',
  './home/goals-quests.js',
  './home/unit-goal.js',
  './home/tomato.js',
  './home/life-zone.js',
  './home/life-zone-state.js',
  './home/character.js',
  './home/farm.js',
  './home/notifications.js',
  './home/friend-feed.js',
  './home/friend-profile.js',
  './home/cheer-card.js',
  './home/cheers-card.js',
  './render-workout.js',
  './render-workout.js?v=20260620z27-selected-scope',
  './render-workout.js?v=20260625z47-workout-record-card-standard',
  './workout/index.js',
  './workout/index.js?v=20260620z27-selected-scope',
  './workout/index.js?v=20260625z47-workout-record-card-standard',
  './workout/state.js',
  './workout/sessions.js',
  './workout/navigation-stack.js',
  './workout/save.js',
  './workout/save-pure.js',
  './workout/save-schema.js',
  './workout/cross-domain.js',
  './workout/render.js',
  './workout/load.js',
  './workout/status.js',
  './workout/exercises.js',
  './workout/exercises.js?v=20260625z47-workout-record-card-standard',
  './workout/timers.js',
  './workout/activity-forms.js',
  './workout/expert/onboarding.js',
  './workout/expert/migrate-gym-v1.js',
  './workout/expert/max.js',
  './workout/expert/max-wendler.js',
  // 테스트모드 v2 — 성장 보드 (workout/test-v2/)
  './test-mode-v2.css',
  './test-mode-v2.css?v=20260620z27-selected-scope',
  './workout/test-v2/entry.js',
  './workout/test-v2/entry.js?v=20260620z27-selected-scope',
  './workout/test-v2/board-core.js',
  './workout/test-v2/board-core.js?v=20260620z27-selected-scope',
  './workout/test-v2/board-render.js',
  './workout/test-v2/board-render.js?v=20260620z27-selected-scope',
  './workout/test-v2/onboarding.js',
  './workout/test-v2/onboarding.js?v=20260620z27-selected-scope',
  './workout/test-v2/wendler.js',
  './workout/expert/max-config.js',
  './workout/expert/max-same-day-advice.js',
  './workout/expert/max-cycle.js',
  './workout/expert/max-cycle-core.js',
  './workout/expert/max-cycle-render.js',
  './workout/expert/max-benchmark-picker.js',
  './calc/volume.js',
  './render-cooking.js',
  './render-stats.js',
  './render-admin.js',
  './admin/admin-hig.css',
  './admin/admin-segmentation.js',
  './admin/admin-outreach.js',
  // 분리 모듈
  './feature-nutrition.js',
  './feature-tutorial.js',
  './feature-diet-plan.js',
  './feature-diet-premium-report.js',
  './feature-checkin.js',
  './feature-misc.js',
  './workout-ui.js',
  './navigation.js',
  './pwa-fcm.js',
  // 모달 핸들러
  './app-modal-goals.js',
  './app-modal-quests.js',
  // 유틸리티
  './fatsecret-api.js',
  './sheet.js',
  './feature-login.js',
  './pwa-register.js',
  './utils/ux-polish.js',
  './utils/confirm-modal.js',
  './utils/form-guard.js',
  './utils/format.js',
  './utils/haptics.js',
  './utils/action-router.js',
  './utils/build-info.js',
  './home/personalize.js',
  './home/streak-warning.js',
  './home/admin-onboarding.js',
  // data 리팩토링 모듈
  './data/data-core.js',
  './data/data-load.js',
  './data/data-save.js',
  './data/data-pure.js',
  './data/data-auth.js',
  './data/data-account.js',
  './data/data-date.js',
  './data/data-image.js',
  './data/data-external.js',
  './data/data-helpers.js',
  './data/data-social.js',
  './data/data-social-friends.js',
  './data/data-social-guild.js',
  './data/data-social-interact.js',
  './data/data-social-log.js',
  './data/data-analytics.js',
  './data/body-checkins.js',
  './data/raw-ingredients.js',
  // 어드민 모듈
  './admin/admin-overview.js',
  './admin/admin-users.js',
  './admin/admin-social.js',
  './admin/admin-charts.js',
  './admin/admin-utils.js',
  './admin/admin-cache.js',
  './admin/admin-actions.js',
  './admin/admin-export.js',
  './admin/admin-cheers.js',
  './modals/weight-result-modal.js',
  './modals/guild-info-modal.js',
  './modals/settings-modal.js',
  './modals/self-cheer-modal.js',
  './modals/patchnote-modal.js',
  // 전문가 모드 (Scene 02~13)
  './expert-mode.css',
  './workout/expert.js',
  './data/data-workout-equipment.js',
  './data/data-equipment-pool.js',
  './modals/expert-onboarding-modal.js',
  './modals/gym-equipment-modal.js',
  './modals/routine-suggest-modal.js',
  './modals/routine-candidates-modal.js',
  './modals/insights-modal.js',
  './modals/max-onboarding-modal.js',
  // AI 음식 사진 추정 (2026-04-17 신규)
  './data/korean-food-normalize.js',
  './workout/ai-estimate.js',
  './modals/ai-estimate-banner.js',
  // AI 개인화 프로파일 (P1)
  './data/ai-food-profile.js',
  // 영양정보 리팩토링 (2026-04-18 신규)
  './data/nutrition-normalize.js',
  // 캘린더 탭 (2026-04-17 신규)
  './render-calendar.js',
  './modals/calendar-day-modal.js',
  './modals/custom-muscles-modal.js',
  './assets/home/life-zone/base-room.png',
  './assets/home/life-zone/base-room-alpha.png',
  './assets/home/life-zone/manifest.json',
  './assets/home/life-zone/sprites/jups-workout-lat.png',
  './assets/home/life-zone/sprites/jups-workout-bench.png',
  './assets/home/life-zone/sprites/jups-workout-squat.png',
  './assets/home/life-zone/sprites/jups-diet-left.png',
  './assets/home/life-zone/sprites/jups-diet-center.png',
  './assets/home/life-zone/sprites/jups-diet-right.png',
  './assets/home/life-zone/sprites/jups-office-upper.png',
  './assets/home/life-zone/sprites/jups-office-center.png',
  './assets/home/life-zone/sprites/jups-office-lower.png',
  './assets/home/life-zone/sprites/moonjung-tomato-workout-lat.png',
  './assets/home/life-zone/sprites/moonjung-tomato-workout-bench.png',
  './assets/home/life-zone/sprites/moonjung-tomato-workout-squat.png',
  './assets/home/life-zone/sprites/moonjung-tomato-diet-left.png',
  './assets/home/life-zone/sprites/moonjung-tomato-diet-center.png',
  './assets/home/life-zone/sprites/moonjung-tomato-diet-right.png',
  './assets/home/life-zone/sprites/moonjung-tomato-office-upper.png',
  './assets/home/life-zone/sprites/moonjung-tomato-office-center.png',
  './assets/home/life-zone/sprites/moonjung-tomato-office-lower.png',
  './assets/home/life-zone/sprites/lee-jaeheon-workout-lat.png',
  './assets/home/life-zone/sprites/lee-jaeheon-workout-bench.png',
  './assets/home/life-zone/sprites/lee-jaeheon-workout-squat.png',
  './assets/home/life-zone/sprites/lee-jaeheon-diet-left.png',
  './assets/home/life-zone/sprites/lee-jaeheon-diet-center.png',
  './assets/home/life-zone/sprites/lee-jaeheon-diet-right.png',
  './assets/home/life-zone/sprites/lee-jaeheon-office-upper.png',
  './assets/home/life-zone/sprites/lee-jaeheon-office-center.png',
  './assets/home/life-zone/sprites/lee-jaeheon-office-lower.png',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install event fired');
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      console.log('[SW] Caching static assets');
      // 개별 add + allSettled로 실패 파일명을 반드시 로깅한다.
      // (기존 addAll은 하나라도 실패하면 전체 롤백 + err.message에 파일명이 안 찍혀서 배포 디버깅 불가)
      const results = await Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url))
      );
      const failures = [];
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          failures.push({
            url: STATIC_ASSETS[i],
            error: (r.reason && r.reason.message) ? r.reason.message : String(r.reason)
          });
        }
      });
      if (failures.length) {
        console.error(`[SW] Precache failed for ${failures.length}/${STATIC_ASSETS.length} files:`);
        failures.forEach(f => console.error(`  - ${f.url}: ${f.error}`));
        throw new Error(`Precache failed for ${failures.length}/${STATIC_ASSETS.length} files`);
      } else {
        console.log(`[SW] Precached ${STATIC_ASSETS.length} assets successfully`);
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event fired');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // HTML, CSS, JS (네트워크 우선)
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname === '/' || url.pathname === '/tomatofarm/') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
        })
    );
    return;
  }

  // 이미지, 폰트 (캐시 우선)
  if (url.pathname.includes('fonts.googleapis') || url.pathname.match(/\.(woff2|woff|png|jpg|jpeg|svg|gif|ico)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        }).catch(() => caches.match(request));
      })
    );
    return;
  }

  // 기타 (네트워크 우선)
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

console.log('[SW] Service Worker loaded');

// ================================================================
// data/firestore-cache.js — Web Firestore 캐시 초기화 경계
// ================================================================

function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

/**
 * Web에서는 여러 PWA 탭이 같은 IndexedDB cache를 안전하게 공유해야 한다.
 * 지원하지 않는 WebView나 초기화 실패 시에는 Firestore의 memory cache로 복귀한다.
 */
export function createFirestoreWithMultiTabCache(app, {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  shouldUsePersistentCache = canUseIndexedDb,
  onCacheError = null,
} = {}) {
  if (!shouldUsePersistentCache()) return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    onCacheError?.(error);
    return getFirestore(app);
  }
}

const modulePromises = new Map();

export function resolveLazyModuleUrl(modulePath) {
  return new URL(modulePath, import.meta.url).href;
}

export function loadLazyModule(key, modulePath) {
  if (!modulePromises.has(key)) {
    modulePromises.set(key, import(resolveLazyModuleUrl(modulePath)).catch((error) => {
      modulePromises.delete(key);
      throw error;
    }));
  }
  return modulePromises.get(key);
}

export function hasLazyModule(key) {
  return modulePromises.has(key);
}

export function clearLazyModuleForTest(key) {
  modulePromises.delete(key);
}

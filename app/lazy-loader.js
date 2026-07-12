const modulePromises = new Map();

export function loadLazyModule(key, path) {
  if (!modulePromises.has(key)) {
    modulePromises.set(key, import(path).catch((error) => {
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

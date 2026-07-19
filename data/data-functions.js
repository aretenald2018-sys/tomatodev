// TomatoDev must never invoke callables from the production Firebase project.
// Keep this module import-free so merely loading a feature cannot instantiate a
// production callable proxy.

function _blockProductionCallable(callableName) {
  const error = new Error(
    `[TOMATODEV] Production Firebase callable "${callableName}" is disabled in TomatoDev.`,
  );
  error.code = 'TOMATODEV_PRODUCTION_CALLABLE_BLOCKED';
  throw error;
}

export async function callGeminiProxy(_payload) {
  _blockProductionCallable('geminiProxy');
}

export async function callOcrProxy(_payload) {
  _blockProductionCallable('ocrProxy');
}

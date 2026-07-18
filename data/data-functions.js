// TomatoDev callables remain disabled until they are deployed and verified in
// the dedicated development Firebase project.
// Keep this module import-free so merely loading a feature cannot instantiate a
// production callable proxy.

function _blockProductionCallable(callableName) {
  const error = new Error(
    `[TOMATODEV] Firebase callable "${callableName}" is not configured for TomatoDev.`,
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

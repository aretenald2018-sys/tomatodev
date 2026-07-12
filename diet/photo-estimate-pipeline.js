export const DIET_ESTIMATE_STATUS = Object.freeze({
  IDLE: 'idle', LOADING: 'loading', READY: 'ready',
  LOW_CONFIDENCE: 'low-confidence', EMPTY: 'empty', OFFLINE: 'offline', ERROR: 'error',
});

export class DietEstimatePipelineError extends Error {
  constructor(code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = 'DietEstimatePipelineError';
    this.code = code;
  }
}

export async function runDietPhotoEstimatePipeline(imageBase64, stages = {}) {
  if (!imageBase64) throw new DietEstimatePipelineError('IMAGE_REQUIRED', '분석할 사진이 없습니다.');
  if (typeof stages.estimate !== 'function') throw new DietEstimatePipelineError('ESTIMATOR_REQUIRED', '사진 분석기를 사용할 수 없습니다.');
  let estimate;
  try {
    estimate = await stages.estimate(imageBase64);
  } catch (error) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw new DietEstimatePipelineError(offline ? 'OFFLINE' : 'ESTIMATE_FAILED', offline ? '오프라인에서는 사진을 분석할 수 없습니다.' : '사진 분석에 실패했습니다.', error);
  }
  if (!estimate?.detectedItems?.length) throw new DietEstimatePipelineError('NO_FOOD', '음식을 찾지 못했습니다.');
  const trace = ['estimate'];
  for (const [name, stage] of [
    ['artifact-filter', stages.filterArtifacts],
    ['normalize', stages.normalize],
    ['prior', stages.applyPrior],
    ['portion-guard', stages.applyPortionGuard],
  ]) {
    if (typeof stage !== 'function') continue;
    estimate = stage(estimate);
    trace.push(name);
    if (!estimate?.detectedItems?.length) throw new DietEstimatePipelineError('NO_FOOD', '음식이 아닌 항목을 제외한 뒤 남은 음식이 없습니다.');
  }
  const confidence = Number(estimate.confidence);
  return {
    ...estimate,
    pipeline: trace,
    status: Number.isFinite(confidence) && confidence < 0.55 ? DIET_ESTIMATE_STATUS.LOW_CONFIDENCE : DIET_ESTIMATE_STATUS.READY,
  };
}

export function applyDietEstimateCorrections(estimate, corrections = {}, stages = {}) {
  let corrected = estimate;
  if (corrections.portion != null && typeof stages.scalePortion === 'function') {
    corrected = stages.scalePortion(corrected, corrections.portion);
  }
  if (Array.isArray(corrections.excludedNames) && corrections.excludedNames.length && typeof stages.excludeItems === 'function') {
    const names = new Set(corrections.excludedNames.map(name => String(name).trim().toLocaleLowerCase('ko-KR')));
    corrected = stages.excludeItems(corrected, item => names.has(String(item?.name || '').trim().toLocaleLowerCase('ko-KR')));
  }
  return { ...corrected, userCorrected: true };
}

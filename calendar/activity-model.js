function num(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function durationFromMinSec(min, sec) {
  return Math.max(0, Math.round(num(min) * 60 + num(sec)));
}

function fmtNum(value, digits = 1) {
  const number = num(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(num(seconds)));
  if (!total) return '';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours) return `${hours}시간 ${minutes}분`;
  if (minutes) return `${minutes}분`;
  return `${secs}초`;
}

export function buildCalendarActivityRows(day = {}, options = {}) {
  const rows = [];
  const trustedCalories = typeof options.isTrustedRunningCalories === 'function'
    ? options.isTrustedRunningCalories
    : () => false;
  const runSummary = day.runRouteSummary && typeof day.runRouteSummary === 'object' ? day.runRouteSummary : {};
  const runAccuracy = day.runGpsAccuracySummary || runSummary.gpsAccuracySummary || null;
  const runDuration = durationFromMinSec(day.runDurationMin, day.runDurationSec) || num(runSummary.durationSec);
  const runDistance = num(day.runDistance) || num(runSummary.distanceKm);
  const runMemo = String(day.runMemo || '').trim();
  const runSource = day.runSource || runSummary.source || 'manual';
  const runMode = String(day.runMode || runSummary.activityMode || '').trim();
  const runSpeedKmh = num(runSummary.speedKmh) || (runDuration > 0 && runDistance > 0 ? runDistance / (runDuration / 3600) : 0);
  const isManualCardio = runSource === 'manual-cardio' || runSummary.source === 'manual-cardio';
  if (day.running || runDistance > 0 || runDuration > 0 || runMemo) {
    const caloriesTrusted = trustedCalories(runSummary);
    rows.push({
      key: 'running', label: isManualCardio ? (runMode === 'walk' ? '걷기' : '유산소') : '러닝', tone: 'run',
      durationSec: runDuration, distanceKm: runDistance, speedKmh: runSpeedKmh,
      avgPaceSecPerKm: num(day.runAvgPaceSecPerKm) || num(runSummary.avgPaceSecPerKm),
      bestPaceSecPerKm: num(runSummary.bestPaceSecPerKm),
      calories: caloriesTrusted ? num(runSummary.calories) : 0,
      calorieSource: caloriesTrusted ? runSummary.calorieSource : null,
      elevationGainM: Number.isFinite(Number(runSummary.elevationGainM)) ? Number(runSummary.elevationGainM) : null,
      elevationLossM: Number.isFinite(Number(runSummary.elevationLossM)) ? Number(runSummary.elevationLossM) : null,
      cadenceSpm: Number(runSummary.cadenceSpm) > 0 ? Number(runSummary.cadenceSpm) : null,
      maxCadenceSpm: Number(runSummary.maxCadenceSpm) > 0 ? Number(runSummary.maxCadenceSpm) : null,
      avgHeartRateBpm: Number(runSummary.avgHeartRateBpm) > 0 ? Number(runSummary.avgHeartRateBpm) : null,
      maxHeartRateBpm: Number(runSummary.maxHeartRateBpm) > 0 ? Number(runSummary.maxHeartRateBpm) : null,
      elapsedDurationSec: num(runSummary.elapsedDurationSec) || runDuration,
      splits: Array.isArray(runSummary.splits) ? runSummary.splits : [],
      pointCount: num(runSummary.pointCount) || (Array.isArray(day.runRoute) ? day.runRoute.length : 0),
      segmentCount: num(runSummary.segmentCount), gapCount: num(runSummary.gapCount),
      interrupted: !!runSummary.interrupted || num(runSummary.gapCount) > 0,
      source: runSource, activityMode: runMode,
      route: Array.isArray(day.runRoute) ? day.runRoute : [], routeRef: day.runRouteRef || null,
      routeSummary: runSummary, placeSummary: day.runPlaceSummary || null, gpsAccuracySummary: runAccuracy,
      main: [runDistance > 0 ? `${fmtNum(runDistance, 2)}km` : '', formatDuration(runDuration)].filter(Boolean).join(' · '),
      detail: runMemo,
    });
  }

  const swimDuration = durationFromMinSec(day.swimDurationMin, day.swimDurationSec);
  const swimDistance = num(day.swimDistance);
  const swimStroke = String(day.swimStroke || '').trim();
  const swimMemo = String(day.swimMemo || '').trim();
  if (day.swimming || swimDistance > 0 || swimDuration > 0 || swimStroke || swimMemo) {
    rows.push({ key: 'swimming', label: '수영', tone: 'swim', durationSec: swimDuration,
      main: [swimDistance > 0 ? `${fmtNum(swimDistance, 1)}m` : '', formatDuration(swimDuration), swimStroke].filter(Boolean).join(' · '), detail: swimMemo });
  }
  const cfDuration = durationFromMinSec(day.cfDurationMin, day.cfDurationSec);
  const cfWod = String(day.cfWod || '').trim();
  const cfMemo = String(day.cfMemo || '').trim();
  if (day.cf || cfDuration > 0 || cfWod || cfMemo) {
    rows.push({ key: 'cf', label: '크로스핏', tone: 'cf', durationSec: cfDuration,
      main: [formatDuration(cfDuration), cfWod].filter(Boolean).join(' · '), detail: cfMemo });
  }
  const stretchDuration = Math.max(0, Math.round(num(day.stretchDuration) * 60));
  const stretchMemo = String(day.stretchMemo || '').trim();
  if (day.stretching || stretchDuration > 0 || stretchMemo) {
    rows.push({ key: 'stretching', label: '스트레칭', tone: 'stretch', durationSec: stretchDuration,
      main: formatDuration(stretchDuration), detail: stretchMemo });
  }
  return rows;
}

export function seriesDelta(series = []) {
  const values = series.map(point => Number(point?.value)).filter(value => Number.isFinite(value) && value > 0);
  if (values.length < 2) return { count: values.length, first: values[0] || 0, last: values.at(-1) || 0, pct: 0 };
  const first = values[0];
  const last = values.at(-1);
  return { count: values.length, first, last, pct: first > 0 ? (last - first) / first * 100 : 0 };
}

export function exercisePerformanceStatus(row, format = value => String(Math.round(value))) {
  const volume = seriesDelta(row?.volumeSeries);
  const e1rm = seriesDelta(row?.e1rmSeries);
  if ((Number(row?.sessionDays) || 0) < 2 || (volume.count < 2 && e1rm.count < 2)) return { tone: 'check', label: '점검필요', note: '표본 부족' };
  if ((e1rm.count >= 2 && e1rm.pct >= 2) || (volume.count >= 2 && volume.pct >= 10)) {
    return { tone: 'growth', label: '성장중', note: e1rm.count >= 2 ? `1RM ${e1rm.pct >= 0 ? '+' : ''}${format(e1rm.pct, 0)}%` : `볼륨 ${volume.pct >= 0 ? '+' : ''}${format(volume.pct, 0)}%` };
  }
  if ((e1rm.count >= 2 && e1rm.pct <= -5) || (volume.count >= 2 && volume.pct <= -25)) {
    return { tone: 'check', label: '점검필요', note: e1rm.count >= 2 ? `1RM ${format(e1rm.pct, 0)}%` : `볼륨 ${format(volume.pct, 0)}%` };
  }
  return { tone: 'steady', label: '유지중', note: volume.count >= 2 ? `볼륨 ${volume.pct >= 0 ? '+' : ''}${format(volume.pct, 0)}%` : '변화 작음' };
}

export function normalizeHealthValues(values = []) {
  const finite = values.filter(value => value !== null && value !== undefined && Number.isFinite(Number(value))).map(Number);
  if (!finite.length) return values.map(() => null);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  return values.map(value => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
    return span <= 0 ? 50 : (Number(value) - min) / span * 100;
  });
}

export function lastRecordedValue(values = []) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] !== null && values[index] !== undefined) return values[index];
  }
  return null;
}

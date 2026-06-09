export function bodyCheckinSequence(rec) {
  const m = String(rec?.id || '').match(/^ci_(\d+)$/);
  const n = m ? Number(m[1]) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function getEffectiveDailyBodyCheckins(list = []) {
  const byDate = new Map();
  const undated = [];

  list.forEach((rec) => {
    if (!rec?.date) {
      undated.push(rec);
      return;
    }

    const prev = byDate.get(rec.date);
    if (!prev || bodyCheckinSequence(rec) >= bodyCheckinSequence(prev)) {
      byDate.set(rec.date, rec);
    }
  });

  return [...undated, ...byDate.values()]
    .sort((a, b) => (
      (a?.date || '').localeCompare(b?.date || '')
      || bodyCheckinSequence(a) - bodyCheckinSequence(b)
      || String(a?.id || '').localeCompare(String(b?.id || ''))
    ));
}

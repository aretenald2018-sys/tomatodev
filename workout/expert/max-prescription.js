export function targetRirLabel(targetRpe) {
  const rir = Math.max(0, Math.min(9, 10 - (Number(targetRpe) || 8)));
  return Number.isInteger(rir) ? `RIR ${rir}` : `RIR ${rir.toFixed(1)}`;
}

export function workSetsOnly(sets = []) {
  return (sets || []).filter(set => {
    if (!set || set.setType === 'warmup') return false;
    if (set.done === true) return true;
    if (set.done === false) return false;
    return (set.kg || 0) > 0 && (set.reps || 0) > 0;
  });
}

export function roundToStep(kg, step) {
  const unit = Number(step) > 0 ? Number(step) : 2.5;
  return Math.round((Number(kg) || 0) / unit) * unit;
}

export function setE1rm(set = {}) {
  const kg = Number(set.kg) || 0;
  const reps = Number(set.reps) || 0;
  const rawRom = set.romPct === '' || set.romPct == null ? 100 : Number(set.romPct);
  const romFactor = Number.isFinite(rawRom) ? Math.max(0, Math.min(100, rawRom)) / 100 : 1;
  return (kg > 0 && reps > 0 ? kg * (1 + reps / 30) : 0) * romFactor;
}

export function buildMaxPrescription({
  cache = {}, exList = [], movement = null, exerciseId = null, todayKey = null,
  sessionType = 'high_volume', weakTarget = false,
} = {}) {
  if (!movement?.id) return null;
  const isHeavy = sessionType === 'heavy_volume';
  const isCore = movement.subPattern === 'core' || movement.primary === 'abs';
  const isLarge = movement.sizeClass === 'large';
  const targetSets = weakTarget ? 5 : 4;
  const repsLow = isCore ? 10 : (isHeavy ? (isLarge ? 6 : 8) : (isLarge ? 8 : 12));
  const repsHigh = isCore ? 15 : (isHeavy ? (isLarge ? 10 : 12) : (isLarge ? 12 : 18));
  const targetRpe = isHeavy ? 9 : 8;
  const step = Number(movement.stepKg) > 0 ? Number(movement.stepKg) : 2.5;
  const ids = new Set(exerciseId ? [exerciseId] : exList.filter(ex => ex?.movementId === movement.id).map(ex => ex.id));
  const sessions = Object.entries(cache)
    .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && (!todayKey || key !== todayKey))
    .sort(([a], [b]) => b.localeCompare(a));
  let bestSet = null;
  let lastDateKey = null;
  for (const [key, day] of sessions) {
    for (const entry of day?.exercises || []) {
      if (!ids.has(entry.exerciseId)) continue;
      const candidate = workSetsOnly(entry.sets)
        .map(set => ({ ...set, e1rm: setE1rm(set) }))
        .sort((a, b) => b.e1rm - a.e1rm)[0];
      if (candidate) {
        bestSet = candidate;
        lastDateKey = key;
        break;
      }
    }
    if (bestSet) break;
  }
  const targetReps = isHeavy ? repsLow : repsHigh;
  const pct = Math.max(0.55, Math.min(0.86, 1 - targetReps * 0.025 - (targetRpe >= 9 ? 0 : 0.03)));
  let startKg = bestSet ? roundToStep(setE1rm(bestSet) * pct, step) : 0;
  let action = isHeavy ? 'load' : (weakTarget || !isLarge ? 'volume' : 'hold');
  let deltaKg = 0;
  let reason = '과거 기록이 부족해 기본 처방으로 시작합니다.';
  let transparency = null;
  const evidence = [];
  if (bestSet) {
    const bestE1rm = setE1rm(bestSet);
    evidence.push({ label: '최근 기준 세트', value: `${lastDateKey?.slice(5).replace('-', '/') || '최근'} · ${Number(bestSet.kg) || 0}kg x ${Number(bestSet.reps) || 0}회` });
    evidence.push({ label: 'e1RM 환산', value: `${Math.round(bestE1rm * 10) / 10}kg x ${Math.round(pct * 100)}%` });
    if ((Number(bestSet.reps) || 0) >= repsHigh + 3) {
      action = 'load';
      deltaKg = step;
      startKg = startKg > 0 ? roundToStep(startKg + step, step) : startKg;
      reason = `상한보다 ${(Number(bestSet.reps) || 0) - repsHigh}회 더 가능해 증량 후보입니다.`;
    } else if (isHeavy && (Number(bestSet.reps) || 0) >= repsHigh) {
      action = 'load';
      reason = '중상볼륨 Day에서 목표 상한을 채워 소폭 증량이 적절합니다.';
    } else if (!isHeavy && (Number(bestSet.reps) || 0) >= repsHigh) {
      action = 'volume';
      reason = '고볼륨 Day에서는 같은 무게로 유효 세트 누적을 우선합니다.';
    } else {
      reason = '목표 반복 범위 안이므로 오늘 처방을 그대로 진행합니다.';
    }
    if (startKg > 0 && (Number(bestSet.kg) || 0) > 0 && startKg < Number(bestSet.kg)) {
      transparency = {
        type: 'rep_rpe_conversion', label: `지난 ${Number(bestSet.kg)}kg보다 낮아 보이는 이유`,
        detail: `${targetReps}회·${targetRirLabel(targetRpe)} 목표로 e1RM을 환산해 시작 무게를 낮췄어요.`,
      };
    } else if (deltaKg > 0) {
      transparency = {
        type: 'session_jump_limit', label: `오늘 증량폭 +${deltaKg}kg`,
        detail: '한 세션에서 무게를 크게 뛰우지 않고 반복 품질을 우선합니다.',
      };
    }
  } else {
    evidence.push({ label: '기록 상태', value: '최근 수행 기록 부족' });
  }
  const actionLabel = action === 'load' ? '증량' : (action === 'volume' ? '볼륨' : '유지');
  return {
    label: `${targetSets}세트 x ${repsLow}-${repsHigh}회 · ${targetRirLabel(targetRpe)}`,
    targetSets, repsLow, repsHigh, targetRpe, startKg, action, actionLabel, deltaKg,
    reason, transparency, evidence, lastDateKey,
    lastSet: bestSet ? { kg: Number(bestSet.kg) || 0, reps: Number(bestSet.reps) || 0, rpe: Number(bestSet.rpe) || null } : null,
    exerciseId: exerciseId || null, movementId: movement.id || null, weakTarget: !!weakTarget,
    sets: Array.from({ length: targetSets }, () => ({ kg: startKg || 0, reps: targetReps, setType: 'main', done: false, rpe: targetRpe })),
  };
}

export function detectMaxFixedMovements({
  cache = {}, exList = [], movements = [], todayKey = null, majors = [], lookbackSessions = 4, minHits = 2,
} = {}) {
  const majorSet = majors instanceof Set ? majors : new Set(majors || []);
  if (!majorSet.size) return [];
  const exById = new Map(exList.map(ex => [ex.id, ex]));
  const movById = new Map(movements.map(movement => [movement.id, movement]));
  const keys = Object.entries(cache)
    .filter(([key, day]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && (!todayKey || key < todayKey) && (day?.exercises || []).some(entry => {
      const movement = movById.get(entry.movementId || exById.get(entry.exerciseId)?.movementId);
      return movement && majorSet.has(movement.primary) && workSetsOnly(entry.sets).length > 0;
    }))
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, lookbackSessions)
    .map(([key]) => key);
  const counts = new Map();
  for (const key of keys) {
    const seen = new Set();
    for (const entry of cache?.[key]?.exercises || []) {
      const movement = movById.get(entry.movementId || exById.get(entry.exerciseId)?.movementId);
      if (movement && majorSet.has(movement.primary) && workSetsOnly(entry.sets).length > 0) seen.add(movement.id);
    }
    for (const movementId of seen) counts.set(movementId, (counts.get(movementId) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minHits)
    .map(([movementId, count]) => ({ ...movById.get(movementId), movementId, count, lookback: keys.length }))
    .filter(item => item.id)
    .sort((a, b) => b.count - a.count || (a.nameKo || '').localeCompare(b.nameKo || ''));
}

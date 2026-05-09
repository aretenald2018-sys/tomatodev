// ================================================================
// workout/expert/max-same-day-advice.js
// 동일 대근육 다음 Day 코칭 문구/세부 보완 분석
// ================================================================

import { calcSetVolume, SUBPATTERN_TO_MAJOR } from '../../calc.js';
import { MOVEMENTS, MAX_PREFERRED_CATEGORIES } from '../../config.js';
import {
  MAJOR_LABEL,
  SAME_DAY_DETAIL_LABEL,
  SAME_DAY_DETAIL_PARTS,
  WEAK_LABEL,
} from './max-config.js';

function _esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

function _normalizeMaxMajor(id) {
  if (!id) return null;
  return SUBPATTERN_TO_MAJOR[id] || (id === 'core' ? 'abs' : id);
}

function _formatShortDate(key) {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return key;
  return `${parseInt(m[1], 10)}/${parseInt(m[2], 10)}`;
}

export function detectMaxMajorsLoose(day, exList, movements = MOVEMENTS, fallbackEntries = []) {
  const out = new Set();
  const exById = new Map((exList || []).map(e => [e.id, e]));
  const movById = new Map((movements || []).map(m => [m.id, m]));
  const entries = (day?.exercises) || fallbackEntries || [];
  for (const entry of entries) {
    const ex = exById.get(entry.exerciseId);
    let major = null;
    const muscleIds = (ex && Array.isArray(ex.muscleIds) && ex.muscleIds.length)
      ? ex.muscleIds
      : (Array.isArray(entry?.muscleIds) ? entry.muscleIds : []);
    if (muscleIds.length > 0) {
      const sp = muscleIds[0];
      major = SUBPATTERN_TO_MAJOR[sp] || sp;
    }
    if (!major) {
      const movId = ex?.movementId || entry?.movementId || null;
      if (movId) {
        const mov = movById.get(movId);
        if (mov?.primary) major = mov.primary;
        else if (mov?.subPattern) major = SUBPATTERN_TO_MAJOR[mov.subPattern] || null;
      }
    }
    if (!major) {
      const legacy = ex?.muscleId || entry?.muscleId;
      if (legacy) major = SUBPATTERN_TO_MAJOR[legacy] || legacy;
    }
    if (major) out.add(major);
  }
  return out;
}

function _resolveMaxEntryMajor(entry, exById, movById) {
  const ex = exById.get(entry?.exerciseId);
  const muscleIds = (ex && Array.isArray(ex.muscleIds) && ex.muscleIds.length)
    ? ex.muscleIds
    : (Array.isArray(entry?.muscleIds) ? entry.muscleIds : []);
  if (muscleIds.length > 0) return _normalizeMaxMajor(SUBPATTERN_TO_MAJOR[muscleIds[0]] || muscleIds[0]);
  const movId = ex?.movementId || entry?.movementId || null;
  if (movId) {
    const mov = movById.get(movId);
    if (mov?.primary) return _normalizeMaxMajor(mov.primary);
    if (mov?.subPattern) return _normalizeMaxMajor(SUBPATTERN_TO_MAJOR[mov.subPattern] || mov.subPattern);
  }
  const legacy = ex?.muscleId || entry?.muscleId;
  return legacy ? _normalizeMaxMajor(SUBPATTERN_TO_MAJOR[legacy] || legacy) : null;
}

function _isMaxActualWorkSet(set) {
  if (!set || set.setType === 'warmup') return false;
  const kg = Number(set.kg) || 0;
  const reps = Number(set.reps) || 0;
  return set.done !== false && kg > 0 && reps > 0;
}

function _maxSameMuscleInsightStats(day, exList, majors, summary = null, movements = MOVEMENTS) {
  const majorSet = majors instanceof Set ? majors : new Set(majors || []);
  if (!majorSet.size) return null;
  const exById = new Map((exList || []).map(e => [e.id, e]));
  const movById = new Map((movements || []).map(m => [m.id, m]));
  let plannedSets = 0;
  let doneSets = 0;
  let plannedVolume = 0;
  let actualVolume = 0;
  let totalReps = 0;
  let topKg = 0;
  let entries = 0;
  let planEntries = 0;
  const names = [];

  for (const entry of day?.exercises || []) {
    const major = _resolveMaxEntryMajor(entry, exById, movById);
    if (!major || !majorSet.has(major)) continue;
    const ex = exById.get(entry?.exerciseId);
    const sets = entry.sets || [];
    const prescription = entry.maxPrescription || null;
    const workSets = sets.filter(_isMaxActualWorkSet);
    if (!workSets.length) continue;
    const name = ex?.name || entry.name || entry.exerciseId;
    if (name) names.push(name);
    const targetKg = Number(prescription?.startKg) || Number(workSets[0]?.kg) || 0;
    const targetReps = Number(prescription?.repsHigh) || Number(workSets[0]?.reps) || 0;
    const targetSets = Number(prescription?.targetSets) || 0;
    entries += 1;
    doneSets += workSets.length;
    actualVolume += workSets.reduce((sum, s) => sum + calcSetVolume(s), 0);
    totalReps += workSets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
    topKg = Math.max(topKg, ...workSets.map(s => Number(s.kg) || 0));
    if (prescription && targetSets > 0) {
      planEntries += 1;
      plannedSets += targetSets;
      plannedVolume += targetKg * targetReps * targetSets;
    }
  }

  if (!entries && !summary) return null;
  const fallbackWorkSets = Number(summary?.workSets) || 0;
  const fallbackVolume = Number(summary?.totalVolume) || 0;
  const workSets = doneSets || fallbackWorkSets;
  const totalVolume = Math.round(actualVolume || fallbackVolume);
  const hasPlan = planEntries > 0 && plannedSets > 0;
  return {
    entries,
    names,
    workSets,
    plannedSets: hasPlan ? plannedSets : null,
    doneSets: hasPlan ? doneSets : null,
    adherence: hasPlan ? Math.round((doneSets / plannedSets) * 100) : null,
    volumeDelta: hasPlan ? Math.round(actualVolume - plannedVolume) : null,
    totalVolume,
    topKg: topKg || Number(summary?.topKg) || 0,
    avgReps: workSets ? Math.round((totalReps / workSets) * 10) / 10 : 0,
  };
}

function _maxSameMuscleHistoryStats({ comparison, cache, exList, majors, movements } = {}) {
  return (comparison?.previous || []).slice(0, 2).map(prev => ({
    dateKey: prev.dateKey,
    ...(_maxSameMuscleInsightStats(cache?.[prev.dateKey], exList, majors, prev, movements) || {}),
  })).filter(s => s?.dateKey && (s.workSets || s.totalVolume));
}

function _finePartLabel(part) {
  return WEAK_LABEL[part] || SAME_DAY_DETAIL_LABEL[part] || part;
}

function _sameDayDetailGaps(comparison, majors) {
  const majorSet = majors instanceof Set ? majors : new Set(majors || []);
  const out = [];
  for (const major of majorSet) {
    const detailParts = SAME_DAY_DETAIL_PARTS[_normalizeMaxMajor(major)];
    if (!detailParts?.length) continue;
    const counts = Object.fromEntries(detailParts.map(part => [part, 0]));
    for (const session of comparison?.previous || []) {
      for (const part of detailParts) {
        counts[part] += Number(session?.subBalance?.[part]) || 0;
      }
    }
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    if (!total) continue;
    const gaps = detailParts
      .map(part => ({ part, sets: counts[part], ratio: counts[part] / total }))
      .filter(x => x.sets === 0 || x.ratio < 0.15)
      .sort((a, b) => a.sets - b.sets || a.ratio - b.ratio)
      .slice(0, 2);
    if (gaps.length) out.push({ major: _normalizeMaxMajor(major), total, gaps });
  }
  return out;
}

function _sameDayDetailMovementNames(parts = [], movements = MOVEMENTS) {
  const preferred = new Set(MAX_PREFERRED_CATEGORIES);
  const names = [];
  for (const part of parts) {
    const picked = (movements || [])
      .filter(m => m?.subPattern === part)
      .sort((a, b) => {
        const pa = preferred.has(a.equipment_category) ? 0 : 1;
        const pb = preferred.has(b.equipment_category) ? 0 : 1;
        return pa - pb || (a.nameKo || '').localeCompare(b.nameKo || '');
      })
      .slice(0, 1);
    for (const mov of picked) {
      const name = mov.nameKo || mov.id;
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return names.slice(0, 3);
}

function _renderSameDayDetailAdvice(comparison, majors, movements = MOVEMENTS) {
  const gaps = _sameDayDetailGaps(comparison, majors);
  if (!gaps.length) return '';
  const weakParts = gaps.flatMap(g => g.gaps.map(x => x.part));
  const movementNames = _sameDayDetailMovementNames(weakParts, movements);
  const summary = gaps.map(g => {
    const majorLabel = MAJOR_LABEL[g.major] || g.major;
    const parts = g.gaps.map(x => `${_finePartLabel(x.part)} ${x.sets}세트`).join(', ');
    return `${majorLabel} 안에서는 ${parts} 비중이 낮습니다`;
  }).join(' · ');
  const movementCopy = movementNames.length
    ? `추천 보강은 ${movementNames.join(' / ')} 중 1-2개를 벤치마크 뒤에 2-3세트입니다.`
    : '추천 보강은 해당 세부 부위 고립 또는 보조 종목을 벤치마크 뒤에 2-3세트입니다.';
  return `
    <div class="bench wt-v4-next-day-detail-row">
      <div>
        <b>세부 보완</b>
        <span>${_esc(summary)}.</span>
        <span>${_esc(movementCopy)}</span>
      </div>
      <strong class="warn">보강</strong>
    </div>
  `;
}

function _signedNum(n) {
  const v = Number(n) || 0;
  return `${v >= 0 ? '+' : ''}${v.toLocaleString()}`;
}

function _formatVolume(n) {
  return Math.round(Number(n) || 0).toLocaleString();
}

function _renderSameDaySessionRow(session, { label, status = '기록', statusClass = '' } = {}) {
  if (!session) return '';
  const parts = [
    `${session.workSets || 0}세트`,
    `${_formatVolume(session.totalVolume)}볼륨`,
  ];
  if (session.avgReps) parts.push(`평균 ${session.avgReps}회`);
  if (session.topKg) parts.push(`최고 ${session.topKg}kg`);
  return `
    <div class="bench">
      <div>
        <b>${_esc(label)} · ${_esc(_formatShortDate(session.dateKey))}</b>
        <span>${_esc(parts.join(' · '))}</span>
      </div>
      <strong class="${_esc(statusClass)}">${_esc(status)}</strong>
    </div>
  `;
}

function _renderSameDaySignalRow({ latest, setDelta, volumeDelta, repsDelta, good }) {
  const signals = [];
  if (latest.adherence != null) signals.push(`계획 이행률 ${latest.adherence}%`);
  if (latest.volumeDelta != null) signals.push(`계획 대비 볼륨 ${_signedNum(latest.volumeDelta)}`);
  if (setDelta != null) signals.push(`세트 ${_signedNum(setDelta)}`);
  if (volumeDelta != null) signals.push(`볼륨 ${_signedNum(volumeDelta)}`);
  if (repsDelta != null) signals.push(`평균 반복 ${_signedNum(repsDelta)}회`);
  if (!signals.length) return '';
  return `
    <div class="bench">
      <div>
        <b>다음 Day 판정</b>
        <span>${_esc(signals.join(' · '))}</span>
      </div>
      <strong class="${good ? '' : 'warn'}">${good ? '진행' : '조정'}</strong>
    </div>
  `;
}

export function renderNextSameMuscleDayAdvice({ comparison, cache, exList, majors, movements = MOVEMENTS } = {}) {
  const sessions = _maxSameMuscleHistoryStats({ comparison, cache, exList, majors, movements });
  const latest = sessions[0];
  if (!latest) return '';
  const prev = sessions[1] || null;
  const setDelta = prev ? latest.workSets - prev.workSets : null;
  const volumeDelta = prev ? latest.totalVolume - prev.totalVolume : null;
  const repsDelta = prev ? Math.round((latest.avgReps - prev.avgReps) * 10) / 10 : null;
  const planMiss = latest.adherence != null && latest.adherence < 90;
  const volumeDrop = volumeDelta != null && volumeDelta < 0;
  const repsDrop = repsDelta != null && repsDelta < -0.5;
  const setDrop = setDelta != null && setDelta <= -2;
  const good = !planMiss && !volumeDrop && !repsDrop && !setDrop;
  const copy = good
    ? '주요 벤치마크는 다음 주 계획대로 진행해도 됩니다. 미달 종목만 같은 중량으로 반복 품질을 먼저 맞추세요.'
    : '다음 동일 부위 Day에서는 증량보다 계획 반복수 회복을 우선하세요. 보강 종목은 2-3세트로 유지하는 편이 좋습니다.';
  const detailAdviceHtml = _renderSameDayDetailAdvice(comparison, majors, movements);
  return `
    <section class="card wt-v4-next-day-coach">
      <div class="card-head">
        <div>
          <b>다음 동일 부위 Day 제안</b>
          <span>직전 기록을 기준으로 다음 같은 부위 운동의 우선순위를 정리합니다.</span>
        </div>
        <div class="badge ${good ? '' : 'warn'}">${good ? '정상 페이스' : '조정 필요'}</div>
      </div>
      <div class="bench-list">
        ${_renderSameDaySessionRow(latest, { label: '직전 동일 부위', status: '기준' })}
        ${prev ? _renderSameDaySessionRow(prev, { label: '직직전 동일 부위', status: '비교', statusClass: 'muted' }) : ''}
        ${_renderSameDaySignalRow({ latest, setDelta, volumeDelta, repsDelta, good })}
        ${detailAdviceHtml}
      </div>
      <div class="coach">
        <b>다음 운동 처방</b>
        <p>${_esc(copy)}</p>
      </div>
    </section>
  `;
}

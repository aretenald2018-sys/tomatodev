import {
  escapeHtml, stageLabel, trajectoryLabel, trajectoryArrow, fmtDate,
} from './admin-utils.js';

let _peopleSort = 'streak_total';
let _peopleSortDir = 'desc';
let _peopleFilter = 'all';

function _sortIndicator(id) {
  if (_peopleSort !== id) return '';
  return _peopleSortDir === 'asc' ? ' ▲' : ' ▼';
}

function _streakForField(uid, dateKeys, workoutMap, field) {
  let streak = 0;
  for (let i = 0; i < dateKeys.length; i++) {
    if (workoutMap[dateKeys[i]]?.[uid]?.[field]) streak++;
    else break;
  }
  return streak;
}

function _contentStyle(uid, data) {
  const keys14 = data.dateKeys30.slice(0, 14);
  let exercise = 0;
  let diet = 0;
  keys14.forEach((key) => {
    const day = data.workoutMap[key]?.[uid];
    if (day?.exercise) exercise++;
    if (day?.diet) diet++;
  });
  const total = exercise + diet;
  if (total === 0) return '미참여';
  const ratio = exercise / total;
  if (ratio >= 0.65) return '운동형';
  if (ratio <= 0.35) return '식단형';
  return '균형형';
}

function _socialStyle(uid, data) {
  const likesOut = (data.lks || []).filter((x) => x.from === uid).length;
  const likesIn = (data.lks || []).filter((x) => x.to === uid).length;
  const gbOut = (data.gbs || []).filter((x) => x.from === uid).length;
  const gbIn = (data.gbs || []).filter((x) => x.to === uid).length;
  const sent = likesOut + gbOut;
  const received = likesIn + gbIn;
  if (sent + received === 0) return '미참여';
  if (sent >= received * 1.2) return '적극형';
  if (received > sent * 1.2) return '수동형';
  return '균형형';
}

function _userRowData(account, data) {
  const uid = account.id;
  const segment = data.userSegments[uid] || {};
  const key14 = data.dateKeys30.slice(0, 14);
  const workoutStreak = _streakForField(uid, key14, data.workoutMap, 'exercise');
  const dietStreak = _streakForField(uid, key14, data.workoutMap, 'diet');
  const activeDays = key14.reduce((sum, key) => sum + (data.workoutMap[key]?.[uid]?.any ? 1 : 0), 0);
  const name = account.nickname || `${account.lastName || ''}${account.firstName || ''}` || uid;

  return {
    uid,
    name,
    stage: segment.stage || '-',
    trajectory: segment.trajectory || '-',
    score: segment.score ?? 0,
    workoutStreak,
    dietStreak,
    streak_total: workoutStreak + dietStreak,
    activity_days: activeDays,
    content_type: _contentStyle(uid, data),
    social_type: _socialStyle(uid, data),
    last_login_at: account.lastLoginAt || 0,
  };
}

function _filteredRows(rows) {
  if (_peopleFilter === 'all') return rows;
  return rows.filter((row) => row.stage === _peopleFilter);
}

function _sortRows(rows) {
  const sorted = [...rows];
  const dir = _peopleSortDir === 'asc' ? 1 : -1;
  sorted.sort((a, b) => {
    let av = a[_peopleSort];
    let bv = b[_peopleSort];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return String(a.name).localeCompare(String(b.name));
  });
  return sorted;
}

function _setSort(key) {
  if (_peopleSort === key) {
    _peopleSortDir = _peopleSortDir === 'asc' ? 'desc' : 'asc';
    return;
  }
  _peopleSort = key;
  _peopleSortDir = (key === 'name' || key === 'stage' || key === 'trajectory' || key === 'content_type' || key === 'social_type')
    ? 'asc'
    : 'desc';
}

function _renderPeople(container, data) {
  const baseRows = data.realAccs.map((account) => _userRowData(account, data));
  const rows = _sortRows(_filteredRows(baseRows));

  container.innerHTML = `
    <div class="hig-rows">
      <div class="hig-segmented-control">
        ${[
          ['streak_total', '스트릭순'],
          ['activity_days', '활동일순'],
        ].map(([id, label]) => `<button type="button" class="${_peopleSort === id ? 'is-active' : ''}" data-admin-user-action="sort" data-sort-id="${id}">${label}</button>`).join('')}
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${[
          ['all', '전체'],
          ['new', 'New'],
          ['activated', 'Activated'],
          ['engaged', 'Engaged'],
          ['at-risk', 'At-Risk'],
          ['dormant', 'Dormant'],
        ].map(([id, label]) => `
          <button type="button" class="hig-action-chip" style="${_peopleFilter === id ? 'opacity:1;' : 'opacity:.55;'}" data-admin-user-action="filter" data-filter-id="${id}">${label}</button>
        `).join('')}
      </div>

      <div class="hig-table-wrap">
        <table class="hig-data-table">
          <thead>
            <tr>
              ${['name','stage','trajectory','score','workoutStreak','dietStreak','activity_days','content_type','social_type','last_login_at'].map((id, index) => `<th><button type="button" data-admin-user-action="sort" data-sort-id="${id}">${['이름','단계','궤적','점수','운동스트릭','식단스트릭','활동일(14d)','콘텐츠유형','소셜유형','마지막접속'][index]}${_sortIndicator(id)}</button></th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.name)}</td>
                <td>${stageLabel(row.stage)}</td>
                <td>${trajectoryArrow(row.trajectory)} ${trajectoryLabel(row.trajectory)}</td>
                <td>${row.score}</td>
                <td>${row.workoutStreak}</td>
                <td>${row.dietStreak}</td>
                <td>${row.activity_days}</td>
                <td>${row.content_type}</td>
                <td>${row.social_type}</td>
                <td>${fmtDate(row.last_login_at)}</td>
              </tr>
            `).join('') || `
              <tr><td colspan="10" style="color:var(--hig-gray1);">조건에 맞는 멤버가 없습니다.</td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.onclick = (event) => {
    const control = event.target.closest('[data-admin-user-action]');
    if (!control || !container.contains(control)) return;
    if (control.dataset.adminUserAction === 'sort') _setSort(control.dataset.sortId);
    if (control.dataset.adminUserAction === 'filter') _peopleFilter = control.dataset.filterId;
    _renderPeople(container, data);
  };
}

export function renderPeopleSection(container, data) {
  _renderPeople(container, data);
}

export const guildPickerState = {
  allGuildsCache: null,
  selectedGuilds: [],
};

export async function _loadAllGuilds() {
  if (guildPickerState.allGuildsCache) return guildPickerState.allGuildsCache;
  const { getAllGuilds } = await import('../data.js');
  guildPickerState.allGuildsCache = await getAllGuilds();
  return guildPickerState.allGuildsCache;
}

// prefix별 ID: {prefix}-guild-input, {prefix}-guild-suggestions, {prefix}-guild-chips
export async function searchGuildsFor(prefix) {
  const input = document.getElementById(prefix + '-guild-input');
  const sugBox = document.getElementById(prefix + '-guild-suggestions');
  if (!sugBox || !input) return;
  const q = (input.value || '').trim().toLowerCase();
  const guilds = await _loadAllGuilds();
  // 빈 쿼리일 때도 전체 목록 표시 (드롭다운)
  const filtered = guilds.filter(g => (!q || g.name.toLowerCase().includes(q)) && !guildPickerState.selectedGuilds.some(s => s.name === g.name));
  if (!filtered.length) { sugBox.style.display = 'none'; return; }
  sugBox.innerHTML = filtered.slice(0, 8).map(g =>
    `<div class="guild-suggest-item" data-login-action="select-guild" data-login-guild-prefix="${prefix}" data-guild-name="${g.name.replace(/"/g, '&quot;')}">
      <span>${g.name}</span><span style="font-size:11px;color:var(--text-tertiary);">${g.memberCount || 0}명</span>
    </div>`
  ).join('');
  sugBox.style.display = '';
}

export function selectGuildFor(prefix, name) {
  if (guildPickerState.selectedGuilds.some(g => g.name === name)) return;
  guildPickerState.selectedGuilds.push({ name, isNew: false });
  document.getElementById(prefix + '-guild-input').value = '';
  document.getElementById(prefix + '-guild-suggestions').style.display = 'none';
  _renderGuildChips(prefix + '-guild-chips');
}

export function addGuildChipFor(prefix) {
  const input = document.getElementById(prefix + '-guild-input');
  const name = (input?.value || '').trim();
  if (!name || guildPickerState.selectedGuilds.some(g => g.name === name)) { if (input) input.value = ''; return; }
  const existing = (guildPickerState.allGuildsCache || []).find(g => g.name === name);
  guildPickerState.selectedGuilds.push({ name, isNew: !existing });
  input.value = '';
  document.getElementById(prefix + '-guild-suggestions').style.display = 'none';
  _renderGuildChips(prefix + '-guild-chips');
}

export function removeGuildChip(name, containerId) {
  guildPickerState.selectedGuilds = guildPickerState.selectedGuilds.filter(g => g.name !== name);
  _renderGuildChips(containerId);
}

export function _renderGuildChips(containerId) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = guildPickerState.selectedGuilds.map((g, i) => {
    const pendingBadge = g.isNew ? '' : '<span class="guild-chip-badge pending">승인 대기</span>';
    const newBadge = g.isNew ? '<span class="guild-chip-badge new">새 길드</span>' : '';
    const primaryMark = i === 0 && g.isNew ? ' primary' : '';
    return `<span class="guild-chip${primaryMark}" title="${g.isNew ? '새로 만드는 길드 (바로 가입)' : '기존 길드 (승인 필요)'}">
      ${g.name}${pendingBadge}${newBadge}
      <button class="guild-chip-remove" data-login-action="remove-guild-chip" data-guild-name="${g.name.replace(/"/g, '&quot;')}" data-container-id="${containerId}">&times;</button>
    </span>`;
  }).join('');
}


// 클릭 외부 닫기
document.addEventListener('click', (e) => {
  ['signup-guild-suggestions', 'ob-guild-suggestions', 'gm-guild-suggestions'].forEach(id => {
    const box = document.getElementById(id);
    if (box && !e.target.closest('#' + id.replace('-suggestions', '-section').replace('gm-guild-section', 'guild-modal-input-section'))) {
      box.style.display = 'none';
    }
  });
});

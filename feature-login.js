import { showToast } from './ui/toast.js';
import { confirmAction } from './utils/confirm-modal.js';
import { openFriendProfile } from './home/friend-profile.js';
import { TOMATODEV_AUTH_STORAGE_KEYS } from './data.js';
// ================================================================
// feature-login.js — 로그인/가입/잠금/길드 온보딩 흐름
// ================================================================
// 로그인 화면과 동적 로그인 모달의 이벤트를 모듈 내부에서 직접 연결한다.
// 앱 세션 시작은 app:start-user-session 이벤트 계약으로 app.js에 요청한다.
// ================================================================
// 테마 토글
// ── 계정 시스템 ──
let _pendingAccount = null;

function _setLoginScreenVisible(visible) {
  const loginScreen = document.getElementById('login-screen');
  const loading = document.getElementById('loading');
  if (loginScreen) loginScreen.style.display = visible ? 'flex' : 'none';
  if (loading) {
    loading.style.display = visible ? 'none' : 'flex';
    loading.classList.toggle('hidden', visible);
  }
}

function _continueToAppAfterLogin() {
  _setLoginScreenVisible(false);
  return new Promise((resolve) => {
    document.dispatchEvent(new CustomEvent('app:start-user-session', { detail: { resolve } }));
  }).catch((error) => {
    console.error('[login] session bootstrap failed:', error);
    _setLoginScreenVisible(true);
    document.getElementById('login-status').textContent = '데이터를 불러오지 못했어요. 다시 시도해주세요.';
    return false;
  });
}

function _runDeferredLoginMaintenance() {
  // Account maintenance remains explicit even on the isolated development
  // backend so merely opening the login screen never rewrites credentials.
  console.info('[login] automatic account maintenance is disabled on TomatoDev');
}

function _needsPassword(account) {
  if (!account) return false;
  const flag = account.hasPassword;
  if (flag === true || flag === 'true' || flag === 1 || flag === '1') return true;
  if (flag === false || flag === 'false' || flag === 0 || flag === '0') return false;
  return !!account.passwordHash;
}

function _ownerProfileError() {
  const error = new Error('The authenticated TomatoDev owner profile could not be loaded');
  error.code = 'TOMATODEV_OWNER_PROFILE_MISSING';
  return error;
}

async function _clearFailedOwnerSession(dataApi = null) {
  const data = dataApi || await import('./data.js');
  try {
    await data.signOutTomatoDevFirebase();
  } catch {}
  data.setCurrentUser(null);
  localStorage.removeItem(TOMATODEV_AUTH_STORAGE_KEYS.adminAuthenticated);
  localStorage.removeItem(TOMATODEV_AUTH_STORAGE_KEYS.kimAuthenticated);
  data.clearAdminAuth();
  await data.waitForAuthPersistence();
}

async function _fetchAuthenticatedOwnerProfile(dataApi = null) {
  const data = dataApi || await import('./data.js');
  const accounts = await data.getAccountList();
  const account = accounts.find(candidate => candidate.id === data.getAdminId());
  if (!account) throw _ownerProfileError();
  return account;
}

async function _authenticateAndFetchOwner(password) {
  const data = await import('./data.js');
  try {
    await data.authenticateTomatoDevOwner(password);
    return await _fetchAuthenticatedOwnerProfile(data);
  } catch (error) {
    await _clearFailedOwnerSession(data);
    throw error;
  }
}

function _showLoadingUntilAppReady() {
  const loading = document.getElementById('loading');
  if (!loading) return;
  if (window.__tomatoAppReady) {
    loading.style.display = 'none';
    loading.classList.add('hidden');
    return;
  }
  loading.classList.remove('hidden');
  loading.style.display = 'flex';
  window.addEventListener('tomato-app-ready', () => {
    loading.style.display = 'none';
    loading.classList.add('hidden');
  }, { once: true });
}

function _runningDraftOwnerId(user) {
  return String((user && (user.uid || user.id || user.username || user.name)) || '_anon');
}

function _hasRestorableRunningDraftForUser(user) {
  if (!user || typeof localStorage === 'undefined') return false;
  const ownerId = _runningDraftOwnerId(user);
  const keys = [
    'tomatodev_running_session_draft_' + encodeURIComponent(ownerId),
    'tomatodev_running_session_draft_active',
  ];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let draft = JSON.parse(raw);
      if (draft?.draftKey) {
        const ownerKey = 'tomatodev_running_session_draft_' + encodeURIComponent(ownerId);
        if (draft.draftKey !== ownerKey) continue;
        const ownerRaw = localStorage.getItem(ownerKey);
        if (!ownerRaw) continue;
        draft = JSON.parse(ownerRaw);
      }
      const phase = String(draft?.phase || '');
      if (!['active', 'paused', 'summary'].includes(phase)) continue;
      if (String(draft?.ownerId || '') !== ownerId) continue;
      return true;
    } catch {}
  }
  return false;
}

async function initLoginScreen() {
  const data = await import('./data.js');

  // 이미 로그인된 사용자가 있으면 바로 진입 (localStorage → IndexedDB 순)
  // Firebase persistence is authoritative. A local profile is never restored
  // until the fixed, pre-provisioned owner session has settled and the profile
  // can be fetched through authenticated Firestore rules.
  try {
    const firebaseUser = await data.waitForTomatoDevFirebaseAuthReady();
    if (data.isTomatoDevFirebaseOwner(firebaseUser)) {
      const owner = await _fetchAuthenticatedOwnerProfile(data);
      data.setKimMode('guest');
      data.setCurrentUser(owner);
      localStorage.setItem(TOMATODEV_AUTH_STORAGE_KEYS.adminAuthenticated, 'true');
      data.backupAdminAuth();
      data.recordLogin();
      void _continueToAppAfterLogin();
      return;
    }
    await _clearFailedOwnerSession(data);
  } catch (error) {
    console.error('[login] restored Firebase owner profile failed:', error);
    await _clearFailedOwnerSession(data);
    const status = document.getElementById('login-status');
    if (status) status.textContent = 'Firebase 인증 또는 계정 정보를 확인하지 못했습니다. 다시 로그인해 주세요.';
  }
  // 이름 입력 시 실시간으로 기존 계정 체크
  const lastNameEl = document.getElementById('login-last-name');
  const firstNameEl = document.getElementById('login-first-name');
  let _checkTimer = null;

  function checkAccountExists() {
    const ln = lastNameEl.value.trim();
    const fn = firstNameEl.value.trim();
    const statusEl = document.getElementById('login-status');
    const pwSection = document.getElementById('login-pw-section');
    if (!ln || !fn) {
      pwSection.style.display = 'none';
      statusEl.textContent = '';
      return;
    }

    const rawId = `${ln}_${fn}`.toLowerCase().replace(/\s/g, '');
    const isFixedOwner = data.isAdminInstance(rawId) || rawId === data.getAdminId();
    const modeSection = document.getElementById('login-mode-section');
    if (modeSection) modeSection.style.display = 'none';
    if (isFixedOwner) {
      pwSection.style.display = 'block';
      statusEl.innerHTML = '<span style="color:var(--primary);">Firebase 비밀번호를 입력해주세요.</span>';
      return;
    }

    pwSection.style.display = 'none';
    statusEl.innerHTML = '<span style="color:#ef4444;">TomatoDev는 사전 등록된 소유자 계정만 로그인할 수 있습니다.</span>';
  }

  [lastNameEl, firstNameEl].forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(_checkTimer);
      _checkTimer = setTimeout(checkAccountExists, 300);
    });
    el.addEventListener('change', checkAccountExists);
    el.addEventListener('blur', checkAccountExists);
  });

  // 로딩 숨기기, 로그인 표시 후 원격 유지보수는 백그라운드에서 실행한다.
  _setLoginScreenVisible(true);
  _runDeferredLoginMaintenance();
}

async function selectAccount(accountId) {
  void accountId;
  document.getElementById('login-status').textContent = 'TomatoDev는 사전 등록된 소유자 계정만 로그인할 수 있습니다.';
  return false;
}

async function verifyAndLogin() {
  if (!_pendingAccount) { console.error('[login] _pendingAccount is null'); return; }
  const { setCurrentUser, setKimMode } = await import('./data.js');
  const pw = document.getElementById('login-pw-modal-input').value;

  let authenticatedOwner;
  try {
    authenticatedOwner = await _authenticateAndFetchOwner(pw);
  } catch (error) {
    document.getElementById('login-pw-modal-error').style.display = 'block';
    document.getElementById('login-pw-modal-error').textContent = error?.code === 'TOMATODEV_LOCAL_PASSWORD_INVALID'
      ? '비밀번호가 맞지 않아요'
      : 'Firebase 인증에 실패했어요. 잠시 후 다시 시도해주세요.';
    return;
  }

  setKimMode('guest');
  setCurrentUser(authenticatedOwner);
  document.getElementById('login-pw-modal').style.display = 'none';
  return _continueToAppAfterLogin();
}

function closePasswordModal() {
  document.getElementById('login-pw-modal').style.display = 'none';
  _pendingAccount = null;
}

function _loginActionTarget(eventTarget, selector) {
  const target = eventTarget instanceof Element ? eventTarget : eventTarget?.parentElement;
  return target?.closest?.(selector) || null;
}

function _isLoginBridgeScope(control) {
  return !!control?.closest?.('#login-screen, #login-pw-modal, #guild-onboarding-overlay, #dynamic-modal, #guild-modal');
}

function _loginGuildPrefix(control) {
  return control?.dataset?.loginGuildPrefix || 'signup';
}

function _runLoginAction(action, control, event = null) {
  let result;
  switch (action) {
    case 'create-account-login':
      result = createAccountAndLogin();
      break;
    case 'show-signup-view':
      result = showSignupView();
      break;
    case 'show-login-view':
      result = showLoginView();
      break;
    case 'toggle-signup-guild':
      result = toggleSignupGuild();
      break;
    case 'toggle-signup-pw':
      result = toggleSignupPw();
      break;
    case 'create-account-signup':
      result = createAccountFromSignup();
      break;
    case 'close-password-modal':
      result = closePasswordModal();
      break;
    case 'verify-and-login':
      result = verifyAndLogin();
      break;
    case 'search-guilds':
      result = searchGuildsFor(_loginGuildPrefix(control));
      break;
    case 'add-guild-chip':
      result = addGuildChipFor(_loginGuildPrefix(control));
      break;
    case 'select-guild':
      result = selectGuildFor(_loginGuildPrefix(control), control.dataset.guildName || '');
      break;
    case 'remove-guild-chip':
      result = removeGuildChip(control.dataset.guildName || '', control.dataset.containerId || '');
      break;
    case 'switch-kim-mode':
      result = switchKimMode(control.dataset.mode || '');
      break;
    case 'close-dynamic-modal':
      if (!event || event.target === control) document.getElementById('dynamic-modal')?.remove();
      break;
    case 'open-nickname-edit':
      result = openNicknameEdit();
      break;
    case 'open-own-profile':
      document.getElementById('dynamic-modal')?.remove();
      result = openFriendProfile(control.dataset.userId || '', control.dataset.userName || '');
      break;
    case 'confirm-logout':
      result = confirmLogout();
      break;
    case 'toggle-guild-primary':
      result = toggleGuildPrimary(control.dataset.guildName || '');
      break;
    case 'toggle-guild-members':
      result = toggleGuildMembers(control.dataset.guildName || '');
      break;
    case 'toggle-guild-icon-picker':
      result = toggleGuildIconPicker(control.dataset.guildName || '');
      break;
    case 'remove-guild':
      result = removeGuildFromModal(control.dataset.guildName || '');
      break;
    case 'transfer-leadership':
      result = transferLeadership(control.dataset.guildName || '', control.dataset.targetId || '', control.dataset.targetName || '');
      break;
    case 'kick-member':
      result = kickMember(control.dataset.guildName || '', control.dataset.targetId || '', control.dataset.targetName || '');
      break;
    case 'leave-guild':
      result = leaveGuildFromMembers(control.dataset.guildName || '');
      break;
    case 'leader-leave-guild':
      result = leaderLeaveGuild(control.dataset.guildName || '');
      break;
    case 'transfer-and-leave':
      result = transferAndLeave(control.dataset.guildName || '', control.dataset.targetId || '', control.dataset.targetName || '');
      break;
    case 'select-guild-icon':
      result = selectGuildIcon(control.dataset.guildName || '', control.dataset.icon || '');
      break;
    case 'close-guild-modal':
      result = closeGuildModal(control);
      break;
    case 'create-guild-modal':
      result = createGuildFromModal();
      break;
    case 'add-guild-modal':
      result = addGuildFromModal();
      break;
    case 'select-guild-modal':
      result = selectGuildForModal(control.dataset.guildName || '');
      break;
    case 'search-guilds-modal':
      result = searchGuildsForModal(control.value || '');
      break;
    case 'send-letter':
      result = sendLetter();
      break;
    case 'refresh-letter-status':
      result = renderLetterStatusList();
      break;
    default:
      return;
  }
  if (result && typeof result.catch === 'function') {
    result.catch((err) => console.error('[login-action]', err));
  }
}

function _bindLoginActions(root = document) {
  const doc = root.ownerDocument || root;
  if (doc.documentElement.dataset.loginActionsBound === '1') return;
  doc.documentElement.dataset.loginActionsBound = '1';

  doc.addEventListener('click', (event) => {
    const control = _loginActionTarget(event.target, '[data-login-action]');
    if (!control || !_isLoginBridgeScope(control)) return;
    event.preventDefault();
    event.stopPropagation();
    _runLoginAction(control.dataset.loginAction, control, event);
  }, true);

  doc.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const control = _loginActionTarget(event.target, '[data-login-enter-action]');
    if (!control || !_isLoginBridgeScope(control)) return;
    event.preventDefault();
    _runLoginAction(control.dataset.loginEnterAction, control, event);
  }, true);

  doc.addEventListener('input', (event) => {
    const control = _loginActionTarget(event.target, '[data-login-input-action]');
    if (!control || !_isLoginBridgeScope(control)) return;
    _runLoginAction(control.dataset.loginInputAction, control, event);
  }, true);

  doc.addEventListener('focusin', (event) => {
    const control = _loginActionTarget(event.target, '[data-login-focus-action]');
    if (!control || !_isLoginBridgeScope(control)) return;
    _runLoginAction(control.dataset.loginFocusAction, control, event);
  }, true);

  doc.addEventListener('change', (event) => {
    const control = _loginActionTarget(event.target, '[data-login-change-action]');
    if (!control || !_isLoginBridgeScope(control)) return;
    if (control.dataset.loginChangeAction === 'upload-guild-photo') {
      void uploadGuildPhoto(control.dataset.guildName || '', control);
    }
  }, true);
}

// 모드 선택 라디오 하이라이트
document.addEventListener('change', (e) => {
  if (e.target.name !== 'login-mode') return;
  document.querySelectorAll('#login-mode-section label').forEach(lbl => {
    const radio = lbl.querySelector('input[type="radio"]');
    lbl.style.borderColor = radio.checked ? 'var(--primary)' : 'transparent';
  });
});

// ── 로그인/가입 뷰 전환 ─────────────────────────────────────────
function showSignupView() {
  const status = document.getElementById('login-status');
  if (status) status.textContent = 'TomatoDev는 사전 등록된 소유자 계정만 로그인할 수 있습니다.';
  return false;
}
function showLoginView() {
  _selectedGuilds = [];
  document.getElementById('signup-view').style.display = 'none';
  document.getElementById('login-view').style.display = '';
  document.getElementById('login-last-name')?.focus();
}

// ── 가입 전용 함수 ─────────────────────────────────────────────
async function createAccountFromSignup() {
  const status = document.getElementById('signup-status') || document.getElementById('login-status');
  if (status) status.textContent = 'TomatoDev에서는 브라우저 계정 가입을 지원하지 않습니다.';
  return false;
}

// ── 가입 토글 (TDS Switch) ───────────────────────────────────────
function toggleSignupGuild() {
  const sw = document.getElementById('signup-guild-toggle');
  const field = document.getElementById('signup-guild-field');
  if (!sw || !field) return;
  const on = sw.classList.toggle('on');
  sw.setAttribute('aria-checked', on);
  field.style.display = on ? 'block' : 'none';
  if (on) {
    // 드롭다운 자동 노출 (기존 길드 리스트)
    const inp = document.getElementById('signup-guild-input');
    if (inp) inp.focus();
    _loadAllGuilds().then(() => searchGuildsFor('signup'));
  }
}
function toggleSignupPw() {
  const sw = document.getElementById('signup-pw-toggle');
  const field = document.getElementById('signup-pw-field');
  if (!sw || !field) return;
  const on = sw.classList.toggle('on');
  sw.setAttribute('aria-checked', on);
  field.style.display = on ? 'block' : 'none';
  if (on) document.getElementById('signup-new-password')?.focus();
}

// ── 길드 입력 헬퍼 (파라미터화: prefix = 'signup' | 'ob') ──────
let _allGuildsCache = null;
let _selectedGuilds = []; // [{name, isNew}]

async function _loadAllGuilds() {
  if (_allGuildsCache) return _allGuildsCache;
  const { getAllGuilds } = await import('./data.js');
  _allGuildsCache = await getAllGuilds();
  return _allGuildsCache;
}

// prefix별 ID: {prefix}-guild-input, {prefix}-guild-suggestions, {prefix}-guild-chips
async function searchGuildsFor(prefix) {
  const input = document.getElementById(prefix + '-guild-input');
  const sugBox = document.getElementById(prefix + '-guild-suggestions');
  if (!sugBox || !input) return;
  const q = (input.value || '').trim().toLowerCase();
  const guilds = await _loadAllGuilds();
  // 빈 쿼리일 때도 전체 목록 표시 (드롭다운)
  const filtered = guilds.filter(g => (!q || g.name.toLowerCase().includes(q)) && !_selectedGuilds.some(s => s.name === g.name));
  if (!filtered.length) { sugBox.style.display = 'none'; return; }
  sugBox.innerHTML = filtered.slice(0, 8).map(g =>
    `<div class="guild-suggest-item" data-login-action="select-guild" data-login-guild-prefix="${prefix}" data-guild-name="${g.name.replace(/"/g, '&quot;')}">
      <span>${g.name}</span><span style="font-size:11px;color:var(--text-tertiary);">${g.memberCount || 0}명</span>
    </div>`
  ).join('');
  sugBox.style.display = '';
}

function selectGuildFor(prefix, name) {
  if (_selectedGuilds.some(g => g.name === name)) return;
  _selectedGuilds.push({ name, isNew: false });
  document.getElementById(prefix + '-guild-input').value = '';
  document.getElementById(prefix + '-guild-suggestions').style.display = 'none';
  _renderGuildChips(prefix + '-guild-chips');
}

function addGuildChipFor(prefix) {
  const input = document.getElementById(prefix + '-guild-input');
  const name = (input?.value || '').trim();
  if (!name || _selectedGuilds.some(g => g.name === name)) { if (input) input.value = ''; return; }
  const existing = (_allGuildsCache || []).find(g => g.name === name);
  _selectedGuilds.push({ name, isNew: !existing });
  input.value = '';
  document.getElementById(prefix + '-guild-suggestions').style.display = 'none';
  _renderGuildChips(prefix + '-guild-chips');
}

function removeGuildChip(name, containerId) {
  _selectedGuilds = _selectedGuilds.filter(g => g.name !== name);
  _renderGuildChips(containerId);
}

function _renderGuildChips(containerId) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = _selectedGuilds.map((g, i) => {
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

async function createAccountAndLogin() {
  const lastName = document.getElementById('login-last-name').value.trim();
  const firstName = document.getElementById('login-first-name').value.trim();
  if (!lastName || !firstName) { showToast('성과 이름을 입력해주세요', 2500, 'warning'); return; }

  const { setCurrentUser, setKimMode } = await import('./data.js');
  const { getAdminId: _gAI, isAdminInstance: _isAI } = await import('./data.js');

  let newId;
  const _tryId = `${lastName}_${firstName}`.toLowerCase().replace(/\s/g, '');
  if (_isAI(_tryId) || _tryId === _gAI()) { newId = _gAI(); }
  else { newId = _tryId; }

  if (newId !== _gAI()) {
    document.getElementById('login-status').innerHTML = '<span style="color:#ef4444;">TomatoDev는 사전 등록된 소유자 계정만 로그인할 수 있습니다.</span>';
    return;
  }

  const pw = document.getElementById('login-password')?.value || '';
  if (!pw) { document.getElementById('login-password')?.focus(); return; }

  let found;
  try {
    // Authenticate the pre-provisioned Firebase owner before the protected
    // profile lookup performed by _authenticateAndFetchOwner.
    found = await _authenticateAndFetchOwner(pw);
  } catch (error) {
    console.warn('[login] fixed owner sign-in failed:', error?.code || error?.message || error);
    document.getElementById('login-status').innerHTML = '<span style="color:#ef4444;">Firebase 인증 또는 계정 정보 확인에 실패했습니다.</span>';
    return;
  }

  if (!found) {
    document.getElementById('login-status').innerHTML = '<span style="color:var(--text-tertiary);">계정이 없어요. 가입하기를 눌러주세요.</span>';
    return;
  }

  if (found) {
    try {
      setKimMode('guest');
    } catch (error) {
      const message = error?.code === 'TOMATODEV_LOCAL_PASSWORD_INVALID'
        ? '비밀번호가 맞지 않아요.'
        : 'Firebase 인증에 실패했어요. 네트워크를 확인해주세요.';
      document.getElementById('login-status').innerHTML = `<span style="color:#ef4444;">${message}</span>`;
      return;
    }
    setCurrentUser(found);
    const { backupAdminAuth: bkAuth, recordLogin: rl1 } = await import('./data.js');
    if (found.id === _gAI() || _isAI(found.id)) {
      localStorage.setItem(TOMATODEV_AUTH_STORAGE_KEYS.adminAuthenticated, 'true');
      bkAuth();
    } else {
      localStorage.removeItem(TOMATODEV_AUTH_STORAGE_KEYS.adminAuthenticated);
      localStorage.removeItem(TOMATODEV_AUTH_STORAGE_KEYS.kimAuthenticated);
    }
    rl1();
  } else {
    document.getElementById('login-status').innerHTML = '<span style="color:#ef4444;">TomatoDev 고정 소유자에 로컬 비밀번호가 필요해요.</span>';
    return;
  }

  return _continueToAppAfterLogin();
}

export async function logoutAccount() {
  const { getCurrentUser, setCurrentUser, isAdmin, isAdminGuest, getAccountList } = await import('./data.js');
  const user = getCurrentUser();
  const name = user ? `${user.lastName}${user.firstName}`.replace(/\(.*\)/, '') : '';
  const isKimTaewoo = isAdmin() || isAdminGuest();

  // 김태우 계정이면 모드 전환 옵션 추가
  let modeSwitch = '';
  if (isKimTaewoo) {
    const currentMode = isAdmin() ? 'Admin' : 'Guest';
    const otherMode = isAdmin() ? 'Guest' : 'Admin';
    const otherLabel = isAdmin() ? '게스트 모드로 전환' : '어드민 모드로 전환';
    modeSwitch = `
      <div style="border-top:1px solid var(--border);margin:16px -24px 0;padding:16px 24px 0;">
        <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:8px;">현재: ${currentMode} 모드</div>
        <button data-login-action="switch-kim-mode" data-mode="${otherMode}" style="width:100%;padding:12px;border-radius:var(--radius-md);border:1px solid var(--primary);background:var(--primary-bg);color:var(--primary);font-size:14px;font-weight:600;cursor:pointer;margin-bottom:8px;">${otherLabel}</button>
      </div>
    `;
  }

  document.getElementById('dynamic-modal')?.remove();
  const modal = document.createElement('div'); modal.id = 'dynamic-modal'; document.body.appendChild(modal);
  modal.innerHTML = `
    <div class="modal-backdrop" style="display:flex;z-index:10000;" data-login-action="close-dynamic-modal">
      <div class="modal-sheet" style="max-width:340px;padding:24px;text-align:center;">
        <div style="width:48px;height:48px;border-radius:50%;background:#fff3e0;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 12px;">🍅</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:2px;">${name || '계정'}</div>
        <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:12px;">
          별명: ${user?.nickname || name}
          <button data-login-action="open-nickname-edit" style="background:none;border:none;color:var(--primary);font-size:11px;font-weight:600;cursor:pointer;padding:0 4px;">변경</button>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <button data-login-action="open-own-profile" data-user-id="${user?.id || ''}" data-user-name="${name.replace(/"/g, '&quot;')}" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--text);font-size:12px;font-weight:500;cursor:pointer;">🏡 내 프로필</button>
        </div>
        ${modeSwitch}
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button data-login-action="close-dynamic-modal" style="flex:1;padding:12px;border-radius:999px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:14px;font-weight:600;cursor:pointer;">닫기</button>
          <button data-login-action="confirm-logout" style="flex:1;padding:12px;border-radius:999px;border:none;background:var(--surface2);color:var(--text-secondary);font-size:14px;font-weight:600;cursor:pointer;">계정 전환</button>
        </div>
      </div>
    </div>
  `;
}

async function confirmLogout() {
  const { setCurrentUser, clearAdminAuth, signOutTomatoDevFirebase, waitForAuthPersistence } = await import('./data.js');
  await signOutTomatoDevFirebase();
  setCurrentUser(null);
  localStorage.removeItem(TOMATODEV_AUTH_STORAGE_KEYS.adminAuthenticated);
  localStorage.removeItem(TOMATODEV_AUTH_STORAGE_KEYS.kimAuthenticated);
  clearAdminAuth();
  await waitForAuthPersistence();
  location.reload();
}

export async function switchKimMode(mode) {
  const { setKimMode } = await import('./data.js');
  setKimMode(mode === 'Admin' ? 'admin' : 'guest');
  document.getElementById('dynamic-modal')?.remove();
  document.dispatchEvent(new CustomEvent('tomatodev:kim-mode-changed', {
    detail: { mode: mode === 'Admin' ? 'admin' : 'guest' },
  }));
}

async function openNicknameEdit() {
  const { getCurrentUser, saveAccount, setCurrentUser } = await import('./data.js');
  const user = getCurrentUser();
  if (!user) return;
  const newNick = prompt('새 별명을 입력하세요', user.nickname || '');
  if (newNick === null || !newNick.trim()) return;
  user.nickname = newNick.trim();
  await saveAccount(user);
  setCurrentUser(user);
  document.getElementById('dynamic-modal')?.remove();
  location.reload();
}

// ── 길드 모달 (프로필 CRUD) ──────────────────────────────────────
let _guildModalGuilds = []; // [{name, status:'member'|'pending'}]
let _guildModalPrimary = null;
let _guildIconMap = {}; // guildName → icon emoji

const GUILD_ICON_OPTIONS = ['🏠','🏃','💪','🧘','🏋️','🚴','⚽','🎾','🏊','🥊','🧗','🎯','🔥','🌿','🍅','⭐'];

let _guildLeaderMap = {}; // guildName → leaderId
let _guildModalUserId = null;
let _guildModalSocialId = null; // admin/guest 매핑 적용된 소셜 ID

// 현재 유저가 해당 길드의 길드장인지 (admin/guest 매핑 포함)
function _isMyGuildLeader(guildName) {
  const leader = _guildLeaderMap[guildName];
  if (!leader) return false;
  return leader === _guildModalUserId || leader === _guildModalSocialId;
}

export async function openGuildModal() {
  const { getCurrentUser, getAllGuilds, isAdminGuest, getAdminId } = await import('./data.js');
  const user = getCurrentUser();
  if (!user) return;
  _guildModalUserId = user.id;
  _guildModalSocialId = isAdminGuest() ? getAdminId() : user.id;

  _allGuildsCache = await getAllGuilds();
  _guildIconMap = {};
  _guildLeaderMap = {};
  _allGuildsCache.forEach(g => {
    if (g.icon) _guildIconMap[g.name] = g.icon;
    if (g.leader || g.createdBy) _guildLeaderMap[g.name] = g.leader || g.createdBy;
  });

  _guildModalGuilds = [
    ...(user.guilds || []).map(g => ({ name: g, status: 'member' })),
    ...(user.pendingGuilds || []).map(g => ({ name: g, status: 'pending' })),
  ];
  _guildModalPrimary = user.primaryGuild || null;

  const modal = document.getElementById('guild-modal');
  if (modal) {
    modal.style.display = 'flex';
    _renderGuildModalList();
  }
}

function closeGuildModal(e) {
  if (e && e.target !== e.currentTarget) return;
  const modal = document.getElementById('guild-modal');
  if (modal) modal.style.display = 'none';
}

function _closeOtherGuildPanels(targetGuildName, panelType) {
  _guildModalGuilds.forEach(g => {
    const safeId = g.name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const membersEl = document.getElementById('gm-members-' + safeId);
    const iconEl = document.getElementById('gm-icon-picker-' + safeId);
    if (membersEl && !(panelType === 'members' && g.name === targetGuildName)) membersEl.style.display = 'none';
    if (iconEl && !(panelType === 'icon' && g.name === targetGuildName)) iconEl.style.display = 'none';
  });
}

function _renderGuildModalList() {
  const list = document.getElementById('guild-modal-list');
  if (!list) return;
  if (!_guildModalGuilds.length) {
    list.innerHTML = '<div class="gm-empty-state">아직 소속 길드가 없어요</div>';
    return;
  }
  list.innerHTML = _guildModalGuilds.map(g => {
    const isPrimary = g.name === _guildModalPrimary;
    const iconVal = _guildIconMap[g.name] || '🏠';
    const isPhoto = iconVal.startsWith('data:');
    const iconDisplay = isPhoto
      ? `<img src="${iconVal}">`
      : iconVal;
    const safeName = g.name.replace(/'/g, "\\'");
    const starBtn = g.status === 'member'
      ? `<button class="gm-primary-btn${isPrimary ? ' is-active' : ''}" data-login-action="toggle-guild-primary" data-guild-name="${safeName}" title="대표 길드 설정">${isPrimary ? '★' : '☆'}</button>`
      : '';
    const amLeader = g.status === 'member' && _isMyGuildLeader(g.name);
    const leaderBadge = amLeader ? ' <span class="guild-leader-badge">👑 길드장</span>' : '';
    const badge = g.status === 'pending'
      ? '<span class="guild-chip-badge pending">승인 대기 중</span>'
      : '';
    const memberBtn = g.status === 'member'
      ? `<button class="gm-action-pill" type="button" data-login-action="toggle-guild-members" data-guild-name="${safeName}">멤버보기</button>`
      : '';
    const iconBtn = g.status === 'member'
      ? `<button class="gm-icon-btn" type="button" data-login-action="toggle-guild-icon-picker" data-guild-name="${safeName}" title="탭하여 아이콘 변경">${iconDisplay}<span class="gm-icon-edit-badge">✎</span></button>`
      : `<span class="gm-icon-static">${iconDisplay}</span>`;
    const safeId = g.name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    return `<div>
      <div class="gm-guild-row">
        ${starBtn}${iconBtn}
        <div class="gm-guild-info"><span class="gm-guild-name${isPrimary ? ' is-primary' : ''}">${g.name}</span>${leaderBadge}${badge}</div>
        <div class="gm-guild-actions">
          ${memberBtn}
          <button class="gm-action-pill gm-remove" type="button" data-login-action="remove-guild" data-guild-name="${safeName}">삭제</button>
        </div>
      </div>
      <div class="gm-icon-picker" id="gm-icon-picker-${safeId}"></div>
      <div class="gm-members-panel" id="gm-members-${safeId}"></div>
    </div>`;
  }).join('');
}

async function toggleGuildMembers(guildName) {
  const safeId = guildName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
  const el = document.getElementById('gm-members-' + safeId);
  if (!el) return;
  if (getComputedStyle(el).display !== 'none') { el.style.display = 'none'; return; }
  _closeOtherGuildPanels(guildName, 'members');

  // 길드원 목록 + 길드장 정보 로드
  const { getAccountList: gal, getGuildLeader, getCurrentUser } = await import('./data.js');
  const accounts = await gal();
  const members = accounts.filter(a => (a.guilds || []).includes(guildName));
  const leaderId = await getGuildLeader(guildName);
  const currentUser = getCurrentUser();
  const amILeader = currentUser && (leaderId === currentUser.id || leaderId === _guildModalSocialId);

  if (!members.length) {
    el.innerHTML = '<div class="gm-member-row"><span class="gm-member-name" style="color:var(--text-tertiary);">길드원이 없어요</span></div>';
  } else {
    el.innerHTML = members.map(m => {
      const isLeader = m.id === leaderId;
      const name = m.nickname || (m.lastName + m.firstName);
      const leaderBadge = isLeader ? '<span class="guild-leader-badge">👑 길드장</span>' : '';
      const isMe = currentUser && (m.id === currentUser.id || (m.id === _guildModalSocialId));
      let actionBtns = '';
      const safeName = guildName.replace(/'/g, "\\'");
      if (amILeader && !isMe) {
        const safeTargetId = m.id.replace(/'/g, "\\'");
        const safeTargetName = name.replace(/'/g, "\\'");
        actionBtns = `<div class="gm-member-actions"><button class="guild-member-action transfer" data-login-action="transfer-leadership" data-guild-name="${safeName}" data-target-id="${safeTargetId}" data-target-name="${safeTargetName}">위임</button>
          <button class="guild-member-action kick" data-login-action="kick-member" data-guild-name="${safeName}" data-target-id="${safeTargetId}" data-target-name="${safeTargetName}">강퇴</button></div>`;
      } else if (isMe && !isLeader) {
        actionBtns = `<div class="gm-member-actions"><button class="guild-member-action kick" data-login-action="leave-guild" data-guild-name="${safeName}">탈퇴</button></div>`;
      } else if (isMe && isLeader) {
        actionBtns = `<div class="gm-member-actions"><button class="guild-member-action kick" data-login-action="leader-leave-guild" data-guild-name="${safeName}">탈퇴</button></div>`;
      }
      return `<div class="gm-member-row">
        <div class="gm-member-avatar">${name.charAt(0)}</div>
        <span class="gm-member-name">${name}${leaderBadge ? ' ' + leaderBadge : ''}</span>
        ${actionBtns}
      </div>`;
    }).join('');
  }
  el.style.display = 'block';
}

// 길드장 위임
async function transferLeadership(guildName, targetId, targetName) {
  const _ok = await (confirmAction({ title: '길드장 위임', message: `${targetName}님에게 길드장을 위임하시겠습니까?\n위임 후에는 되돌릴 수 없습니다.`, destructive: true, longPress: 2000 }) ?? Promise.resolve(confirm(`${targetName}님에게 길드장을 위임하시겠습니까?`)));
  if (!_ok) return;
  const { transferGuildLeadership } = await import('./data.js');
  const ok = await transferGuildLeadership(guildName, targetId);
  const { showToast: _st } = await import('./home/utils.js');
  if (ok) {
    _guildLeaderMap[guildName] = targetId;
    _st(`${targetName}님에게 길드장을 위임했어요`, 3000, 'success');
    _renderGuildModalList();
    // 멤버 목록 새로고침
    const safeId = guildName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const el = document.getElementById('gm-members-' + safeId);
    if (el) { el.style.display = 'none'; toggleGuildMembers(guildName); }
  } else {
    _st('위임에 실패했어요', 3000, 'error');
  }
}

// 길드원 강퇴
async function kickMember(guildName, targetId, targetName) {
  const _ok2 = await (confirmAction({ title: '길드원 강퇴', message: `정말 ${targetName}님을 강퇴하시겠습니까?`, destructive: true, longPress: 2000 }) ?? Promise.resolve(confirm(`정말 ${targetName}님을 강퇴하시겠습니까?`)));
  if (!_ok2) return;
  const { kickGuildMember } = await import('./data.js');
  const ok = await kickGuildMember(guildName, targetId);
  const { showToast: _st } = await import('./home/utils.js');
  if (ok) {
    _st(`${targetName}님을 내보냈어요`, 3000, 'success');
    // 멤버 목록 새로고침
    const safeId = guildName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const el = document.getElementById('gm-members-' + safeId);
    if (el) { el.style.display = 'none'; toggleGuildMembers(guildName); }
  } else {
    _st('강퇴에 실패했어요. 길드장만 강퇴할 수 있어요.', 3000, 'error');
  }
}

// 일반 멤버 자진 탈퇴
async function leaveGuildFromMembers(guildName) {
  const _ok3 = await (confirmAction({ title: '길드 탈퇴', message: `${guildName} 길드에서 탈퇴할까요?`, destructive: true, longPress: 2000 }) ?? Promise.resolve(confirm(`${guildName} 길드에서 탈퇴할까요?`)));
  if (!_ok3) return;
  const { getCurrentUser, saveAccount, setCurrentUser, updateGuildMemberCount } = await import('./data.js');
  const user = getCurrentUser();
  if (!user) return;
  user.guilds = (user.guilds || []).filter(g => g !== guildName);
  user.pendingGuilds = (user.pendingGuilds || []).filter(g => g !== guildName);
  if (user.primaryGuild === guildName) {
    user.primaryGuild = user.guilds.length > 0 ? user.guilds[0] : null;
  }
  await saveAccount(user);
  setCurrentUser(user);
  await updateGuildMemberCount(guildName, -1);
  // 모달 상태도 동기화
  _guildModalGuilds = _guildModalGuilds.filter(g => g.name !== guildName);
  if (_guildModalPrimary === guildName) {
    const first = _guildModalGuilds.find(g => g.status === 'member');
    _guildModalPrimary = first ? first.name : null;
  }
  _renderGuildModalList();
  const { showToast: _st } = await import('./home/utils.js');
  _st(`${guildName}에서 탈퇴했어요`, 3000, 'success');
}

// 길드장 탈퇴: 위임할 사람 선택 후 탈퇴
async function leaderLeaveGuild(guildName) {
  const { getAccountList } = await import('./data.js');
  const accounts = await getAccountList();
  const members = accounts.filter(a => (a.guilds || []).includes(guildName) && a.id !== _guildModalUserId && a.id !== _guildModalSocialId);

  if (!members.length) {
    // 혼자 남은 길드장 → 그냥 탈퇴
    const _ok4 = await (confirmAction({ title: '길드 탈퇴', message: `${guildName}의 마지막 멤버입니다. 탈퇴하면 길드가 비게 됩니다. 탈퇴할까요?`, destructive: true, longPress: 2000 }) ?? Promise.resolve(confirm(`${guildName}의 마지막 멤버입니다. 탈퇴하면 길드가 비게 됩니다. 탈퇴할까요?`)));
    if (!_ok4) return;
    await leaveGuildFromMembers(guildName);
    return;
  }

  // 위임할 멤버 선택 UI
  const safeId = guildName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
  const el = document.getElementById('gm-members-' + safeId);
  if (!el) return;

  const safeName = guildName.replace(/'/g, "\\'");
  const memberList = members.map(m => {
    const name = m.nickname || (m.lastName + m.firstName);
    return `<button class="guild-member-action transfer" data-login-action="transfer-and-leave" data-guild-name="${safeName}" data-target-id="${m.id.replace(/"/g, '&quot;')}" data-target-name="${name.replace(/"/g, '&quot;')}">${name}에게 위임</button>`;
  }).join('');

  el.innerHTML = `<div class="gm-transfer-panel">
    <div class="gm-transfer-title">길드장을 위임할 멤버를 선택하세요</div>
    <div class="gm-transfer-list">${memberList}</div>
    <button class="guild-member-action kick" style="margin-top:8px;" data-login-action="toggle-guild-members" data-guild-name="${safeName}">취소</button>
  </div>`;
}

// 위임 후 탈퇴
async function transferAndLeave(guildName, newLeaderId, newLeaderName) {
  const _ok5 = await (confirmAction({ title: '위임 후 탈퇴', message: `${newLeaderName}님에게 길드장을 위임하고 탈퇴할까요?`, destructive: true, longPress: 2000 }) ?? Promise.resolve(confirm(`${newLeaderName}님에게 길드장을 위임하고 탈퇴할까요?`)));
  if (!_ok5) return;
  const { transferGuildLeadership } = await import('./data.js');
  const ok = await transferGuildLeadership(guildName, newLeaderId);
  if (!ok) {
    const { showToast: _st } = await import('./home/utils.js');
    _st('위임에 실패했어요', 3000, 'error');
    return;
  }
  _guildLeaderMap[guildName] = newLeaderId;
  await leaveGuildFromMembers(guildName);
}

function toggleGuildIconPicker(guildName) {
  const safeId = guildName.replace(/[^a-zA-Z0-9가-힣]/g, '_');
  const el = document.getElementById('gm-icon-picker-' + safeId);
  if (!el) return;
  if (getComputedStyle(el).display !== 'none') { el.style.display = 'none'; return; }
  _closeOtherGuildPanels(guildName, 'icon');
  const safeName = guildName.replace(/'/g, "\\'");
  el.innerHTML = `<div class="gm-icon-grid">${
    GUILD_ICON_OPTIONS.map(ic =>
      `<button class="gm-icon-option${_guildIconMap[guildName] === ic ? ' is-selected' : ''}" type="button" data-login-action="select-guild-icon" data-guild-name="${safeName}" data-icon="${ic}">${ic}</button>`
    ).join('')
  }
  <label class="gm-icon-upload" title="사진 업로드">
    📷<input type="file" accept="image/*" data-login-change-action="upload-guild-photo" data-guild-name="${safeName}">
  </label>
  </div>`;
  el.style.display = 'block';
}

async function selectGuildIcon(guildName, icon) {
  _guildIconMap[guildName] = icon;
  const { updateGuildIcon } = await import('./data.js');
  await updateGuildIcon(guildName, icon);
  _renderGuildModalList();
  const { showToast: _st } = await import('./home/utils.js');
  _st('아이콘이 변경되었어요', 2000, 'success');
}

async function uploadGuildPhoto(guildName, input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 500 * 1024) {
    const { showToast: _st } = await import('./home/utils.js');
    _st('사진이 너무 커요. 500KB 이하로 올려주세요.', 3000, 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    // 32x32 크기로 리사이즈
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2, sy = (img.height - size) / 2;
      ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 64, 64);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      _guildIconMap[guildName] = dataUrl;
      const { updateGuildIcon } = await import('./data.js');
      await updateGuildIcon(guildName, dataUrl);
      _renderGuildModalList();
      const { showToast: _st } = await import('./home/utils.js');
      _st('사진이 설정되었어요', 2000, 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}


async function toggleGuildPrimary(name) {
  const g = _guildModalGuilds.find(x => x.name === name);
  if (!g || g.status !== 'member') return;
  _guildModalPrimary = _guildModalPrimary === name ? null : name;
  _renderGuildModalList();
  await syncGuildModalState({ successMessage: _guildModalPrimary ? `${name}을(를) 대표 길드로 설정했어요` : '대표 길드 설정을 해제했어요', successType: 'success', refreshCache: false });
}

async function removeGuildFromModal(name) {
  const guildEntry = _guildModalGuilds.find(g => g.name === name);
  const isPending = guildEntry && guildEntry.status === 'pending';

  if (!isPending) {
    // 정식 멤버 → 탈퇴
    if (_isMyGuildLeader(name)) {
      const { showToast: _st } = await import('./home/utils.js');
      _st('길드장은 탈퇴 전에 다른 멤버에게 길드장을 위임해주세요.', 3000, 'warning');
      return;
    }
    const _ok6 = await (confirmAction({ title: '길드 탈퇴', message: `${name} 길드에서 탈퇴할까요?\n길드 데이터는 유지됩니다.`, destructive: true, longPress: 2000 }) ?? Promise.resolve(confirm(`${name} 길드에서 탈퇴할까요?`)));
    if (!_ok6) return;
  } else {
    // 승인 대기중 → 가입신청 철회
    const _ok7 = await (confirmAction({ title: '가입신청 철회', message: `${name} 가입신청을 철회할까요?`, destructive: true, longPress: 2000 }) ?? Promise.resolve(confirm(`${name} 가입신청을 철회할까요?`)));
    if (!_ok7) return;

    // pending은 즉시 Firebase 반영 (저장하기 안 눌러도 적용)
    const { getCurrentUser, saveAccount, setCurrentUser, withdrawGuildJoinRequest } = await import('./data.js');
    const user = getCurrentUser();
    if (user) {
      user.pendingGuilds = (user.pendingGuilds || []).filter(g => g !== name);
      await saveAccount(user);
      setCurrentUser(user);
    }
    if (user) await withdrawGuildJoinRequest(name, user.id);
    const { showToast: _st } = await import('./home/utils.js');
    _st(`${name} 가입신청을 철회했어요`, 2500, 'info');
  }

  _guildModalGuilds = _guildModalGuilds.filter(g => g.name !== name);
  if (_guildModalPrimary === name) {
    const firstMember = _guildModalGuilds.find(g => g.status === 'member');
    _guildModalPrimary = firstMember ? firstMember.name : null;
  }
  _renderGuildModalList();
  await syncGuildModalState({ refreshCache: false });
}

async function searchGuildsForModal(query) {
  const sugBox = document.getElementById('gm-guild-suggestions');
  if (!sugBox) return;
  const q = (query || '').trim().toLowerCase();
  const guilds = _allGuildsCache || [];
  // 빈 쿼리일 때도 전체 목록 표시 (드롭다운)
  const filtered = guilds.filter(g => (!q || g.name.toLowerCase().includes(q)) && !_guildModalGuilds.some(s => s.name === g.name));
  if (!filtered.length) { sugBox.style.display = 'none'; return; }
  sugBox.innerHTML = filtered.slice(0, 8).map(g =>
    `<div class="guild-suggest-item" data-login-action="select-guild-modal" data-guild-name="${g.name.replace(/"/g, '&quot;')}">
      <span>${g.name}</span><span style="font-size:11px;color:var(--text-tertiary);">${g.memberCount || 0}명</span>
    </div>`
  ).join('');
  sugBox.style.display = '';
}

async function selectGuildForModal(name) {
  if (_guildModalGuilds.some(g => g.name === name)) return;
  const existing = (_allGuildsCache || []).find(g => g.name === name);
  if (!existing) return;
  _guildModalGuilds.push({ name, status: (existing && (existing.memberCount || 0) > 0) ? 'pending' : 'member', isNew: !existing });
  document.getElementById('gm-guild-input').value = '';
  document.getElementById('gm-guild-suggestions').style.display = 'none';
  _renderGuildModalList();
  await syncGuildModalState({ refreshCache: true });
}

async function addGuildFromModal() {
  const input = document.getElementById('gm-guild-input');
  const name = (input?.value || '').trim();
  if (!name || _guildModalGuilds.some(g => g.name === name)) { if (input) input.value = ''; return; }
  const existing = (_allGuildsCache || []).find(g => g.name === name);
  if (!existing) {
    const { showToast: _st } = await import('./home/utils.js');
    _st('검색 결과에 없는 길드는 아래에서 새로 만들어주세요.', 2600, 'info');
    return;
  }
  _guildModalGuilds.push({ name, status: (existing.memberCount || 0) > 0 ? 'pending' : 'member', isNew: false });
  input.value = '';
  document.getElementById('gm-guild-suggestions').style.display = 'none';
  _renderGuildModalList();
  await syncGuildModalState({ refreshCache: true });
}

async function createGuildFromModal() {
  const input = document.getElementById('gm-create-guild-input');
  const name = (input?.value || '').trim();
  if (!name) return;
  if (_guildModalGuilds.some(g => g.name === name)) {
    const { showToast: _st } = await import('./home/utils.js');
    _st('이미 목록에 담긴 길드예요.', 2200, 'info');
    if (input) input.value = '';
    return;
  }
  const existing = (_allGuildsCache || []).find(g => g.name === name);
  if (existing) {
    const { showToast: _st } = await import('./home/utils.js');
    _st('이미 있는 길드예요. 위에서 검색해서 추가해 주세요.', 2600, 'warning');
    if (input) input.value = '';
    return;
  }
  _guildModalGuilds.push({ name, status: 'member', isNew: true });
  if (input) input.value = '';
  _renderGuildModalList();
  await syncGuildModalState({ successMessage: `${name} 길드를 만들었어요.`, successType: 'success', refreshCache: true });
}

async function syncGuildModalState(options = {}) {
  const { closeAfter = false, successMessage = '', successType = 'success', refreshCache = true } = options;
  const { getCurrentUser, saveAccount, setCurrentUser, createGuild, createGuildJoinRequest, updateGuildMemberCount, updateGuildLeader, withdrawGuildJoinRequest } = await import('./data.js');
  const user = getCurrentUser();
  if (!user) return;

  const oldGuilds = new Set(user.guilds || []);
  const oldPending = new Set(user.pendingGuilds || []);
  const newGuilds = [];
  const newPending = [];

  for (const g of _guildModalGuilds) {
    if (g.status === 'member') {
      newGuilds.push(g.name);
      // 새로 생성되는 길드
      if (g.isNew && !oldGuilds.has(g.name)) {
        await createGuild(g.name, user.id);
      }
      // 기존 길드에서 새로 가입 (이전에 없었던 것)
      if (!g.isNew && !oldGuilds.has(g.name)) {
        await updateGuildMemberCount(g.name, 1);
        const guildMeta = (_allGuildsCache || []).find(item => item.name === g.name);
        if ((guildMeta?.memberCount || 0) === 0) {
          await updateGuildLeader(g.name, user.id);
        }
      }
    } else {
      newPending.push(g.name);
      // 새로운 pending 길드 → 가입 요청
      if (!oldPending.has(g.name)) {
        const displayName = user.nickname || (user.lastName + user.firstName);
        await createGuildJoinRequest(g.name, g.name, user.id, displayName);
      }
    }
  }

  // 탈퇴한 길드 memberCount 감소
  for (const oldG of oldGuilds) {
    if (!newGuilds.includes(oldG)) {
      await updateGuildMemberCount(oldG, -1);
    }
  }

  // 철회된 pending 길드 → repository에서 요청과 pending 알림을 함께 제거
  for (const oldP of oldPending) {
    if (!newPending.includes(oldP)) {
      await withdrawGuildJoinRequest(oldP, user.id);
    }
  }

  // 승인된 멤버가 1개 이상이면 대표길드 필수
  const primaryGuild = newGuilds.length > 0
    ? (newGuilds.includes(_guildModalPrimary) ? _guildModalPrimary : newGuilds[0])
    : null;

  user.guilds = newGuilds;
  user.pendingGuilds = newPending;
  user.primaryGuild = primaryGuild;
  await saveAccount(user);
  setCurrentUser(user);

  if (refreshCache) {
    const { getAllGuilds } = await import('./data.js');
    _allGuildsCache = await getAllGuilds();
  }
  if (closeAfter) closeGuildModal();
  if (successMessage) {
    const { showToast: _st } = await import('./home/utils.js');
    _st(successMessage, 2600, successType);
  }
}

async function saveGuildFromModal() {
  await syncGuildModalState({ closeAfter: true, successMessage: '저장되었습니다', successType: 'success' });
}


async function manageAccountPassword(accountId) {
  const {
    changeTomatoDevOwnerPassword,
    getAccountList,
  } = await import('./data.js');
  const accounts = await getAccountList();
  const account = accounts.find(a => a.id === accountId);
  if (!account) return;

  if (account.authProvider === 'firebase-password' || account.hasPassword) {
    // Firebase Auth와 로컬 잠금 비밀번호를 같은 입력에서 함께 회전한다.
    const oldPw = prompt(`${account.lastName}${account.firstName} — 현재 비밀번호를 입력하세요`);
    if (oldPw === null) return;
    const newPw = prompt('새 비밀번호를 입력하세요');
    if (!newPw) return;
    try {
      await changeTomatoDevOwnerPassword(account, oldPw, newPw);
      showToast('비밀번호가 변경되었어요', 2500, 'success');
    } catch (error) {
      console.error('[login] owner password rotation failed:', error);
      showToast('비밀번호 변경에 실패했어요. 다시 로그인한 뒤 시도해주세요.', 3000, 'error');
      return;
    }
  } else {
    showToast('Firebase Auth 연결에는 기존 로컬 비밀번호가 필요해요.', 3000, 'error');
    return;
  }
  // 목록 갱신
  initLoginScreen();
}


// ── 개발자에게 편지 ──
function _letterEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _letterTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function _letterPreview(message) {
  const text = String(message || '').replace(/\s+/g, ' ').trim();
  return text.length > 70 ? `${text.slice(0, 70)}...` : text;
}

async function renderLetterStatusList() {
  const list = document.getElementById('letter-status-list');
  if (!list) return;
  list.innerHTML = '<div class="letter-status-empty">불러오는 중...</div>';

  try {
    const { getMyDeveloperLetters, getDeveloperLetterStatus, getDeveloperLetterStatusMeta } = await import('./data.js');
    const letters = await getMyDeveloperLetters(8);
    if (!document.getElementById('letter-status-list')) return;

    if (!letters.length) {
      list.innerHTML = '<div class="letter-status-empty">아직 보낸 요청이 없어요</div>';
      return;
    }

    list.innerHTML = letters.map((letter) => {
      const meta = getDeveloperLetterStatusMeta(getDeveloperLetterStatus(letter));
      return `
        <div class="letter-status-row">
          <div class="letter-status-main">
            <div class="letter-status-message">${_letterEscape(_letterPreview(letter.message))}</div>
            <div class="letter-status-time">${_letterEscape(_letterTime(letter.createdAt))}</div>
          </div>
          <span class="letter-status-chip letter-status-chip--${meta.key}">${_letterEscape(meta.label)}</span>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.warn('[letter-status]', e);
    list.innerHTML = '<div class="letter-status-empty">상태를 불러오지 못했어요</div>';
  }
}

export async function openLetterModal() {
  const { getCurrentUser } = await import('./data.js');
  const user = getCurrentUser();
  if (!user) return;
  const nick = user.nickname || `${user.lastName || ''}${user.firstName || ''}` || '회원';

  document.getElementById('dynamic-modal')?.remove();
  const modal = document.createElement('div'); modal.id = 'dynamic-modal'; document.body.appendChild(modal);
  modal.innerHTML = `<div class="modal-backdrop" style="display:flex;z-index:10000;" data-login-action="close-dynamic-modal">
    <div class="modal-sheet" style="max-width:420px;padding:24px;max-height:85vh;overflow-y:auto;">
      <div class="sheet-handle"></div>
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:28px;margin-bottom:8px;">✉️</div>
        <div style="font-size:17px;font-weight:700;color:var(--text);">개발자에게 편지</div>
        <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">${_letterEscape(nick)}님의 요청 상태도 여기서 확인할 수 있어요</div>
      </div>
      <textarea id="letter-text" style="width:100%;min-height:120px;padding:14px 16px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;color:var(--text);background:var(--surface);outline:none;resize:vertical;font-family:inherit;box-sizing:border-box;line-height:1.6;transition:border-color 0.15s;" placeholder="편하게 적어주세요..."></textarea>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button data-login-action="close-dynamic-modal" style="flex:1;padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text-secondary);font-size:14px;font-weight:600;cursor:pointer;">닫기</button>
        <button id="letter-send-btn" data-login-action="send-letter" style="flex:2;padding:14px;border:none;border-radius:12px;background:#fa342c;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">보내기</button>
      </div>
      <div class="letter-status-panel">
        <div class="letter-status-head">
          <span>내 요청 현황</span>
          <button type="button" data-login-action="refresh-letter-status">새로고침</button>
        </div>
        <div id="letter-status-list" class="letter-status-list">
          <div class="letter-status-empty">불러오는 중...</div>
        </div>
      </div>
    </div>
  </div>`;
  setTimeout(() => document.getElementById('letter-text')?.focus(), 200);
  renderLetterStatusList();
}

// ── 식단 탭 인라인 다이어트 설정 ──
export async function submitDietSetup() {
  const h = parseFloat(document.getElementById('ds-height')?.value);
  const w = parseFloat(document.getElementById('ds-weight')?.value);
  const age = parseInt(document.getElementById('ds-age')?.value);
  const tw = parseFloat(document.getElementById('ds-target-weight')?.value);
  if (!h || !w || !age || !tw) { showToast('신장, 체중, 연령, 목표 체중을 입력해주세요', 2500, 'warning'); return; }

  // 체지방률: 미입력 시 BMI 기반 추정 (Deurenberg + 보수적 보정 -2%p)
  let bf = parseFloat(document.getElementById('ds-bodyfat')?.value);
  let bfEstimated = false;
  if (!bf) {
    const bmi = w / ((h / 100) ** 2);
    // Deurenberg(1991) 남성: 1.20*BMI + 0.23*나이 - 16.2, 보수적 보정 -2%p
    bf = Math.round((1.20 * bmi + 0.23 * age - 16.2 - 2) * 10) / 10;
    bf = Math.max(5, Math.min(bf, 40));
    bfEstimated = true;
  }
  let tbf = parseFloat(document.getElementById('ds-target-bf')?.value);
  if (!tbf) {
    const targetBmi = tw / ((h / 100) ** 2);
    tbf = Math.round((1.20 * targetBmi + 0.23 * age - 16.2 - 2) * 10) / 10;
    tbf = Math.max(5, Math.min(tbf, 35));
  }

  const btn = document.getElementById('ds-submit-btn');
  btn.textContent = '계산 중...'; btn.disabled = true;

  const { saveDietPlan } = await import('./data.js');
  await saveDietPlan({
    height: h, weight: w, bodyFatPct: bf, age,
    targetWeight: tw, targetBodyFatPct: tbf,
    startDate: new Date().toISOString().split('T')[0],
  });

  // 애니메이션: 설정 폼 → 칼로리 트래커
  const setup = document.getElementById('wt-diet-setup');
  setup.style.transition = 'opacity 0.3s, transform 0.3s';
  setup.style.opacity = '0';
  setup.style.transform = 'scale(0.95)';

  setTimeout(async () => {
    setup.style.display = 'none';
    // 칼로리 트래커 표시 (애니메이션)
    const tracker = document.getElementById('wt-calorie-tracker');
    tracker.style.display = 'block';
    tracker.style.opacity = '0';
    tracker.style.transform = 'translateY(-10px)';
    tracker.style.transition = 'opacity 0.4s, transform 0.4s';
    requestAnimationFrame(() => {
      tracker.style.opacity = '1';
      tracker.style.transform = 'translateY(0)';
    });
    // 다이어트 요약도 표시
    const summary = document.getElementById('wt-diet-summary');
    if (summary) {
      summary.style.opacity = '0';
      summary.style.transition = 'opacity 0.4s 0.15s';
      summary.style.display = 'block';
      requestAnimationFrame(() => { summary.style.opacity = '1'; });
    }
    // 데이터 리렌더
    const { loadWorkoutDate } = await import('./workout/load.js');
    const t = new Date();
    loadWorkoutDate(t.getFullYear(), t.getMonth(), t.getDate());
  }, 300);
}

// "설정" 버튼 → 인라인 폼 다시 열기
async function openDietSetupInline() {
  const { getDietPlan } = await import('./data.js');
  const plan = getDietPlan();
  const setup = document.getElementById('wt-diet-setup');
  if (!setup) return;

  // 기존 값 채우기 (0은 빈칸 처리)
  document.getElementById('ds-height').value = plan.height || '';
  document.getElementById('ds-weight').value = plan.weight || '';
  document.getElementById('ds-bodyfat').value = plan.bodyFatPct || '';
  document.getElementById('ds-age').value = plan.age || '';
  document.getElementById('ds-target-weight').value = plan.targetWeight || '';
  document.getElementById('ds-target-bf').value = plan.targetBodyFatPct || '';
  document.getElementById('ds-submit-btn').textContent = '저장하기';
  document.getElementById('ds-submit-btn').disabled = false;

  // 칼로리 트래커 숨기고 폼 보이기
  const tracker = document.getElementById('wt-calorie-tracker');
  const summary = document.getElementById('wt-diet-summary');
  tracker.style.transition = 'opacity 0.2s';
  tracker.style.opacity = '0';
  if (summary) { summary.style.transition = 'opacity 0.2s'; summary.style.opacity = '0'; }

  setTimeout(() => {
    tracker.style.display = 'none';
    if (summary) summary.style.display = 'none';
    setup.style.display = 'block';
    setup.style.opacity = '0';
    setup.style.transform = 'scale(0.95)';
    setup.style.transition = 'opacity 0.3s, transform 0.3s';
    requestAnimationFrame(() => {
      setup.style.opacity = '1';
      setup.style.transform = 'scale(1)';
    });
  }, 200);
}

async function sendLetter() {
  const text = document.getElementById('letter-text')?.value.trim();
  if (!text) return;
  const btn = document.getElementById('letter-send-btn');
  btn.textContent = '보내는 중...'; btn.disabled = true;
  try {
    const { sendDeveloperLetter } = await import('./data.js');
    await sendDeveloperLetter(text);
    const textarea = document.getElementById('letter-text');
    if (textarea) textarea.value = '';
    btn.textContent = '보내기'; btn.disabled = false;
    renderLetterStatusList();
    showToast('편지를 보냈어요. 상태는 시행전으로 표시됩니다', 2500, 'success');
  } catch(e) {
    console.error('[letter]', e);
    showToast('전송 실패: ' + e.message, 3000, 'error');
    btn.textContent = '보내기'; btn.disabled = false;
  }
}

// 페이지 로드 시 로그인 초기화
document.addEventListener('DOMContentLoaded', () => {
  _bindLoginActions();
  initLoginScreen();
});

function toggleTheme() {
  const root = document.documentElement;
  const isLight = root.classList.toggle('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  document.getElementById('theme-toggle').textContent = isLight ? '☀️' : '🌙';
}
// 밝은 모드 고정
(function() {
  document.documentElement.classList.add('light');
})();

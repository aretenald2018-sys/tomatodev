import { isAdmin } from '../data.js';
import { logoutAccount, openLetterModal } from '../feature-login.js';
import { closeNotifCenter, markAllNotifsRead, toggleNotifCenter } from '../home/notifications.js';
import {
  closeTabSettingsModal,
  openTabSettingsModal,
  saveTabSettingsFromModal,
  SHELL_ROLE_TAB_IDS,
} from '../navigation.js';
import { installPWA } from '../pwa-fcm.js';
import { requestTomatoApkInstall, requestTomatoAppRefresh } from '../utils/build-info.js';
import { openWorkoutTab } from './deep-link-entry.js';

let _getCurrentTab = () => 'home';
let _switchTab = () => undefined;

export function configureShellActions({ getCurrentTab, switchTab } = {}) {
  if (typeof getCurrentTab === 'function') _getCurrentTab = getCurrentTab;
  if (typeof switchTab === 'function') _switchTab = switchTab;
}

export function _syncNavigationForCurrentRole() {
  const adminOnlyMode = isAdmin();
  const tabNav = document.getElementById('tab-nav');
  const moreMenu = document.getElementById('more-menu');
  const adminMenu = document.getElementById('admin-menu-items');
  const moreBtn = tabNav?.querySelector('.tab-more-btn');

  SHELL_ROLE_TAB_IDS.forEach((tabId) => {
    const btn = tabNav?.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (btn) btn.style.display = adminOnlyMode ? 'none' : '';
  });

  if (moreBtn) {
    moreBtn.style.display = '';
    moreBtn.dataset.mode = adminOnlyMode ? 'admin-only' : 'default';
    moreBtn.dataset.appAction = adminOnlyMode ? 'switch-tab' : 'toggle-more-menu';
    moreBtn.dataset.tab = adminOnlyMode ? 'admin' : 'more';
    moreBtn.innerHTML = adminOnlyMode
      ? '<span class="tab-icon nav-icon nav-icon-admin" aria-hidden="true"></span><span class="tab-label">토마토어드민</span>'
      : '<span class="tab-icon nav-icon nav-icon-more" aria-hidden="true"></span><span class="tab-label">더보기</span>';
    moreBtn.onclick = null;
    moreBtn.classList.toggle('active', _getCurrentTab() === 'admin' && adminOnlyMode);
  }

  if (adminMenu) adminMenu.style.display = isAdmin() ? '' : 'none';

  if (tabNav) tabNav.style.display = '';
  if (moreMenu && adminOnlyMode) moreMenu.style.display = 'none';
}

const APP_SHELL_ACTION_SCOPE = '#notif-center, #notif-center-backdrop, #tab-nav, #more-menu, #tab-settings-modal, #weekly-streak-grid';

function _closeMoreMenu() {
  const menu = document.getElementById('more-menu');
  if (menu) menu.style.display = 'none';
}

function _toggleMoreMenu() {
  const menu = document.getElementById('more-menu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
}

function _runAppShellAction(action, control, event) {
  const tab = control?.dataset?.tab;
  switch (action) {
    case 'install-pwa':
      installPWA();
      _closeMoreMenu();
      break;
    case 'install-apk':
      void requestTomatoApkInstall({ control, source: 'more-menu' });
      _closeMoreMenu();
      break;
    case 'open-letter-modal':
      _closeMoreMenu();
      void openLetterModal();
      break;
    case 'toggle-notif-center':
      _closeMoreMenu();
      toggleNotifCenter();
      break;
    case 'refresh-app-update':
      _closeMoreMenu();
      void requestTomatoAppRefresh({ control, source: 'more-menu' });
      break;
    case 'logout-account':
      _closeMoreMenu();
      void logoutAccount();
      break;
    case 'mark-all-notifs-read':
      void markAllNotifsRead();
      break;
    case 'close-notif-center':
      closeNotifCenter();
      break;
    case 'switch-tab':
      if (tab) void _switchTab(tab);
      break;
    case 'open-workout-date':
      openWorkoutTab(control.dataset.year, control.dataset.month, control.dataset.day);
      break;
    case 'toggle-more-menu':
      _toggleMoreMenu();
      break;
    case 'switch-tab-close-more':
      if (tab) void _switchTab(tab);
      _closeMoreMenu();
      break;
    case 'open-tab-settings-close-more':
      openTabSettingsModal();
      _closeMoreMenu();
      break;
    case 'close-tab-settings':
      closeTabSettingsModal(event);
      break;
    case 'save-tab-settings':
      void saveTabSettingsFromModal();
      break;
    default:
      console.warn(`[app-shell] unknown action: ${action}`);
  }
}

export function _bindAppShellActions(root = document) {
  const marker = root.documentElement || root;
  if (!marker || marker.dataset.appShellActionsBound === '1') return;
  marker.dataset.appShellActionsBound = '1';

  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const control = target?.closest?.('[data-app-action]');
    if (!control || !root.contains(control)) return;
    if (!control.matches(APP_SHELL_ACTION_SCOPE) && !control.closest(APP_SHELL_ACTION_SCOPE)) return;
    if (control.id === 'tab-settings-modal' && event.target !== control) return;

    event.preventDefault();
    _runAppShellAction(control.dataset.appAction, control, event);
  });
}

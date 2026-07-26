import { getCurrentUser, getDataOwnerId, isAdmin, isAdminGuest } from '../data.js';

export function _isSharedOwnerSessionUnresolved() {
  return !!getCurrentUser()
    && (isAdmin() || isAdminGuest())
    && !getDataOwnerId();
}

export function _sharedOwnerBootstrapError(message, cause = null) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = 'ACCOUNT_DATA_OWNER_UNRESOLVED';
  return error;
}

export function _withRequiredSharedOwnerTimeout(promise, ms, label) {
  let timer = null;
  const requiredLoad = Promise.resolve(promise)
    .catch((cause) => {
      throw _sharedOwnerBootstrapError(`${label} failed`, cause);
    })
    .finally(() => { if (timer) clearTimeout(timer); });
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      console.error(`[init] ${label} timed out after ${ms}ms; blocking shared-account access`);
      reject(_sharedOwnerBootstrapError(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([requiredLoad, timeout]);
}

export function _showSharedOwnerBlockedOverlay(error) {
  document.documentElement.dataset.accountOwnerState = 'blocked';
  const loading = document.getElementById('loading');
  if (!loading) return;

  for (const child of document.body.children) {
    if (child === loading) continue;
    child.inert = true;
    child.setAttribute('aria-hidden', 'true');
  }

  const card = document.createElement('div');
  card.style.cssText = 'max-width:320px;padding:24px;border-radius:20px;background:var(--surface,#fff);box-shadow:0 18px 50px rgba(0,0,0,.18);text-align:center;';
  const title = document.createElement('div');
  title.style.cssText = 'font-size:17px;font-weight:700;color:var(--text,#222);margin-bottom:8px;';
  title.textContent = '데이터 계정을 확인할 수 없어요';
  const detail = document.createElement('div');
  detail.style.cssText = 'font-size:13px;line-height:1.55;color:var(--text-secondary,#666);margin-bottom:16px;';
  detail.textContent = '잘못된 계정에 저장되지 않도록 모든 입력을 잠갔습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.style.cssText = 'width:100%;padding:12px;border:0;border-radius:999px;background:var(--primary,#ef5b2a);color:#fff;font-size:14px;font-weight:700;cursor:pointer;';
  retry.textContent = '다시 시도';
  retry.addEventListener('click', () => location.reload());
  card.append(title, detail, retry);

  loading.replaceChildren(card);
  loading.classList.remove('hidden');
  loading.setAttribute('role', 'alert');
  loading.setAttribute('aria-live', 'assertive');
  Object.assign(loading.style, {
    display: 'flex',
    zIndex: '2147483647',
    pointerEvents: 'auto',
  });
  console.error('[account-owner] bootstrap blocked:', error);
}

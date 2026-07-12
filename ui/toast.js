export function showToast(message, duration = 2500, type = 'default', opts = null) {
  const existing = document.getElementById('tds-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'tds-toast';
  toast.className = 'tds-toast';
  toast.dataset.type = type;
  const icons = { success: '✓ ', error: '✕ ', warning: '⚠ ', info: 'ℹ ', default: '' };
  const hasAction = opts && typeof opts.action === 'string' && typeof opts.onAction === 'function';

  if (hasAction) {
    toast.classList.add('has-action');
    const msgSpan = document.createElement('span');
    msgSpan.className = 'tds-toast-msg';
    msgSpan.textContent = (icons[type] || '') + message;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tds-toast-action';
    btn.textContent = opts.action;
    btn.setAttribute('aria-label', opts.action);
    btn.addEventListener('click', () => {
      try { opts.onAction(); } finally {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }
    });
    toast.appendChild(msgSpan);
    toast.appendChild(btn);
  } else {
    toast.textContent = (icons[type] || '') + message;
  }

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
  try {
    if (type === 'success') window.haptic?.medium?.();
    else if (type === 'error' || type === 'warning') window.haptic?.light?.();
  } catch {}
}

export function showCenterToast(message, duration = 1800) {
  const existing = document.getElementById('tds-center-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'tds-center-toast';
  toast.className = 'tds-center-toast';
  toast.innerHTML = `<span class="tds-center-toast-icon">✓</span><span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

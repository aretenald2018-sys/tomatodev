export function requestAppRender(reason = 'feature-update') {
  document.dispatchEvent(new CustomEvent('app:render-requested', { detail: { reason } }));
}

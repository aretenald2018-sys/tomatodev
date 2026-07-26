// ================================================================
// feature-misc.js — 구역 제목, 미니 메모
// ================================================================

import { getSectionTitle, saveSectionTitle,
         getMiniMemoItems, saveMiniMemoItems } from './data.js';
import { renderHome } from './home/index.js';
import { closeModal, openModal } from './app/overlay-stack.js';
import { showToast } from './ui/toast.js';

// ── 구역 제목 편집 ────────────────────────────────────────────────
export function editSectionTitle(key) {
  document.getElementById('section-title-key').value   = key;
  document.getElementById('section-title-input').value = getSectionTitle(key);
  openModal('section-title-modal');
}

export function closeSectionTitleModal(e) { closeModal('section-title-modal', e); }

export async function saveSectionTitleFromModal() {
  const key   = document.getElementById('section-title-key').value;
  const title = document.getElementById('section-title-input').value.trim();
  if (!title) return;
  await saveSectionTitle(key, title);
  const el = document.getElementById(`title-${key}`);
  if (el) el.textContent = title;
  document.getElementById('section-title-modal').classList.remove('open');
  showToast('저장되었습니다');
}

// ── 미니 메모 (체크리스트) ────────────────────────────────────────
export async function addMiniMemoItem() {
  const input = document.getElementById('mini-memo-new-input');
  const text  = input.value.trim();
  if (!text) return;
  const items = getMiniMemoItems();
  items.push({ id: `memo_${Date.now()}`, text, checked: false });
  await saveMiniMemoItems(items);
  input.value = '';
  renderHome();
}

export async function toggleMiniMemoItem(id) {
  const items = getMiniMemoItems().map(item =>
    item.id === id ? { ...item, checked: !item.checked } : item
  );
  await saveMiniMemoItems(items);
  renderHome();
}

export async function deleteMiniMemoItem(id) {
  const items = getMiniMemoItems().filter(item => item.id !== id);
  await saveMiniMemoItems(items);
  renderHome();
}

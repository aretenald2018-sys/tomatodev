// ================================================================
// data-social-log.js — TomatoDev 자동 로그 차단 + 패치노트 조회/관리
// ================================================================

import {
  db, doc, setDoc, getDoc,
} from './data-core.js';

// TomatoDev must not emit automatic telemetry into the production project.
// Keep these public compatibility entry points write-free; explicit admin
// patchnote creation and read-only queries below remain available.
export async function recordLogin() {}

export async function recordTutorialDone() {}

export async function markPatchnoteRead(_patchnoteId) {}

export async function getPatchnote(patchnoteId) {
  if (!patchnoteId) return null;
  try {
    const pnDoc = await getDoc(doc(db, '_patchnotes', patchnoteId));
    if (!pnDoc.exists()) return null;
    return pnDoc.data();
  } catch(e) {
    console.warn('[patchnote] get:', e);
    return null;
  }
}

export async function getLatestPatchnote() {
  try {
    const { collection, getDocs } = await import('./data-core.js');
    const snap = await getDocs(collection(db, '_patchnotes'));
    let latest = null;
    snap.forEach((d) => {
      const pn = d.data();
      if (!latest || (pn.createdAt || 0) > (latest.createdAt || 0)) latest = pn;
    });
    return latest;
  } catch(e) {
    console.warn('[patchnote] latest:', e);
    return null;
  }
}

export async function createPatchnote({ title, body }) {
  const id = `pn_${Date.now()}`;
  const payload = {
    id,
    title: title || '',
    body: body || '',
    createdAt: Date.now(),
    readBy: [],
  };
  await setDoc(doc(db, '_patchnotes', id), payload);
  return payload;
}

export async function recordAction(_action) {}

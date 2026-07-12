// Firebase callable functions repository.
// Feature/AI modules consume plain async functions and never import Firebase SDKs directly.

import { functions } from './data-core.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-functions.js';

const geminiProxy = httpsCallable(functions, 'geminiProxy');
const ocrProxy = httpsCallable(functions, 'ocrProxy');

export async function callGeminiProxy(payload) {
  const { data } = await geminiProxy(payload);
  return data;
}

export async function callOcrProxy(payload) {
  const { data } = await ocrProxy(payload);
  return data;
}

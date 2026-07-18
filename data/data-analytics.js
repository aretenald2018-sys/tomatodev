// ================================================================
// data-analytics.js — TomatoDev 자동 트래킹 차단 + 어드민 집계 조회
// ================================================================

import {
  db, doc, getDoc, getDocs, collection,
} from './data-core.js';
import { dateKey, TODAY } from './data-date.js';

// ── trackEvent: 앱 전역에서 호출하는 단일 진입점 ─────────────────
// TomatoDev keeps the public API for callers but intentionally records nothing.
export function trackEvent(_category, _action, _meta) {}

// ── Firestore flush ──────────────────────────────────────────────
export async function flushAnalytics() {}

// ── 읽기: 어드민 대시보드용 ──────────────────────────────────────

/** 최근 N일치 analytics 문서 로드 (날짜 내림차순) */
export async function getAnalytics(days = 30) {
  const results = [];
  const today = new Date(TODAY);

  // 병렬로 30개 문서 읽기
  const promises = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dk = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    promises.push(
      getDoc(doc(db, '_analytics', dk))
        .then(snap => snap.exists() ? { dk, ...snap.data() } : null)
        .catch(() => null)
    );
  }

  const docs = await Promise.all(promises);
  for (const d of docs) {
    if (d) results.push(d);
  }
  results.sort((a, b) => (a.dk > b.dk ? -1 : 1));
  return results;
}

/** 전체 analytics 컬렉션 로드 (히스토리 전체 필요 시) */
export async function getAllAnalytics() {
  const results = [];
  try {
    const snap = await getDocs(collection(db, '_analytics'));
    snap.forEach(d => results.push({ dk: d.id, ...d.data() }));
    results.sort((a, b) => (a.dk > b.dk ? -1 : 1));
  } catch (e) {
    console.warn('[analytics] getAllAnalytics fail:', e);
  }
  return results;
}

// ── API 사용량 집계 (어드민 전용) ────────────────────────────────
// _apiUsage/{YYYY-MM-DD}: { gemini_proxy, ocr_proxy, updatedAt } — 서버 측 증분
// _ocrQuota/{YYYY-MM}: { count } — OCR 월 하드 리밋(990)용, 기존 유지
/**
 * 최근 N일 API 사용량 + 이번 달 OCR 누적치 반환
 * @param {number} days 조회할 최근 일수 (default 30)
 * @returns {{daily: Array<{dk,gemini_proxy,ocr_proxy}>, ocrMonthly: {monthKey:string,count:number,limit:number}}}
 */
export async function getApiUsage(days = 30) {
  const today = new Date(TODAY);
  const daily = [];

  const dailyPromises = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dk = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    dailyPromises.push(
      getDoc(doc(db, '_apiUsage', dk))
        .then(snap => ({
          dk,
          gemini_proxy: snap.exists() ? (snap.data().gemini_proxy || 0) : 0,
          ocr_proxy:    snap.exists() ? (snap.data().ocr_proxy    || 0) : 0,
        }))
        .catch(() => ({ dk, gemini_proxy: 0, ocr_proxy: 0 }))
    );
  }
  const dailyDocs = await Promise.all(dailyPromises);
  for (const d of dailyDocs) daily.push(d);
  daily.sort((a, b) => (a.dk > b.dk ? -1 : 1)); // 최신순

  // 이번 달 OCR 누적 (functions/index.js _ocrQuotaKey는 UTC 기준)
  const nowUtc = new Date();
  const monthKey = `${nowUtc.getUTCFullYear()}-${String(nowUtc.getUTCMonth() + 1).padStart(2, '0')}`;
  let ocrMonthly = { monthKey, count: 0, limit: 990 };
  try {
    const snap = await getDoc(doc(db, '_ocrQuota', monthKey));
    if (snap.exists()) ocrMonthly.count = snap.data().count || 0;
  } catch (e) {
    console.warn('[apiUsage] ocrQuota read fail:', e?.message || e);
  }

  return { daily, ocrMonthly };
}

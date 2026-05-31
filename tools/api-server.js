#!/usr/bin/env node
/**
 * API 서버
 * - CNN Fear & Greed 프록시
 * - 헬스체크
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 서빙 (배포 환경에서)
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    // HTML 파일은 캐시하지 않음
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache');
    }
  }
}));

// CORS 미들웨어
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ── Fear & Greed Index 프록시 ──
app.get('/api/fear-greed', async (req, res) => {
  try {
    const response = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata');
    if (!response.ok) throw new Error(`CNN API ${response.status}`);
    const data = await response.json();
    const score = Math.round(data?.fear_and_greed?.score ?? 0);
    const rating = data?.fear_and_greed?.rating ?? '';
    res.json({ score, rating, source: 'cnn-proxy' });
  } catch (e) {
    res.status(502).json({ error: e.message, score: null, rating: '', source: 'error' });
  }
});

/**
 * 헬스체크
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 API 서버 시작: http://localhost:${PORT}`);
  console.log('   GET /api/fear-greed - CNN Fear & Greed 프록시');
  console.log('   GET /api/health - 서버 상태 확인\n');
});

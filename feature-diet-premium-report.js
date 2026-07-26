import { escapeHtml as _esc } from './utils/escape-html.js';
import { showToast } from './ui/toast.js';
import { closeModal, openModal } from './app/overlay-stack.js';
// ================================================================
// feature-diet-premium-report.js
// Targeted one-time premium diet reports for selected users.
// ================================================================

import {
  getCurrentUser,
  DIET_PREMIUM_CONTENT_VERSION,
  DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED,
  getDietPremiumReportInbox,
  getDietPremiumReportSeen,
  saveDietPremiumReportSeen,
} from './data.js';

const DEFAULT_REPORT_ID = DIET_PREMIUM_CONTENT_VERSION;

const REPORTS = {
  '최_준수': {
    name: '최준수',
    nick: '줍스',
    eyebrow: '실제 기록 기반 · 신뢰도 높음',
    headline: '최근 식단을 유지하면\n월 약 3.1kg 감량 흐름입니다.',
    summary: '2026.04.06-2026.05.12 총 37일 중 식단 기록 31일, 완성 기록 28일을 반영했습니다. 최신 체중은 2026.05.12 기준 82.1kg입니다.',
    kpis: [
      { label: '한 달 예상', value: '-3.1kg', note: '최근 14일 기록 평균 2,115kcal 기준' },
      { label: '78kg까지', value: '약 41일', note: '예상 도달 2026.06.22 전후' },
      { label: '현재 / 목표', value: '82.1 → 78', note: '4.1kg 남음' },
    ],
    trust: {
      tone: 'good',
      title: '기록 신뢰도: 높음',
      body: '최근 37일 중 31일을 입력했고 체중 체크인도 6회 있습니다. 기록 평균과 실제 체중 변화가 같은 방향이라 감량 예측에 사용할 수 있습니다.',
    },
    metrics: [
      { label: '최근 섭취', value: '2,115kcal', width: 73, color: 'green' },
      { label: '목표 섭취', value: '2,309kcal', width: 80, color: 'blue' },
      { label: '단백질', value: '평균 137g', width: 82, color: 'green' },
    ],
    projections: [
      { value: '-3kg: 약 30일', label: '2026.06.11 전후' },
      { value: '-5kg: 약 50일', label: '2026.07.01 전후' },
    ],
    workDinner: '회식 1회가 평소보다 1,200kcal 높아져도 월 예상 감량은 약 -2.4kg입니다. 목표 78kg 도달은 약 41일에서 51일 정도로 밀리지만, 계획 자체가 무너지는 수준은 아닙니다.',
    patterns: [
      '2026.04.24 막창 1,280kcal, 2026.04.25 저녁 1,298kcal처럼 고열량 저녁이 있어도 주간 평균은 목표권에 머물렀습니다.',
      '회식 전 점심을 굶기보다 닭가슴살, 계란, 단백질 음료 같은 앵커를 먼저 세우는 편이 저녁 선택을 덜 흔듭니다.',
      '회식 다음 날 체중 증가는 수분과 나트륨 영향이 큽니다. 48시간 안에 원래 루틴으로 돌아오는지만 확인하면 됩니다.',
    ],
    counselor: [
      '줍스님은 완벽하게 먹는 사람보다 기록하고 되돌아오는 사람에 가깝습니다. 다이어트에서는 이 패턴이 훨씬 강합니다.',
      '고열량 저녁을 실패로 이름 붙이지 말고, 다음 두 끼를 원래 리듬으로 돌리는 능력을 핵심 성과로 보세요.',
      '체중이 하루 갑자기 오르는 날에는 판단을 유예하세요. 벌주듯 식단을 줄이면 주말 반동을 부를 수 있습니다.',
    ],
    source: '산식: 최신 체중 82.1kg, 목표 78kg, 최근 기록 섭취 2,115kcal, 추정 TDEE 2,900kcal, 7,700kcal=1kg 기준.',
  },
  '이_재헌': {
    name: '이재헌',
    nick: '이재헌',
    eyebrow: '실제 기록 기반 · 신뢰도 주의',
    headline: '기록 그대로라면 빠르게 빠지지만,\n지속성 점검이 먼저입니다.',
    summary: '2026.04.05-2026.05.12 총 38일 중 식단 기록 27일, 완성 기록 23일을 반영했습니다. 체중 체크인이 없어 현재 체중은 플랜 입력값 86kg을 사용했습니다.',
    kpis: [
      { label: '한 달 예상', value: '-5.5~-7.0kg', note: '기록 섭취가 매우 낮아 보수 표시' },
      { label: '78kg까지', value: '35~44일', note: '안전 페이스는 약 70일 내외' },
      { label: '현재 / 목표', value: '86 → 78', note: '8kg 남음' },
    ],
    trust: {
      tone: 'warn',
      title: '기록 신뢰도: 낮음~중간',
      body: '최근 14일 중 기록일이 7일이고 체중 체크인이 0건입니다. 371kcal, 470kcal처럼 하루 전체 섭취로 보기 어려운 날도 있어 부분 입력 가능성을 함께 표시해야 합니다.',
    },
    metrics: [
      { label: '완성일 섭취', value: '1,276kcal', width: 47, color: 'yellow' },
      { label: '목표 섭취', value: '1,985kcal', width: 74, color: 'blue' },
      { label: '단백질', value: '평균 98g', width: 49, color: 'yellow' },
    ],
    projections: [
      { value: '-3kg: 13~16일', label: '기록 그대로라면 2026.05.25-05.28' },
      { value: '-5kg: 22~27일', label: '기록 그대로라면 2026.06.03-06.08' },
    ],
    workDinner: '회식 1회가 평소보다 1,200kcal 높아져도 완성일 평균 기준 월 예상은 약 -4.9kg입니다. 다만 현재 리스크는 회식보다 평일 저열량 누적과 미입력 가능성입니다.',
    patterns: [
      '최근 14일 중 절반이 비어 있고, 2026.05.10 470kcal, 2026.05.12 371kcal처럼 한 끼만 기록된 날이 있습니다.',
      '회식 전에는 점심을 700-900kcal 안에서 단백질 중심으로 먹는 편이 좋습니다. 낮에 너무 비우면 저녁 자리에서 통제감이 떨어집니다.',
      '회식 다음 날은 보상 단식보다 정상식 한 끼와 체중 체크인이 우선입니다.',
    ],
    counselor: [
      '이재헌님에게 먼저 필요한 말은 더 참으라는 말이 아닙니다. 지금 기록은 의지가 약한 사람보다 너무 세게 조이는 사람의 기록에 가깝습니다.',
      '감량은 빠를 수 있지만 마음은 빠른 속도를 빚으로 받아들입니다. 예외를 없애기보다 예외 뒤에 돌아오는 길을 짧게 만드세요.',
      '비어 있는 기록은 게으름보다 피로의 흔적일 때가 많습니다. 최소 단백질 앵커와 2-3일 간격 체중 체크인을 먼저 세우는 편이 오래 갑니다.',
    ],
    source: '산식: 플랜 체중 86kg, 목표 78kg, 완성 기록 평균 1,276kcal 및 최근 기록 평균 911kcal, 추정 TDEE 2,700kcal, 7,700kcal=1kg 기준.',
  },
  '김_태우': {
    name: '김태우',
    nick: '문정토마토',
    eyebrow: '실제 기록 기반 · 신뢰도 높음',
    headline: '최근 식단을 유지하면\n월 약 3.9kg 감량 흐름입니다.',
    summary: '2026.03.22-2026.05.12 총 52일 중 식단 기록 50일, 완성 기록 40일을 반영했습니다. 최신 체중은 2026.05.06 기준 71.5kg입니다.',
    kpis: [
      { label: '한 달 예상', value: '-3.9kg', note: '최근 14일 기록 평균 1,309kcal 기준' },
      { label: '68kg까지', value: '약 28일', note: '예상 도달 2026.06.09 전후' },
      { label: '현재 / 목표', value: '71.5 → 68', note: '3.5kg 남음' },
    ],
    trust: {
      tone: 'good',
      title: '기록 신뢰도: 높음',
      body: '52일 중 50일을 입력했고 체중 체크인도 37건입니다. 다만 일부 날짜에 한 끼만 입력된 날이 있어, 최근 감량 속도는 실제보다 조금 빠르게 잡혔을 수 있습니다.',
    },
    metrics: [
      { label: '최근 섭취', value: '1,309kcal', width: 57, color: 'green' },
      { label: '목표 섭취', value: '1,420kcal', width: 62, color: 'blue' },
      { label: '단백질', value: '평균 85g', width: 58, color: 'yellow' },
    ],
    projections: [
      { value: '-3kg: 약 24일', label: '2026.06.05 전후' },
      { value: '-5kg: 약 39일', label: '2026.06.20 전후' },
    ],
    workDinner: '회식 1회가 평소보다 1,200kcal 높아져도 월 예상 감량은 약 -3.2kg입니다. 현재는 회식 자체보다 닭강정, 피자, 아이스크림이 겹친 저녁 이후 복귀 속도가 핵심입니다.',
    patterns: [
      '2026.05.07 후라이드치킨 1,453kcal, 2026.05.09 피자와 아이스크림 2,187kcal 저녁이 있었지만 기록 복귀율이 높습니다.',
      '최근 평균 단백질 85g은 목표 146g보다 낮습니다. 감량 후반부에는 칼로리보다 단백질 부족이 피로와 식욕 반동을 만듭니다.',
      '회식 다음 날 401kcal처럼 한 끼만 기록하는 방식보다, 1,200-1,400kcal 안에서 단백질을 채우는 방식이 더 안정적입니다.',
    ],
    counselor: [
      '문정토마토님은 기록 근육이 이미 강합니다. 그래서 이제는 더 조이는 것보다 덜 흔들리게 만드는 쪽이 성과를 냅니다.',
      '고열량 저녁을 없애려 하기보다, 그런 날 뒤에 몸을 다시 보호하는 식사를 넣으세요. 단백질을 채우는 것은 의지가 아니라 회복 전략입니다.',
      '목표까지 남은 거리가 짧아질수록 마음은 급해지기 쉽습니다. 속도를 조금 낮추더라도 컨디션을 지키는 쪽이 마지막 3kg을 더 안정적으로 만듭니다.',
    ],
    source: '산식: 최신 체중 71.5kg, 목표 68kg, 최근 기록 섭취 1,309kcal, 추정 TDEE 2,300kcal, 7,700kcal=1kg 기준.',
  },
};

let _activeReport = null;

function _renderReport(report) {
  const kpis = report.kpis.map(kpi => `
    <div class="dpr-kpi">
      <div>
        <div class="dpr-kpi-label">${_esc(kpi.label)}</div>
        <div class="dpr-kpi-value">${_esc(kpi.value)}</div>
      </div>
      <div class="dpr-kpi-note">${_esc(kpi.note)}</div>
    </div>
  `).join('');

  const metrics = report.metrics.map(metric => `
    <div class="dpr-bar-row">
      <div class="dpr-bar-label">${_esc(metric.label)}</div>
      <div class="dpr-bar-track"><span class="dpr-bar-fill ${_esc(metric.color)}" style="width:${Number(metric.width) || 0}%;"></span></div>
      <div class="dpr-bar-value">${_esc(metric.value)}</div>
    </div>
  `).join('');

  const projections = report.projections.map(item => `
    <div class="dpr-pill"><b>${_esc(item.value)}</b><span>${_esc(item.label)}</span></div>
  `).join('');

  const patterns = report.patterns.map(item => `<li>${_esc(item)}</li>`).join('');
  const counselor = report.counselor.map(item => `<p>${_esc(item)}</p>`).join('');

  return `
    <div class="dpr-head">
      <div class="dpr-head-copy">
        <div class="dpr-head-title">식단 프리미엄 리포트</div>
        <div class="dpr-head-sub">${_esc(report.name)}(${_esc(report.nick)}) · PDF 저장 가능</div>
      </div>
      <div class="dpr-actions">
        <button class="dpr-pdf-btn" type="button" data-dpr-action="print" aria-label="PDF로 저장">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          PDF
        </button>
        <button class="dpr-icon-btn" type="button" data-dpr-action="close" aria-label="닫기">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
    <div class="dpr-body">
      <span class="dpr-eyebrow">${_esc(report.eyebrow)}</span>
      <h1 class="dpr-title">${_esc(report.headline)}</h1>
      <p class="dpr-summary">${_esc(report.summary)}</p>
      <div class="dpr-kpis">${kpis}</div>

      <section class="dpr-section">
        <h2 class="dpr-section-title">기록 신뢰도</h2>
        <div class="dpr-callout ${_esc(report.trust.tone)}"><b>${_esc(report.trust.title)}</b><br>${_esc(report.trust.body)}</div>
      </section>

      <section class="dpr-section">
        <h2 class="dpr-section-title">감량 추정</h2>
        <div class="dpr-bars">${metrics}</div>
        <div class="dpr-pill-grid">${projections}</div>
      </section>

      <section class="dpr-section">
        <h2 class="dpr-section-title">회사원 회식 반영</h2>
        <div class="dpr-callout">${_esc(report.workDinner)}</div>
        <ul class="dpr-list">${patterns}</ul>
      </section>

      <section class="dpr-section">
        <h2 class="dpr-section-title">상담 코멘트</h2>
        <div class="dpr-counselor">${counselor}</div>
      </section>

      <p class="dpr-source">${_esc(report.source)} 의료 진단이 아닌 앱 리포트용 추정입니다.</p>
    </div>
    <div class="dpr-footer">
      <button class="dpr-primary" type="button" data-dpr-action="confirm">확인했어요</button>
      <div class="dpr-footer-note">닫으면 이번 리포트는 다시 자동 노출되지 않습니다.</div>
    </div>
  `;
}

async function _closeReport({ persist = true } = {}) {
  const overlay = document.getElementById('diet-premium-report-modal');
  if (!overlay) return;
  closeModal('diet-premium-report-modal');
  overlay.remove();

  const userId = _activeReport?.userId;
  const reportId = _activeReport?.reportId || DEFAULT_REPORT_ID;
  _activeReport = null;
  if (!persist || !userId) return;

  try {
    await saveDietPremiumReportSeen(reportId, {
      seenAt: Date.now(),
      userId,
    });
  } catch (e) {
    console.warn('[diet-premium-report] ack failed:', e?.message || e);
    showToast('리포트 확인 저장에 실패했어요', 2500, 'warning');
  }
}

function _showReport(userId, { persist = true, reportId = DEFAULT_REPORT_ID } = {}) {
  const report = REPORTS[userId];
  if (!report || document.getElementById('diet-premium-report-modal')) return false;

  const overlay = document.createElement('div');
  overlay.id = 'diet-premium-report-modal';
  overlay.className = 'dpr-overlay';
  overlay.innerHTML = `<div class="dpr-sheet" role="dialog" aria-modal="true" aria-label="식단 프리미엄 리포트">${_renderReport(report)}</div>`;

  _activeReport = { userId, reportId };
  document.body.appendChild(overlay);
  openModal('diet-premium-report-modal');

  const sheet = overlay.querySelector('.dpr-sheet');
  sheet?.addEventListener('click', (event) => event.stopPropagation());
  overlay.addEventListener('click', () => _closeReport({ persist }));
  overlay.querySelector('[data-dpr-action="close"]')?.addEventListener('click', () => _closeReport({ persist }));
  overlay.querySelector('[data-dpr-action="confirm"]')?.addEventListener('click', () => _closeReport({ persist }));
  overlay.querySelector('[data-dpr-action="print"]')?.addEventListener('click', () => window.print());
  return true;
}

export async function showDietPremiumReportIfNeeded() {
  if (!DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED) return false;

  const user = getCurrentUser();
  const userId = user?.id;
  if (!REPORTS[userId]) return false;
  const inbox = getDietPremiumReportInbox();
  const reportId = inbox?.reportId || DEFAULT_REPORT_ID;
  if (getDietPremiumReportSeen(reportId)) return false;
  return _showReport(userId, { persist: true, reportId });
}

if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  window.__showDietPremiumReportPreview = (userId) => _showReport(userId, { persist: false });
}

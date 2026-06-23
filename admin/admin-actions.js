import {
  DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED,
  DIET_PREMIUM_REPORT_TARGETS,
  deleteUserAccount,
  publishDietPremiumReportIssue,
} from '../data.js';
import {
  exportUsersReport, exportDailyActivity,
  exportSocialInteractions, exportLettersAndPatchnotes,
  exportAll, exportAIJson,
} from './admin-export.js';
import { escapeHtml } from './admin-utils.js';

let _rerender = null;
let _dietReportPeriod = 'weekly';
let _dietReportLastPublish = null;

function _targetLabel(target) {
  return `${target.name}${target.nick ? `(${target.nick})` : ''}`;
}

function _renderDietReportPublisher() {
  const isEnabled = DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED;
  const periodButtons = [
    ['weekly', '주간'],
    ['monthly', '월간'],
  ].map(([period, label]) => `
    <button
      class="${_dietReportPeriod === period ? 'hig-btn-primary' : 'hig-btn-secondary'}"
      type="button"
      onclick="window._adminSetDietReportPeriod('${period}')"
    >${label}</button>
  `).join('');
  const targetChips = DIET_PREMIUM_REPORT_TARGETS.map((target) => `
    <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:var(--hig-fill-tertiary);color:var(--hig-text);font-size:12px;font-weight:700;">
      ${escapeHtml(_targetLabel(target))}
    </span>
  `).join('');
  const lastPublish = _dietReportLastPublish ? `
    <div class="hig-caption1" style="margin-top:10px;color:var(--hig-gray1);">
      마지막 발간: ${escapeHtml(_dietReportLastPublish.title)} · ${escapeHtml(_dietReportLastPublish.cycleLabel)} · ${escapeHtml(String(_dietReportLastPublish.deliveredCount))}명 배송
    </div>
  ` : '';

  return `
    <div class="hig-card">
      <div class="hig-headline">식단 프리미엄 리포트 발간${isEnabled ? '' : ' 중지됨'}</div>
      <div class="hig-caption1" style="color:var(--hig-gray1);margin-top:6px;">
        ${isEnabled
          ? '선택한 주기 기준으로 최신 리포트 ID를 생성하고, 대상 계정의 다음 접속 때 1회성 모달로 배송합니다.'
          : '기존 사용자에게 불필요한 리포트 팝업이 반복 노출되지 않도록 자동 배송을 중지했습니다.'}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        ${periodButtons}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
        ${targetChips}
      </div>
      <button id="admin-diet-report-publish-button" class="hig-btn-primary" style="margin-top:12px;" onclick="window._adminPublishDietReport()" ${isEnabled ? '' : 'disabled'}>
        ${isEnabled ? '지금 리포트 발간/배송' : '자동 배송 중지됨'}
      </button>
      <div class="hig-caption1" style="color:var(--hig-gray1);margin-top:8px;">
        ${isEnabled
          ? '같은 주 또는 같은 달에 다시 발간하면 같은 ID를 사용해, 이미 확인한 사용자에게는 중복 자동 노출되지 않습니다.'
          : '다시 운영하려면 DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED를 켠 뒤 새 캐시 버전으로 배포해야 합니다.'}
      </div>
      ${lastPublish}
    </div>
  `;
}

async function _askDelete(uid, name) {
  const ok = await (window.confirmAction?.({
    title: `${name} 계정을 삭제할까요?`,
    message: '이 작업은 되돌릴 수 없어요.\n계정의 모든 운동·식단 기록이 함께 삭제돼요.',
    confirmLabel: '삭제',
    cancelLabel: '취소',
    destructive: true,
    longPress: 2000,
  }) || Promise.resolve(false));
  if (!ok) return;
  deleteUserAccount(uid)
    .then(() => {
      window.showToast?.(`${name} 계정을 삭제했습니다`, 2500, 'success');
      if (_rerender) _rerender();
    })
    .catch((error) => {
      window.showToast?.(`삭제 실패: ${error.message}`, 3500, 'error');
    });
}

export function renderSettingsSection(container, data, rerender) {
  _rerender = rerender;
  const users = [...data.realAccs]
    .sort((a, b) => ((a.nickname || '') > (b.nickname || '') ? 1 : -1));

  container.innerHTML = `
    <div class="hig-rows">
      <div class="hig-card">
        <div class="hig-headline">데이터 내보내기</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <button class="hig-btn-secondary" onclick="window._adminExportSettings('ai_json')">AI JSON</button>
          <button class="hig-btn-secondary" onclick="window._adminExportSettings('all_csv')">전체 CSV</button>
          <button class="hig-btn-secondary" onclick="window._adminExportSettings('users')">유저 CSV</button>
          <button class="hig-btn-secondary" onclick="window._adminExportSettings('daily')">일일 CSV</button>
        </div>
      </div>

      ${_renderDietReportPublisher()}

      <div class="hig-card">
        <div class="hig-headline">함께 축하해요 관리</div>
        <div class="hig-caption1" style="color:var(--hig-gray1);margin-top:4px;">감지 모듈 on/off 및 수동 축하 작성</div>
        <div id="admin-cheers-container" style="margin-top:12px;"></div>
      </div>

      <div class="hig-card">
        <div class="hig-headline">Admin 모드 전환</div>
        <div class="hig-subhead" style="color:var(--hig-gray1);margin-top:6px;">게스트 모드로 전환하려면 아래 버튼을 사용하세요.</div>
        <button class="hig-btn-secondary" style="margin-top:10px;" onclick="window.switchKimMode && window.switchKimMode('Guest')">게스트 모드로 전환</button>
      </div>

      <div class="hig-card-grouped">
        <div class="hig-list-row"><div class="hig-headline">유저 삭제</div></div>
        ${users.map((user) => `
          <div class="hig-list-row" style="justify-content:space-between;">
            <div>
              <div class="hig-subhead">${escapeHtml(user.nickname || `${user.lastName || ''}${user.firstName || ''}` || user.id)}</div>
              <div class="hig-caption1" style="color:var(--hig-gray1);">${escapeHtml(user.id)}</div>
            </div>
            <button class="hig-btn-destructive" onclick="window._adminConfirmDeleteUser('${user.id}','${escapeHtml(user.nickname || user.id)}')">삭제</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // cheers 관리 UI는 lazy import로 로드
  import('./admin-cheers.js').then((mod) => {
    const el = document.getElementById('admin-cheers-container');
    if (el) mod.renderCheersAdminCard(el, data);
  }).catch((err) => console.warn('[admin-actions] cheers module load:', err));
}

window._adminConfirmDeleteUser = (uid, name) => _askDelete(uid, name);

window._adminSetDietReportPeriod = (period) => {
  _dietReportPeriod = period === 'monthly' ? 'monthly' : 'weekly';
  if (_rerender) _rerender();
};

window._adminPublishDietReport = async () => {
  if (!DIET_PREMIUM_REPORT_AUTO_DELIVERY_ENABLED) {
    window.showToast?.('식단 프리미엄 리포트 자동 배송이 중지되어 있습니다', 2500, 'info');
    return;
  }

  const periodLabel = _dietReportPeriod === 'monthly' ? '월간' : '주간';
  const ok = await (window.confirmAction?.({
    title: `${periodLabel} 식단 리포트를 발간할까요?`,
    message: DIET_PREMIUM_REPORT_TARGETS.map(_targetLabel).join(', ') + ' 계정에 다음 접속 1회성 모달로 배송됩니다.',
    confirmLabel: '발간',
    cancelLabel: '취소',
  }) || Promise.resolve(window.confirm?.(`${periodLabel} 식단 리포트를 발간할까요?`) ?? true));
  if (!ok) return;

  const button = document.getElementById('admin-diet-report-publish-button');
  if (button) {
    button.disabled = true;
    button.textContent = '발간 중...';
  }

  try {
    const result = await publishDietPremiumReportIssue({
      period: _dietReportPeriod,
      targetUserIds: DIET_PREMIUM_REPORT_TARGETS.map((target) => target.id),
    });
    _dietReportLastPublish = result;
    window.showToast?.(`${result.title}를 ${result.deliveredCount}명에게 배송했습니다`, 3000, 'success');
    if (_rerender) _rerender();
  } catch (error) {
    window.showToast?.(`리포트 발간 실패: ${error.message}`, 3500, 'error');
    if (button) {
      button.disabled = false;
      button.textContent = '지금 리포트 발간/배송';
    }
  }
};

window._adminExportSettings = (type) => {
  if (!window.__adminDataCache) return;
  switch (type) {
    case 'users':
      exportUsersReport(window.__adminDataCache);
      break;
    case 'daily':
      exportDailyActivity(window.__adminDataCache);
      break;
    case 'social':
      exportSocialInteractions(window.__adminDataCache);
      break;
    case 'letters':
      exportLettersAndPatchnotes(window.__adminDataCache);
      break;
    case 'all_csv':
      exportAll(window.__adminDataCache);
      break;
    case 'ai_json':
      exportAIJson(window.__adminDataCache);
      break;
  }
};

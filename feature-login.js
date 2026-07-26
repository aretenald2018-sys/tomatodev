import { initLoginScreen } from './auth/login-screen.js';
import { _bindLoginActions } from './auth/login-actions.js';

export {
  logoutAccount,
  switchKimMode,
} from './auth/login-screen.js';
export { openGuildModal } from './social/guild-modal.js';
export { openLetterModal } from './feature-letters.js';
export { submitDietSetup } from './feature-diet-setup.js';

// 페이지 로드 시 로그인 초기화
document.addEventListener('DOMContentLoaded', () => {
  _bindLoginActions();
  initLoginScreen();
});

// 밝은 모드 고정 (앱은 라이트 테마 전용, :root.light 규칙을 활성화)
(function() {
  document.documentElement.classList.add('light');
})();

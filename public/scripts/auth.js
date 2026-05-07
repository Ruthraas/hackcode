// ===== AUTH.JS — ES Module =====
import { DB, Security, applySiteConfig, initDefaultChallenges, playBeep } from './security.js';

// ── BOOT SEQUENCE ──
async function runBoot() {
  const bootText = document.getElementById('boot-text');
  const bootProgress = document.getElementById('boot-progress');
  const bootScreen = document.getElementById('boot-screen');
  const authContainer = document.getElementById('auth-container');

  // Busca mensagem salva no JSON local, mas com timeout para não travar
  let bootMsg = 'ACESSO AUTORIZADO. BEM-VINDO AO SISTEMA.';
  try {
    const cfg = await Promise.race([
      DB.getSiteConfig(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
    ]);
    bootMsg = cfg.bootMessage || bootMsg;
  } catch (e) {
    // API local indisponível — usa mensagem padrão e continua
  }

  const lines = [
    'HACKCODE OS v2.0.47',
    'Carregando ambiente de estudos...',
    'Preparando trilhas de desenvolvimento...',
    bootMsg,
    'Pronto.'
  ];

  let progress = 0;
  const step = 100 / lines.length;

  for (const line of lines) {
    bootText.textContent = '> ' + line;
    progress += step;
    bootProgress.style.width = Math.min(progress, 100) + '%';
    await new Promise(r => setTimeout(r, 350));
  }

  bootProgress.style.width = '100%';
  await new Promise(r => setTimeout(r, 200));

  // Esconde boot, mostra login
  bootScreen.style.opacity = '0';
  bootScreen.style.transition = 'opacity 0.4s';
  await new Promise(r => setTimeout(r, 400));
  bootScreen.style.display = 'none';
  authContainer.style.display = 'grid';

  // Init challenges em background (não bloqueia UI)
  initDefaultChallenges().catch(() => {});
}

// ── LOGIN ──
window.handleLogin = async function() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const errorEl = document.getElementById('login-error');
  const attemptsEl = document.getElementById('login-attempts');
  const btn = document.getElementById('btn-login');

  errorEl.style.display = 'none';
  attemptsEl.style.display = 'none';

  if (!username || !password) {
    showError(errorEl, 'Preencha usuário e senha.');
    return;
  }

  // Rate limit
  const rateKey = 'login_' + username.toLowerCase();
  const rate = Security.checkRateLimit(rateKey, false);
  if (rate.blocked) {
    showError(errorEl, `Muitas tentativas. Aguarde ${rate.wait} minutos.`);
    return;
  }

  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'VERIFICANDO...';

  try {
    const user = await DB.getUser(username);

    if (!user) {
      Security.checkRateLimit(rateKey);
      showError(errorEl, 'Usuário ou senha incorretos.');
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'ENTRAR';
      return;
    }

    if (user.banned) {
      showError(errorEl, 'Conta banida. Contate o administrador.');
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'ENTRAR';
      return;
    }

    const hash = await Security.hashPassword(password);
    if (hash !== user.passwordHash) {
      Security.checkRateLimit(rateKey);
      const remaining = 5 - (Security._attempts[rateKey]?.count || 0);
      if (remaining <= 2) {
        attemptsEl.textContent = `⚠ ${remaining} tentativas restantes.`;
        attemptsEl.style.display = 'block';
      }
      showError(errorEl, 'Usuário ou senha incorretos.');
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'ENTRAR';
      return;
    }

    // Sucesso
    Security.resetRateLimit(rateKey);
    DB.setSession({ username: user.username, role: user.role || 'user' });
    await DB.addLog('info', `Login: ${user.username}`);
    playBeep(800, 100);

    btn.querySelector('.btn-text').textContent = 'ACESSO CONCEDIDO!';
    await new Promise(r => setTimeout(r, 500));
    window.location.href = '/dashboard';

  } catch (e) {
    console.error('Login error:', e);
    showError(errorEl, 'Erro de conexão. Tente novamente.');
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'ENTRAR';
  }
};

// ── REGISTER ──
window.handleRegister = async function() {
  const username = document.getElementById('reg-user').value.trim();
  const password = document.getElementById('reg-pass').value;
  const password2 = document.getElementById('reg-pass2').value;
  const errorEl = document.getElementById('reg-error');
  const successEl = document.getElementById('reg-success');

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  const usernameErr = Security.validateUsername(username);
  if (usernameErr) { showError(errorEl, usernameErr); return; }

  const passErr = Security.validatePassword(password);
  if (passErr) { showError(errorEl, passErr); return; }

  if (password !== password2) { showError(errorEl, 'Senhas não coincidem.'); return; }

  // Verifica se já existe
  let existing = null;
  try {
    existing = await DB.getUser(username);
  } catch (e) {
    console.error('Register getUser error:', e);
    showError(errorEl, 'Não foi possível verificar o usuário agora.');
    return;
  }
  if (existing) { showError(errorEl, 'Este username já está em uso.'); return; }

  const passwordHash = await Security.hashPassword(password);
  const newUser = {
    username: username.toLowerCase(),
    displayName: username,
    avatarUrl: '',
    preferredLanguages: [],
    passwordHash,
    role: 'user',
    xp: 0,
    completedChallenges: [],
    achievements: [],
    banned: false,
    createdAt: new Date().toISOString()
  };

  const saved = await DB.saveUser(username, newUser);
  if (!saved) { showError(errorEl, 'Erro ao criar conta. Verifique o servidor local e tente novamente.'); return; }

  await DB.addLog('info', `Novo usuário: ${username}`);
  successEl.textContent = '✓ Conta criada! Faça login agora.';
  successEl.style.display = 'block';
  playBeep(600, 150);

  setTimeout(() => window.showLogin(), 1500);
};

// ── TOGGLE VIEWS ──
window.showRegister = function() {
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('register-box').style.display = 'block';
};

window.showLogin = function() {
  document.getElementById('register-box').style.display = 'none';
  document.getElementById('login-box').style.display = 'block';
};

// ── PASSWORD STRENGTH ──
function bindAuthInputs() {
  const passInput = document.getElementById('reg-pass');
  if (passInput) {
    passInput.addEventListener('input', () => {
      const strength = Security.passwordStrength(passInput.value);
      const el = document.getElementById('pass-strength');
      if (!el) return;
      const labels = ['', 'FRACA', 'FRACA', 'MÉDIA', 'FORTE', 'MUITO FORTE'];
      const colors = ['', '#ff0040', '#ff5000', '#ffa500', '#00ff64', '#00ff00'];
      el.textContent = passInput.value ? `Força: ${labels[strength] || 'MUITO FORTE'}` : '';
      el.style.color = colors[Math.min(strength, 5)];
    });
  }

  // Enter key no login
  document.getElementById('login-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.handleLogin();
  });
  document.getElementById('login-user')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.handleLogin();
  });
}

// ── HELPERS ──
function showError(el, msg) {
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}

async function initAuthPage() {
  const token = window.__hackcodePageToken || 'auth';
  window.__hackcodeInitTokens ||= {};
  if (window.__hackcodeInitTokens.auth === token) return;
  window.__hackcodeInitTokens.auth = token;

  bindAuthInputs();

  if (DB.isSessionValid()) {
    window.location.href = '/dashboard';
    return;
  }

  Promise.race([
    applySiteConfig(),
    new Promise(r => setTimeout(r, 3000))
  ]).finally(() => runBoot());
}

document.addEventListener('hackcode:ready', event => {
  if (event.detail?.page === 'auth') initAuthPage();
});

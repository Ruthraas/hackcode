// ===== ADMIN PANEL — ES Module =====
import { DB, Security, logout, playBeep, applySiteConfig } from './security.js';

let editingChallengeId = null;

const DIFFICULTY_LABELS = {
  easy: 'FÁCIL',
  hard: 'DIFÍCIL',
  complex: 'COMPLEXO',
  senior: 'MESTRE SENIOR'
};

const DIFFICULTY_COLORS = {
  easy: '#00ff64',
  hard: '#ffb020',
  complex: '#ff4d8d',
  senior: '#d7ff00'
};

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  cpp: 'C++',
  csharp: 'C#',
  java: 'Java',
  css: 'CSS'
};

async function initAdminPage() {
  const token = window.__hackcodePageToken || 'admin';
  window.__hackcodeInitTokens ||= {};
  if (window.__hackcodeInitTokens.admin === token) return;
  window.__hackcodeInitTokens.admin = token;

  if (!DB.isSessionValid()) {
    window.location.href = '/';
    return;
  }

  const user = await DB.getCurrentUser();
  if (!user || !user.isAdmin) {
    window.location.href = '/dashboard';
    return;
  }

  await DB.addLog('info', `Painel admin acessado por: ${user.username}`);

  await loadOverview();
  await loadCustomize();
  await loadChallengesAdmin();
  await loadUsersAdmin();
  await loadLogs();
}

document.addEventListener('hackcode:ready', event => {
  if (event.detail?.page === 'admin') initAdminPage();
});

// ===== TAB NAVIGATION =====
function showTab(name) {
  document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).style.display = 'block';
  event.target.classList.add('active');
  playBeep(600, 60);
}

// ===== OVERVIEW =====
async function loadOverview() {
  const [users, challenges, submissions] = await Promise.all([
    DB.getUsers(),
    DB.getChallenges(),
    DB.getSubmissions()
  ]);

  const userList = Object.values(users);
  const banned = userList.filter(u => u.banned).length;

  document.getElementById('ov-users').textContent = userList.length;
  document.getElementById('ov-challenges').textContent = challenges.length;
  document.getElementById('ov-submissions').textContent = submissions.length;
  document.getElementById('ov-banned').textContent = banned;

  const log = document.getElementById('activity-log');
  const logs = await DB.getLogs();
  const recent = logs.slice(0, 30);

  if (recent.length === 0) {
    log.innerHTML = '<div class="activity-item"><span class="activity-time">--</span><span>Nenhuma atividade registrada.</span></div>';
    return;
  }

  log.innerHTML = recent.map(l => {
    const t = new Date(l.time).toLocaleTimeString('pt-BR');
    return `
      <div class="activity-item">
        <span class="activity-time">${t}</span>
        <span>[${l.level.toUpperCase()}]</span>
        <span>${Security.sanitize(l.msg)}</span>
      </div>
    `;
  }).join('');
}

// ===== CUSTOMIZATION =====
async function loadCustomize() {
  const cfg = await DB.getSiteConfig();

  document.getElementById('color-primary').value = cfg.primaryColor || '#00ff00';
  document.getElementById('color-primary-hex').value = cfg.primaryColor || '#00ff00';
  document.getElementById('color-secondary').value = cfg.secondaryColor || '#00ffff';
  document.getElementById('color-secondary-hex').value = cfg.secondaryColor || '#00ffff';
  document.getElementById('color-bg').value = cfg.bgColor || '#000000';
  document.getElementById('color-bg-hex').value = cfg.bgColor || '#000000';
  document.getElementById('color-accent').value = cfg.accentColor || '#ff0040';
  document.getElementById('color-accent-hex').value = cfg.accentColor || '#ff0040';
  document.getElementById('boot-message').value = cfg.bootMessage || 'ACESSO AUTORIZADO. BEM-VINDO AO SISTEMA.';
  document.getElementById('matrix-effect').checked = cfg.matrixEffect !== false;
  document.getElementById('scanlines-effect').checked = cfg.scanlinesEffect !== false;
  document.getElementById('glitch-effect').checked = cfg.glitchEffect !== false;
  document.getElementById('sound-effect').checked = cfg.soundEffect === true;
}

function updateSiteColor(key, value) {
  const hexMap = { primary: 'color-primary-hex', secondary: 'color-secondary-hex', bg: 'color-bg-hex', accent: 'color-accent-hex' };
  const cssMap = { primary: '--primary', secondary: '--secondary', bg: '--bg', accent: '--accent' };
  if (hexMap[key]) document.getElementById(hexMap[key]).value = value;
  if (cssMap[key]) document.documentElement.style.setProperty(cssMap[key], value);
}

function updateSiteColorHex(key, value) {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
  const pickMap = { primary: 'color-primary', secondary: 'color-secondary', bg: 'color-bg', accent: 'color-accent' };
  if (pickMap[key]) document.getElementById(pickMap[key]).value = value;
  updateSiteColor(key, value);
}

async function toggleEffect(effect) {
  const cfg = await DB.getSiteConfig();
  if (effect === 'matrix') {
    const on = document.getElementById('matrix-effect').checked;
    cfg.matrixEffect = on;
    if (on && window.matrixControl) window.matrixControl.start();
    else if (window.matrixControl) window.matrixControl.stop();
  }
  if (effect === 'scanlines') {
    const on = document.getElementById('scanlines-effect').checked;
    cfg.scanlinesEffect = on;
    document.querySelector('.scanlines').style.display = on ? 'block' : 'none';
  }
  if (effect === 'glitch') cfg.glitchEffect = document.getElementById('glitch-effect').checked;
  if (effect === 'sound') cfg.soundEffect = document.getElementById('sound-effect').checked;
  await DB.saveSiteConfig(cfg);
}

async function saveBootMessage() {
  const msg = document.getElementById('boot-message').value.trim();
  if (!msg) return;
  const cfg = await DB.getSiteConfig();
  cfg.bootMessage = Security.sanitize(msg).substring(0, 100);
  await DB.saveSiteConfig(cfg);
  showNotify('✓ Mensagem de boot salva!');
  playBeep(700, 150);
}

async function saveCustomization() {
  const cfg = await DB.getSiteConfig();
  cfg.primaryColor = document.getElementById('color-primary').value;
  cfg.secondaryColor = document.getElementById('color-secondary').value;
  cfg.bgColor = document.getElementById('color-bg').value;
  cfg.accentColor = document.getElementById('color-accent').value;
  cfg.bootMessage = document.getElementById('boot-message').value.trim().substring(0, 100);
  cfg.matrixEffect = document.getElementById('matrix-effect').checked;
  cfg.scanlinesEffect = document.getElementById('scanlines-effect').checked;
  cfg.glitchEffect = document.getElementById('glitch-effect').checked;
  cfg.soundEffect = document.getElementById('sound-effect').checked;
  await DB.saveSiteConfig(cfg);
  await DB.addLog('info', 'Admin salvou configurações do site');
  showNotify('💾 Configurações salvas! Todos os usuários verão as mudanças.');
  playBeep(800, 200);
}

async function resetCustomization() {
  if (!confirm('Restaurar configurações padrão?')) return;
  const defaults = {
    primaryColor: '#00ff00', secondaryColor: '#00ffff', bgColor: '#000000', accentColor: '#ff0040',
    bootMessage: 'ACESSO AUTORIZADO. BEM-VINDO AO SISTEMA.',
    matrixEffect: true, scanlinesEffect: true, glitchEffect: true, soundEffect: false
  };
  await DB.saveSiteConfig(defaults);
  await applySiteConfig();
  await loadCustomize();
  showNotify('↺ Configurações restauradas ao padrão.');
  playBeep(400, 150);
}

// ===== CHALLENGES ADMIN =====
async function loadChallengesAdmin() {
  const challenges = await DB.getChallenges();
  const list = document.getElementById('challenges-admin-list');

  if (challenges.length === 0) {
    list.innerHTML = '<div style="color:var(--text-dim);padding:1rem">Nenhum desafio cadastrado.</div>';
    return;
  }

  list.innerHTML = challenges.map(ch => `
    <div class="admin-challenge-item">
      <div class="admin-challenge-info">
        <div class="admin-challenge-title">${Security.sanitize(ch.title)}</div>
        <div class="admin-challenge-meta">
          <span style="color:${DIFFICULTY_COLORS[ch.difficulty] || 'var(--primary)'}">
            ${DIFFICULTY_LABELS[ch.difficulty] || ch.difficulty}
          </span>
          · ${LANGUAGE_LABELS[ch.language] || (ch.language || 'JS').toUpperCase()} · ${ch.xp} XP · ID: ${ch.id}
        </div>
      </div>
      <div class="admin-challenge-actions">
        <button class="admin-btn edit" onclick="editChallenge(${ch.id})">EDITAR</button>
        <button class="admin-btn delete" onclick="deleteChallenge(${ch.id})">DELETAR</button>
      </div>
    </div>
  `).join('');
}

function showCreateChallenge() {
  editingChallengeId = null;
  document.getElementById('modal-title').textContent = 'CRIAR DESAFIO';
  clearChallengeForm();
  document.getElementById('challenge-modal').style.display = 'flex';
  playBeep(600, 80);
}

async function editChallenge(id) {
  const challenges = await DB.getChallenges();
  const ch = challenges.find(c => c.id === id);
  if (!ch) return;

  editingChallengeId = id;
  document.getElementById('modal-title').textContent = 'EDITAR DESAFIO';
  document.getElementById('ch-title').value = ch.title || '';
  document.getElementById('ch-diff').value = ch.difficulty || 'easy';
  document.getElementById('ch-lang').value = ch.language || 'javascript';
  document.getElementById('ch-desc-input').value = ch.description || '';
  document.getElementById('ch-input-ex').value = ch.inputExample || '';
  document.getElementById('ch-output-ex').value = ch.outputExample || '';
  document.getElementById('ch-starter').value = ch.starterCode || '';
  document.getElementById('ch-tests').value = ch.testCases ? JSON.stringify(ch.testCases, null, 2) : '[]';
  document.getElementById('ch-xp-val').value = ch.xp || 100;
  document.getElementById('ch-hints-input').value = (ch.hints || []).join('|');
  document.getElementById('challenge-modal').style.display = 'flex';
  playBeep(600, 80);
}

async function saveChallenge() {
  const title = document.getElementById('ch-title').value.trim();
  const diff = document.getElementById('ch-diff').value;
  const lang = document.getElementById('ch-lang').value;
  const desc = document.getElementById('ch-desc-input').value.trim();
  const inputEx = document.getElementById('ch-input-ex').value.trim();
  const outputEx = document.getElementById('ch-output-ex').value.trim();
  const starter = document.getElementById('ch-starter').value;
  const testsRaw = document.getElementById('ch-tests').value.trim();
  const xp = parseInt(document.getElementById('ch-xp-val').value) || 100;
  const hintsRaw = document.getElementById('ch-hints-input').value.trim();

  if (!title || !desc) { showNotify('❌ Preencha título e descrição!'); return; }

  let testCases = [];
  if (testsRaw) {
    try { testCases = JSON.parse(testsRaw); }
    catch (e) { showNotify('❌ JSON dos casos de teste inválido!'); return; }
  }

  const hints = hintsRaw ? hintsRaw.split('|').map(h => h.trim()).filter(Boolean) : [];
  const challenges = await DB.getChallenges();

  if (editingChallengeId !== null) {
    const idx = challenges.findIndex(c => c.id === editingChallengeId);
    if (idx !== -1) {
      challenges[idx] = {
        ...challenges[idx], title, difficulty: diff, language: lang, description: desc,
        inputExample: inputEx, outputExample: outputEx, starterCode: starter,
        testCases, xp: Math.min(Math.max(xp, 10), 2000), hints,
        updatedAt: new Date().toISOString()
      };
      await DB.saveChallenge(challenges[idx]);
    }
    await DB.addLog('info', `Admin editou desafio: "${title}"`);
    showNotify(`✓ Desafio "${title}" atualizado!`);
  } else {
    const newId = Math.max(0, ...challenges.map(c => c.id)) + 1;
    const newChallenge = {
      id: newId, title, difficulty: diff, language: lang, description: desc,
      inputExample: inputEx, outputExample: outputEx,
      starterCode: starter || '// Seu código aqui\n',
      testCases, xp: Math.min(Math.max(xp, 10), 2000), hints,
      badge: null, createdBy: 'carlos', createdAt: new Date().toISOString()
    };
    await DB.saveChallenge(newChallenge);
    await DB.addLog('info', `Admin criou desafio: "${title}"`);
    showNotify(`✓ Desafio "${title}" criado com sucesso!`);
  }

  closeChallengeModal();
  await loadChallengesAdmin();
  await loadOverview();
  playBeep(800, 200);
}

async function deleteChallenge(id) {
  const challenges = await DB.getChallenges();
  const ch = challenges.find(c => c.id === id);
  if (!ch) return;
  if (!confirm(`Deletar o desafio "${ch.title}"? Esta ação é irreversível.`)) return;

  await DB.deleteChallenge(id);
  await DB.addLog('warn', `Admin deletou desafio: "${ch.title}" (ID: ${id})`);
  showNotify(`🗑 Desafio "${ch.title}" deletado.`);
  await loadChallengesAdmin();
  await loadOverview();
  playBeep(300, 200);
}

function clearChallengeForm() {
  ['ch-title', 'ch-input-ex', 'ch-output-ex', 'ch-hints-input'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('ch-desc-input').value = '';
  document.getElementById('ch-starter').value = '// Seu código aqui\n';
  document.getElementById('ch-tests').value = '[{"input":"funcao(args)","expected":"resultado"}]';
  document.getElementById('ch-xp-val').value = 100;
  document.getElementById('ch-diff').value = 'easy';
  document.getElementById('ch-lang').value = 'javascript';
}

function closeChallengeModal() {
  document.getElementById('challenge-modal').style.display = 'none';
  editingChallengeId = null;
}

// ===== USERS ADMIN =====
async function loadUsersAdmin(filter = '') {
  const users = await DB.getUsers();
  const list = document.getElementById('users-admin-list');
  const userArr = Object.values(users).filter(u =>
    !filter || u.username.includes(filter.toLowerCase()) || (u.displayName || '').toLowerCase().includes(filter.toLowerCase())
  );

  if (userArr.length === 0) {
    list.innerHTML = '<div style="color:var(--text-dim);padding:1rem">Nenhum usuário encontrado.</div>';
    return;
  }

  list.innerHTML = userArr.map(u => `
    <div class="admin-user-item ${u.banned ? 'banned' : ''}">
      <div class="admin-user-info">
        <div class="admin-user-name">
          ${Security.sanitize(u.displayName || u.username)}
          ${u.isAdmin ? '<span style="color:#ffd700;font-size:0.7rem"> 👑 ADMIN</span>' : ''}
          ${u.banned ? '<span style="color:var(--accent);font-size:0.7rem"> 🔴 BANIDO</span>' : ''}
        </div>
        <div class="admin-user-meta">
          @${Security.sanitize(u.username)} · Nível ${Math.floor((u.xp || 0) / 300) + 1} · ${u.xp || 0} XP
          · ${(u.completedChallenges || []).length} desafios
          · Desde ${u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '?'}
        </div>
      </div>
      <div class="admin-challenge-actions">
        ${!u.isAdmin ? `
          <button class="admin-btn ${u.banned ? 'edit' : 'delete'}" onclick="toggleBan('${u.username}')">
            ${u.banned ? 'DESBANIR' : 'BANIR'}
          </button>
          <button class="admin-btn delete" onclick="deleteUser('${u.username}')">DELETAR</button>
        ` : '<span style="font-size:0.65rem;color:var(--text-dim)">PROTEGIDO</span>'}
      </div>
    </div>
  `).join('');
}

function searchUsers() {
  const filter = document.getElementById('user-search').value.trim();
  loadUsersAdmin(filter);
}

async function toggleBan(username) {
  const user = await DB.getUser(username);
  if (!user || user.isAdmin) return;
  user.banned = !user.banned;
  await DB.saveUser(username, user);
  await DB.addLog('warn', `Admin ${user.banned ? 'baniu' : 'desbaniu'} usuário: ${username}`);
  showNotify(`${user.banned ? '🔴 Usuário banido' : '✓ Usuário desbanido'}: ${username}`);
  await loadUsersAdmin();
  await loadOverview();
  playBeep(user.banned ? 200 : 600, 150);
}

async function deleteUser(username) {
  const user = await DB.getUser(username);
  if (!user || user.isAdmin) return;
  if (!confirm(`Deletar permanentemente o usuário "${username}"?`)) return;

  await DB.deleteUser(username);
  await DB.addLog('warn', `Admin deletou usuário: ${username}`);
  showNotify(`🗑 Usuário "${username}" deletado.`);
  await loadUsersAdmin();
  await loadOverview();
  playBeep(200, 200);
}

// ===== LOGS =====
async function loadLogs() {
  const logsEl = document.getElementById('system-logs');
  const logs = await DB.getLogs();

  if (logs.length === 0) {
    logsEl.innerHTML = '<div class="log-entry"><span class="log-msg" style="color:var(--text-dim)">Nenhum log registrado.</span></div>';
    return;
  }

  logsEl.innerHTML = logs.map(l => {
    const t = new Date(l.time).toLocaleString('pt-BR');
    const levelClass = `log-level-${l.level}`;
    return `
      <div class="log-entry">
        <span class="log-time">${t}</span>
        <span class="${levelClass}">[${l.level.toUpperCase()}]</span>
        <span class="log-msg">${Security.sanitize(l.msg)}</span>
      </div>
    `;
  }).join('');

  logsEl.scrollTop = logsEl.scrollHeight;
}

async function clearLogs() {
  if (!confirm('Limpar todos os logs do sistema?')) return;
  await DB.clearLogs();
  await DB.addLog('info', 'Logs limpos pelo admin');
  await loadLogs();
  showNotify('🗑 Logs limpos.');
  playBeep(400, 150);
}

async function exportLogs() {
  const logs = await DB.getLogs();
  const text = logs.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.msg}`).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hackcode-logs-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showNotify('📥 Logs exportados!');
}

// ===== UTILITIES =====
function showNotify(msg) {
  const el = document.getElementById('terminal-notify');
  el.textContent = '> ' + msg;
  el.style.display = 'block';
  clearTimeout(window._notifyTimer);
  window._notifyTimer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// ===== EXPÕE FUNÇÕES PARA onclick NO HTML =====
window.logout              = logout;
window.showTab             = showTab;
window.showCreateChallenge = showCreateChallenge;
window.editChallenge       = editChallenge;
window.deleteChallenge     = deleteChallenge;
window.closeChallengeModal = closeChallengeModal;
window.saveChallenge       = saveChallenge;
window.searchUsers         = searchUsers;
window.toggleBan           = toggleBan;
window.deleteUser          = deleteUser;
window.clearLogs           = clearLogs;
window.exportLogs          = exportLogs;
window.saveCustomization   = saveCustomization;
window.resetCustomization  = resetCustomization;
window.updateSiteColor     = updateSiteColor;
window.updateSiteColorHex  = updateSiteColorHex;
window.saveBootMessage     = saveBootMessage;
window.toggleEffect        = toggleEffect;

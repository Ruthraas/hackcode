// ===== SECURITY.JS — ES Module =====

// ===== SECURITY UTILITIES =====
export const Security = {
  sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  validateUsername(u) {
    if (!u || u.length < 2 || u.length > 30) return 'Username deve ter entre 2 e 30 caracteres.';
    if (!/^[a-zA-Z0-9_\-]+$/.test(u)) return 'Username só pode ter letras, números, _ e -.';
    if (/^(admin|root|system|hackcode|carlos)$/i.test(u)) return 'Este username é reservado.';
    return null;
  },

  validatePassword(p) {
    if (!p || p.length < 8) return 'Senha deve ter pelo menos 8 caracteres.';
    if (p.length > 100) return 'Senha muito longa.';
    return null;
  },

  passwordStrength(p) {
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    return score;
  },

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'hackcode_salt_2024_x9z');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  generateToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  _attempts: {},
  checkRateLimit(key, increment = true) {
    const now = Date.now();
    if (!this._attempts[key]) this._attempts[key] = { count: 0, firstAttempt: now, blocked: false };
    const a = this._attempts[key];
    if (now - a.firstAttempt > 15 * 60 * 1000) {
      this._attempts[key] = { count: 0, firstAttempt: now, blocked: false };
      return { blocked: false, remaining: 5 };
    }
    if (a.blocked) {
      const wait = Math.ceil((15 * 60 * 1000 - (now - a.firstAttempt)) / 1000 / 60);
      return { blocked: true, wait };
    }
    if (!increment) return { blocked: false, remaining: 5 - a.count };
    a.count++;
    if (a.count >= 5) { a.blocked = true; return { blocked: true, wait: 15 }; }
    return { blocked: false, remaining: 5 - a.count };
  },

  resetRateLimit(key) { delete this._attempts[key]; },

  sanitizeCode(code) {
    if (typeof code !== 'string') return '';
    if (code.length > 10000) return code.substring(0, 10000);
    return code;
  },

  getCSRFToken() {
    let t = sessionStorage.getItem('csrf_token');
    if (!t) { t = this.generateToken(); sessionStorage.setItem('csrf_token', t); }
    return t;
  }
};

async function api(action, payload = {}) {
  const response = await fetch('/api/hackcode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) {
    throw new Error(json?.error || 'Falha na API local.');
  }

  return json.data;
}

const STORAGE_KEY = 'hackcode_browser_data_v1';
const ADMIN_PASSWORD_HASH = '738326f2d63bd058755adffcd5e71089c56d8bc79af32c3af89ffe712b935e6a';
const DEFAULT_SITE_CONFIG = {
  primaryColor: '#00ff00',
  secondaryColor: '#00ffff',
  bgColor: '#000000',
  accentColor: '#ff0040',
  bootMessage: 'ACESSO AUTORIZADO. BEM-VINDO AO SISTEMA.',
  matrixEffect: true,
  scanlinesEffect: true,
  glitchEffect: true,
  soundEffect: false
};

function createFallbackData() {
  const createdAt = new Date().toISOString();
  return {
    users: {
      carlos: {
        username: 'carlos',
        displayName: 'Carlos',
        avatarUrl: '',
        preferredLanguages: [],
        passwordHash: ADMIN_PASSWORD_HASH,
        role: 'admin',
        isAdmin: true,
        xp: 0,
        completedChallenges: [],
        achievements: ['admin_power'],
        banned: false,
        createdAt
      }
    },
    challenges: [],
    submissions: [],
    logs: [],
    siteConfig: DEFAULT_SITE_CONFIG
  };
}

function normalizeData(data = {}) {
  const fallback = createFallbackData();
  const users = { ...fallback.users, ...(data.users || {}) };

  users.carlos = {
    ...fallback.users.carlos,
    ...(users.carlos || {}),
    username: 'carlos',
    displayName: users.carlos?.displayName || 'Carlos',
    avatarUrl: users.carlos?.avatarUrl || '',
    preferredLanguages: users.carlos?.preferredLanguages || [],
    passwordHash: ADMIN_PASSWORD_HASH,
    role: 'admin',
    isAdmin: true,
    banned: false,
    achievements: Array.from(new Set([...(users.carlos?.achievements || []), 'admin_power']))
  };

  for (const user of Object.values(users)) {
    user.username = String(user.username || '').toLowerCase();
    user.displayName ||= user.username;
    user.avatarUrl ||= '';
    user.preferredLanguages ||= [];
    user.completedChallenges ||= [];
    user.achievements ||= [];
    user.role ||= user.isAdmin ? 'admin' : 'user';
    user.banned = Boolean(user.banned);
    user.xp ||= 0;
    user.createdAt ||= new Date().toISOString();
  }

  return {
    users,
    challenges: Array.isArray(data.challenges) ? data.challenges : fallback.challenges,
    submissions: Array.isArray(data.submissions) ? data.submissions : fallback.submissions,
    logs: Array.isArray(data.logs) ? data.logs : fallback.logs,
    siteConfig: { ...DEFAULT_SITE_CONFIG, ...(data.siteConfig || {}) }
  };
}

function readStoredData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : null;
  } catch (e) {
    console.error('readStoredData error:', e);
    return null;
  }
}

function writeStoredData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
  return true;
}

async function getBrowserData() {
  const stored = readStoredData();
  if (stored) {
    writeStoredData(stored);
    return stored;
  }

  let seeded = null;
  try {
    seeded = await fetch('/api/hackcode', { cache: 'no-store' })
      .then(response => response.json())
      .then(json => json?.data || null);
  } catch (e) {
    console.warn('Seed API indisponível, usando dados mínimos locais:', e);
  }

  const data = normalizeData(seeded || createFallbackData());
  writeStoredData(data);
  return data;
}

async function updateBrowserData(updater) {
  const data = await getBrowserData();
  const result = await updater(data);
  writeStoredData(data);
  return result;
}

// ===== DB (localStorage no navegador; API só semeia os dados iniciais) =====
export const DB = {

  // ── SESSION ──
  getSession() {
    try {
      const v = sessionStorage.getItem('hc_session');
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },

  setSession(data) {
    sessionStorage.setItem('hc_session', JSON.stringify({
      ...data,
      expires: Date.now() + 24 * 60 * 60 * 1000
    }));
  },

  clearSession() {
    sessionStorage.removeItem('hc_session');
  },

  isSessionValid() {
    const s = this.getSession();
    if (!s) return false;
    if (Date.now() > s.expires) { this.clearSession(); return false; }
    return true;
  },

  // ── USERS ──
  async getUsers() {
    return (await getBrowserData()).users;
  },

  async getUser(username) {
    const data = await getBrowserData();
    return data.users[String(username || '').toLowerCase()] || null;
  },

  async saveUser(username, data) {
    return updateBrowserData(store => {
      const key = String(username || data?.username || '').toLowerCase();
      if (!key) return false;
      store.users[key] = { ...data, username: key };
      return true;
    });
  },

  async deleteUser(username) {
    return updateBrowserData(store => {
      const key = String(username || '').toLowerCase();
      if (!key || key === 'carlos') return false;
      delete store.users[key];
      return true;
    });
  },

  async getCurrentUser() {
    if (!this.isSessionValid()) return null;
    const s = this.getSession();
    return await this.getUser(s.username);
  },

  // ── CHALLENGES ──
  async getChallenges() {
    const data = await getBrowserData();
    return [...data.challenges].sort((a, b) => a.id - b.id);
  },

  async saveChallenges(challenges) {
    return updateBrowserData(store => {
      store.challenges = Array.isArray(challenges) ? challenges : store.challenges;
      return true;
    });
  },

  async saveChallenge(ch) {
    return updateBrowserData(store => {
      if (!ch || typeof ch.id !== 'number') return false;
      const idx = store.challenges.findIndex(item => item.id === ch.id);
      if (idx >= 0) store.challenges[idx] = ch;
      else store.challenges.push(ch);
      store.challenges.sort((a, b) => a.id - b.id);
      return true;
    });
  },

  async deleteChallenge(id) {
    return updateBrowserData(store => {
      store.challenges = store.challenges.filter(item => item.id !== Number(id));
      return true;
    });
  },

  // ── SUBMISSIONS ──
  async addSubmission(username, challengeId, status, code) {
    return updateBrowserData(store => {
      const submission = {
        id: Date.now(),
        username: String(username || '').toLowerCase(),
        challengeId: Number(challengeId),
        status,
        time: new Date().toISOString(),
        codeLength: String(code || '').length
      };
      store.submissions.unshift(submission);
      store.submissions = store.submissions.slice(0, 500);
      return submission;
    });
  },

  async getSubmissions() {
    return (await getBrowserData()).submissions.slice(0, 500);
  },

  async getUserSubmissions(username) {
    const key = String(username || '').toLowerCase();
    return (await getBrowserData()).submissions.filter(item => item.username === key).slice(0, 50);
  },

  // ── LOGS ──
  async addLog(level, msg) {
    await updateBrowserData(store => {
      store.logs.unshift({ id: Date.now(), time: new Date().toISOString(), level, msg });
      store.logs = store.logs.slice(0, 500);
      return true;
    });
  },

  async getLogs() {
    return (await getBrowserData()).logs.slice(0, 500);
  },

  async clearLogs() {
    await updateBrowserData(store => {
      store.logs = [];
      return true;
    });
  },

  // ── SITE CONFIG ──
  async getSiteConfig() {
    return (await getBrowserData()).siteConfig;
  },

  async saveSiteConfig(cfg) {
    return updateBrowserData(store => {
      store.siteConfig = { ...store.siteConfig, ...(cfg || {}) };
      return true;
    });
  },

  // ── DRAFT ──
  getDraft(username, challengeId) {
    return sessionStorage.getItem(`draft_${username}_${challengeId}`) || null;
  },

  saveDraft(username, challengeId, code) {
    sessionStorage.setItem(`draft_${username}_${challengeId}`, code);
  },

  clearDraft(username, challengeId) {
    sessionStorage.removeItem(`draft_${username}_${challengeId}`);
  }
};

// ── APPLY SITE CONFIG ──
export async function applySiteConfig() {
  try {
    const cfg = await DB.getSiteConfig();
    const root = document.documentElement;
    root.style.setProperty('--primary', cfg.primaryColor);
    root.style.setProperty('--secondary', cfg.secondaryColor);
    root.style.setProperty('--bg', cfg.bgColor);
    root.style.setProperty('--accent', cfg.accentColor);

    if (!cfg.matrixEffect && window.matrixControl) window.matrixControl.stop();
    if (!cfg.scanlinesEffect) {
      const sl = document.querySelector('.scanlines');
      if (sl) sl.style.display = 'none';
    }
  } catch (e) {
    console.error('[applySiteConfig] Falhou, usando padrão:', e);
    // Continua com os valores CSS padrão — não trava a tela
  }
}

// ── INIT DEFAULT CHALLENGES ──
export async function initDefaultChallenges() {
  // Os desafios padrão agora são inicializados no servidor em data/hackcode.json.
  return DB.getChallenges();
}

// ── LOGOUT ──
export function logout() {
  DB.clearSession();
  window.location.href = '/';
}

// ── TERMINAL NOTIFICATION ──
export function notify(msg, duration = 3000) {
  const el = document.getElementById('terminal-notify');
  if (!el) return;
  el.innerHTML = `<span style="color:var(--text-dim);margin-right:0.5rem">▶</span>${Security.sanitize(msg)}`;
  el.style.display = 'block';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.style.display = 'none'; }, duration);
}

// ── SOUND EFFECTS ──
export async function playBeep(freq = 800, duration = 100) {
  try {
    const cfg = await DB.getSiteConfig();
    if (!cfg.soundEffect) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch(e) {}
}

// ── INIT ON LOAD ──
// Protegido com try/catch para nunca travar a tela de loading
(async () => {
  try {
    await applySiteConfig();
  } catch (e) {
    console.error('[init] applySiteConfig falhou:', e);
  }
  try {
    await initDefaultChallenges();
  } catch (e) {
    console.error('[init] initDefaultChallenges falhou:', e);
  }
})();

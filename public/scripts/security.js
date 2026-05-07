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

// ===== DB (JSON local via Next API) =====
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
    try {
      return await api('getUsers');
    } catch (e) {
      console.error('getUsers error:', e);
      return {};
    }
  },

  async getUser(username) {
    try {
      return await api('getUser', { username });
    } catch (e) {
      console.error('getUser error:', e);
      return null;
    }
  },

  async saveUser(username, data) {
    try {
      return await api('saveUser', { username, user: data });
    } catch (e) {
      console.error('saveUser error:', e);
      return false;
    }
  },

  async deleteUser(username) {
    try {
      return await api('deleteUser', { username });
    } catch (e) {
      console.error('deleteUser error:', e);
      return false;
    }
  },

  async getCurrentUser() {
    if (!this.isSessionValid()) return null;
    const s = this.getSession();
    return await this.getUser(s.username);
  },

  // ── CHALLENGES ──
  async getChallenges() {
    try {
      return await api('getChallenges');
    } catch (e) {
      console.error('getChallenges error:', e);
      return [];
    }
  },

  async saveChallenges(challenges) {
    try {
      return await api('saveChallenges', { challenges });
    } catch (e) {
      console.error('saveChallenges error:', e);
      return false;
    }
  },

  async saveChallenge(ch) {
    try {
      return await api('saveChallenge', { challenge: ch });
    } catch (e) {
      console.error('saveChallenge error:', e);
      return false;
    }
  },

  async deleteChallenge(id) {
    try {
      return await api('deleteChallenge', { id });
    } catch (e) {
      console.error('deleteChallenge error:', e);
      return false;
    }
  },

  // ── SUBMISSIONS ──
  async addSubmission(username, challengeId, status, code) {
    try {
      return await api('addSubmission', { username, challengeId, status, code });
    } catch (e) {
      console.error('addSubmission error:', e);
      return { id: Date.now(), username, challengeId, status, time: new Date().toISOString() };
    }
  },

  async getSubmissions() {
    try {
      return await api('getSubmissions');
    } catch (e) {
      console.error('getSubmissions error:', e);
      return [];
    }
  },

  async getUserSubmissions(username) {
    try {
      return await api('getUserSubmissions', { username });
    } catch (e) {
      console.error('getUserSubmissions error:', e);
      return [];
    }
  },

  // ── LOGS ──
  async addLog(level, msg) {
    try {
      await api('addLog', { level, msg });
    } catch (e) {
      // Silently fail — logs são não-críticos
    }
  },

  async getLogs() {
    try {
      return await api('getLogs');
    } catch (e) {
      console.error('getLogs error:', e);
      return [];
    }
  },

  async clearLogs() {
    try {
      await api('clearLogs');
    } catch (e) {
      console.error('clearLogs error:', e);
    }
  },

  // ── SITE CONFIG ──
  async getSiteConfig() {
    const defaults = {
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
    try {
      return { ...defaults, ...(await api('getSiteConfig')) };
    } catch (e) {
      return defaults;
    }
  },

  async saveSiteConfig(cfg) {
    try {
      return await api('saveSiteConfig', { config: cfg });
    } catch (e) {
      console.error('saveSiteConfig error:', e);
      return false;
    }
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

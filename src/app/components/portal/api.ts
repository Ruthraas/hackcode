import { defaultChallenges } from '@/lib/default-challenges';
import type { HackcodeData } from './types';

const STORAGE_KEY = 'hackcode_browser_data_v1';
const ADMIN_PASSWORD_HASH = '738326f2d63bd058755adffcd5e71089c56d8bc79af32c3af89ffe712b935e6a';

function createDefaultData(): HackcodeData {
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
    challenges: defaultChallenges,
    submissions: []
  };
}

function normalizeData(data?: Partial<HackcodeData> | null): HackcodeData {
  const defaults = createDefaultData();
  const users = { ...defaults.users, ...(data?.users || {}) };

  users.carlos = {
    ...defaults.users.carlos,
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
    challenges: data?.challenges?.length ? data.challenges : defaults.challenges,
    submissions: data?.submissions || []
  };
}

function readData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw) as Partial<HackcodeData>) : normalizeData(null);
  } catch {
    return normalizeData(null);
  }
}

function writeData(data: HackcodeData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
}

export async function api(action: string, payload: Record<string, unknown> = {}) {
  const data = readData();

  if (action === 'saveUser') {
    const user = payload.user as HackcodeData['users'][string] | undefined;
    const username = String(payload.username || user?.username || '').toLowerCase();
    if (!username || !user) throw new Error('Usuário inválido.');
    data.users[username] = { ...user, username };
  } else {
    throw new Error(`Ação local desconhecida: ${action}`);
  }

  writeData(data);
  return true;
}

export async function fetchHackcodeData() {
  const data = readData();
  writeData(data);
  return data;
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem('hc_session');
    const session = raw ? JSON.parse(raw) : null;
    if (!session || Date.now() > session.expires) return null;
    return session as { username: string; role: string };
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem('hc_session');
}

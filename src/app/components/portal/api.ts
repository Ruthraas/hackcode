import type { HackcodeData } from './types';

export async function api(action: string, payload = {}) {
  const response = await fetch('/api/hackcode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  const json = await response.json();
  if (!response.ok || !json?.ok) throw new Error(json?.error || 'Falha na API local.');
  return json.data;
}

export async function fetchHackcodeData() {
  const full = await fetch('/api/hackcode').then((response) => response.json());
  return full.data as HackcodeData;
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

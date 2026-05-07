import { NextRequest, NextResponse } from 'next/server';
import { readHackcodeData, updateHackcodeData } from '@/lib/hackcode-store';

export const dynamic = 'force-dynamic';

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  const data = await readHackcodeData();
  return ok(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== 'string') return fail('Ação inválida.');

  const action = body.action;

  const result = await updateHackcodeData((data) => {
    if (action === 'getUsers') return data.users;
    if (action === 'getUser') return data.users[String(body.username || '').toLowerCase()] || null;
    if (action === 'saveUser') {
      const username = String(body.username || body.user?.username || '').toLowerCase();
      if (!username) throw new Error('Username obrigatório.');
      data.users[username] = { ...body.user, username };
      return true;
    }
    if (action === 'deleteUser') {
      const username = String(body.username || '').toLowerCase();
      if (!username || username === 'carlos') return false;
      delete data.users[username];
      return true;
    }
    if (action === 'getChallenges') return [...data.challenges].sort((a, b) => a.id - b.id);
    if (action === 'saveChallenges') {
      data.challenges = Array.isArray(body.challenges) ? body.challenges : data.challenges;
      return true;
    }
    if (action === 'saveChallenge') {
      const challenge = body.challenge;
      if (!challenge || typeof challenge.id !== 'number') throw new Error('Desafio inválido.');
      const idx = data.challenges.findIndex((item) => item.id === challenge.id);
      if (idx >= 0) data.challenges[idx] = challenge;
      else data.challenges.push(challenge);
      data.challenges.sort((a, b) => a.id - b.id);
      return true;
    }
    if (action === 'deleteChallenge') {
      data.challenges = data.challenges.filter((item) => item.id !== Number(body.id));
      return true;
    }
    if (action === 'addSubmission') {
      const submission = {
        id: Date.now(),
        username: String(body.username || '').toLowerCase(),
        challengeId: Number(body.challengeId),
        status: String(body.status || 'unknown'),
        time: new Date().toISOString(),
        codeLength: String(body.code || '').length
      };
      data.submissions.unshift(submission);
      data.submissions = data.submissions.slice(0, 500);
      return submission;
    }
    if (action === 'getSubmissions') return data.submissions.slice(0, 500);
    if (action === 'getUserSubmissions') {
      const username = String(body.username || '').toLowerCase();
      return data.submissions.filter((item) => item.username === username).slice(0, 50);
    }
    if (action === 'addLog') {
      data.logs.unshift({
        id: Date.now(),
        time: new Date().toISOString(),
        level: String(body.level || 'info'),
        msg: String(body.msg || '')
      });
      data.logs = data.logs.slice(0, 500);
      return true;
    }
    if (action === 'getLogs') return data.logs.slice(0, 500);
    if (action === 'clearLogs') {
      data.logs = [];
      return true;
    }
    if (action === 'getSiteConfig') return data.siteConfig;
    if (action === 'saveSiteConfig') {
      data.siteConfig = { ...data.siteConfig, ...(body.config || {}) };
      return true;
    }

    throw new Error(`Ação desconhecida: ${action}`);
  }).catch((error: Error) => ({ __error: error.message }));

  if (result && typeof result === 'object' && '__error' in result) {
    return fail(String(result.__error));
  }

  return ok(result);
}

import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { defaultChallenges, type HackcodeChallenge } from './default-challenges';

export type HackcodeUser = {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  preferredLanguages?: string[];
  passwordHash: string;
  role: 'admin' | 'user';
  isAdmin?: boolean;
  xp: number;
  completedChallenges: number[];
  achievements: string[];
  banned: boolean;
  createdAt: string;
};

export type HackcodeSubmission = {
  id: number;
  username: string;
  challengeId: number;
  status: string;
  time: string;
  codeLength?: number;
};

export type HackcodeLog = {
  id: number;
  time: string;
  level: 'info' | 'warn' | 'error' | string;
  msg: string;
};

export type HackcodeSiteConfig = {
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  accentColor: string;
  bootMessage: string;
  matrixEffect: boolean;
  scanlinesEffect: boolean;
  glitchEffect: boolean;
  soundEffect: boolean;
};

export type HackcodeData = {
  users: Record<string, HackcodeUser>;
  challenges: HackcodeChallenge[];
  submissions: HackcodeSubmission[];
  logs: HackcodeLog[];
  siteConfig: HackcodeSiteConfig;
};

const dataDir = path.join(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'hackcode.json');

const defaultSiteConfig: HackcodeSiteConfig = {
  primaryColor: '#00ff00',
  secondaryColor: '#00ffff',
  bgColor: '#000000',
  accentColor: '#ff0040',
  bootMessage: 'AMBIENTE PRONTO. BEM-VINDO AO HACKCODE.',
  matrixEffect: true,
  scanlinesEffect: true,
  glitchEffect: true,
  soundEffect: false
};

function createDefaultData(): HackcodeData {
  const createdAt = new Date().toISOString();

  return {
    users: {
      carlos: {
        username: 'carlos',
        displayName: 'Carlos',
        passwordHash: '5449691c6104f88f42d12d87f471b87bf2ba777442ccaa3e7b7079090431478d',
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
    submissions: [],
    logs: [
      {
        id: Date.now(),
        time: createdAt,
        level: 'info',
        msg: 'Base JSON inicializada.'
      }
    ],
    siteConfig: defaultSiteConfig
  };
}

function normalizeData(data: Partial<HackcodeData>): HackcodeData {
  const defaults = createDefaultData();
  const users = { ...defaults.users, ...(data.users || {}) };
  const defaultTitles = new Set(defaultChallenges.map((challenge) => challenge.title));
  const existingChallenges = data.challenges || [];
  const customChallenges = existingChallenges.filter(
    (challenge) =>
      !defaultChallenges.some((defaultChallenge) => defaultChallenge.id === challenge.id) &&
      !defaultTitles.has(challenge.title)
  );

  users.carlos = {
    ...defaults.users.carlos,
    ...(users.carlos || {}),
    username: 'carlos',
    role: 'admin',
    isAdmin: true,
    banned: false
  };

  for (const user of Object.values(users)) {
    delete (user as HackcodeUser & { email?: string }).email;
    user.preferredLanguages ||= [];
    user.displayName ||= user.username;
    user.avatarUrl ||= '';
  }

  return {
    users,
    challenges: [...defaultChallenges, ...customChallenges].sort((a, b) => a.id - b.id),
    submissions: data.submissions || [],
    logs: data.logs || [],
    siteConfig: { ...defaults.siteConfig, ...(data.siteConfig || {}) }
  };
}

export async function readHackcodeData(): Promise<HackcodeData> {
  await mkdir(dataDir, { recursive: true });

  try {
    const raw = await readFile(dataFile, 'utf8');
    return normalizeData(JSON.parse(raw) as Partial<HackcodeData>);
  } catch {
    const data = createDefaultData();
    await writeHackcodeData(data);
    return data;
  }
}

export async function writeHackcodeData(data: HackcodeData) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(normalizeData(data), null, 2)}\n`, 'utf8');
}

export async function updateHackcodeData<T>(updater: (data: HackcodeData) => T | Promise<T>) {
  const data = await readHackcodeData();
  const result = await updater(data);
  await writeHackcodeData(data);
  return result;
}

import type { ReactNode } from 'react';
import type { HackcodeChallenge } from '@/lib/default-challenges';
import type { HackcodeUser } from '@/lib/hackcode-store';

export type HackcodeData = {
  users: Record<string, HackcodeUser>;
  challenges: HackcodeChallenge[];
  submissions: Array<{ username: string; challengeId: number; status: string; time: string }>;
};

export type PortalView = 'dashboard' | 'challenges' | 'ranking' | 'profile';

export type PortalViewProps = {
  data: HackcodeData;
  user: HackcodeUser;
  rank: number;
  ranked: HackcodeUser[];
  refresh: () => Promise<void>;
};

export type StatProps = {
  label: string;
  value: ReactNode;
};

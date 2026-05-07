import type { HackcodeUser } from '@/lib/hackcode-store';
import type { HackcodeData } from './types';

export function rankUsers(users: HackcodeUser[]) {
  return [...users]
    .filter((user) => !user.banned)
    .sort((a, b) => (b.xp || 0) - (a.xp || 0) || (b.completedChallenges?.length || 0) - (a.completedChallenges?.length || 0));
}

export function getLevel(xp = 0) {
  return Math.floor(xp / 300) + 1;
}

export function initials(user?: HackcodeUser) {
  return (user?.displayName || user?.username || '?').slice(0, 2).toUpperCase();
}

export function getUnlockedAchievements(user: HackcodeUser, data: HackcodeData, rank: number) {
  const ids = new Set(user.achievements || []);
  const completed = user.completedChallenges || [];
  if ((user.preferredLanguages || []).length >= 3) ids.add('polyglot_3');
  if (completed.some((id) => data.challenges.find((challenge) => challenge.id === id)?.language === 'css')) ids.add('css_artist');
  if (rank > 0 && rank <= 3) ids.add('top_3');
  return ids;
}

import { type CSSProperties, useMemo } from 'react';
import type { HackcodeUser } from '@/lib/hackcode-store';
import { achievementCatalog, languageMeta } from './meta';
import type { HackcodeData, StatProps } from './types';
import { getUnlockedAchievements, initials } from './user';

export function LanguagePill({ language }: { language: string }) {
  const meta = languageMeta[language as keyof typeof languageMeta];
  if (!meta) return <span className="hc-pill">{language}</span>;
  const Icon = meta.Icon;
  return <span className="hc-pill" style={{ '--pill-color': meta.color } as CSSProperties}><Icon />{meta.label}</span>;
}

export function UserAvatar({ user, large = false }: { user?: HackcodeUser; large?: boolean }) {
  return (
    <div className={`hc-avatar ${large ? 'large' : ''}`}>
      {user?.avatarUrl ? <span className="hc-avatar-image" style={{ backgroundImage: `url(${user.avatarUrl})` }} /> : <span>{initials(user)}</span>}
    </div>
  );
}

export function Stat({ label, value }: StatProps) {
  return <div className="hc-stat"><span>{label}</span><strong>{value}</strong></div>;
}

export function AchievementGrid({ user, data, rank }: { user: HackcodeUser; data: HackcodeData; rank: number }) {
  const unlocked = useMemo(() => getUnlockedAchievements(user, data, rank), [user, data, rank]);
  return (
    <div className="hc-achievements">
      {achievementCatalog.map(({ id, title, text, Icon }) => (
        <div key={id} className={`hc-achievement ${unlocked.has(id) ? 'unlocked' : ''}`}>
          <Icon /><strong>{title}</strong><span>{text}</span>
        </div>
      ))}
    </div>
  );
}

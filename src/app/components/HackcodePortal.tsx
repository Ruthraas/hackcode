'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { FaCrown, FaRankingStar } from 'react-icons/fa6';
import { FiActivity, FiAward, FiGrid, FiLogOut, FiSave, FiSearch, FiTarget, FiUser } from 'react-icons/fi';
import type { HackcodeUser } from '@/lib/hackcode-store';
import type { HackcodeDifficulty } from '@/lib/default-challenges';
import { api, clearSession, fetchHackcodeData, getSession } from './portal/api';
import { difficultyMeta, languageMeta } from './portal/meta';
import type { HackcodeData, PortalView } from './portal/types';
import { AchievementGrid, LanguagePill, Stat, UserAvatar } from './portal/ui';
import { getLevel, rankUsers } from './portal/user';

function Shell({ children, user }: { children: ReactNode; user: HackcodeUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    ['/dashboard', 'Dashboard', FiGrid],
    ['/desafios', 'Desafios', FiTarget],
    ['/ranking', 'Ranking', FaRankingStar],
    ['/perfil', 'Perfil', FiUser]
  ] as const;

  function logout() {
    clearSession();
    router.push('/');
  }

  return (
    <div className="hc-shell">
      <div className="scanlines" />
      <header className="hc-topbar">
        <Link href="/dashboard" className="hc-brand">HACKCODE<span>v3</span></Link>
        <nav className="hc-nav">
          {links.map(([href, label, Icon]) => (
            <Link key={href} href={href} className={pathname === href ? 'active' : ''}><Icon />{label}</Link>
          ))}
          {user.isAdmin && <Link href="/admin" className="admin-link"><FaCrown />Admin</Link>}
        </nav>
        <div className="hc-userbar">
          <UserAvatar user={user} />
          <span>{user.displayName || user.username}</span>
          <button type="button" onClick={logout} title="Sair"><FiLogOut /></button>
        </div>
      </header>
      {children}
    </div>
  );
}

export default function HackcodePortal({ view }: { view: PortalView }) {
  const router = useRouter();
  const [data, setData] = useState<HackcodeData | null>(null);
  const [user, setUser] = useState<HackcodeUser | null>(null);

  useEffect(() => {
    async function load() {
      const session = getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      const payload = await fetchHackcodeData();
      const current = payload.users[session.username];
      if (!current || current.banned) {
        clearSession();
        router.replace('/');
        return;
      }
      setData(payload);
      setUser(current);
    }
    load().catch(() => router.replace('/'));
  }, [router]);

  if (!data || !user) return <div className="hc-loading">Carregando HACKCODE...</div>;

  const ranked = rankUsers(Object.values(data.users));
  const rank = ranked.findIndex((item) => item.username === user.username) + 1;
  const viewProps = { data, user, rank, ranked, refresh: async () => {
    const freshData = await fetchHackcodeData();
    setData(freshData);
    setUser(freshData.users[user.username]);
  } };

  return (
    <Shell user={user}>
      {view === 'dashboard' && <DashboardView {...viewProps} />}
      {view === 'challenges' && <ChallengesView {...viewProps} />}
      {view === 'ranking' && <RankingView {...viewProps} />}
      {view === 'profile' && <ProfileView {...viewProps} />}
    </Shell>
  );
}

function DashboardView({ data, user, rank, ranked }: { data: HackcodeData; user: HackcodeUser; rank: number; ranked: HackcodeUser[] }) {
  const completed = user.completedChallenges || [];
  const percent = Math.round((completed.length / data.challenges.length) * 100);

  return (
    <main className="hc-main">
      <section className="hc-hero">
        <div>
          <span className="hc-eyebrow">Dashboard</span>
          <h1>{user.displayName || user.username}</h1>
          <p>Seu painel de progresso, conquistas e posição geral na plataforma.</p>
        </div>
        <UserAvatar user={user} large />
      </section>

      <section className="hc-stats">
        <Stat label="Ranking" value={`#${rank || '-'}`} />
        <Stat label="Nível" value={getLevel(user.xp)} />
        <Stat label="XP" value={(user.xp || 0).toLocaleString('pt-BR')} />
        <Stat label="Concluídos" value={`${completed.length}/${data.challenges.length}`} />
      </section>

      <section className="hc-panel">
        <div className="hc-section-title"><FiActivity /> Progresso geral <span>{percent}%</span></div>
        <div className="hc-progress"><span style={{ width: `${percent}%` }} /></div>
      </section>

      <section className="hc-grid two">
        <div className="hc-panel">
          <div className="hc-section-title"><FiAward /> Conquistas</div>
          <AchievementGrid user={user} data={data} rank={rank} />
        </div>
        <div className="hc-panel">
          <div className="hc-section-title"><FaRankingStar /> Top 5</div>
          <div className="hc-mini-list">
            {ranked.slice(0, 5).map((item, index) => (
              <Link href="/ranking" key={item.username} className="hc-mini-row">
                <span>#{index + 1}</span><UserAvatar user={item} /><strong>{item.displayName || item.username}</strong><em>{item.xp || 0} XP</em>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="hc-panel">
        <div className="hc-section-title"><FiTarget /> Linguagens preferidas</div>
        <div className="hc-pills">{(user.preferredLanguages?.length ? user.preferredLanguages : ['javascript', 'typescript']).map((lang) => <LanguagePill key={lang} language={lang} />)}</div>
      </section>
    </main>
  );
}

function ChallengesView({ data, user }: { data: HackcodeData; user: HackcodeUser }) {
  const [difficulty, setDifficulty] = useState('all');
  const [language, setLanguage] = useState('all');
  const [query, setQuery] = useState('');
  const completed = user.completedChallenges || [];
  const filtered = data.challenges.filter((challenge) => {
    return (difficulty === 'all' || challenge.difficulty === difficulty)
      && (language === 'all' || challenge.language === language)
      && (!query || `${challenge.title} ${challenge.description}`.toLowerCase().includes(query.toLowerCase()));
  });

  return (
    <main className="hc-main challenges-page">
      <aside className="hc-sidebar">
        <div className="hc-section-title"><FiSearch /> Filtros</div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="hc-input" placeholder="Buscar desafio..." />
        <div className="hc-filter-group">
          <strong>Níveis</strong>
          {['all', 'easy', 'hard', 'complex', 'senior'].map((item) => (
            <button key={item} className={difficulty === item ? 'active' : ''} onClick={() => setDifficulty(item)}>
              {item === 'all' ? 'Todos' : difficultyMeta[item as keyof typeof difficultyMeta].label}
            </button>
          ))}
        </div>
        <div className="hc-filter-group">
          <strong>Linguagens</strong>
          {['all', ...Object.keys(languageMeta)].map((item) => (
            <button key={item} className={language === item ? 'active' : ''} onClick={() => setLanguage(item)}>
              {item === 'all' ? 'Todas' : <LanguagePill language={item} />}
            </button>
          ))}
        </div>
      </aside>
      <section className="hc-content">
        <div className="hc-page-head">
          <div><span className="hc-eyebrow">Desafios</span><h1>Trilhas por nível e linguagem</h1></div>
          <span className="hc-count">{filtered.length} encontrados</span>
        </div>
        <div className="hc-challenge-grid">
          {filtered.map((challenge) => (
            <Link href={`/editor?challenge=${challenge.id}`} key={challenge.id} className={`hc-challenge ${completed.includes(challenge.id) ? 'done' : ''}`}>
        <span className="hc-difficulty" style={{ color: difficultyMeta[challenge.difficulty as HackcodeDifficulty]?.color }}>
          {difficultyMeta[challenge.difficulty as HackcodeDifficulty]?.label}
        </span>
              <h2>{challenge.title}</h2>
              <p>{challenge.description}</p>
              <footer><LanguagePill language={challenge.language} /><strong>+{challenge.xp} XP</strong></footer>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function RankingView({ data, ranked }: { data: HackcodeData; ranked: HackcodeUser[] }) {
  return (
    <main className="hc-main">
      <div className="hc-page-head">
        <div><span className="hc-eyebrow">Ranking</span><h1>Classificação geral</h1></div>
      </div>
      <section className="hc-ranking">
        {ranked.map((user, index) => (
          <div className="hc-rank-row" key={user.username}>
            <span className="hc-rank-pos">#{index + 1}</span>
            <UserAvatar user={user} />
            <div><strong>{user.displayName || user.username}</strong><span>@{user.username}</span></div>
            <em>{user.completedChallenges?.length || 0} desafios</em>
            <b>{user.xp || 0} XP</b>
            <div className="hc-profile-popover">
              <UserAvatar user={user} large />
              <strong>{user.displayName || user.username}</strong>
              <span>Nível {getLevel(user.xp)} · {user.completedChallenges?.length || 0}/{data.challenges.length} desafios</span>
              <div className="hc-pills">{(user.preferredLanguages || []).slice(0, 4).map((lang) => <LanguagePill key={lang} language={lang} />)}</div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function ProfileView({ data, user, rank, refresh }: { data: HackcodeData; user: HackcodeUser; rank: number; refresh: () => Promise<void> }) {
  const [displayName, setDisplayName] = useState(user.displayName || user.username);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(user.preferredLanguages || []);
  const [status, setStatus] = useState('');

  async function save() {
    const nextUser = { ...user, displayName: displayName.trim() || user.username, avatarUrl: avatarUrl.trim(), preferredLanguages };
    const nextAchievements = new Set(nextUser.achievements || []);
    if (preferredLanguages.length >= 3) nextAchievements.add('polyglot_3');
    nextUser.achievements = [...nextAchievements];
    await api('saveUser', { username: user.username, user: nextUser });
    setStatus('Perfil salvo.');
    await refresh();
  }

  function toggleLanguage(language: string) {
    setPreferredLanguages((current) => current.includes(language) ? current.filter((item) => item !== language) : [...current, language]);
  }

  return (
    <main className="hc-main">
      <div className="hc-page-head"><div><span className="hc-eyebrow">Perfil</span><h1>Editar presença na plataforma</h1></div></div>
      <section className="hc-grid two">
        <div className="hc-panel profile-editor">
          <UserAvatar user={{ ...user, avatarUrl, displayName }} large />
          <label>Nome exibido<input className="hc-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
          <label>Foto por URL<input className="hc-input" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." /></label>
          <div className="hc-filter-group inline">
            <strong>Linguagens preferidas</strong>
            {Object.keys(languageMeta).map((lang) => (
              <button key={lang} className={preferredLanguages.includes(lang) ? 'active' : ''} onClick={() => toggleLanguage(lang)}><LanguagePill language={lang} /></button>
            ))}
          </div>
          <button className="hc-primary" onClick={save}><FiSave /> Salvar perfil</button>
          {status && <span className="hc-status">{status}</span>}
        </div>
        <div className="hc-panel">
          <div className="hc-section-title"><FiUser /> Resumo</div>
          <Stat label="Ranking" value={`#${rank}`} />
          <Stat label="Nível" value={getLevel(user.xp)} />
          <Stat label="Desafios" value={`${user.completedChallenges?.length || 0}/${data.challenges.length}`} />
          <div className="hc-section-title spaced"><FiAward /> Conquistas</div>
          <AchievementGrid user={user} data={data} rank={rank} />
        </div>
      </section>
    </main>
  );
}

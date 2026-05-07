import { FaCode, FaCrown, FaJava, FaRankingStar, FaUserGear } from 'react-icons/fa6';
import { FiActivity, FiAward, FiGrid, FiTarget } from 'react-icons/fi';
import { SiCplusplus, SiCss, SiJavascript, SiSharp, SiTypescript } from 'react-icons/si';

export const languageMeta = {
  javascript: { label: 'JavaScript', Icon: SiJavascript, color: '#f7df1e' },
  typescript: { label: 'TypeScript', Icon: SiTypescript, color: '#3178c6' },
  cpp: { label: 'C++', Icon: SiCplusplus, color: '#6295cb' },
  csharp: { label: 'C#', Icon: SiSharp, color: '#9b4f96' },
  java: { label: 'Java', Icon: FaJava, color: '#f89820' },
  css: { label: 'CSS Visual', Icon: SiCss, color: '#1572b6' }
} as const;

export const difficultyMeta = {
  easy: { label: 'Fácil', color: '#00ff64' },
  hard: { label: 'Difícil', color: '#ffb020' },
  complex: { label: 'Complexo', color: '#ff4d8d' },
  senior: { label: 'Mestre Senior', color: '#d7ff00' }
} as const;

export const achievementCatalog = [
  { id: 'first_login', title: 'Primeira Conexão', text: 'Entrou na plataforma', Icon: FiActivity },
  { id: 'first_solve', title: 'Primeira Entrega', text: 'Resolveu um desafio', Icon: FiAward },
  { id: 'easy_master', title: 'Base Consistente', text: '10 desafios fáceis', Icon: FiTarget },
  { id: 'hard_master', title: 'Dev Avançado', text: '8 desafios difíceis', Icon: FaCode },
  { id: 'complex_master', title: 'Pensamento Complexo', text: '5 desafios complexos', Icon: FiGrid },
  { id: 'senior_master', title: 'Mestre Senior', text: 'Desafio final concluído', Icon: FaCrown },
  { id: 'polyglot_3', title: 'Poliglota', text: 'Preferiu 3 linguagens', Icon: SiTypescript },
  { id: 'css_artist', title: 'Visual Builder', text: 'Concluiu um desafio CSS', Icon: SiCss },
  { id: 'top_3', title: 'Pódio Geral', text: 'Está no top 3 do ranking', Icon: FaRankingStar },
  { id: 'century', title: 'Centenário', text: '1000 XP acumulado', Icon: FiAward },
  { id: 'legend', title: 'Referência Técnica', text: 'Completou todos os desafios', Icon: FaCrown },
  { id: 'admin_power', title: 'Admin', text: 'Acesso administrativo', Icon: FaUserGear }
];

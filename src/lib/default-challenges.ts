export type HackcodeDifficulty = 'easy' | 'hard' | 'complex' | 'senior';

export type HackcodeValidation = {
  mode: 'runtime' | 'static' | 'css';
  required?: string[];
  forbidden?: string[];
};

export type HackcodeChallenge = {
  id: number;
  title: string;
  difficulty: HackcodeDifficulty;
  language: string;
  description: string;
  inputExample: string;
  outputExample: string;
  starterCode: string;
  testCases: Array<{ input: string; expected: string }>;
  hints: string[];
  xp: number;
  badge: string | null;
  createdBy: string;
  validation?: HackcodeValidation;
  createdAt?: string;
  updatedAt?: string;
};

type ChallengeSeed = {
  title: string;
  concept: string;
  fn: string;
  input: string;
  output: string;
  tests: Array<{ input: string; expected: string }>;
  hints: string[];
};

const algorithmSeeds: ChallengeSeed[] = [
  {
    title: 'Olá, Mundo Dev',
    concept: 'retornar uma string fixa',
    fn: 'hello',
    input: 'hello()',
    output: '"Hello, World!"',
    tests: [{ input: 'hello()', expected: 'Hello, World!' }],
    hints: ['Use return', 'Strings podem usar aspas simples ou duplas']
  },
  {
    title: 'Soma Dois Números',
    concept: 'somar dois argumentos numéricos',
    fn: 'soma',
    input: 'soma(5, 3)',
    output: '8',
    tests: [
      { input: 'soma(5, 3)', expected: '8' },
      { input: 'soma(-2, 7)', expected: '5' }
    ],
    hints: ['Use o operador +', 'Retorne o resultado']
  },
  {
    title: 'Par ou Ímpar',
    concept: 'identificar se um número é par ou ímpar',
    fn: 'parOuImpar',
    input: 'parOuImpar(7)',
    output: '"impar"',
    tests: [
      { input: 'parOuImpar(4)', expected: 'par' },
      { input: 'parOuImpar(7)', expected: 'impar' }
    ],
    hints: ['Use o operador %', 'n % 2 === 0 indica número par']
  },
  {
    title: 'Maior Número',
    concept: 'retornar o maior valor de uma lista',
    fn: 'maiorNumero',
    input: 'maiorNumero([2, 9, 4])',
    output: '9',
    tests: [
      { input: 'maiorNumero([2, 9, 4])', expected: '9' },
      { input: 'maiorNumero([-5, -1, -9])', expected: '-1' }
    ],
    hints: ['Percorra o array', 'Compare cada item com o maior atual']
  },
  {
    title: 'Contador de Vogais',
    concept: 'contar vogais em uma string',
    fn: 'contarVogais',
    input: 'contarVogais("desenvolvimento")',
    output: '6',
    tests: [
      { input: 'contarVogais("desenvolvimento")', expected: '6' },
      { input: 'contarVogais("xyz")', expected: '0' }
    ],
    hints: ['Normalize para minúsculas', 'Verifique se cada caractere está em aeiou']
  },
  {
    title: 'Palíndromo',
    concept: 'verificar se uma string lida igual de trás para frente',
    fn: 'isPalindromo',
    input: 'isPalindromo("radar")',
    output: 'true',
    tests: [
      { input: 'isPalindromo("radar")', expected: 'true' },
      { input: 'isPalindromo("codigo")', expected: 'false' }
    ],
    hints: ['Normalize a string', 'Compare com a versão invertida']
  },
  {
    title: 'Fatorial',
    concept: 'calcular o fatorial de um número',
    fn: 'fatorial',
    input: 'fatorial(5)',
    output: '120',
    tests: [
      { input: 'fatorial(0)', expected: '1' },
      { input: 'fatorial(5)', expected: '120' }
    ],
    hints: ['0! é 1', 'Pode ser feito com loop ou recursão']
  },
  {
    title: 'Busca Binária',
    concept: 'buscar um valor em array ordenado',
    fn: 'buscaBinaria',
    input: 'buscaBinaria([1,3,5,7], 5)',
    output: '2',
    tests: [
      { input: 'buscaBinaria([1,3,5,7], 5)', expected: '2' },
      { input: 'buscaBinaria([1,3,5,7], 4)', expected: '-1' }
    ],
    hints: ['Use left/right/mid', 'Reduza o intervalo a cada passo']
  },
  {
    title: 'Agrupar por Chave',
    concept: 'agrupar objetos por uma propriedade',
    fn: 'agruparPor',
    input: 'JSON.stringify(agruparPor([{tipo:"a"},{tipo:"b"},{tipo:"a"}], "tipo"))',
    output: '{"a":[{"tipo":"a"},{"tipo":"a"}],"b":[{"tipo":"b"}]}',
    tests: [
      {
        input: 'JSON.stringify(agruparPor([{tipo:"a"},{tipo:"b"},{tipo:"a"}], "tipo"))',
        expected: '{"a":[{"tipo":"a"},{"tipo":"a"}],"b":[{"tipo":"b"}]}'
      }
    ],
    hints: ['Use objeto acumulador', 'Crie o array quando a chave ainda não existir']
  },
  {
    title: 'Cache LRU Simplificado',
    concept: 'simular uma política de cache com limite',
    fn: 'lru',
    input: 'JSON.stringify(lru(["A","B","A","C"], 2))',
    output: '["A","C"]',
    tests: [
      { input: 'JSON.stringify(lru(["A","B","A","C"], 2))', expected: '["A","C"]' }
    ],
    hints: ['Ao acessar um item, mova-o para o final', 'Remova o mais antigo quando passar do limite']
  }
];

const cssSeeds: Array<[string, string, string[]]> = [
  ['Card Responsivo', '.card', ['display', 'padding', 'border-radius']],
  ['Botão com Estado Hover', '.button', [':hover', 'transition', 'background']],
  ['Layout Grid de Produtos', '.grid', ['display: grid', 'grid-template-columns', 'gap']],
  ['Navbar Fixa', '.navbar', ['position: sticky', 'top', 'z-index']],
  ['Modal Centralizado', '.modal', ['position: fixed', 'inset', 'display']],
  ['Formulário Acessível', '.form-field', ['label', 'input', 'focus']],
  ['Tabela Escaneável', '.table', ['border-collapse', 'padding', 'font-size']],
  ['Painel de Métricas', '.metric-card', ['display', 'align-items', 'gap']],
  ['Tema Escuro Profissional', ':root', ['--bg', '--text', '--accent']],
  ['Animação Sutil de Entrada', '.fade-in', ['@keyframes', 'opacity', 'transform']]
];

const languagePlan = [
  { language: 'javascript', label: 'JavaScript', count: 20 },
  { language: 'typescript', label: 'TypeScript', count: 20 },
  { language: 'cpp', label: 'C++', count: 15 },
  { language: 'csharp', label: 'C#', count: 15 },
  { language: 'java', label: 'Java', count: 15 },
  { language: 'css', label: 'CSS', count: 14 }
];

function difficultyForIndex(index: number): HackcodeDifficulty {
  if (index <= 45) return 'easy';
  if (index <= 75) return 'hard';
  return 'complex';
}

function xpForDifficulty(difficulty: HackcodeDifficulty) {
  return { easy: 80, hard: 220, complex: 420, senior: 1500 }[difficulty];
}

function jsStarter(seed: ChallengeSeed, language: string) {
  if (language === 'typescript') {
    return `export function ${seed.fn}(entrada: unknown): unknown {\n  // Implemente: ${seed.concept}\n  return entrada;\n}`;
  }

  return `function ${seed.fn}() {\n  // Implemente: ${seed.concept}\n}`;
}

function compiledStarter(seed: ChallengeSeed, language: string) {
  if (language === 'cpp') {
    return `#include <bits/stdc++.h>\nusing namespace std;\n\n// Implemente uma função para ${seed.concept}.\nint main() {\n  return 0;\n}`;
  }
  if (language === 'csharp') {
    return `using System;\nusing System.Collections.Generic;\n\npublic class Solution {\n  // Implemente um método para ${seed.concept}.\n}`;
  }
  return `import java.util.*;\n\npublic class Solution {\n  // Implemente um método para ${seed.concept}.\n}`;
}

function makeAlgorithmChallenge(id: number, language: string, label: string): HackcodeChallenge {
  const seed = algorithmSeeds[(id - 1) % algorithmSeeds.length];
  const difficulty = difficultyForIndex(id);
  const compiled = ['cpp', 'csharp', 'java'].includes(language);

  return {
    id,
    title: `${seed.title} em ${label}`,
    difficulty,
    language,
    description: `Resolva um exercício de ${label} para ${seed.concept}. Foque em clareza, nomes bons e tratamento de casos simples.`,
    inputExample: seed.input,
    outputExample: seed.output,
    starterCode: compiled ? compiledStarter(seed, language) : jsStarter(seed, language),
    testCases: compiled || language === 'typescript' ? [] : seed.tests,
    hints: compiled
      ? ['Escreva uma solução completa e legível', 'Use estruturas idiomáticas da linguagem', 'Este desafio usa validação estática no navegador']
      : seed.hints,
    xp: xpForDifficulty(difficulty),
    badge: difficulty === 'senior' ? '🏆' : null,
    createdBy: 'carlos',
    validation: compiled || language === 'typescript'
      ? { mode: 'static', required: compiled ? ['return', 'class|int main|public'] : ['function|=>|export', ':|interface|type'] }
      : { mode: 'runtime' }
  };
}

function makeCssChallenge(id: number): HackcodeChallenge {
  const seed = cssSeeds[(id - 1) % cssSeeds.length];
  const difficulty = difficultyForIndex(id);
  const [title, selector, required] = seed;

  return {
    id,
    title: `${title} com CSS`,
    difficulty,
    language: 'css',
    description: `Crie estilos CSS para ${String(title).toLowerCase()} com atenção a responsividade, espaçamento e acabamento visual.`,
    inputExample: selector as string,
    outputExample: `Use ${required.join(', ')}`,
    starterCode: `${selector} {\n  /* ajuste o visual aqui */\n}\n`,
    testCases: [],
    hints: ['Use propriedades claras e previsíveis', 'Pense em mobile e desktop', 'Clique em executar para visualizar'],
    xp: xpForDifficulty(difficulty),
    badge: null,
    createdBy: 'carlos',
    validation: { mode: 'css', required: required as string[] }
  };
}

function buildChallenges(): HackcodeChallenge[] {
  const challenges: HackcodeChallenge[] = [];
  let id = 1;
  const remaining = languagePlan.map((plan) => ({ ...plan }));

  while (remaining.some((plan) => plan.count > 0)) {
    for (const plan of remaining) {
      if (plan.count <= 0) continue;
      challenges.push(
        plan.language === 'css'
          ? makeCssChallenge(id)
          : makeAlgorithmChallenge(id, plan.language, plan.label)
      );
      id++;
      plan.count--;
    }
  }

  challenges.push({
    id,
    title: 'Mestre Senior: Arquitetura de Plataforma de Estudos',
    difficulty: 'senior',
    language: 'typescript',
    description: 'Desafio único do nível Mestre Senior: modele uma mini plataforma com usuários, desafios, submissões, ranking e validações. O objetivo é demonstrar arquitetura, tipagem e organização.',
    inputExample: 'createPlatform().submit("carlos", 1, "solution")',
    outputExample: 'Estado consistente com ranking e histórico',
    starterCode: `type User = { username: string; xp: number };\ntype Challenge = { id: number; xp: number };\n\nexport function createPlatform() {\n  // Modele estado, submissões, ranking e validações.\n  return {};\n}\n`,
    testCases: [],
    hints: ['Separe entidades e operações', 'Use tipos explícitos', 'Evite estado global solto', 'Pense em casos de erro'],
    xp: 3000,
    badge: '🏆',
    createdBy: 'carlos',
    validation: {
      mode: 'static',
      required: ['type|interface', 'function|class', 'submit', 'ranking|rank', 'Challenge', 'User']
    }
  });

  return challenges;
}

export const defaultChallenges: HackcodeChallenge[] = buildChallenges();

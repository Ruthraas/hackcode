// ===== CODE EDITOR =====
import { DB, Security, applySiteConfig, notify, playBeep, logout } from './security.js';

let editor = null;
let currentChallenge = null;
let currentUser = null;

const DIFFICULTY_LABELS = {
  easy: 'FÁCIL',
  hard: 'DIFÍCIL',
  complex: 'COMPLEXO',
  senior: 'MESTRE SENIOR'
};

const DIFFICULTY_COLORS = {
  easy: '#00ff64',
  hard: '#ffb020',
  complex: '#ff4d8d',
  senior: '#d7ff00'
};

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  cpp: 'C++',
  csharp: 'C#',
  java: 'Java',
  css: 'CSS'
};

async function initEditorPage() {
  const token = window.__hackcodePageToken || `editor:${window.location.search}`;
  window.__hackcodeInitTokens ||= {};
  if (window.__hackcodeInitTokens.editor === token) return;
  window.__hackcodeInitTokens.editor = token;

  editor = null;
  currentChallenge = null;
  currentUser = null;

  // Apply site config (cores/efeitos)
  await applySiteConfig();

  // Auth guard
  if (!DB.isSessionValid()) {
    window.location.href = '/';
    return;
  }

  currentUser = await DB.getCurrentUser();
  if (!currentUser || currentUser.banned) { logout(); return; }

  // Get challenge ID from URL
  const params = new URLSearchParams(window.location.search);
  const challengeId = parseInt(params.get('challenge'));

  const challenges = await DB.getChallenges();
  currentChallenge = challenges.find(c => c.id === challengeId);

  if (!currentChallenge) {
    window.location.href = '/dashboard';
    return;
  }

  // Init CodeMirror
  editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    mode: getMode(currentChallenge.language),
    theme: 'monokai',
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    extraKeys: {
      'Ctrl-Enter': runCode,
      'Tab': function(cm) { cm.replaceSelection('  '); }
    }
  });

  // Load saved draft if any
  const draftKey = `draft_${currentUser.username}_${challengeId}`;
  const savedDraft = localStorage.getItem(draftKey);
  editor.setValue(savedDraft || currentChallenge.starterCode || '// Seu código aqui\n');

  // Auto-save draft on change
  editor.on('change', () => {
    localStorage.setItem(draftKey, editor.getValue());
  });

  // Populate challenge info
  document.title = `HACKCODE :: ${currentChallenge.title}`;
  document.getElementById('challenge-title-bar').textContent = currentChallenge.title;

  const diffBadge = document.getElementById('diff-badge');
  diffBadge.textContent = DIFFICULTY_LABELS[currentChallenge.difficulty] || currentChallenge.difficulty;
  diffBadge.style.color = DIFFICULTY_COLORS[currentChallenge.difficulty] || 'var(--primary)';
  diffBadge.style.borderColor = DIFFICULTY_COLORS[currentChallenge.difficulty] || 'var(--primary)';

  document.getElementById('xp-reward').textContent = `+${currentChallenge.xp} XP`;
  document.getElementById('ch-difficulty').textContent =
    `NÍVEL: ${(DIFFICULTY_LABELS[currentChallenge.difficulty] || currentChallenge.difficulty)} · ${LANGUAGE_LABELS[currentChallenge.language] || currentChallenge.language}`;
  document.getElementById('ch-name').textContent = currentChallenge.title;
  document.getElementById('ch-desc').textContent = currentChallenge.description;
  document.getElementById('ch-guide').textContent = getLearningGuide(currentChallenge);
  document.getElementById('ch-input').textContent = currentChallenge.inputExample || '--';
  document.getElementById('ch-output').textContent = currentChallenge.outputExample || '--';
  document.getElementById('ch-xp').textContent = `+${currentChallenge.xp} XP`;

  if (currentChallenge.badge) {
    document.getElementById('ch-badge').textContent = currentChallenge.badge;
  }

  // Hints
  const hints = (currentChallenge.hints || []);
  document.getElementById('ch-hints').innerHTML = hints.map(h =>
    `<div class="hint-item">💡 ${Security.sanitize(h)}</div>`
  ).join('');

  // Language selector
  const langSelect = document.getElementById('lang-select');
  langSelect.value = currentChallenge.language || 'javascript';

  // If already completed, show badge
  if ((currentUser.completedChallenges || []).includes(currentChallenge.id)) {
    notify('✓ Você já completou este desafio! Tente melhorar sua solução.');
  }

  // Load submission history
  await loadSubmissionHistory();

  // Tab click handler for code tab
  document.getElementById('tab-code').addEventListener('click', showCodeView);

  await DB.addLog('info', `Desafio aberto: "${currentChallenge.title}" por ${currentUser.username}`);
}

document.addEventListener('hackcode:ready', event => {
  if (event.detail?.page === 'editor') initEditorPage();
});

// ===== MODE UTILS =====
function getMode(lang) {
  const modes = {
    javascript: 'javascript',
    typescript: 'text/typescript',
    css: 'css',
    cpp: 'text/x-c++src',
    csharp: 'text/x-csharp',
    java: 'text/x-java'
  };
  return modes[lang] || 'javascript';
}

function changeLanguage() {
  const lang = document.getElementById('lang-select').value;
  if (editor) editor.setOption('mode', getMode(lang));
}

function getLearningGuide(challenge) {
  const language = LANGUAGE_LABELS[challenge.language] || challenge.language;
  if (challenge.language === 'css') {
    return `Construa o visual em camadas: primeiro layout, depois espaçamento, estados e responsividade. Use Executar para abrir o preview CSS e confira se o componente continua legível.`;
  }
  if (challenge.validation?.mode === 'static') {
    return `Este desafio de ${language} usa validação estrutural no navegador. Escreva uma solução idiomática, com função ou classe clara, retorno explícito e nomes que comuniquem intenção.`;
  }
  if (challenge.language === 'typescript') {
    return 'Modele os tipos antes da lógica. Prefira funções pequenas, entradas bem nomeadas e retorno explícito para deixar a solução fácil de validar.';
  }
  return 'Comece pelos exemplos, transforme cada requisito em uma condição simples e rode pequenos testes no console antes de enviar.';
}

// ===== PANEL TOGGLE =====
function togglePanel() {
  const panel = document.getElementById('challenge-panel');
  const btn = panel.querySelector('.panel-toggle');
  panel.classList.toggle('collapsed');
  btn.textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
  if (editor) editor.refresh();
}

// ===== CONSOLE =====
function showConsole() {
  document.getElementById('code-view').style.display = 'none';
  document.getElementById('console-view').style.display = 'flex';
  document.getElementById('tab-code').classList.remove('active');
  document.getElementById('tab-console').classList.add('active');
}

function showCodeView() {
  document.getElementById('console-view').style.display = 'none';
  document.getElementById('code-view').style.display = 'block';
  document.getElementById('tab-console').classList.remove('active');
  document.getElementById('tab-code').classList.add('active');
  if (editor) editor.refresh();
}

function clearConsole() {
  const output = document.getElementById('console-output');
  output.innerHTML = '<div class="console-line system">[ Console limpo ]</div>';
}

function appendConsole(msg, type = 'output') {
  const output = document.getElementById('console-output');
  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  line.textContent = msg;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

// ===== CODE EXECUTION =====
function runCode() {
  if (!editor) return;
  const code = Security.sanitizeCode(editor.getValue());

  if (!code.trim()) {
    showConsole();
    appendConsole('[ Erro: Código vazio ]', 'error');
    return;
  }

  showConsole();
  clearConsole();
  appendConsole('> Executando código...', 'system');
  playBeep(500, 80);

  const lang = document.getElementById('lang-select').value;

  if (lang === 'javascript' || lang === 'typescript') {
    executeJS(lang === 'typescript' ? transpileTypeScript(code) : code);
  } else if (lang === 'css') {
    renderCssPreview(code);
  } else {
    appendConsole(`[ ${LANGUAGE_LABELS[lang] || lang}: validação estática no navegador ]`, 'system');
    appendConsole('[ Para execução real desta linguagem, use um compilador externo ou pipeline de CI. ]', 'system');
    appendConsole('[ O envio verifica estrutura, palavras-chave e intenção da solução. ]', 'system');
  }
}

function transpileTypeScript(code) {
  return code
    .replace(/export\s+/g, '')
    .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
    .replace(/:\s*[A-Za-z_$][A-Za-z0-9_$<>,\s\[\]\|&?]*/g, '')
    .replace(/\)\s*:\s*[A-Za-z_$][A-Za-z0-9_$<>,\s\[\]\|&?]*/g, ')');
}

function renderCssPreview(code) {
  appendConsole('✓ Preview CSS atualizado abaixo.', 'success');

  const frame = document.createElement('iframe');
  frame.className = 'css-preview-frame';
  frame.title = 'Preview CSS';
  frame.srcdoc = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <style>
          body { margin: 0; font-family: system-ui, sans-serif; background: #101418; color: #eef7ee; }
          .preview-shell { min-height: 280px; display: grid; grid-template-rows: auto 1fr; }
          .preview-head { padding: 12px 16px; border-bottom: 1px solid rgba(0,255,120,.25); color: #89ffa8; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
          .preview-stage { min-height: 240px; display: grid; place-items: center; padding: 24px; }
          .card, .button, .grid, .navbar, .modal, .form-field, .table, .metric-card, .fade-in {
            border: 1px solid rgba(0,255,120,.35);
          }
          .card { display: grid; gap: 12px; width: min(520px, 100%); padding: 18px; background: rgba(255,255,255,.04); }
          .button { padding: 10px 14px; background: transparent; color: inherit; }
          .grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
          .grid span, .metric-card, .modal, .form-field, .table { padding: 10px; }
          input { width: 100%; margin-top: 6px; padding: 8px; background: #0c1114; color: #fff; border: 1px solid rgba(255,255,255,.12); }
          ${code}
        </style>
      </head>
      <body>
        <section class="preview-shell">
          <div class="preview-head">Preview visual do componente</div>
          <main class="preview-stage">
            <div class="card">
              <div class="metric-card">42 XP · CSS Preview</div>
              <button class="button">Interagir</button>
              <div class="grid"><span>Layout</span><span>Responsivo</span><span>Polido</span></div>
              <label class="form-field">Campo <input placeholder="Digite aqui" /></label>
              <table class="table"><tr><td>Status</td><td>OK</td></tr></table>
              <div class="modal">Modal de exemplo</div>
              <div class="fade-in">Entrada suave</div>
            </div>
          </main>
        </section>
      </body>
    </html>
  `;
  document.getElementById('console-output').appendChild(frame);
}

function executeJS(code) {
  const logs = [];

  const fakeConsole = {
    log: (...args) => logs.push(args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
      catch { return String(a); }
    }).join(' ')),
    error: (...args) => logs.push('ERROR: ' + args.join(' ')),
    warn: (...args) => logs.push('WARN: ' + args.join(' ')),
    info: (...args) => logs.push('INFO: ' + args.join(' '))
  };

  try {
    const fn = new Function('console', `"use strict";\n${code}`);
    const result = fn(fakeConsole);

    logs.forEach(l => {
      const type = l.startsWith('ERROR:') ? 'error' : l.startsWith('WARN:') ? 'system' : 'output';
      appendConsole(l, type);
    });

    if (result !== undefined) {
      appendConsole(`→ Retornou: ${JSON.stringify(result)}`, 'success');
    }

    if (logs.length === 0 && result === undefined) {
      appendConsole('[ Código executado sem saída — use console.log() para ver resultados ]', 'system');
    }

    appendConsole('✓ Execução concluída.', 'system');

  } catch (err) {
    appendConsole(`❌ ${err.constructor.name}: ${err.message}`, 'error');

    if (err instanceof SyntaxError) {
      appendConsole('→ Verifique a sintaxe: parênteses, chaves e ponto-e-vírgula.', 'system');
    } else if (err instanceof ReferenceError) {
      appendConsole('→ Variável ou função não definida. Verifique os nomes.', 'system');
    } else if (err instanceof TypeError) {
      appendConsole('→ Tipo de dado incorreto. Verifique os argumentos.', 'system');
    }
  }
}

// ===== ANALYSIS ENGINE =====
function analyzeCode(code, challenge) {
  const results = {
    passed: [],
    failed: [],
    errors: [],
    feedback: '',
    totalTests: 0,
    passedTests: 0,
    syntaxOk: true,
    logicOk: false
  };

  if (!code.trim() || code.trim() === (challenge.starterCode || '').trim()) {
    results.feedback = '⚠ Seu código parece estar vazio ou inalterado. Escreva sua solução!';
    return results;
  }

  const validationMode = challenge.validation?.mode || (challenge.language === 'css' ? 'css' : 'runtime');
  if (validationMode === 'static' || validationMode === 'css') {
    const required = challenge.validation?.required || [];
    const forbidden = challenge.validation?.forbidden || [];
    results.totalTests = required.length + forbidden.length;

    for (const rule of required) {
      const variants = String(rule).split('|');
      const ok = variants.some(item => code.toLowerCase().includes(item.toLowerCase()));
      const test = { input: `contém: ${rule}`, expected: 'presente', got: ok ? 'presente' : 'ausente', ok };
      if (ok) {
        results.passed.push(test);
        results.passedTests++;
      } else {
        results.failed.push(test);
      }
    }

    for (const rule of forbidden) {
      const ok = !code.toLowerCase().includes(String(rule).toLowerCase());
      const test = { input: `evita: ${rule}`, expected: 'ausente', got: ok ? 'ausente' : 'presente', ok };
      if (ok) {
        results.passed.push(test);
        results.passedTests++;
      } else {
        results.failed.push(test);
      }
    }

    results.logicOk = results.totalTests > 0 && results.passedTests === results.totalTests;
    if (results.logicOk) {
      results.feedback = validationMode === 'css'
        ? '✓ CSS validado. Use Executar para revisar o preview visual.'
        : '✓ Estrutura validada. A solução contém os elementos esperados para esta linguagem.';
    } else {
      results.feedback = `⚠ Validação estrutural incompleta: ${results.passedTests}/${results.totalTests}. Revise os requisitos do desafio.`;
    }
    return results;
  }

  const executableCode = challenge.language === 'typescript' ? transpileTypeScript(code) : code;

  // 1. Syntax check
  try {
    new Function(executableCode);
  } catch (e) {
    results.syntaxOk = false;
    results.errors.push({ type: 'syntax', message: e.message });
    results.feedback = `❌ Erro de Sintaxe detectado: ${e.message}`;
    return results;
  }

  // 3. Run test cases
  const testCases = challenge.testCases || [];
  results.totalTests = testCases.length;

  if (testCases.length === 0) {
    results.logicOk = true;
    results.passedTests = 0;
    results.totalTests = 0;
    results.feedback = '✓ Código válido! (Nenhum caso de teste configurado para este desafio)';
    return results;
  }

  for (const tc of testCases) {
    try {
      const wrapped = `${executableCode}\nreturn (${tc.input});`;
      const fn = new Function(wrapped);
      let output = fn();

      if (output === null) output = 'null';
      else if (output === undefined) output = 'undefined';
      else if (typeof output === 'object') output = JSON.stringify(output);
      else output = String(output);

      const expected = String(tc.expected);

      if (output.trim() === expected.trim()) {
        results.passed.push({ input: tc.input, expected, got: output, ok: true });
        results.passedTests++;
      } else {
        results.failed.push({ input: tc.input, expected, got: output, ok: false });
      }
    } catch (e) {
      const errMsg = `ERRO: ${e.message}`;
      results.failed.push({ input: tc.input, expected: tc.expected, got: errMsg, ok: false });
      results.errors.push({ type: 'runtime', message: e.message });
    }
  }

  results.logicOk = results.passedTests === results.totalTests && results.totalTests > 0;

  // 4. Generate detailed feedback
  if (results.logicOk) {
    const msgs = [
      '✓ Perfeito! Todos os testes passaram. Desafio concluído!',
      '✓ Excelente! Solução correta. Código aprovado!',
      '✓ Código aprovado! Todos os casos de teste validados.'
    ];
    results.feedback = msgs[Math.floor(Math.random() * msgs.length)];
  } else if (results.passedTests > 0) {
    const pct = Math.round((results.passedTests / results.totalTests) * 100);
    results.feedback = `⚠ Parcialmente correto: ${results.passedTests}/${results.totalTests} testes OK (${pct}%). `;

    const hasBooleanMismatch = results.failed.some(f =>
      (f.expected === 'true' || f.expected === 'false') &&
      (f.got === 'True' || f.got === 'False')
    );
    if (hasBooleanMismatch) {
      results.feedback += 'Dica: use true/false em minúsculas (JavaScript).';
    } else if (results.errors.length > 0) {
      results.feedback += 'Erros de runtime em alguns casos — verifique os valores extremos.';
    } else {
      results.feedback += 'Revise os casos que falharam e verifique a lógica.';
    }
  } else {
    if (!results.syntaxOk) {
      results.feedback = `❌ Erro de Sintaxe: ${results.errors[0]?.message}`;
    } else if (results.errors.length > 0) {
      results.feedback = `❌ Erro de Runtime: ${results.errors[0]?.message}. Verifique se sua função lida com todos os tipos de entrada.`;
    } else {
      results.feedback = '❌ Nenhum teste passou. Revise a lógica e compare com o exemplo de saída esperado.';
    }
  }

  return results;
}

// ===== SUBMIT =====
async function submitCode() {
  if (!editor || !currentChallenge || !currentUser) return;

  const code = Security.sanitizeCode(editor.getValue());

  if (!code.trim()) {
    showResult('wrong', '❌ CÓDIGO VAZIO', [], 'Escreva seu código antes de enviar!');
    return;
  }

  const submitBtn = document.querySelector('.action-btn.submit');
  submitBtn.textContent = '⟳ ANALISANDO...';
  submitBtn.disabled = true;
  playBeep(600, 100);

  // Simulate analysis delay for UX
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

  const analysis = analyzeCode(code, currentChallenge);

  submitBtn.textContent = '⬆ ENVIAR';
  submitBtn.disabled = false;

  let status;
  if (analysis.logicOk) {
    status = 'correct';
    playBeep(880, 200);
  } else if (analysis.passedTests > 0) {
    status = 'partial';
    playBeep(440, 150);
  } else {
    status = 'wrong';
    playBeep(200, 300);
  }

  const allTests = [
    ...analysis.passed.map(t => ({ ...t, ok: true })),
    ...analysis.failed.map(t => ({ ...t, ok: false }))
  ];

  showResult(status, getStatusLabel(status, analysis), allTests, analysis.feedback);

  // Save submission record
  const sub = await DB.addSubmission(currentUser.username, currentChallenge.id, status, code);
  await loadSubmissionHistory();

  // Grant rewards if correct and first time
  if (analysis.logicOk && !(currentUser.completedChallenges || []).includes(currentChallenge.id)) {
    await grantRewards();
  }

  await DB.addLog('info', `Submissão: ${currentUser.username} → "${currentChallenge.title}" → ${status.toUpperCase()}`);
}

function getStatusLabel(status, analysis) {
  if (status === 'correct') return '✓ DESAFIO CONCLUÍDO!';
  if (status === 'partial') return `⚠ PARCIAL ${analysis.passedTests}/${analysis.totalTests}`;
  if (analysis.syntaxOk === false) return '❌ ERRO DE SINTAXE';
  return '❌ LÓGICA INCORRETA';
}

function showResult(status, label, tests, feedback) {
  document.getElementById('result-idle').style.display = 'none';
  const box = document.getElementById('result-box');
  box.style.display = 'block';

  const statusEl = document.getElementById('result-status');
  statusEl.textContent = label;
  statusEl.className = `result-status ${status}`;

  const tcEl = document.getElementById('test-cases');
  if (tests.length > 0) {
    tcEl.innerHTML = tests.map(t => `
      <div class="test-case">
        <span class="test-icon" style="color:${t.ok ? 'var(--primary)' : 'var(--accent)'}">${t.ok ? '✓' : '✗'}</span>
        <span class="test-label" style="color:${t.ok ? 'var(--primary)' : 'var(--accent)'}">
          ${Security.sanitize(String(t.input).substring(0, 28))}
          ${!t.ok ? `<br><span style="color:var(--text-dim);font-size:0.65rem">esperado: ${Security.sanitize(String(t.expected))}</span>` : ''}
        </span>
      </div>
    `).join('');
  } else {
    tcEl.innerHTML = '';
  }

  document.getElementById('result-feedback').textContent = feedback;
}

// ===== REWARDS =====
async function grantRewards() {
  // Reload user fresh from DB
  currentUser = await DB.getCurrentUser();
  const prevXP = currentUser.xp || 0;
  currentUser.xp = prevXP + currentChallenge.xp;
  currentUser.completedChallenges = [...(currentUser.completedChallenges || [])];
  if (!currentUser.completedChallenges.includes(currentChallenge.id)) {
    currentUser.completedChallenges.push(currentChallenge.id);
  }

  // Check all achievements
  const challenges = await DB.getChallenges();
  const completed = currentUser.completedChallenges;
  if (!currentUser.achievements) currentUser.achievements = [];

  const byDiff = (diff) => completed.filter(id => {
    const ch = challenges.find(c => c.id === id);
    return ch && ch.difficulty === diff;
  }).length;

  const checkAch = (id) => !currentUser.achievements.includes(id);

  if (checkAch('first_solve')) currentUser.achievements.push('first_solve');
  if (byDiff('easy') >= 10 && checkAch('easy_master')) currentUser.achievements.push('easy_master');
  if (byDiff('hard') >= 8 && checkAch('hard_master')) currentUser.achievements.push('hard_master');
  if (byDiff('complex') >= 5 && checkAch('complex_master')) currentUser.achievements.push('complex_master');
  if (byDiff('senior') >= 1 && checkAch('senior_master')) currentUser.achievements.push('senior_master');
  if (currentUser.xp >= 1000 && checkAch('century')) currentUser.achievements.push('century');
  if (completed.length >= challenges.length && checkAch('legend')) currentUser.achievements.push('legend');

  await DB.saveUser(currentUser.username, currentUser);

  // Show success modal
  setTimeout(() => {
    document.getElementById('success-xp').textContent = `+${currentChallenge.xp} XP`;
    document.getElementById('success-msg').textContent =
      `Desafio "${currentChallenge.title}" concluído! Você agora tem ${currentUser.xp.toLocaleString('pt-BR')} XP total.`;
    document.getElementById('success-modal').style.display = 'flex';

    playBeep(523, 150);
    setTimeout(() => playBeep(659, 150), 180);
    setTimeout(() => playBeep(784, 150), 360);
    setTimeout(() => playBeep(1047, 300), 540);
  }, 400);
}

// ===== MODAL =====
async function nextChallenge() {
  const challenges = await DB.getChallenges();
  const idx = challenges.findIndex(c => c.id === currentChallenge.id);
  const next = challenges[idx + 1];
  closeModal();
  if (next) {
    window.location.href = `/editor?challenge=${next.id}`;
  } else {
    window.location.href = '/dashboard';
  }
}

function closeModal() {
  document.getElementById('success-modal').style.display = 'none';
}

// ===== RESET =====
function resetCode() {
  if (!confirm('Resetar o código para o ponto de partida original?')) return;
  if (editor) {
    editor.setValue(currentChallenge.starterCode || '// Seu código aqui\n');
    const draftKey = `draft_${currentUser.username}_${currentChallenge.id}`;
    localStorage.removeItem(draftKey);
  }
  playBeep(350, 100);
}

// ===== SUBMISSION HISTORY =====
async function loadSubmissionHistory() {
  currentUser = await DB.getCurrentUser();
  if (!currentUser) return;

  const subs = (await DB.getUserSubmissions(currentUser.username))
    .filter(s => s.challengeId === currentChallenge.id)
    .slice(0, 8);

  const container = document.getElementById('submission-history');

  if (subs.length === 0) {
    container.innerHTML = '<div class="history-empty">Nenhuma submissão ainda</div>';
    return;
  }

  const icons = { correct: '✓', partial: '⚠', wrong: '✗' };
  const colors = { correct: 'var(--primary)', partial: '#ffa500', wrong: 'var(--accent)' };

  container.innerHTML = subs.map(s => {
    const time = new Date(s.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="history-item">
        <span class="history-status" style="color:${colors[s.status]}">${icons[s.status]}</span>
        <span style="flex:1;font-size:0.7rem;color:${colors[s.status]}">${s.status.toUpperCase()}</span>
        <span style="color:var(--text-dim);font-size:0.65rem">${time}</span>
      </div>
    `;
  }).join('');
}

// ===== EXPOSE GLOBALS (funções chamadas por onclick no HTML) =====
window.runCode = runCode;
window.submitCode = submitCode;
window.resetCode = resetCode;
window.togglePanel = togglePanel;
window.changeLanguage = changeLanguage;
window.showConsole = showConsole;
window.showCodeView = showCodeView;
window.clearConsole = clearConsole;
window.nextChallenge = nextChallenge;
window.closeModal = closeModal;
window.logout = logout;

// ===== MATRIX RAIN EFFECT =====
(function() {
  if (window.__hackcodeMatrixTimer) {
    clearInterval(window.__hackcodeMatrixTimer);
    window.__hackcodeMatrixTimer = null;
  }
  (window.__hackcodeResizeHandlers || []).forEach(handler => window.removeEventListener('resize', handler));
  window.__hackcodeResizeHandlers = [];

  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  window.__hackcodeResizeHandlers.push(resize);

  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>{}[]//\\=+-*&^%$#@!01';
  const fontSize = 14;
  let columns = Math.floor(canvas.width / fontSize);
  let drops = [];

  function initDrops() {
    columns = Math.floor(canvas.width / fontSize);
    drops = Array(columns).fill(0).map(() => Math.random() * -50);
  }
  initDrops();
  window.addEventListener('resize', initDrops);
  window.__hackcodeResizeHandlers.push(initDrops);

  // Read color from CSS var
  function getPrimaryColor() {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#00ff00';
    return c;
  }

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const color = getPrimaryColor();
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px 'Share Tech Mono', monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      // Bright head
      if (Math.random() > 0.95) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = color;
      }

      ctx.fillText(char, x, y);

      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += 0.5 + Math.random() * 0.5;
    }
  }

  let animId;
  function startMatrix() {
    if (animId) clearInterval(animId);
    animId = setInterval(draw, 40);
    window.__hackcodeMatrixTimer = animId;
  }

  function stopMatrix() {
    clearInterval(animId);
    if (window.__hackcodeMatrixTimer === animId) window.__hackcodeMatrixTimer = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Expose to admin
  window.matrixControl = { start: startMatrix, stop: stopMatrix };
  startMatrix();
})();

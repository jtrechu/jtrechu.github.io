(() => {
  'use strict';

  const root = document.querySelector('[data-ips-sim]');
  if (!root) return;

  const microCanvas = root.querySelector('[data-canvas="micro"]');
  const pdeCanvas = root.querySelector('[data-canvas="pde"]');
  const microCtx = microCanvas.getContext('2d', { alpha: false });
  const pdeCtx = pdeCanvas.getContext('2d', { alpha: false });

  const toggleBtn = root.querySelector('[data-action="toggle"]');
  const resetBtn = root.querySelector('[data-action="reset"]');
  const randomBtn = root.querySelector('[data-action="randomize"]');
  const stirInput = root.querySelector('[data-control="stir"]');
  const gridSelect = root.querySelector('[data-control="grid"]');
  const stirOutput = root.querySelector('[data-output="stir"]');
  const densityStat = root.querySelector('[data-stat="density"]');
  const viewButtons = [...root.querySelectorAll('[data-view]')];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const params = {
    lambda: 1.45,
    mu: 0.55,
    baseDt: 0.035,
    pdeDiffusionBase: 0.015,
  };

  let n = Number(gridSelect.value);
  let state = new Uint8Array(n * n);
  let pde = new Float32Array(n * n);
  let pdeNext = new Float32Array(n * n);
  let localDensity = new Float32Array(n * n);
  let running = !reducedMotion;
  let microView = 'particles';
  let frame = 0;
  let raf = null;
  let drawing = false;

  function idx(x, y) {
    x = (x + n) % n;
    y = (y + n) % n;
    return y * n + x;
  }

  function initialise(kind = 'blob') {
    state = new Uint8Array(n * n);
    pde = new Float32Array(n * n);
    pdeNext = new Float32Array(n * n);
    localDensity = new Float32Array(n * n);

    const cx = n * 0.37;
    const cy = n * 0.5;
    const radius = n * 0.2;

    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const i = idx(x, y);
        let probability;

        if (kind === 'random') {
          probability = 0.15 + 0.45 * Math.random();
        } else {
          const d = Math.hypot(x - cx, y - cy);
          probability = d < radius ? 0.82 : 0.04;
        }

        state[i] = Math.random() < probability ? 1 : 0;
        pde[i] = probability;
      }
    }

    render();
  }

  function neighbourCount(x, y) {
    return state[idx(x + 1, y)] + state[idx(x - 1, y)] + state[idx(x, y + 1)] + state[idx(x, y - 1)];
  }

  function microStep() {
    const sites = n * n;
    const dt = params.baseDt;
    const updates = Math.max(1, Math.floor(sites * 0.18));

    for (let k = 0; k < updates; k += 1) {
      const x = Math.floor(Math.random() * n);
      const y = Math.floor(Math.random() * n);
      const i = idx(x, y);

      if (state[i]) {
        if (Math.random() < params.mu * dt) state[i] = 0;
      } else {
        const occupiedFraction = neighbourCount(x, y) / 4;
        if (Math.random() < params.lambda * occupiedFraction * dt) state[i] = 1;
      }
    }

    const stir = Number(stirInput.value);
    const swaps = Math.floor(sites * stir * 0.045);
    for (let k = 0; k < swaps; k += 1) {
      const x = Math.floor(Math.random() * n);
      const y = Math.floor(Math.random() * n);
      const dir = Math.floor(Math.random() * 4);
      const dx = dir === 0 ? 1 : dir === 1 ? -1 : 0;
      const dy = dir === 2 ? 1 : dir === 3 ? -1 : 0;
      const a = idx(x, y);
      const b = idx(x + dx, y + dy);
      const tmp = state[a];
      state[a] = state[b];
      state[b] = tmp;
    }
  }

  function pdeStep() {
    const stir = Number(stirInput.value);
    const D = params.pdeDiffusionBase * stir;
    const dt = 0.08;

    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const i = idx(x, y);
        const u = pde[i];
        const lap = pde[idx(x + 1, y)] + pde[idx(x - 1, y)] + pde[idx(x, y + 1)] + pde[idx(x, y - 1)] - 4 * u;
        const reaction = params.lambda * u * (1 - u) - params.mu * u;
        pdeNext[i] = Math.max(0, Math.min(1, u + dt * (D * lap + reaction)));
      }
    }

    const temp = pde;
    pde = pdeNext;
    pdeNext = temp;
  }

  function smoothDensity(radius = 2) {
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        let sum = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            sum += state[idx(x + dx, y + dy)];
            count += 1;
          }
        }
        localDensity[idx(x, y)] = sum / count;
      }
    }
  }

  function densityColor(u) {
    const bg = [247, 247, 244];
    const fg = [93, 101, 55];
    const t = Math.max(0, Math.min(1, u));
    return [
      Math.round(bg[0] + (fg[0] - bg[0]) * t),
      Math.round(bg[1] + (fg[1] - bg[1]) * t),
      Math.round(bg[2] + (fg[2] - bg[2]) * t),
    ];
  }

  function renderField(ctx, values, binary = false) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const image = ctx.createImageData(width, height);
    const data = image.data;

    for (let py = 0; py < height; py += 1) {
      const y = Math.min(n - 1, Math.floor((py / height) * n));
      for (let px = 0; px < width; px += 1) {
        const x = Math.min(n - 1, Math.floor((px / width) * n));
        const value = values[idx(x, y)];
        const offset = (py * width + px) * 4;
        let rgb;
        if (binary) {
          rgb = value ? [43, 43, 40] : [247, 247, 244];
        } else {
          rgb = densityColor(value);
        }
        data[offset] = rgb[0];
        data[offset + 1] = rgb[1];
        data[offset + 2] = rgb[2];
        data[offset + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
  }

  function renderParticles() {
    if (microView === 'particles') {
      const width = microCanvas.width;
      const height = microCanvas.height;
      microCtx.fillStyle = '#f7f7f4';
      microCtx.fillRect(0, 0, width, height);

      const cellW = width / n;
      const cellH = height / n;
      const r = Math.max(1.2, Math.min(cellW, cellH) * 0.34);
      microCtx.fillStyle = '#2b2b28';

      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          if (!state[idx(x, y)]) continue;
          const cx = (x + 0.5) * cellW;
          const cy = (y + 0.5) * cellH;
          microCtx.beginPath();
          microCtx.arc(cx, cy, r, 0, Math.PI * 2);
          microCtx.fill();
        }
      }
    } else {
      smoothDensity(n >= 90 ? 3 : 2);
      renderField(microCtx, localDensity, false);
    }
  }

  function render() {
    renderParticles();
    renderField(pdeCtx, pde, false);

    let occupied = 0;
    for (let i = 0; i < state.length; i += 1) occupied += state[i];
    densityStat.textContent = `density ${(occupied / state.length).toFixed(3)}`;
  }

  function loop() {
    if (running) {
      microStep();
      pdeStep();
      frame += 1;
      if (frame % 2 === 0) render();
    }
    raf = requestAnimationFrame(loop);
  }

  function setRunning(value) {
    running = value;
    toggleBtn.textContent = running ? 'Pause' : 'Run';
  }

  function setView(view) {
    microView = view;
    viewButtons.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    render();
  }

  function paintAtEvent(event) {
    const rect = microCanvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * n);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * n);
    if (x < 0 || x >= n || y < 0 || y >= n) return;

    const brushRadius = Math.max(1, Math.round(n / 60));
    for (let dy = -brushRadius; dy <= brushRadius; dy += 1) {
      for (let dx = -brushRadius; dx <= brushRadius; dx += 1) {
        if (dx * dx + dy * dy > brushRadius * brushRadius) continue;
        const i = idx(x + dx, y + dy);
        state[i] = 1;
        pde[i] = Math.max(pde[i], 0.85);
      }
    }
    render();
  }

  toggleBtn.addEventListener('click', () => setRunning(!running));
  resetBtn.addEventListener('click', () => initialise('blob'));
  randomBtn.addEventListener('click', () => initialise('random'));

  stirInput.addEventListener('input', () => {
    stirOutput.textContent = stirInput.value;
  });

  gridSelect.addEventListener('change', () => {
    n = Math.max(20, Math.min(120, Number(gridSelect.value) || 60));
    initialise('blob');
  });

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  microCanvas.addEventListener('pointerdown', (event) => {
    drawing = true;
    microCanvas.setPointerCapture(event.pointerId);
    paintAtEvent(event);
  });

  microCanvas.addEventListener('pointermove', (event) => {
    if (drawing) paintAtEvent(event);
  });

  const stopDrawing = () => { drawing = false; };
  microCanvas.addEventListener('pointerup', stopDrawing);
  microCanvas.addEventListener('pointercancel', stopDrawing);

  initialise('blob');
  stirOutput.textContent = stirInput.value;
  setRunning(running);
  raf = requestAnimationFrame(loop);

  window.addEventListener('pagehide', () => {
    if (raf) cancelAnimationFrame(raf);
  }, { once: true });
})();

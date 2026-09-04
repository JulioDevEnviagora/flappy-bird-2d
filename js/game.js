(() => {
  "use strict";

  const W = 480;
  const H = 720;
  const GROUND_H = 112;
  const PLAY_H = H - GROUND_H;
  const STORAGE_KEY = "flappy-bird-2d-best";

  const STATE = Object.freeze({
    START: "start",
    PLAYING: "playing",
    OVER: "over",
  });

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);

  function loadBest() {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function saveBest(score) {
    localStorage.setItem(STORAGE_KEY, String(score));
  }

  const audio = {
    ctx: null,
    muted: false,

    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },

    beep(freq, dur, type, gain, slide) {
      if (this.muted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },

    flap() {
      this.beep(420, 0.09, "square", 0.05, 720);
    },

    score() {
      this.beep(660, 0.1, "triangle", 0.06, 880);
    },

    hit() {
      this.beep(180, 0.22, "sawtooth", 0.07, 70);
    },
  };

  const game = {
    state: STATE.START,
    bird: null,
    pipes: [],
    particles: [],
    score: 0,
    best: loadBest(),
    speed: 2.15,
    spawnAcc: 0,
    groundX: 0,
    hillX: 0,
    farX: 0,
    cloudX: 0,
    shake: 0,
    flash: 0,
    ready: 0,
  };

  function makeBird() {
    return {
      x: 128,
      y: PLAY_H * 0.5,
      r: 16,
      vy: 0,
      rot: 0,
      wing: 0,
    };
  }

  function resetPlay() {
    game.bird = makeBird();
    game.pipes = [];
    game.particles = [];
    game.score = 0;
    game.speed = 2.2;
    game.spawnAcc = 0;
    game.shake = 0;
    game.flash = 0;
    game.ready = 0.4;
  }

  function spawnPipe() {
    const first = game.score === 0 && game.pipes.length === 0;
    const second = game.score === 0 && game.pipes.length === 1;
    const margin = 40;
    const gap = first
      ? PLAY_H - 128
      : second
        ? 220
        : clamp(196 - game.score * 1.05, 152, 196);
    const minTop = 78;
    const maxTop = PLAY_H - gap - margin;
    const top = first
      ? 0
      : second
        ? (PLAY_H - gap) * 0.5
        : rand(minTop, Math.max(minTop + 8, maxTop));
    game.pipes.push({
      x: W + 36,
      w: 72,
      top,
      gap,
      passed: false,
    });
  }

  function burst(x, y, color, n, spread) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(0.6, spread);
      game.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 1.2,
        life: rand(0.35, 0.75),
        max: 0.75,
        r: rand(2, 4.5),
        color,
      });
    }
  }

  function flap() {
    audio.ensure();
    if (game.state === STATE.START) {
      resetPlay();
      game.state = STATE.PLAYING;
      game.bird.vy = -5.7;
      game.bird.wing = 1;
      audio.flap();
      burst(game.bird.x - 8, game.bird.y + 6, "#fff6d6", 6, 2.4);
      return;
    }
    if (game.state === STATE.OVER) {
      resetPlay();
      game.state = STATE.PLAYING;
      game.bird.vy = -5.7;
      game.bird.wing = 1;
      audio.flap();
      return;
    }
    if (game.state === STATE.PLAYING) {
      game.bird.vy = -5.7;
      game.bird.wing = 1;
      audio.flap();
      burst(game.bird.x - 8, game.bird.y + 6, "#fff6d6", 5, 2.2);
    }
  }

  function hit() {
    if (game.state !== STATE.PLAYING) return;
    game.state = STATE.OVER;
    game.shake = 11;
    game.flash = 0.35;
    audio.hit();
    burst(game.bird.x, game.bird.y, "#f4b942", 16, 5.5);
    burst(game.bird.x, game.bird.y, "#f26b2b", 8, 3.8);
    if (game.score > game.best) {
      game.best = game.score;
      saveBest(game.best);
    }
  }

  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw);
    const ny = clamp(cy, ry, ry + rh);
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  function update(dt) {
    const t = dt / (1000 / 60);
    const bird = game.bird;

    game.groundX = (game.groundX + game.speed * t) % 48;
    game.hillX = (game.hillX + game.speed * 0.35 * t) % 280;
    game.farX = (game.farX + game.speed * 0.14 * t) % 360;
    game.cloudX = (game.cloudX + game.speed * 0.22 * t) % 520;
    game.shake = Math.max(0, game.shake - t * 0.7);
    game.flash = Math.max(0, game.flash - dt / 1000);

    for (let i = game.particles.length - 1; i >= 0; i -= 1) {
      const p = game.particles[i];
      p.life -= dt / 1000;
      p.x += p.vx * t;
      p.y += p.vy * t;
      p.vy += 0.12 * t;
      if (p.life <= 0) game.particles.splice(i, 1);
    }

    if (game.state === STATE.START) {
      bird.y = PLAY_H * 0.5 + Math.sin(performance.now() / 280) * 8;
      bird.vy = 0;
      bird.rot = -0.12;
      bird.wing = (Math.sin(performance.now() / 140) + 1) / 2;
      return;
    }

    if (game.state === STATE.OVER) {
      bird.vy = Math.min(12, bird.vy + 0.32 * t);
      bird.y += bird.vy * t;
      bird.rot = lerp(bird.rot, 1.15, 0.12);
      if (bird.y > PLAY_H - bird.r) {
        bird.y = PLAY_H - bird.r;
        bird.vy = 0;
      }
      return;
    }

    game.ready = Math.max(0, game.ready - dt / 1000);
    bird.vy = Math.min(10.5, bird.vy + 0.26 * t);
    bird.y += bird.vy * t;
    bird.rot = clamp(bird.vy * 0.09, -0.5, 1.05);
    bird.wing = Math.max(0, bird.wing - dt / 180);

    if (bird.y - bird.r < 0) {
      bird.y = bird.r;
      bird.vy = 0;
    }
    if (bird.y + bird.r >= PLAY_H) {
      bird.y = PLAY_H - bird.r;
      hit();
      return;
    }

    if (game.ready <= 0) {
      game.spawnAcc += game.speed * t;
      if (game.pipes.length === 0 || game.spawnAcc >= 230) {
        spawnPipe();
        game.spawnAcc = 0;
      }
    }

    for (const pipe of game.pipes) {
      pipe.x -= game.speed * t;
      if (!pipe.passed && pipe.x + pipe.w < bird.x) {
        pipe.passed = true;
        game.score += 1;
        audio.score();
        game.speed = Math.min(3.35, 2.2 + game.score * 0.04);
        burst(bird.x + 10, bird.y, "#ffffff", 7, 2.6);
      }
    }
    game.pipes = game.pipes.filter((p) => p.x + p.w > -40);

    const hitR = bird.r - 5;
    for (const pipe of game.pipes) {
      const topH = pipe.top;
      const botY = pipe.top + pipe.gap;
      const botH = PLAY_H - botY;
      if (
        circleRect(bird.x, bird.y, hitR, pipe.x, 0, pipe.w, topH) ||
        circleRect(bird.x, bird.y, hitR, pipe.x, botY, pipe.w, botH)
      ) {
        hit();
        return;
      }
    }
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#4a90c8");
    g.addColorStop(0.45, "#7ec8e3");
    g.addColorStop(0.78, "#f7d9a3");
    g.addColorStop(1, "#f0c27a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255, 236, 179, 0.55)";
    ctx.beginPath();
    ctx.arc(368, 96, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 248, 220, 0.85)";
    ctx.beginPath();
    ctx.arc(368, 96, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.beginPath();
    ctx.ellipse(x, y, 28 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 22 * s, y + 2 * s, 22 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 20 * s, y + 4 * s, 18 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFarHills() {
    ctx.save();
    ctx.translate(-game.farX, 0);
    ctx.fillStyle = "#6aa3c5";
    for (let i = -1; i < 4; i += 1) {
      const x = i * 360;
      ctx.beginPath();
      ctx.moveTo(x, PLAY_H);
      ctx.quadraticCurveTo(x + 90, PLAY_H - 90, x + 180, PLAY_H - 40);
      ctx.quadraticCurveTo(x + 260, PLAY_H - 120, x + 360, PLAY_H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHills() {
    ctx.save();
    ctx.translate(-game.hillX, 0);
    ctx.fillStyle = "#5ea06a";
    for (let i = -1; i < 5; i += 1) {
      const x = i * 280;
      ctx.beginPath();
      ctx.moveTo(x, PLAY_H);
      ctx.quadraticCurveTo(x + 70, PLAY_H - 58, x + 140, PLAY_H - 22);
      ctx.quadraticCurveTo(x + 210, PLAY_H - 78, x + 280, PLAY_H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#4e8b58";
    for (let i = -1; i < 5; i += 1) {
      const x = i * 280 + 40;
      ctx.beginPath();
      ctx.moveTo(x, PLAY_H);
      ctx.quadraticCurveTo(x + 60, PLAY_H - 36, x + 130, PLAY_H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawClouds() {
    const clouds = [
      [40, 78, 1],
      [210, 120, 0.75],
      [360, 64, 1.1],
      [500, 150, 0.65],
    ];
    clouds.forEach(([x, y, s], i) => {
      const px = ((x - game.cloudX * (0.7 + i * 0.08)) % 520) + 40;
      drawCloud(px, y, s);
    });
  }

  function drawPipe(pipe) {
    const { x, w, top, gap } = pipe;
    const botY = top + gap;
    const botH = PLAY_H - botY;
    const body = "#c1664a";
    const dark = "#8d3f2e";
    const light = "#d9855f";
    const cap = "#a34c36";

    function pillar(px, py, pw, ph, capAt) {
      if (ph <= 0) return;
      ctx.fillStyle = body;
      ctx.fillRect(px + 6, py, pw - 12, ph);
      ctx.fillStyle = light;
      ctx.fillRect(px + 10, py, 8, ph);
      ctx.fillStyle = dark;
      ctx.fillRect(px + pw - 16, py, 6, ph);

      const cy = capAt === "bottom" ? py + ph - 22 : py;
      roundRect(px, cy, pw, 22, 5);
      ctx.fillStyle = cap;
      ctx.fill();
      ctx.fillStyle = light;
      roundRect(px + 4, cy + 3, 14, 16, 3);
      ctx.fill();
    }

    pillar(x, 0, w, top, "bottom");
    pillar(x, botY, w, botH, "top");
  }

  function drawGround() {
    ctx.fillStyle = "#d7b07a";
    ctx.fillRect(0, PLAY_H, W, GROUND_H);

    ctx.fillStyle = "#6bb36a";
    ctx.fillRect(0, PLAY_H, W, 18);
    ctx.fillStyle = "#4e8b58";
    ctx.fillRect(0, PLAY_H + 16, W, 6);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, PLAY_H + 22, W, GROUND_H);
    ctx.clip();
    ctx.translate(-game.groundX, 0);
    for (let x = -48; x < W + 48; x += 48) {
      ctx.fillStyle = x % 96 === 0 ? "#c9a36c" : "#e0c08a";
      ctx.fillRect(x, PLAY_H + 28, 48, GROUND_H);
      ctx.strokeStyle = "rgba(120, 80, 40, 0.18)";
      ctx.strokeRect(x + 0.5, PLAY_H + 28, 48, 40);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, PLAY_H, W, 3);
  }

  function drawBird(bird) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(3, 14, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const wing = -0.55 + bird.wing * 1.15;
    ctx.save();
    ctx.translate(-4, 2);
    ctx.rotate(wing);
    ctx.fillStyle = "#e89b2d";
    ctx.beginPath();
    ctx.ellipse(-2, 2, 12, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#f4b942";
    ctx.beginPath();
    ctx.ellipse(0, 1, 17, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff6d6";
    ctx.beginPath();
    ctx.ellipse(-1, 5, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f26b2b";
    ctx.beginPath();
    ctx.moveTo(14, -1);
    ctx.lineTo(27, 2);
    ctx.lineTo(14, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff9a56";
    ctx.beginPath();
    ctx.moveTo(14, 3);
    ctx.lineTo(24, 3.5);
    ctx.lineTo(14, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(7, -4, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b2b2b";
    ctx.beginPath();
    ctx.arc(8.6, -4, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(9.4, -5.1, 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(242, 107, 43, 0.28)";
    ctx.beginPath();
    ctx.ellipse(-2, 3, 3.2, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawParticles() {
    for (const p of game.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawText(text, x, y, size, color, align) {
    ctx.font = `700 ${size}px Trebuchet MS, Segoe UI, sans-serif`;
    ctx.textAlign = align || "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(4, size / 7);
    ctx.strokeStyle = "rgba(40, 28, 16, 0.55)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = "rgba(28, 36, 48, 0.62)";
    roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawHud() {
    if (game.state === STATE.PLAYING || game.state === STATE.OVER) {
      drawText(String(game.score), W / 2, 64, 54, "#fffef5");
    }

    if (game.state === STATE.START) {
      panel(48, 168, W - 96, 292);
      drawText("FLAPPY BIRD 2D", W / 2, 214, 30, "#fff6d6");
      drawText("clone inspirado", W / 2, 250, 16, "#f7d9a3");
      drawText("Toque, clique ou Espaço", W / 2, 308, 18, "#ffffff");
      drawText("para bater as asas", W / 2, 334, 18, "#ffffff");
      drawText(`Recorde: ${game.best}`, W / 2, 392, 20, "#f4b942");
      drawText("arte original · sem sprites oficiais", W / 2, 428, 13, "#d7e8f3");
    }

    if (game.state === STATE.OVER) {
      panel(56, 188, W - 112, 268);
      drawText("FIM DE JOGO", W / 2, 232, 32, "#ffd1b8");
      drawText(`Pontos: ${game.score}`, W / 2, 292, 26, "#ffffff");
      drawText(`Recorde: ${game.best}`, W / 2, 332, 22, "#f4b942");
      if (game.score >= game.best && game.score > 0) {
        drawText("novo recorde!", W / 2, 368, 16, "#7CFFB2");
      }
      drawText("Toque para jogar de novo", W / 2, 412, 16, "#fff6d6");
    }

    ctx.font = "600 13px Trebuchet MS, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(audio.muted ? "M mudo" : "M som", 14, H - 18);
  }

  function drawMuteHit() {
    return { x: 8, y: H - 40, w: 70, h: 32 };
  }

  function pointIn(box, x, y) {
    return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  }

  function draw() {
    ctx.save();
    if (game.shake > 0) {
      ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }
    drawSky();
    drawFarHills();
    drawClouds();
    drawHills();
    for (const pipe of game.pipes) drawPipe(pipe);
    drawGround();
    drawParticles();
    drawBird(game.bird);
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${game.flash * 0.55})`;
      ctx.fillRect(0, 0, W, H);
    }
    drawHud();
    ctx.restore();
  }

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function canvasPoint(ev) {
    const rect = canvas.getBoundingClientRect();
    const src = ev.changedTouches ? ev.changedTouches[0] : ev;
    return {
      x: ((src.clientX - rect.left) / rect.width) * W,
      y: ((src.clientY - rect.top) / rect.height) * H,
    };
  }

  function onPointer(ev) {
    ev.preventDefault();
    const p = canvasPoint(ev);
    if (pointIn(drawMuteHit(), p.x, p.y)) {
      audio.muted = !audio.muted;
      audio.ensure();
      return;
    }
    flap();
  }

  if (window.PointerEvent) {
    canvas.addEventListener("pointerdown", onPointer);
  } else {
    canvas.addEventListener("mousedown", onPointer);
    canvas.addEventListener("touchstart", onPointer, { passive: false });
  }
  canvas.addEventListener(
    "touchstart",
    (ev) => {
      ev.preventDefault();
    },
    { passive: false }
  );

  window.addEventListener("keydown", (ev) => {
    if (ev.code === "Space" || ev.code === "ArrowUp" || ev.code === "KeyW") {
      ev.preventDefault();
      flap();
    }
    if (ev.code === "KeyM") {
      audio.muted = !audio.muted;
      audio.ensure();
    }
  });

  window.addEventListener("resize", fitCanvas);

  game.bird = makeBird();
  fitCanvas();

  let last = performance.now();
  function loop(now) {
    const dt = clamp(now - last, 0, 40);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.__flappy = {
    get state() {
      return game.state;
    },
    get score() {
      return game.score;
    },
    get best() {
      return game.best;
    },
    snapshot() {
      return {
        state: game.state,
        score: game.score,
        y: game.bird ? Math.round(game.bird.y) : null,
        vy: game.bird ? Number(game.bird.vy.toFixed(2)) : null,
        pipes: game.pipes.map((p) => ({
          x: Math.round(p.x),
          top: Math.round(p.top),
          gap: Math.round(p.gap),
          bot: Math.round(p.top + p.gap),
        })),
      };
    },
    flap,
  };
})();

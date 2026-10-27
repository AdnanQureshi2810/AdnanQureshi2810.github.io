/* ============================================
   Personal Website v4 — Motion graphics
   Hero microscope worms · Research gene network · Contact mitochondrion
   ============================================ */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ── Helpers ────────────────────────────────────────────────
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const VIOLET = [167, 139, 250];
  const VIOLET_DEEP = [139, 92, 246];
  const FIELD = [226, 226, 236];              // dark-field highlights; the hero tint turns these violet
  // Seeded PRNG so layouts are stable between visits.
  const rng = seed => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Smallest signed angle from `from` to `to`.
  const angleTo = (from, to) => {
    let d = (to - from) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };

  // ── Scene runner ───────────────────────────────────────────
  // Each scene owns one canvas, re-lays itself out on resize, and only
  // animates while on screen. With reduced motion it draws one still frame.
  const scenes = [];

  function addScene(canvas, api, { maxDpr = 2 } = {}) {
    const ctx = canvas.getContext('2d');
    const s = { canvas, ctx, W: 0, H: 0, t: 0, last: 0, visible: false };
    s.render = dt => { ctx.clearRect(0, 0, s.W, s.H); api.draw(s, dt); };
    s.relayout = () => { if (s.W) { api.layout(s); s.render(0); } };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      s.W = r.width; s.H = r.height;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      api.layout(s);
      s.render(0);
    };
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; s.last = 0; },
      { rootMargin: '120px' }).observe(canvas);
    scenes.push(s);
    return s;
  }

  function tick(now) {
    for (const s of scenes) {
      if (!s.visible || !s.W) continue;
      const dt = s.last ? Math.min((now - s.last) / 1000, 0.05) : 0;
      s.last = now;
      s.t += dt;
      s.render(dt);
    }
    requestAnimationFrame(tick);
  }

  // ── 1. Hero: dark-field microscope view of C. elegans ──────
  // Each worm lays down a sinuous track with its head and the body follows
  // that track, the way C. elegans crawls on agar. Worms turn away from the
  // cursor, a nod to the touch-avoidance response.
  const AVOID_RADIUS = 170;
  const bodyWidth = u => (u < 0.06 ? 0.2 + 0.8 * Math.sqrt(u / 0.06)       // rounded nose
    : u > 0.74 ? Math.pow(1 - (u - 0.74) / 0.26, 0.9)                        // whip-like tail
      : 1);

  function stepWorm(w, dt, W, H, ptr) {
    w.phase += w.omega * dt * w.boost;
    w.drift = clamp(w.drift + (Math.random() - 0.5) * 0.9 * dt, -0.22, 0.22);
    let steer = w.drift;
    // Turn back toward the field near the edges.
    const mx = W * 0.06, my = H * 0.1;
    if (w.hx < mx || w.hx > W - mx || w.hy < my || w.hy > H - my) {
      steer += angleTo(w.heading, Math.atan2(H / 2 - w.hy, W / 2 - w.hx)) * 0.9;
    }
    w.boost += (1 - w.boost) * Math.min(1, dt * 1.5);
    if (ptr) {
      const dx = w.hx - ptr.x, dy = w.hy - ptr.y, d = Math.hypot(dx, dy);
      const reach = AVOID_RADIUS + w.L * 0.15;
      if (d < reach) {
        const k = 1 - d / reach;
        steer += angleTo(w.heading, Math.atan2(dy, dx)) * 3.2 * k;
        w.boost = Math.max(w.boost, 1 + 1.4 * k);
      }
    }
    w.heading += steer * dt;
    const dir = w.heading + w.amp * Math.sin(w.phase);
    const v = w.speed * w.boost * dt;
    w.hx += Math.cos(dir) * v;
    w.hy += Math.sin(dir) * v;
    const last = w.trail[0];
    if (!last || Math.hypot(w.hx - last.x, w.hy - last.y) >= w.ds) {
      w.trail.unshift({ x: w.hx, y: w.hy });
      const keep = Math.ceil(w.L / w.ds) + 4;
      if (w.trail.length > keep) w.trail.length = keep;
    }
  }

  function drawWorm(ctx, w) {
    const N = 46;
    const span = w.L / w.ds;
    const pts = [];
    for (let k = 0; k < N; k++) {
      const f = (k / (N - 1)) * span;
      const i = Math.floor(f), t = f - i;
      const a = i === 0 ? { x: w.hx, y: w.hy } : w.trail[Math.min(i - 1, w.trail.length - 1)];
      const b = w.trail[Math.min(i, w.trail.length - 1)];
      pts.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
    }
    const left = [], right = [], norms = [];
    for (let k = 0; k < N; k++) {
      const p0 = pts[Math.max(0, k - 1)], p1 = pts[Math.min(N - 1, k + 1)];
      let tx = p1.x - p0.x, ty = p1.y - p0.y;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len; ty /= len;
      const nx = -ty, ny = tx;
      const hw = w.half * bodyWidth(k / (N - 1));
      norms.push([nx, ny, hw]);
      left.push([pts[k].x + nx * hw, pts[k].y + ny * hw]);
      right.push([pts[k].x - nx * hw, pts[k].y - ny * hw]);
    }
    const at = u => { const k = Math.round(u * (N - 1)); return [pts[k], norms[k]]; };

    // Body: bright rim and faint interior, as in dark-field illumination.
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let k = 1; k < N; k++) ctx.lineTo(left[k][0], left[k][1]);
    for (let k = N - 1; k >= 0; k--) ctx.lineTo(right[k][0], right[k][1]);
    ctx.closePath();
    ctx.fillStyle = rgba(FIELD, w.alpha * 0.1);
    ctx.fill();
    ctx.lineWidth = lerp(1.2, 0.8, w.depth);
    ctx.strokeStyle = rgba(FIELD, w.alpha * 0.85);
    ctx.stroke();

    // Pharynx: lumen plus the metacorpus and terminal bulbs.
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = rgba(FIELD, w.alpha * 0.45);
    ctx.beginPath();
    for (let k = 0; k <= Math.round(0.13 * (N - 1)); k++) (k ? ctx.lineTo : ctx.moveTo).call(ctx, pts[k].x, pts[k].y);
    ctx.stroke();
    for (const [u, scale] of [[0.055, 0.5], [0.12, 0.64]]) {
      const [p, [, , hw]] = at(u);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, hw * scale), 0, TAU);
      ctx.fillStyle = rgba(FIELD, w.alpha * 0.1);
      ctx.fill();
      ctx.strokeStyle = rgba(FIELD, w.alpha * 0.55);
      ctx.stroke();
    }

    // Gut granules along the intestine.
    ctx.fillStyle = rgba(FIELD, w.alpha * 0.35);
    for (const [u, v, r] of w.granules) {
      const [p, [nx, ny, hw]] = at(u);
      ctx.beginPath();
      ctx.arc(p.x + nx * hw * v, p.y + ny * hw * v, Math.max(0.5, r * w.half * 0.14), 0, TAU);
      ctx.fill();
    }
  }

  const heroScope = {
    worms: [], specks: [], ptr: { x: -1e4, y: -1e4 },

    init(canvas) {
      const hero = canvas.closest('.hero');
      if (!hero || !finePointer || reduceMotion) return;
      hero.addEventListener('pointermove', e => {
        const r = canvas.getBoundingClientRect();
        this.ptr.x = e.clientX - r.left;
        this.ptr.y = e.clientY - r.top;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { this.ptr.x = this.ptr.y = -1e4; });
    },

    layout(s) {
      const R = rng(5);
      const { W, H } = s;
      const count = W < 700 ? 3 : 5;
      const base = Math.min(H, 1000);
      // Faint specks of the bacterial lawn the worms crawl on.
      this.specks = Array.from({ length: Math.round((W * H) / 9000) }, () => ({
        x: R() * W, y: R() * H, a: 0.04 + R() * 0.12, r: R() < 0.85 ? 0.8 : 1.4, ph: R() * TAU,
      }));
      this.worms = Array.from({ length: count }, (_, i) => {
        const depth = i / (count - 1);                 // 0 = in focus and near, 1 = far
        const L = base * lerp(0.42, 0.2, depth) * (0.9 + R() * 0.2);
        const w = {
          depth, L, half: L / 30, ds: 2.5,
          speed: L * lerp(0.11, 0.08, depth),
          amp: 0.55 + R() * 0.15, phase: R() * TAU, drift: 0, boost: 1,
          heading: R() * TAU, hx: lerp(0.15, 0.85, R()) * W, hy: lerp(0.2, 0.8, R()) * H,
          alpha: lerp(0.6, 0.25, depth), trail: [],
          granules: Array.from({ length: 46 }, () => [0.16 + R() * 0.7, (R() * 2 - 1) * 0.55, 0.5 + R() * 0.9]),
        };
        w.omega = (TAU * w.speed) / (w.L * 0.62);       // track wavelength ≈ 0.62 body lengths
        // Run the worm forward off-screen so it starts fully formed.
        for (let k = 0; k < (L / w.speed + 1) * 30; k++) stepWorm(w, 1 / 30, W, H, null);
        return w;
      });
      this.worms.sort((a, b) => b.depth - a.depth);   // draw far worms first
    },

    draw(s, dt) {
      const { ctx, W, H, t } = s;
      // Opaque dark field: the hero's multiply tint needs a dark base to sit on.
      ctx.fillStyle = 'rgb(9,9,13)';
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.6);
      glow.addColorStop(0, rgba(FIELD, 0.05));
      glow.addColorStop(1, rgba(FIELD, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      for (const p of this.specks) {
        ctx.fillStyle = rgba(FIELD, p.a);
        ctx.fillRect(p.x + Math.sin(t * 0.3 + p.ph) * 1.5, p.y + Math.cos(t * 0.25 + p.ph) * 1.5, p.r, p.r);
      }
      const ptr = this.ptr.x > -1e3 ? this.ptr : null;
      for (const w of this.worms) {
        if (dt) stepWorm(w, dt, W, H, ptr);
        drawWorm(ctx, w);
      }
    },
  };

  // ── 2. Research: one gene/pathway network under the section ─
  // Ports sit on the edges of each research card and on top of each metric
  // group; signals run card → card and card → its numbers. Hovering a card
  // lights its routes.
  const researchNet = {
    nodes: [], edges: [], routes: [], pulses: [], active: -1, spawn: 0, highlight: 0, hlCard: -1,

    init(canvas) {
      this.section = canvas.closest('section');
      this.cards = [...this.section.querySelectorAll('.r-card')];
      this.cards.forEach((card, i) => {
        card.addEventListener('mouseenter', () => { this.active = i; this.spawn = 0; });
        card.addEventListener('mouseleave', () => { if (this.active === i) this.active = -1; });
        // Cards slide in on reveal; re-measure once they settle.
        card.addEventListener('animationend', () => this.scene && this.scene.relayout());
      });
    },

    layout(s) {
      const cr = s.canvas.getBoundingClientRect();
      const rel = el => {
        const r = el.getBoundingClientRect();
        return { x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height };
      };
      const cards = this.cards.map(rel);
      const groups = [...this.section.querySelectorAll('.metric-group')].map(rel);
      const strip = this.section.querySelector('.metrics-strip');
      const bottomEdge = strip ? rel(strip) : cards[cards.length - 1];
      const top = Math.min(...cards.map(c => c.y)) - 80;
      const bottom = bottomEdge.y + bottomEdge.h + 60;
      const R = rng(19);

      const nodes = [];
      const target = clamp(Math.round((s.W * (bottom - top)) / 5200), 60, 260);
      const minGap2 = 26 * 26;
      for (let tries = 0; nodes.length < target && tries < target * 30; tries++) {
        const p = { x: R() * s.W, y: top + R() * (bottom - top), glow: 0, port: false };
        if (nodes.some(q => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < minGap2)) continue;
        nodes.push(p);
      }
      const port = (x, y) => { const p = { x, y, glow: 0, port: true }; nodes.push(p); return p; };
      const cardPorts = cards.map(c => ({
        top: port(c.x + c.w / 2, c.y),
        bottom: port(c.x + c.w / 2, c.y + c.h),
        left: port(c.x, c.y + c.h / 2),
        right: port(c.x + c.w, c.y + c.h / 2),
      }));
      const groupPorts = groups.map(g => port(g.x + g.w / 2, g.y));

      // Each node links to its three nearest neighbours (ports only to genes).
      const n = nodes.length;
      const adj = nodes.map(() => []);
      const edges = [];
      for (let i = 0; i < n; i++) {
        const near = [];
        for (let j = 0; j < n; j++) {
          if (j === i || (nodes[i].port && nodes[j].port)) continue;
          near.push([(nodes[i].x - nodes[j].x) ** 2 + (nodes[i].y - nodes[j].y) ** 2, j]);
        }
        near.sort((a, b) => a[0] - b[0]);
        for (let k = 0; k < Math.min(3, near.length); k++) {
          const j = near[k][1];
          if (k > 0 && near[k][0] > 150 * 150) break;
          if (adj[i].includes(j)) continue;
          adj[i].push(j); adj[j].push(i);
          edges.push([i, j]);
        }
      }
      const bfs = (a, b) => {
        const prev = new Array(n).fill(-1);
        prev[a] = a;
        const queue = [a];
        for (let h = 0; h < queue.length && prev[b] < 0; h++) {
          for (const v of adj[queue[h]]) if (prev[v] < 0) { prev[v] = queue[h]; queue.push(v); }
        }
        if (prev[b] < 0) return null;
        const path = [b];
        while (path[0] !== a) path.unshift(prev[path[0]]);
        return path;
      };
      const routes = [];
      const addRoute = (card, from, to) => {
        const path = bfs(nodes.indexOf(from), nodes.indexOf(to));
        if (path && path.length > 1) routes.push({ card, path });
      };
      cardPorts.forEach((cp, i) => {
        if (groupPorts[i]) addRoute(i, cp.bottom, groupPorts[i]);
        if (cardPorts[i + 1]) addRoute(i, cp.right, cardPorts[i + 1].left);
        addRoute(i, cp.top, cardPorts[(i + 1) % cardPorts.length].top);
      });
      this.routeEdges = cards.map((_, i) => {
        const keys = new Set();
        for (const r of routes) if (r.card === i) for (let k = 1; k < r.path.length; k++) keys.add(`${Math.min(r.path[k - 1], r.path[k])}-${Math.max(r.path[k - 1], r.path[k])}`);
        return keys;
      });
      Object.assign(this, { nodes, edges, adj, routes, pulses: [] });
    },

    launch(path, bright) {
      const pts = path.map(i => this.nodes[i]);
      const cum = [0];
      for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
      this.pulses.push({ path, pts, cum, d: 0, next: 1, bright });
    },

    randomWalk() {
      const start = (Math.random() * this.nodes.length) | 0;
      const path = [start];
      for (let k = 0; k < 6; k++) {
        const opts = this.adj[path[path.length - 1]].filter(v => !path.includes(v));
        if (!opts.length) break;
        path.push(opts[(Math.random() * opts.length) | 0]);
      }
      return path;
    },

    draw(s, dt) {
      const { ctx } = s;
      const { nodes, edges } = this;
      if (!nodes.length) return;

      // Spawn signals: along routes (more from the hovered card) and short random walks.
      this.spawn -= dt;
      if (dt && this.spawn <= 0) {
        this.spawn = this.active >= 0 ? 0.16 : 0.42;
        const own = this.routes.filter(r => r.card === this.active);
        if (own.length && Math.random() < 0.8) this.launch(own[(Math.random() * own.length) | 0].path, 1);
        else if (this.routes.length && Math.random() < 0.5) this.launch(this.routes[(Math.random() * this.routes.length) | 0].path, 0.85);
        else this.launch(this.randomWalk(), 0.5);
      }

      // Base mesh.
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(VIOLET, 0.09);
      ctx.beginPath();
      for (const [i, j] of edges) { ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); }
      ctx.stroke();

      // Hovered card's routes fade in; with reduced motion all routes stay softly lit.
      if (this.active >= 0) this.hlCard = this.active;
      this.highlight = dt ? clamp(this.highlight + (this.active >= 0 ? dt * 3 : -dt * 2)) : this.highlight;
      const lit = reduceMotion ? this.routeEdges.flatMap(set => [...set]) : this.hlCard >= 0 && this.highlight > 0 ? [...this.routeEdges[this.hlCard]] : [];
      if (lit.length) {
        ctx.strokeStyle = rgba(VIOLET, reduceMotion ? 0.22 : 0.32 * this.highlight);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (const key of lit) {
          const [i, j] = key.split('-').map(Number);
          ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
        }
        ctx.stroke();
      }

      // Signals with a short fading tail.
      const SPEED = 170, TAIL = 46;
      for (let p = this.pulses.length - 1; p >= 0; p--) {
        const q = this.pulses[p];
        q.d += SPEED * dt;
        const total = q.cum[q.cum.length - 1];
        while (q.next < q.pts.length && q.cum[q.next] <= q.d) { q.pts[q.next].glow = q.bright; q.next++; }
        if (q.d - TAIL > total) { this.pulses.splice(p, 1); continue; }
        const along = d => {
          d = clamp(d, 0, total);
          let k = 1;
          while (k < q.cum.length - 1 && q.cum[k] < d) k++;
          const f = (d - q.cum[k - 1]) / ((q.cum[k] - q.cum[k - 1]) || 1);
          return [lerp(q.pts[k - 1].x, q.pts[k].x, f), lerp(q.pts[k - 1].y, q.pts[k].y, f)];
        };
        const head = along(q.d), tail = along(q.d - TAIL);
        const grad = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
        grad.addColorStop(0, rgba(VIOLET, 0));
        grad.addColorStop(1, rgba(VIOLET, 0.7 * q.bright));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tail[0], tail[1]);
        for (let k = 1; k < q.pts.length; k++) if (q.cum[k] > q.d - TAIL && q.cum[k] < q.d) ctx.lineTo(q.pts[k].x, q.pts[k].y);
        ctx.lineTo(head[0], head[1]);
        ctx.stroke();
        if (q.d <= total) {
          ctx.fillStyle = rgba([237, 237, 242], 0.9 * q.bright);
          ctx.shadowColor = rgba(VIOLET, q.bright);
          ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(head[0], head[1], 1.9, 0, TAU); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Nodes: genes are small dots, ports are larger and glow when signals arrive.
      for (const nd of nodes) {
        nd.glow = Math.max(0, nd.glow - dt * 1.4);
        const r = nd.port ? 2.6 : 1.5;
        ctx.fillStyle = rgba(VIOLET, (nd.port ? 0.45 : 0.28) + 0.7 * nd.glow);
        if (nd.glow > 0.05) { ctx.shadowColor = rgba(VIOLET, nd.glow); ctx.shadowBlur = 12 * nd.glow; }
        ctx.beginPath(); ctx.arc(nd.x, nd.y, r + nd.glow * 1.2, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
      }
    },
  };

  // ── 3. Contact: a mitochondrion powering the call to action ─
  // Outer membrane, folded inner membrane (cristae), matrix granules, and
  // ATP drifting up. Hovering a button briefly raises ATP output.
  const ctaMito = {
    atp: [], boost: 0, spawn: 0,

    init(canvas) {
      canvas.parentElement.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => { this.boost = 1; });
      });
    },

    layout(s) {
      const R = rng(31);
      const cw = s.W * 0.9;
      const ch = Math.min(s.H * 0.74, cw * 0.34);
      this.geo = { cx: s.W / 2, cy: s.H * 0.52, cw, ch };
      const folds = Math.max(6, Math.round(cw / 70));
      this.folds = Array.from({ length: folds }, (_, i) => ({
        f: (i + 0.5 + (R() - 0.5) * 0.35) / folds, depth: 0.42 + R() * 0.3, ph: R() * TAU, top: i % 2 === 0,
      }));
      this.granules = Array.from({ length: 36 }, () => ({ x: R(), y: R(), r: 0.8 + R() * 1.4 }));
      this.atp = [];
    },

    draw(s, dt) {
      const { ctx, t } = s;
      const { cx, cy, cw, ch } = this.geo;
      const x0 = cx - cw / 2, y0 = cy - ch / 2;
      const pad = Math.max(8, ch * 0.06);
      const ix = x0 + pad, iy = y0 + pad, iw = cw - 2 * pad, ih = ch - 2 * pad;
      const breathe = 1 + 0.012 * Math.sin(t * 0.9);
      const tips = [];

      ctx.save();
      ctx.translate(cx, cy); ctx.scale(breathe, breathe); ctx.translate(-cx, -cy);
      ctx.beginPath(); ctx.roundRect(x0, y0, cw, ch, ch / 2);
      ctx.fillStyle = rgba(VIOLET_DEEP, 0.05); ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = rgba(VIOLET, 0.32);
      ctx.shadowColor = rgba(VIOLET, 0.5); ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.save();
      ctx.beginPath(); ctx.roundRect(ix, iy, iw, ih, ih / 2);
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(VIOLET, 0.14); ctx.stroke();
      ctx.clip();
      const r = Math.min(10, (iw / this.folds.length) * 0.22);
      ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(VIOLET, 0.22);
      ctx.beginPath();
      for (const fold of this.folds) {
        const x = ix + iw * fold.f;
        const wob = Math.sin(t * 0.8 + fold.ph) * 3;
        if (fold.top) {
          const yt = iy + ih * fold.depth + wob;
          ctx.moveTo(x, iy - 2); ctx.lineTo(x, yt - r); ctx.arc(x + r, yt - r, r, Math.PI, 0, true); ctx.lineTo(x + 2 * r, iy - 2);
          tips.push([x + r, yt]);
        } else {
          const yt = iy + ih * (1 - fold.depth) + wob;
          ctx.moveTo(x, iy + ih + 2); ctx.lineTo(x, yt + r); ctx.arc(x + r, yt + r, r, Math.PI, 0, false); ctx.lineTo(x + 2 * r, iy + ih + 2);
          tips.push([x + r, yt]);
        }
      }
      ctx.stroke();
      ctx.fillStyle = rgba(VIOLET, 0.12);
      for (const g of this.granules) { ctx.beginPath(); ctx.arc(ix + g.x * iw, iy + g.y * ih, g.r, 0, TAU); ctx.fill(); }
      ctx.restore();   // inner-membrane clip
      ctx.restore();   // breathing transform

      // Fade the drawing behind the headline and buttons so the text stays
      // clean: an elliptical eraser centred on the panel.
      const rx = cw * 0.42, ry = ch * 0.8;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      const veil = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      veil.addColorStop(0, 'rgba(0,0,0,0.85)');
      veil.addColorStop(0.6, 'rgba(0,0,0,0.6)');
      veil.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = veil;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();

      // ATP rising from the cristae.
      this.boost = Math.max(0, this.boost - dt * 0.6);
      this.spawn -= dt;
      if (dt && this.spawn <= 0 && tips.length) {
        this.spawn = this.boost > 0.05 ? 0.05 : 0.2;
        const [tx, ty] = tips[(Math.random() * tips.length) | 0];
        this.atp.push({ x: tx, y: ty, vx: (Math.random() - 0.5) * 10, vy: -(14 + Math.random() * 22), life: 0 });
      }
      for (let i = this.atp.length - 1; i >= 0; i--) {
        const p = this.atp[i];
        p.life += dt / 5;
        if (p.life >= 1) { this.atp.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        const a = Math.sin(Math.PI * p.life) * 0.55;
        ctx.fillStyle = rgba([237, 237, 242], a);
        ctx.shadowColor = rgba(VIOLET, a); ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, TAU); ctx.fill();
      }
      ctx.shadowBlur = 0;
    },
  };

  // ── Wire up ────────────────────────────────────────────────
  const defs = [
    ['hero-scope', heroScope, { maxDpr: 1.5 }],
    ['research-net', researchNet, {}],
    ['cta-mito', ctaMito, {}],
  ];
  for (const [id, api, opts] of defs) {
    const canvas = document.getElementById(id);
    if (!canvas || !canvas.getContext || !window.ResizeObserver || !window.IntersectionObserver) continue;
    if (api.init) api.init(canvas);
    api.scene = addScene(canvas, api, opts);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => scenes.forEach(s => s.relayout()));
  if (!reduceMotion) requestAnimationFrame(tick);
})();

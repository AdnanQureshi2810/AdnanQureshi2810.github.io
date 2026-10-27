/* ============================================
   Personal Website v4 — Motion graphics
   Research gene network · Contact mitochondrion
   ============================================ */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Helpers ────────────────────────────────────────────────
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const VIOLET = [167, 139, 250];
  const VIOLET_DEEP = [139, 92, 246];
  // Seeded PRNG so layouts are stable between visits.
  const rng = seed => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

  // ── Research: one gene/pathway network under the section ─
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

  // ── Contact: a textbook mitochondrion behind the call to action ─
  // Drawn the way biology textbooks show it: a smooth double-line outer
  // membrane, an intermembrane space, and an inner membrane that folds into
  // irregular cristae (different depths, widths, leans and swollen tips)
  // around a matrix holding ribosomes, granules and circular mtDNA. ATP
  // drifts up from the cristae; hovering a button raises the output.

  // Rounded-capsule half-height at position u ∈ [-1, 1] along the long axis.
  const capsule = u => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.4)), 1 / 2.4);
  // Membrane half-height with a little low-frequency irregularity per side.
  const memHalf = (m, u, side) => m.ry * capsule(u) *
    (1 + 0.035 * Math.sin(u * 3.1 + m.n1 + side * 1.7) + 0.025 * Math.sin(u * 5.3 + m.n2 - side * 2.3));

  const ctaMito = {
    atp: [], boost: 0, spawn: 0, tips: [],

    init(canvas) {
      canvas.parentElement.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => { this.boost = 1; });
      });
    },

    layout(s) {
      const R = rng(31);
      const cw = s.W * 0.9;
      const ch = Math.min(s.H * 0.74, cw * 0.34);
      const cx = s.W / 2, cy = s.H * 0.52;
      const gap = Math.max(5, ch * 0.065);                    // intermembrane space
      const outer = { rx: cw / 2, ry: ch / 2, n1: R() * TAU, n2: R() * TAU };
      const inner = { rx: cw / 2 - gap, ry: ch / 2 - gap, n1: R() * TAU, n2: R() * TAU };
      this.geo = { cx, cy, cw, ch, outer, inner };

      // Cristae alternate top and bottom across the middle of the organelle.
      const span = inner.rx * 1.55;
      const count = Math.max(5, Math.round(span / 52));
      const spacing = span / count;
      const baseY = (x, top) => {
        const u = (x - cx) / inner.rx;
        return top ? cy - memHalf(inner, u, 0) : cy + memHalf(inner, u, 1);
      };
      this.folds = Array.from({ length: count }, (_, i) => {
        const top = i % 2 === 0;
        const x = cx - span / 2 + spacing * (i + 0.5) + (R() - 0.5) * spacing * 0.3;
        const u = (x - cx) / inner.rx;
        const height = memHalf(inner, u, 0) + memHalf(inner, u, 1);
        const depth = height * (0.34 + R() * 0.46);
        return {
          x, top, depth, y0: baseY(x, top),
          hw: clamp(ch * (0.022 + R() * 0.026), 2.4, 8),
          lean: (R() - 0.5) * 2 * ((spacing * 0.28) / depth),
          bulge: R() < 0.4 ? 0.4 + R() * 0.7 : R() * 0.15,     // some cristae swell at the tip
          wob: 0.8 + R() * 2.2, k: 0.8 + R() * 1.6, ph: R() * TAU,
        };
      });

      // Matrix contents, placed only where no crista passes.
      const inMatrix = (x, y, pad) => {
        const u = (x - cx) / inner.rx;
        if (Math.abs(u) > 0.92) return false;
        if (y < cy - memHalf(inner, u, 0) + pad || y > cy + memHalf(inner, u, 1) - pad) return false;
        return this.folds.every(f => {
          const sAlong = f.top ? (y - f.y0) / f.depth : (f.y0 - y) / f.depth;
          if (sAlong < -0.1 || sAlong > 1.2) return true;
          const c = f.x + f.lean * clamp(sAlong) * f.depth;
          return Math.abs(x - c) > f.hw * (1 + f.bulge) + f.wob + pad;
        });
      };
      const place = (n, pad, make) => {
        const out = [];
        for (let tries = 0; out.length < n && tries < n * 60; tries++) {
          const x = cx + (R() * 2 - 1) * inner.rx, y = cy + (R() * 2 - 1) * inner.ry;
          if (inMatrix(x, y, pad)) out.push(make(x, y));
        }
        return out;
      };
      const scale = clamp(ch / 120, 0.6, 1.6);
      this.ribosomes = place(Math.round(cw / 16), 4, (x, y) => ({ x, y, r: (0.7 + R() * 0.8) * scale, ph: R() * TAU }));
      this.granules = place(Math.max(2, Math.round(cw / 220)), 8, (x, y) => ({ x, y, r: (2.2 + R() * 1.4) * scale }));
      this.dna = place(Math.max(2, Math.round(cw / 300)), 12 * scale, (x, y) => ({
        x, y, r: (5 + R() * 3) * scale, rot: R() * TAU, spin: (R() - 0.5) * 0.3,
        bumps: Array.from({ length: 3 }, () => [1 + ((R() * 3) | 0), R() * 0.18, R() * TAU]),
      }));
      this.atp = [];
    },

    // One crista: down the entry wall, round the tip, back up the exit wall.
    fold(pts, f, side, t) {
      const dir = side === 0 ? 1 : -1;                         // top folds hang down, bottom folds rise
      const entry = side === 0 ? -1 : 1;                       // tracing runs left→right on top, right→left below
      const M = 14;
      const wall = (sAlong, sign) => {
        const sway = Math.sin(sAlong * Math.PI * f.k + f.ph + t * 0.6) * f.wob * sAlong;
        const c = f.x + f.lean * sAlong * f.depth + sway;
        const w = f.hw * (1 + f.bulge * sAlong * sAlong);
        return [c + sign * w, f.y0 + dir * sAlong * f.depth];
      };
      pts.push([f.x + entry * f.hw, f.y0]);
      for (let k = 1; k <= M; k++) pts.push(wall(k / M, entry));
      const tip = wall(1, 0), tipR = f.hw * (1 + f.bulge);
      for (let k = 1; k < 9; k++) {
        const a = (Math.PI * k) / 9;
        const ang = entry === -1 ? Math.PI - a : a;
        pts.push([tip[0] + Math.cos(ang) * tipR, tip[1] + dir * Math.sin(ang) * tipR]);
      }
      for (let k = M; k >= 1; k--) pts.push(wall(k / M, -entry));
      pts.push([f.x - entry * f.hw, f.y0]);
      this.tips.push(tip);
    },

    // Closed outline of a membrane, with cristae spliced into the inner one.
    trace(m, folds, t) {
      const { cx, cy } = this.geo;
      const N = 150;
      const us = Array.from({ length: N + 1 }, (_, k) => -Math.cos((Math.PI * k) / N));  // denser at the ends
      const pts = [];
      const edge = side => {
        const list = folds ? folds.filter(f => f.top === (side === 0)).sort((a, b) => (side === 0 ? a.x - b.x : b.x - a.x)) : [];
        const order = side === 0 ? us : [...us].reverse();
        let next = 0, skipTo = null;
        for (const u of order) {
          const x = cx + m.rx * u;
          if (skipTo !== null) {
            if (side === 0 ? x <= skipTo : x >= skipTo) continue;
            skipTo = null;
          }
          const f = list[next];
          if (f && (side === 0 ? x >= f.x - f.hw : x <= f.x + f.hw)) {
            this.fold(pts, f, side, t);
            skipTo = side === 0 ? f.x + f.hw : f.x - f.hw;
            next++;
            continue;
          }
          pts.push([x, side === 0 ? cy - memHalf(m, u, 0) : cy + memHalf(m, u, 1)]);
        }
      };
      edge(0);
      edge(1);
      const path = new Path2D();
      path.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) path.lineTo(pts[k][0], pts[k][1]);
      path.closePath();
      return path;
    },

    draw(s, dt) {
      const { ctx, t } = s;
      const { cx, cy, cw, ch, outer, inner } = this.geo;
      this.tips = [];

      ctx.save();
      const breathe = 1 + 0.01 * Math.sin(t * 0.9);
      ctx.translate(cx, cy); ctx.scale(breathe, breathe); ctx.translate(-cx, -cy);
      const outerPath = this.trace(outer, null, t);
      const innerPath = this.trace(inner, this.folds, t);

      // Intermembrane space, then the slightly brighter matrix.
      ctx.fillStyle = rgba(VIOLET_DEEP, 0.07);
      ctx.fill(outerPath);
      ctx.fillStyle = rgba(VIOLET, 0.075);
      ctx.fill(innerPath);

      // Membranes as textbook double lines: a wide stroke with a dark core.
      ctx.lineJoin = 'round';
      const membrane = (path, strength, glow) => {
        if (glow) { ctx.shadowColor = rgba(VIOLET, 0.45); ctx.shadowBlur = 16; }
        ctx.lineWidth = 4.4;
        ctx.strokeStyle = rgba(VIOLET, 0.36 * strength);
        ctx.stroke(path);
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.7;
        ctx.strokeStyle = 'rgba(26,21,44,0.92)';
        ctx.stroke(path);
      };
      membrane(outerPath, 1, true);
      membrane(innerPath, 0.85, false);

      // Matrix contents.
      ctx.fillStyle = rgba(VIOLET, 0.3);
      for (const r of this.ribosomes) {
        ctx.beginPath();
        ctx.arc(r.x + Math.sin(t * 0.7 + r.ph) * 0.8, r.y + Math.cos(t * 0.6 + r.ph) * 0.8, r.r, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = rgba(VIOLET, 0.16);
      ctx.strokeStyle = rgba(VIOLET, 0.3);
      ctx.lineWidth = 1;
      for (const g of this.granules) {
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.fill(); ctx.stroke();
      }
      ctx.strokeStyle = rgba(VIOLET, 0.34);
      for (const d of this.dna) {
        const rot = d.rot + t * d.spin;
        ctx.beginPath();
        for (let k = 0; k <= 28; k++) {
          const a = (k / 28) * TAU;
          let rr = d.r;
          for (const [freq, amp, ph] of d.bumps) rr += d.r * amp * Math.sin(a * freq + ph);
          const px = d.x + Math.cos(a + rot) * rr, py = d.y + Math.sin(a + rot) * rr;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Fade the drawing behind the headline and buttons so the text stays
      // clean: an elliptical eraser centred on the panel.
      const rx = cw * 0.42, ry = ch * 0.8;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      const veil = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      veil.addColorStop(0, 'rgba(0,0,0,0.8)');
      veil.addColorStop(0.6, 'rgba(0,0,0,0.55)');
      veil.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = veil;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();

      // ATP rising from the cristae tips.
      this.boost = Math.max(0, this.boost - dt * 0.6);
      this.spawn -= dt;
      if (dt && this.spawn <= 0 && this.tips.length) {
        this.spawn = this.boost > 0.05 ? 0.05 : 0.2;
        const [tx, ty] = this.tips[(Math.random() * this.tips.length) | 0];
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

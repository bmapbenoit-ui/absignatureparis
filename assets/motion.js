/* ═══════════════════════════════════════════════════════════════════════
   SIGNATURE MOTION v3 — AB Signature Paris (STELLA 09/07/2026)
   « Le voyage se marche. » — décision Benoit 09/07 : la ligne d'or est
   remplacée par des EMPREINTES DE PAS dans le sable qui vont d'une île à
   l'autre (discontinues, révélées pas à pas au défilement), le curseur
   devient une empreinte, le flacon PIVOTE réellement au fil du scroll
   (recto → verso gravé), et la couleur de l'île suivante MONTE COMME UNE
   MARÉE entre deux chapitres.
   Un seul rythme : une boucle rAF, uniquement transform/opacity,
   tout s'éteint avec prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  /* ── Fil d'or de progression (fin, en haut — conservé) ───────────────── */
  const progress = document.createElement('div');
  progress.className = 'gold-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  if (REDUCED) {
    addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    }, { passive: true });
    return;
  }

  /* ── Lecture vidéo garantie (Safari économie d'énergie → flèche ▶) ───── */
  const kickVideos = () => {
    document.querySelectorAll('video[autoplay], .hero video').forEach((v) => {
      if (v.paused) v.play().catch(() => {});
    });
  };
  ['wheel', 'touchstart', 'pointerdown', 'keydown', 'scroll'].forEach((ev) =>
    addEventListener(ev, kickVideos, { once: true, passive: true }));
  setTimeout(kickVideos, 1500);
  setTimeout(kickVideos, 4000);

  /* ── Reflet d'or périodique du logo hero (calé sur la boîte de l'img) ── */
  const heroLogo = document.querySelector('.hero-logo');
  const heroInner = document.querySelector('.hero-inner');
  if (heroLogo && heroInner) {
    const sheen = document.createElement('div');
    sheen.className = 'hero-sheen';
    sheen.style.setProperty('--hero-logo-url', `url("${heroLogo.src}")`);
    heroInner.appendChild(sheen);
    const placeSheen = () => {
      sheen.style.left = heroLogo.offsetLeft + 'px';
      sheen.style.top = heroLogo.offsetTop + 'px';
      sheen.style.width = heroLogo.offsetWidth + 'px';
      sheen.style.height = heroLogo.offsetHeight + 'px';
    };
    placeSheen();
    heroLogo.addEventListener('load', placeSheen);
    addEventListener('load', placeSheen);
    addEventListener('resize', placeSheen, { passive: true });
  }

  /* ── Manifeste : mots éclairés au fil du défilement ──────────────────── */
  const lead = document.querySelector('.manifesto .lead');
  let words = [];
  if (lead) {
    const wrap = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3 && n.textContent.trim()) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'SPAN') wrap(n);
      });
    };
    wrap(lead);
    words = [...lead.querySelectorAll('.w')];
  }

  /* ── Noms de parfums : composés lettre à lettre ──────────────────────── */
  document.querySelectorAll('.ch-txt h2.name').forEach((h) => {
    const txt = h.textContent;
    h.textContent = '';
    [...txt].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ltr';
      s.style.transitionDelay = (0.15 + i * 0.07).toFixed(2) + 's';
      // Espace INSÉCABLE : un espace normal dans un span inline-block
      // s'effondre (constaté : « OroRojo » collé).
      s.textContent = ch === ' ' ? ' ' : ch;
      h.appendChild(s);
    });
  });

  /* ── Poussière d'or (canvas 2D) ──────────────────────────────────────── */
  const dust = document.createElement('canvas');
  dust.className = 'gold-dust';
  dust.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dust);
  const dctx = dust.getContext('2d');
  let parts = [];
  const seedDust = () => {
    dust.width = innerWidth * devicePixelRatio;
    dust.height = innerHeight * devicePixelRatio;
    const n = FINE ? 42 : 22;
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * dust.width,
      y: Math.random() * dust.height,
      r: (Math.random() * 1.4 + 0.5) * devicePixelRatio,
      vx: (Math.random() - 0.5) * 0.12 * devicePixelRatio,
      vy: (-Math.random() * 0.2 - 0.05) * devicePixelRatio,
      tw: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.012 + 0.004,
    }));
  };
  seedDust();
  addEventListener('resize', seedDust, { passive: true });

  /* ── LES PAS DU VOYAGE ────────────────────────────────────────────────────
     Des empreintes de pieds nus, dorées et discrètes, marchent d'une île à
     l'autre dans les marges — révélées pas à pas au fil du défilement,
     alternance pied gauche / pied droit, orientées dans le sens du chemin.
     Le dernier pas atteint le monogramme du pied de page → la signature
     s'embrase. (Remplace la ligne d'or — décision Benoit 09/07.) */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const FOOT_D = 'M8.8 1.6c2.6 0 4.6 2.2 4.9 5.6.3 3.2-.9 6.6-2.2 9.5-1 2.3-1.6 4.4-1.6 6.2 0 2.1-1 3.5-2.6 3.5s-2.8-1.3-2.9-3.4c-.1-1.8-.5-3.9-1.3-6.3-1-3-1.9-6.4-1.4-9.6C2.2 3.7 4 1.6 6.6 1.6Z';
  const TOES = [[3.1, 1.9, 1.15], [5.9, 0.6, 1.0], [8.6, 0.2, 0.95], [11.2, 0.7, 0.9], [13.5, 1.9, 0.8]];
  const trail = { svg: null, steps: [], top: 0, bottom: 0 };
  const flogo = document.querySelector('footer .flogo');
  const kares = document.querySelector('.ch-kares');

  const buildTrail = () => {
    const hero = document.querySelector('.hero');
    const foot = flogo || document.querySelector('footer');
    if (!hero || !foot) return;
    const W = innerWidth, H = document.documentElement.scrollHeight;
    const abs = (el) => { const r = el.getBoundingClientRect(); return { top: scrollY + r.top, h: r.height }; };
    const pts = [];
    const hr = abs(hero);
    pts.push([W * 0.5, hr.top + hr.h * 0.88]);
    const man = document.querySelector('.manifesto');
    if (man) { const r = abs(man); pts.push([W * 0.44, r.top + r.h * 0.5]); }
    [...document.querySelectorAll('.chapter')].forEach((c, i) => {
      const r = abs(c);
      const x = i % 2 === 0 ? W * 0.955 : W * 0.045;
      pts.push([x, r.top + r.h * 0.28]);
      pts.push([x, r.top + r.h * 0.72]);
    });
    const mais = document.querySelector('#maison, .maison');
    if (mais) { const r = abs(mais); pts.push([W * 0.07, r.top + r.h * 0.5]); }
    const fr = abs(foot);
    const endY = fr.top + fr.h * 0.5;
    pts.push([W * 0.5, endY - 120]);
    pts.push([W * 0.5, endY - 18]);
    let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    if (!trail.svg) {
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('class', 'sig-steps');
      svg.setAttribute('aria-hidden', 'true');
      const defs = document.createElementNS(SVGNS, 'defs');
      const sym = document.createElementNS(SVGNS, 'g');
      sym.setAttribute('id', 'abs-foot');
      const sole = document.createElementNS(SVGNS, 'path');
      sole.setAttribute('d', FOOT_D);
      sym.appendChild(sole);
      TOES.forEach(([cx, cy, r]) => {
        const t = document.createElementNS(SVGNS, 'circle');
        t.setAttribute('cx', cx); t.setAttribute('cy', cy); t.setAttribute('r', r);
        sym.appendChild(t);
      });
      defs.appendChild(sym);
      svg.appendChild(defs);
      document.body.appendChild(svg);
      trail.svg = svg;
    }
    trail.svg.setAttribute('width', W);
    trail.svg.setAttribute('height', H);
    trail.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Échantillonnage du chemin (invisible) en PAS espacés
    const probe = document.createElementNS(SVGNS, 'path');
    probe.setAttribute('d', d);
    trail.svg.appendChild(probe);
    const len = probe.getTotalLength();
    const STEP = Math.max(96, Math.min(150, len / 90)); // ~60-90 pas au total
    trail.steps.forEach((s) => s.el.remove());
    trail.steps = [];
    const karR = kares ? abs(kares) : null;
    for (let l = STEP * 0.5, i = 0; l < len - 30; l += STEP, i++) {
      const p = probe.getPointAtLength(l);
      const q = probe.getPointAtLength(Math.min(len, l + 14));
      const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI + 90; // pointe du pied vers l'avant
      const side = i % 2 === 0 ? 1 : -1; // pied droit / pied gauche
      const nx = -(q.y - p.y), ny = (q.x - p.x); // normale
      const nl = Math.hypot(nx, ny) || 1;
      const ox = (nx / nl) * 9 * side, oy = (ny / nl) * 9 * side;
      const g = document.createElementNS(SVGNS, 'use');
      g.setAttribute('href', '#abs-foot');
      g.setAttribute('class', 'foot');
      const mirror = side === 1 ? '' : ' scale(-1,1)';
      g.setAttribute('transform',
        `translate(${(p.x + ox).toFixed(1)},${(p.y + oy).toFixed(1)}) rotate(${ang.toFixed(1)})${mirror} scale(0.62) translate(-8,-14)`);
      // Île claire (Karès) : empreinte encre dorée sombre, sinon or
      if (karR && p.y > karR.top && p.y < karR.top + karR.h) g.setAttribute('fill', '#8a6d1f');
      else g.setAttribute('fill', '#e8c76a');
      trail.svg.appendChild(g);
      trail.steps.push({ el: g, on: false });
    }
    probe.remove();
    trail.top = pts[0][1];
    trail.bottom = endY;
  };
  let btTimer = 0, lastDocH = 0;
  addEventListener('load', buildTrail);
  addEventListener('resize', () => { clearTimeout(btTimer); btTimer = setTimeout(buildTrail, 200); }, { passive: true });
  setInterval(() => {
    const h = document.documentElement.scrollHeight;
    if (h !== lastDocH) { lastDocH = h; buildTrail(); }
  }, 2500);
  buildTrail();

  /* ── FLACONS QUI PIVOTENT au fil du scroll (recto → verso gravé) ─────── */
  const flips = [...document.querySelectorAll('.chapter')].map((c) => ({
    sec: c, faces: c.querySelector('.arch .faces'),
  })).filter((f) => f.faces);

  /* ── MARÉES D'ÎLE : la couleur du chapitre suivant monte entre deux îles ── */
  const TIDE_COLORS = { 'ch-oro': '72,0,0', 'ch-kares': '212,205,180', 'ch-ahi': '1,42,40' };
  const tide = document.createElement('div');
  tide.className = 'island-tide';
  tide.setAttribute('aria-hidden', 'true');
  const tideInner = document.createElement('div');
  tide.appendChild(tideInner);
  document.body.appendChild(tide);
  let tideBounds = [];
  const buildTide = () => {
    tideBounds = [];
    const chs = [...document.querySelectorAll('.chapter')];
    for (const c of chs) {
      const key = [...c.classList].find((k) => TIDE_COLORS[k]);
      if (!key) continue;
      const r = c.getBoundingClientRect();
      tideBounds.push({ y: scrollY + r.top, rgb: TIDE_COLORS[key] });
    }
  };
  addEventListener('load', buildTide);
  addEventListener('resize', () => setTimeout(buildTide, 220), { passive: true });
  setInterval(buildTide, 2600);
  buildTide();

  /* ── Relief 3D des médaillons + CTA magnétiques (desktop) ────────────── */
  const arches = [...document.querySelectorAll('.arch')].map((el) => ({ el, rx: 0, ry: 0, trx: 0, try_: 0 }));
  const magnets = [...document.querySelectorAll('.buy .btn, nav a.bag')].map((el) => ({ el, x: 0, y: 0, tx: 0, ty: 0 }));
  if (FINE) {
    arches.forEach((a) => {
      a.el.addEventListener('pointermove', (e) => {
        const r = a.el.getBoundingClientRect();
        a.try_ = ((e.clientX - r.left) / r.width - 0.5) * 9;
        a.trx = -((e.clientY - r.top) / r.height - 0.5) * 7;
      });
      a.el.addEventListener('pointerleave', () => { a.trx = 0; a.try_ = 0; });
    });
    magnets.forEach((m) => {
      m.el.classList.add('magnetic');
      m.el.addEventListener('pointermove', (e) => {
        const r = m.el.getBoundingClientRect();
        m.tx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        m.ty = (e.clientY - (r.top + r.height / 2)) * 0.3;
      });
      m.el.addEventListener('pointerleave', () => { m.tx = 0; m.ty = 0; });
    });
  }

  /* ── Boucle unique ───────────────────────────────────────────────────── */
  const heroVideo = document.querySelector('.hero video');
  const chapterVids = [...document.querySelectorAll('.chapter video.bgv')];
  let lastLit = -1, lastSteps = -1;
  const tick = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    // Hero : profondeur douce
    if (heroVideo && y < innerHeight * 1.2) {
      heroVideo.style.transform = `translateY(${y * 0.16}px) scale(1.06)`;
      if (heroInner) {
        heroInner.style.transform = `translateY(${y * 0.3}px)`;
        heroInner.style.opacity = String(Math.max(0, 1 - y / (innerHeight * 0.85)));
      }
    }

    // Vidéos de chapitre : parallaxe contenue
    for (const v of chapterVids) {
      if (!v.src) continue;
      const r = v.parentElement.getBoundingClientRect();
      if (r.bottom < -80 || r.top > innerHeight + 80) continue;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      v.style.transform = `translateY(${p * -34}px) scale(1.12)`;
    }

    // Manifeste : éclairage progressif des mots
    if (words.length && lead) {
      const r = lead.getBoundingClientRect();
      const p = clamp01((innerHeight * 0.78 - r.top) / (r.height + innerHeight * 0.28));
      const lit = Math.round(p * words.length);
      if (lit !== lastLit) {
        words.forEach((w, i) => w.classList.toggle('lit', i < lit));
        lastLit = lit;
      }
    }

    // LES PAS DU VOYAGE : révélés pas à pas, le dernier signe le monogramme
    if (trail.steps.length) {
      const p = clamp01((y + innerHeight * 0.62 - trail.top) / (trail.bottom - trail.top));
      const n = Math.floor(p * trail.steps.length);
      if (n !== lastSteps) {
        trail.steps.forEach((s, i) => {
          const on = i < n;
          if (on !== s.on) { s.on = on; s.el.classList.toggle('on', on); }
        });
        lastSteps = n;
      }
      if (flogo) flogo.classList.toggle('signed', p > 0.985);
    }

    // FLACONS : pivot recto→verso en quittant l'île (face pendant la lecture)
    for (const f of flips) {
      const r = f.sec.getBoundingClientRect();
      if (r.bottom < -60 || r.top > innerHeight + 60) continue;
      const p = clamp01((innerHeight - r.top) / (innerHeight + r.height));
      let rot = 0;
      if (p > 0.56) rot = 180 * easeInOut(clamp01((p - 0.56) / 0.3));
      f.faces.style.transform = rot > 0.2 ? `perspective(1200px) rotateY(${rot.toFixed(1)}deg)` : '';
    }

    // MARÉE D'ÎLE : la couleur du chapitre suivant monte entre deux sections
    if (tideBounds.length) {
      let best = 0, rgb = null;
      for (const b of tideBounds) {
        // la frontière = le haut du chapitre ; cloche autour de son passage au 2/3 de l'écran
        const d = Math.abs((b.y - y) - innerHeight * 0.66) / (innerHeight * 0.85);
        const v = clamp01(1 - d);
        if (v > best) { best = v; rgb = b.rgb; }
      }
      const o = easeInOut(best) * 0.5;
      if (rgb && o > 0.02) {
        tideInner.style.background = `linear-gradient(to top, rgba(${rgb},${(o).toFixed(3)}) 0%, rgba(${rgb},0) 62%)`;
        tideInner.style.transform = `translateY(${((1 - best) * 30).toFixed(1)}%)`;
        tide.style.opacity = '1';
      } else {
        tide.style.opacity = '0';
      }
    }

    // Médaillons : relief amorti
    for (const a of arches) {
      a.rx = lerp(a.rx, a.trx, 0.09);
      a.ry = lerp(a.ry, a.try_, 0.09);
      if (Math.abs(a.rx) > 0.02 || Math.abs(a.ry) > 0.02)
        a.el.style.transform = `perspective(900px) rotateX(${a.rx.toFixed(2)}deg) rotateY(${a.ry.toFixed(2)}deg)`;
      else if (a.el.style.transform) a.el.style.transform = '';
    }

    // CTA magnétiques
    for (const m of magnets) {
      m.x = lerp(m.x, m.tx, 0.14);
      m.y = lerp(m.y, m.ty, 0.14);
      if (Math.abs(m.x) > 0.05 || Math.abs(m.y) > 0.05)
        m.el.style.transform = `translate(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px)`;
      else if (m.el.style.transform) m.el.style.transform = '';
    }

    // Poussière d'or
    dctx.clearRect(0, 0, dust.width, dust.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.tw += p.ts;
      if (p.y < -6) { p.y = dust.height + 6; p.x = Math.random() * dust.width; }
      if (p.x < -6) p.x = dust.width + 6;
      if (p.x > dust.width + 6) p.x = -6;
      const a = 0.14 + 0.5 * Math.abs(Math.sin(p.tw));
      dctx.beginPath();
      dctx.arc(p.x, p.y, p.r, 0, 6.2832);
      dctx.fillStyle = `rgba(232,199,106,${a.toFixed(3)})`;
      dctx.fill();
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* ═══════════════════════════════════════════════════════════════════════
   SIGNATURE MOTION — AB Signature Paris (STELLA 09/07/2026)
   Un seul rythme : une boucle rAF, des interpolations feutrées (lerp),
   uniquement transform/opacity. Tout s'éteint avec prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── Fil d'or de progression ─────────────────────────────────────────── */
  const progress = document.createElement('div');
  progress.className = 'gold-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  if (REDUCED) {
    // Lecture apaisée : seule la progression (statique) est conservée.
    addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    }, { passive: true });
    return;
  }

  /* ── Masque du reflet hero (le sheen épouse le logo) ─────────────────── */
  const heroLogo = document.querySelector('.hero-logo');
  const heroInner = document.querySelector('.hero-inner');
  if (heroLogo && heroInner) {
    const sheen = document.createElement('div');
    sheen.className = 'hero-sheen';
    // .src (propriété) = URL ABSOLUE — un chemin relatif serait résolu contre
    // motion.css (constaté : /assets/assets/… 404), pas contre la page.
    sheen.style.setProperty('--hero-logo-url', `url("${heroLogo.src}")`);
    heroInner.appendChild(sheen);
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

  /* ── Poussière d'or (canvas 2D — 0 dépendance, ~40 particules) ───────── */
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

  /* ── Relief 3D des médaillons + CTA magnétiques (desktop) ────────────── */
  const arches = [...document.querySelectorAll('.arch')].map((el) => ({ el, rx: 0, ry: 0, trx: 0, try_: 0 }));
  const magnets = [...document.querySelectorAll('.buy .btn, nav a.bag')].map((el) => ({ el, x: 0, y: 0, tx: 0, ty: 0 }));
  if (FINE) {
    arches.forEach((a) => {
      a.el.addEventListener('pointermove', (e) => {
        const r = a.el.getBoundingClientRect();
        a.try_ = ((e.clientX - r.left) / r.width - 0.5) * 9;   // rotateY
        a.trx = -((e.clientY - r.top) / r.height - 0.5) * 7;   // rotateX
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

  /* ── Noms de parfums : composés lettre à lettre ──────────────────────── */
  document.querySelectorAll('.ch-txt h2.name').forEach((h) => {
    const txt = h.textContent;
    h.textContent = '';
    [...txt].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ltr';
      s.style.transitionDelay = (0.15 + i * 0.07).toFixed(2) + 's';
      s.textContent = ch === ' ' ? ' ' : ch;
      h.appendChild(s);
    });
  });

  /* ── LE FIL DE LA SIGNATURE ──────────────────────────────────────────────
     « Suivez la ligne. » — un trait d'or continu, cousu dans les marges,
     se dessine au fil du défilement : il descend du hero, traverse le
     manifeste, longe chaque île en alternant les rives, et vient SIGNER
     le monogramme du pied de page (embrasement à l'arrivée). */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const thread = { svg: null, glow: null, line: null, comet: null, len: 0, top: 0, bottom: 0 };
  const flogo = document.querySelector('footer .flogo');
  const buildThread = () => {
    const hero = document.querySelector('.hero');
    const foot = flogo || document.querySelector('footer');
    if (!hero || !foot) return;
    const W = innerWidth, H = document.documentElement.scrollHeight;
    const abs = (el) => { const r = el.getBoundingClientRect(); return { top: scrollY + r.top, h: r.height }; };
    const pts = [];
    const hr = abs(hero);
    pts.push([W * 0.5, hr.top + hr.h * 0.86]);
    const man = document.querySelector('.manifesto');
    if (man) { const r = abs(man); pts.push([W * 0.5, r.top + r.h * 0.45]); }
    [...document.querySelectorAll('.chapter')].forEach((c, i) => {
      const r = abs(c);
      const x = i % 2 === 0 ? W * 0.958 : W * 0.042;
      pts.push([x, r.top + r.h * 0.26]);
      pts.push([x, r.top + r.h * 0.74]);
    });
    const mais = document.querySelector('#maison, .maison');
    if (mais) { const r = abs(mais); pts.push([W * 0.06, r.top + r.h * 0.5]); }
    const fr = abs(foot);
    const endY = fr.top + fr.h * 0.5;
    pts.push([W * 0.5, endY - 110]);
    pts.push([W * 0.5, endY]);
    // Catmull-Rom → courbes cubiques (le fil ondule, jamais d'angle)
    let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    if (!thread.svg) {
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('class', 'sig-thread');
      svg.setAttribute('aria-hidden', 'true');
      const glow = document.createElementNS(SVGNS, 'path');
      glow.setAttribute('class', 'sig-thread-glow');
      const line = document.createElementNS(SVGNS, 'path');
      line.setAttribute('class', 'sig-thread-line');
      const comet = document.createElementNS(SVGNS, 'circle');
      comet.setAttribute('class', 'sig-comet');
      comet.setAttribute('r', '2.6');
      comet.style.opacity = '0';
      svg.append(glow, line, comet);
      document.body.appendChild(svg);
      Object.assign(thread, { svg, glow, line, comet });
    }
    thread.svg.setAttribute('width', W);
    thread.svg.setAttribute('height', H);
    thread.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    thread.glow.setAttribute('d', d);
    thread.line.setAttribute('d', d);
    thread.len = thread.line.getTotalLength();
    thread.line.style.strokeDasharray = thread.len;
    thread.glow.style.strokeDasharray = thread.len;
    thread.line.style.strokeDashoffset = thread.len;
    thread.glow.style.strokeDashoffset = thread.len;
    thread.top = pts[0][1];
    thread.bottom = endY;
  };
  let btTimer = 0, lastDocH = 0;
  addEventListener('load', buildThread);
  addEventListener('resize', () => { clearTimeout(btTimer); btTimer = setTimeout(buildThread, 200); }, { passive: true });
  setInterval(() => {
    const h = document.documentElement.scrollHeight;
    if (h !== lastDocH) { lastDocH = h; buildThread(); }
  }, 2500);
  buildThread();

  /* ── Sillage d'encre du curseur (la plume, desktop) ──────────────────── */
  let inkCtx = null, inkPts = [];
  if (FINE) {
    const ink = document.createElement('canvas');
    ink.className = 'ink-trail';
    ink.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ink);
    inkCtx = ink.getContext('2d');
    const sizeInk = () => { ink.width = innerWidth * devicePixelRatio; ink.height = innerHeight * devicePixelRatio; };
    sizeInk();
    addEventListener('resize', sizeInk, { passive: true });
    addEventListener('pointermove', (e) => {
      inkPts.push({ x: e.clientX * devicePixelRatio, y: e.clientY * devicePixelRatio, t: performance.now() });
      if (inkPts.length > 60) inkPts.shift();
    }, { passive: true });
  }

  /* ── Boucle unique ───────────────────────────────────────────────────── */
  const heroVideo = document.querySelector('.hero video');
  const chapterVids = [...document.querySelectorAll('.chapter video.bgv')];
  let lastLit = -1;
  const tick = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    // Hero : profondeur douce (la vidéo retient, le logo précède)
    if (heroVideo && y < innerHeight * 1.2) {
      heroVideo.style.transform = `translateY(${y * 0.16}px) scale(1.06)`;
      if (heroInner) {
        heroInner.style.transform = `translateY(${y * 0.3}px)`;
        heroInner.style.opacity = String(Math.max(0, 1 - y / (innerHeight * 0.85)));
      }
    }

    // Vidéos de chapitre : parallaxe contenue (±5 %)
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
      const p = Math.min(1, Math.max(0, (innerHeight * 0.78 - r.top) / (r.height + innerHeight * 0.28)));
      const lit = Math.round(p * words.length);
      if (lit !== lastLit) {
        words.forEach((w, i) => w.classList.toggle('lit', i < lit));
        lastLit = lit;
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

    // LE FIL DE LA SIGNATURE : le trait se dessine, la pointe d'or le mène
    if (thread.len) {
      const p = Math.min(1, Math.max(0, (y + innerHeight * 0.62 - thread.top) / (thread.bottom - thread.top)));
      const off = thread.len * (1 - p);
      thread.line.style.strokeDashoffset = off;
      thread.glow.style.strokeDashoffset = off;
      if (p > 0.004 && p < 0.996) {
        const pt = thread.line.getPointAtLength(thread.len * p);
        thread.comet.setAttribute('cx', pt.x.toFixed(1));
        thread.comet.setAttribute('cy', pt.y.toFixed(1));
        thread.comet.style.opacity = '1';
      } else {
        thread.comet.style.opacity = '0';
      }
      // Finale : la ligne atteint le monogramme → la signature s'embrase
      if (flogo) flogo.classList.toggle('signed', p > 0.985);
    }

    // Sillage d'encre de la plume (s'évanouit en ~0,55 s)
    if (inkCtx) {
      const now = performance.now();
      inkPts = inkPts.filter((q) => now - q.t < 550);
      inkCtx.clearRect(0, 0, inkCtx.canvas.width, inkCtx.canvas.height);
      for (let i = 1; i < inkPts.length; i++) {
        const a = 1 - (now - inkPts[i].t) / 550;
        inkCtx.beginPath();
        inkCtx.moveTo(inkPts[i - 1].x, inkPts[i - 1].y);
        inkCtx.lineTo(inkPts[i].x, inkPts[i].y);
        inkCtx.strokeStyle = `rgba(232,199,106,${(a * 0.34).toFixed(3)})`;
        inkCtx.lineWidth = (0.4 + a * 1.6) * devicePixelRatio;
        inkCtx.lineCap = 'round';
        inkCtx.stroke();
      }
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

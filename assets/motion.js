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

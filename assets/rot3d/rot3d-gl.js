// Rotation 3D WebGL — flacons AB Signature (progressive enhancement du fallback CSS)
// Corps laqué vitrail (clearcoat + env), bouchon or physique dont les reflets tournent,
// ombre de contact, drag inertiel, flèches ±90°, rendu à la demande.
//
// v16 — 21/07/2026 · FIABILITÉ (incident Benoit : « quelques fois la vue 3D s'affiche
// mal, on dirait une vue à plat »). Le « plat », c'est le fallback CSS resté visible
// parce que la 3D n'a jamais atteint gl-ready. Trois causes structurelles corrigées :
//   1. TextureLoader.load() était appelé SANS callback d'erreur. Une seule des 8 textures
//      qui échoue (réseau, requête annulée par un scroll, timeout) et le compteur reste
//      bloqué sous 8 → gl-ready n'arrive JAMAIS → panneau plat à vie.
//   2. Aucun filet temporel : rien ne révélait la 3D si une texture traînait.
//   3. Les 3 contextes WebGL étaient créés d'un coup au chargement, en concurrence avec
//      la vidéo hero, avec preserveDrawingBuffer:true (framebuffer conservé = mémoire
//      GPU doublée pour rien, personne ne lit les pixels) et PMREMGenerator jamais
//      libéré ×3. Sur Safari/iPhone, la création du renderer peut échouer → catch →
//      fallback plat définitif. Et une perte de contexte laissait un trou vide.
// Corrections : chargement tolérant à l'échec · révélation garantie dès que la face
// AVANT est prête · init paresseuse à l'approche · budget GPU réduit · reprise sur
// perte de contexte.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '/assets/vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from '/assets/vendor/RoomEnvironment.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const BOT_W = 45, BOT_D = 28.5, BOT_H = 88.97, EDGE_R = 0.9;
const CAP_R = 13.9, CAP_H = 17.5, NECK_H = 1.2;

// Au-delà de ce délai, si la face AVANT est prête, on montre la 3D sans attendre les
// autres faces : au repos une seule face est visible, les autres arrivent en coulisse.
const REVEAL_MS = 2600;
// Une texture qui a échoué est retentée une fois — un échec réseau isolé ne doit pas
// coûter la 3D. (Cache-buster pour ne pas retomber sur une entrée de cache corrompue.)
const RETRY_MS = 900;

function makeShadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function initBox(box) {
  const model = box.dataset.model;
  const canvas = document.createElement('canvas');
  canvas.className = 'rgl';
  let renderer;
  try {
    // preserveDrawingBuffer retiré (v16) : aucun readPixels/toDataURL sur ces canvas,
    // et le conserver double la mémoire GPU par contexte — ×3 sur cette page.
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  const envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;  // réservé aux ors (bouchon)
  pm.dispose();   // v16 : la cible de rendu intermédiaire n'a plus lieu d'être gardée

  const camera = new THREE.PerspectiveCamera(24, BOT_W / BOT_H, 10, 900);
  camera.position.set(0, 9, 292);
  camera.lookAt(0, 1, 0);

  const key = new THREE.DirectionalLight(0xfff0cf, 0.3);
  key.position.set(60, 90, 120);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe8e0, 0.06);
  rim.position.set(-80, 40, -60);
  scene.add(rim);


  const group = new THREE.Group();
  scene.add(group);

  let ry = 0, vel = 0, target = null, lastInteract = 0, visible = false, needsRender = true;
  let intro = null, introPlayed = false, pendingIntro = false;

  // ── révélation de la 3D : garantie, jamais suspendue à une seule requête
  let settled = 0; const TEX_TOTAL = 8;   // 4 faces × (couleur + rugosité/métal)
  let frontReady = false, revealed = false, lost = false;

  const loader = new THREE.TextureLoader();
  const P = m => `/assets/rot3d/${model}-${m}.webp?v=10`;
  const renderOnce = () => { group.rotation.y = ry; renderer.render(scene, camera); };
  const startIntro = () => { intro = { start: performance.now(), from: ry, dur: 6000 }; needsRender = true; loop(); };

  const reveal = () => {
    if (revealed || lost) return;
    revealed = true;
    renderOnce();
    box.classList.add('gl-ready');          // le fallback ne s'efface que maintenant
    canvas.style.opacity = '1';
    if (pendingIntro) { pendingIntro = false; startIntro(); }
  };
  // Filet temporel : passé REVEAL_MS on montre la 3D dès que la face AVANT est là.
  // Si elle ne l'est pas, on NE révèle PAS (une boîte sans texture serait pire que le
  // fallback) — on laisse les retries faire leur travail.
  setTimeout(() => { if (frontReady) reveal(); }, REVEAL_MS);

  const bump = () => {
    needsRender = true;
    if (!lost) renderOnce();
    if (++settled >= TEX_TOTAL) reveal();
    else if (frontReady && settled >= TEX_TOTAL - 2) reveal();  // les 2 dernières ne
    // conditionnent qu'une face non visible au repos : inutile de faire attendre.
  };

  // Teinte de laque du flacon, ÉCHANTILLONNÉE sur la face avant une fois chargée —
  // jamais une couleur inventée. Sert de repli si une face perd définitivement sa
  // texture : plutôt qu'un panneau NOIR (défaut constaté au test de panne), la face
  // devient une laque unie à la couleur du flacon. Discret, cohérent, jamais « cassé ».
  let bodyTint = null;
  const orphelines = new Set();          // index des faces privées de texture
  const echantillonner = img => {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 1;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data;
      // La moyenne inclut les rehauts crème et le soleil : elle tire vers le laiteux.
      // On la ramène à la profondeur d'une vraie laque (facteur unique, assumé), la
      // TEINTE restant celle du flacon — aucune couleur inventée.
      const k = 0.62;
      return ((d[0] * k | 0) << 16) | ((d[1] * k | 0) << 8) | (d[2] * k | 0);
    } catch (_) { return null; }
  };
  const neutraliser = idx => {
    const m = mats && mats[idx];
    if (!m || bodyTint === null) return;
    m.map = null; m.emissiveMap = null;
    m.roughnessMap = null; m.metalnessMap = null;
    m.color = new THREE.Color(bodyTint);
    m.emissive = new THREE.Color(bodyTint);
    m.emissiveIntensity = 0.85;
    m.roughness = 0.5; m.metalness = 0.12;
    m.needsUpdate = true;
    needsRender = true; if (!lost) renderOnce();
  };
  const purgerOrphelines = () => { orphelines.forEach(neutraliser); orphelines.clear(); };
  const noterTeinte = img => {
    if (bodyTint !== null || !img) return;
    bodyTint = echantillonner(img);
    if (bodyTint !== null) purgerOrphelines();
  };

  // Chargement tolérant : onLoad ET onError font avancer le compteur, et un échec est
  // retenté une fois. C'est LE correctif du panneau plat.
  const loadTex = (url, mirrorX, linear, isFrontMap, matIdx) => {
    let tex;
    const ok = () => { if (isFrontMap) { frontReady = true; noterTeinte(tex.image); } bump(); };
    const mort = () => {
      // texture définitivement perdue : la face passe en laque unie, jamais en noir
      if (matIdx == null) return;
      if (bodyTint !== null) neutraliser(matIdx); else orphelines.add(matIdx);
    };
    const fail = () => {
      // une seule reprise, avec cache-buster, puis on abandonne cette texture
      setTimeout(() => {
        loader.load(url + '&r=1',
          retry => {
            tex.image = retry.image; tex.needsUpdate = true;
            if (isFrontMap) { frontReady = true; noterTeinte(retry.image); }
            needsRender = true; if (!lost) renderOnce();
            if (frontReady && !revealed) reveal();
          },
          undefined,
          mort);
      }, RETRY_MS);
      bump();   // le compteur avance quand même : plus rien ne peut le bloquer
    };
    tex = loader.load(url, ok, undefined, fail);
    tex.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    if (mirrorX) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1; }
    return tex;
  };

  // index dans `mats` (ordre BoxGeometry : +X, −X, +Y, −Y, +Z, −Z)
  const IDX = { right: 0, left: 1, front: 4, back: 5 };
  const lacquer = (face, mirrorX) => {
    const tex = loadTex(P(face), mirrorX, false, face === 'front', IDX[face]);
    const rm = loadTex(P(face + '-rm'), mirrorX, true, false, null);
    return new THREE.MeshPhysicalMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.0,
      roughnessMap: rm, metalnessMap: rm,
      roughness: 1, metalness: 1
    });
  };
  const darkSide = new THREE.MeshPhysicalMaterial({
    color: 0x17100c, emissive: 0x17100c, emissiveIntensity: 0.9, roughness: 0.55, metalness: 0.1
  });
  const mats = [
    lacquer('right', false),
    lacquer('left', false),
    darkSide, darkSide,
    lacquer('front', false),
    lacquer('back', true),
  ];
  const body = new THREE.Mesh(new RoundedBoxGeometry(BOT_W, BOT_H, BOT_D, 3, EDGE_R), mats);
  body.position.y = -(CAP_H + NECK_H) / 2;
  group.add(body);

  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xd9b465, metalness: 1, roughness: 0.21, envMap: envTex, envMapIntensity: 1.35,
    clearcoat: 0.4, clearcoatRoughness: 0.25
  });
  const goldDark = gold.clone(); goldDark.envMap = envTex; goldDark.color = new THREE.Color(0xa8853f); goldDark.roughness = 0.3;
  const bodyTop = body.position.y + BOT_H / 2;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(11.3, 11.3, NECK_H, 48), goldDark);
  neck.position.y = bodyTop + NECK_H / 2;
  group.add(neck);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(CAP_R, CAP_R, CAP_H, 72, 1, false), gold);
  cap.position.y = bodyTop + NECK_H + CAP_H / 2;
  group.add(cap);
  const capTop = new THREE.Mesh(new THREE.CircleGeometry(CAP_R, 72), goldDark);
  capTop.rotation.x = -Math.PI / 2;
  capTop.position.y = cap.position.y + CAP_H / 2 + 0.01;
  group.add(capTop);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(BOT_W * 1.7, BOT_D * 2.6),
    new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = body.position.y - BOT_H / 2 - 0.5;
  scene.add(shadow);

  // ── perte de contexte GPU (Safari sous pression mémoire, mise en veille, onglet
  // longtemps en arrière-plan). Sans ça le canvas devenait un trou vide, le fallback
  // étant masqué par gl-ready. On rend la main au fallback CSS, proprement.
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    lost = true;
    box.classList.remove('gl-ready');
    canvas.style.opacity = '0';
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    try {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      resize();
      renderOnce();
      if (revealed) { box.classList.add('gl-ready'); canvas.style.opacity = '1'; }
      loop();
    } catch (_) { /* on reste sur le fallback */ }
  }, false);

  // ── interactions
  const arch = box.closest('.arch');

  function resize() {
    const r = box.getBoundingClientRect();
    if (r.width < 10) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(box);
  window.addEventListener('resize', resize);

  let dragging = false, lastX = 0, lastT = 0;
  box.addEventListener('pointerdown', e => {
    if (e.target.closest('.rbtn')) return;
    dragging = true; lastX = e.clientX; lastT = performance.now();
    vel = 0; target = null; intro = null; lastInteract = Date.now();
    box.setPointerCapture && box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, now = performance.now();
    ry += dx * 0.011;
    vel = dx * 0.011 / Math.max((now - lastT) / 16.7, 0.5);
    lastX = e.clientX; lastT = now; lastInteract = Date.now();
    needsRender = true;
    if (!visible) renderOnce();
  });
  const endDrag = () => { dragging = false; };
  box.addEventListener('pointerup', endDrag);
  box.addEventListener('pointercancel', endDrag);

  const prev = box.querySelector('.rprev'), next = box.querySelector('.rnext');
  function snap(d) {
    const step = Math.PI / 2;
    target = Math.round(ry / step) * step + d * step;
    lastInteract = Date.now(); needsRender = true;
    if (!visible) { ry = target; target = null; renderOnce(); }
  }
  if (prev) prev.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); snap(1); });
  if (next) next.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); snap(-1); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(en => { visible = en[0].isIntersecting;
      if (visible) {
        if (!introPlayed && !REDUCED) {
          introPlayed = true;
          if (revealed) startIntro(); else pendingIntro = true;
        }
        needsRender = true; loop();
      } }, { threshold: 0.35 }).observe(box);
  } else visible = true;

  let rafId = null, lastFrame = performance.now();
  function loop() {
    if (rafId) return;
    const tick = (now) => {
      rafId = null;
      if (!visible || lost) return;
      const dt = Math.min((now - lastFrame) / 1000, 0.05); lastFrame = now;
      let animating = false;
      if (intro) {
        const t = Math.min((now - intro.start) / intro.dur, 1);
        const e = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
        ry = intro.from - e * Math.PI * 2;
        if (t >= 1) { ry = intro.from - Math.PI * 2; intro = null; lastInteract = Date.now(); }
        animating = true;
      } else if (target !== null) {
        const diff = target - ry;
        if (Math.abs(diff) < 0.002) { ry = target; target = null; }
        else { ry += diff * Math.min(dt * 5.2, 1); animating = true; }
      } else if (dragging) {
        animating = true;
      } else if (Math.abs(vel) > 0.0004) {
        ry += vel * dt * 60; vel *= Math.pow(0.94, dt * 60); animating = true;
      } else if (!REDUCED && Date.now() - lastInteract > 6000 &&
                 (arch && (arch.classList.contains('is-in') || arch.classList.contains('is-seen')))) {
        ry -= dt * 0.42; animating = true;
      }
      group.rotation.y = ry;
      if (animating || needsRender) { renderer.render(scene, camera); needsRender = false; }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  box.addEventListener('rot3d-intro', () => { visible = true; introPlayed = true; startIntro(); });
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity .5s ease';
  (window.__rot3d = window.__rot3d || {})[model] = { scene, mats, key, rim, renderer, renderOnce, group };
  box.appendChild(canvas);
  box.classList.add('gl-on');
  resize();
  renderer.render(scene, camera);
  loop();
  return true;
}

// ── Init PARESSEUSE (v16) : un contexte WebGL n'est créé qu'à l'approche de son
// chapitre. Évite 3 contextes + 24 textures + 3 PMREM d'un bloc pendant le décodage
// de la vidéo hero — le moment précis où Safari refuse un renderer. rootMargin large :
// la 3D est prête bien avant d'entrer dans le champ, l'utilisateur ne voit pas d'attente.
const boxes = [...document.querySelectorAll('.rot3d')];
const armer = box => { try { initBox(box); } catch (e) { /* fallback CSS conservé */ } };

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      armer(en.target);
    });
  }, { rootMargin: '150% 0px 150% 0px' });
  boxes.forEach(b => io.observe(b));
  // Filet : si l'observer ne se déclenche jamais (mise en page exotique, onglet ouvert
  // en arrière-plan), on arme tout au bout de 6 s.
  setTimeout(() => boxes.forEach(b => {
    if (!b.classList.contains('gl-on')) { io.unobserve(b); armer(b); }
  }), 6000);
} else {
  boxes.forEach(armer);
}

// Rotation 3D WebGL — flacons AB Signature (progressive enhancement du fallback CSS)
// Corps laqué vitrail (clearcoat + env), bouchon or physique dont les reflets tournent,
// ombre de contact, drag inertiel, flèches ±90°, rendu à la demande.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '/assets/vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from '/assets/vendor/RoomEnvironment.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const BOT_W = 45, BOT_D = 28.5, BOT_H = 88.97, EDGE_R = 0.9;
const CAP_R = 13.95, CAP_H = 27.2, NECK_H = 2.2;



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

function loadTex(loader, url, mirrorX, onload) {
  const t = loader.load(url, onload);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (mirrorX) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
  return t;
}

function initBox(box) {
  const model = box.dataset.model;
  const canvas = document.createElement('canvas');
  canvas.className = 'rgl';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch (e) { return false; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(24, BOT_W / BOT_H, 10, 900);
  camera.position.set(0, 9, 292);
  camera.lookAt(0, 1, 0);

  const key = new THREE.DirectionalLight(0xfff0cf, 1.15);
  key.position.set(60, 90, 120);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe8e0, 0.35);
  rim.position.set(-80, 40, -60);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  const group = new THREE.Group();
  scene.add(group);

  let ry = 0, vel = 0, target = null, lastInteract = 0, visible = false, needsRender = true;
  let intro = null, introPlayed = false;

  const loader = new THREE.TextureLoader();
  const P = m => `/assets/rot3d/${model}-${m}.webp`;
  const renderOnce = () => { group.rotation.y = ry; renderer.render(scene, camera); };
  const kick = () => { needsRender = true; renderOnce(); };
  const lacquer = (map) => new THREE.MeshPhysicalMaterial({
    map, roughness: 0.38, metalness: 0.06,
    clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.05
  });
  const darkSide = new THREE.MeshPhysicalMaterial({
    color: 0x0d0a08, roughness: 0.55, metalness: 0.1, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.5
  });
  const mats = [
    lacquer(loadTex(loader, P('right'), false, kick)),
    lacquer(loadTex(loader, P('left'), false, kick)),
    darkSide, darkSide,
    lacquer(loadTex(loader, P('front'), false, kick)),
    lacquer(loadTex(loader, P('back'), true, kick)),
  ];
  const body = new THREE.Mesh(new RoundedBoxGeometry(BOT_W, BOT_H, BOT_D, 3, EDGE_R), mats);
  body.position.y = -(CAP_H + NECK_H) / 2;
  group.add(body);

  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xd9b465, metalness: 1, roughness: 0.21, envMapIntensity: 1.35,
    clearcoat: 0.4, clearcoatRoughness: 0.25
  });
  const goldDark = gold.clone(); goldDark.color = new THREE.Color(0xa8853f); goldDark.roughness = 0.3;
  const bodyTop = body.position.y + BOT_H / 2;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(10.6, 11.6, NECK_H, 48), goldDark);
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
        if (!introPlayed && !REDUCED) { introPlayed = true; intro = { start: performance.now(), from: ry, dur: 4000 }; }
        needsRender = true; loop();
      } }, { threshold: 0.35 }).observe(box);
  } else visible = true;

  let rafId = null, lastFrame = performance.now();
  function loop() {
    if (rafId) return;
    const tick = (now) => {
      rafId = null;
      if (!visible) return;
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

  box.addEventListener('rot3d-intro', () => {
    visible = true; introPlayed = true;
    intro = { start: performance.now(), from: ry, dur: 4000 };
    needsRender = true; loop();
  });
  box.appendChild(canvas);
  box.classList.add('gl-on');
  resize();
  renderer.render(scene, camera);
  loop();
  return true;
}

document.querySelectorAll('.rot3d').forEach(box => {
  try { initBox(box); } catch (e) { /* fallback CSS conservé */ }
});

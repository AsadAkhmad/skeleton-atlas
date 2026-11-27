import * as THREE from 'three';
import { makeStage, patchBone, geometryFrom } from './stage.js';
import { ROSTER, decorative, ribArcLength } from './layout.js';
import { staticCartilage, articularCaps } from './cartilage.js';
import { SYSTEMS, buildSystem } from './systems.js';
import { INFO, REGIONS, REGION_COLORS } from './data.js';
import { RES } from './sdf.js';
import * as AX from './shapes_axial.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SIDE_NAME = { L: 'Left', R: 'Right' };

// ---------------------------------------------------------------- stage
const canvas = $('#c');
const stage = makeStage(canvas);
const { renderer, scene, camera, controls } = stage;
const small = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
RES.scale = small ? 1.85 : 1.55;
controls.minDistance = 0.8;

const makeMat = (o) => patchBone(new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, vertexColors: true, ...o }));
const MATS = {
  base: makeMat({ color: 0xe9ddc4 }),
  hover: makeMat({ color: 0xdfe9ef, emissive: 0x3f7da8, emissiveIntensity: 0.42 }),
  select: makeMat({ color: 0xffd99a, emissive: 0xe0861a, emissiveIntensity: 0.55 }),
  ghost: makeMat({ color: 0x9fb3c8, transparent: true, opacity: 0.1, depthWrite: false, roughness: 0.9 }),
};
const cartMat = new THREE.MeshStandardMaterial({ color: 0xb9ccd0, roughness: 0.5, vertexColors: true, transparent: true, opacity: 0.92 });
const teethMat = new THREE.MeshStandardMaterial({ color: 0xf5efe1, roughness: 0.28, vertexColors: true });
const ghostCart = new THREE.MeshStandardMaterial({ color: 0x9fb3c8, roughness: 0.9, vertexColors: true, transparent: true, opacity: 0.06, depthWrite: false });

const makeOrg = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.46, metalness: 0, ...o });
const ORG = {
  base: makeOrg({}),
  hover: makeOrg({ emissive: 0x3f7da8, emissiveIntensity: 0.4 }),
  select: makeOrg({ emissive: 0xe0861a, emissiveIntensity: 0.5 }),
  ghost: makeOrg({ transparent: true, opacity: 0.1, depthWrite: false, roughness: 0.9 }),
};

// ---------------------------------------------------------------- state
const bones = []; // {id, def, info, mesh, center, region, sub}
const byId = new Map();
const deco = []; // {mesh, kind, owners: [bone]} cartilage and teeth that ride along with their bones
const S = { selected: null, hovered: null, dim: true, labels: innerWidth > 760, cartilage: true, teeth: true, autorotate: false, explode: 0, hiddenRegions: new Set(), isolate: false, boneMode: 'solid', selOrgan: null, hoverOrgan: null };
const organs = []; // soft-tissue items from the body systems: {id, key, system, info, mesh, on, isOrgan}
const sysBuilt = new Map(); // system id -> { items, on }
let dirty = true, shadowDirty = true;
const invalidate = () => { dirty = true; };
const invalidateShadow = () => { shadowDirty = true; dirty = true; };

// ---------------------------------------------------------------- info helpers
function infoOf(def) {
  const i = INFO[def.key] || {};
  return i;
}
const ribLenCache = {};
function sizeRows(def, info) {
  const key = def.key;
  if (info.size) return info.size;
  const m = /^rib-(\d+)$/.exec(key);
  if (m) {
    const n = +m[1];
    const L = ribLenCache[n] || (ribLenCache[n] = ribArcLength(n));
    return [{ k: 'Bony arc length', v: `≈ ${L.toFixed(0)} cm` }, { k: 'Costal cartilage', v: n <= 10 ? 'adds ≈ ' + [2, 3, 5, 6, 7, 8, 9, 5, 4, 3][n - 1] + ' cm' : 'none (floating)' }, { k: 'Shaft width', v: n === 1 ? '≈ 2 cm (flat)' : '≈ 1–1.4 cm' }];
  }
  return [];
}
function vertSize(key) {
  const m = /^([CTL])(\d)(\d?)$/.exec(key);
  if (!m) return null;
  const kind = m[1], n = +(m[2] + m[3]);
  if (kind === 'C' && n < 3) return null;
  const { bw, bd, bh } = AX.bodyDims(kind, n);
  const width = kind === 'C' ? 4.6 + 0.2 * (n - 3) : kind === 'T' ? 6.4 + 0.35 * (n - 1) : 7.4 + 0.15 * (n - 1);
  const rows = [{ k: 'Body width', v: `≈ ${bw.toFixed(1)} cm` }, { k: 'Body depth', v: `≈ ${bd.toFixed(1)} cm` }, { k: 'Body height', v: `≈ ${bh.toFixed(1)} cm` }, { k: 'Width with processes', v: `≈ ${width.toFixed(1)} cm` }];
  rows.width = width; return rows;
}

// ---------------------------------------------------------------- build bones
const loadEl = $('#loading'), bar = $('#bar'), loadTxt = $('#loadtxt');
const _mc = new MessageChannel(); let _res = null; _mc.port1.onmessage = () => { const r = _res; _res = null; r && r(); };
const tick = () => new Promise((r) => { _res = r; _mc.port2.postMessage(0); });
const world = new THREE.Group(); scene.add(world);

async function buildAll() {
  const t0 = performance.now();
  let tris = 0;
  const total = ROSTER.length + 1;
  for (let i = 0; i < ROSTER.length; i++) {
    const d = ROSTER[i];
    const info = infoOf(d);
    loadTxt.textContent = `${i + 1} / 206 · ${(info.name || d.key)}`;
    bar.style.width = (i / total * 100).toFixed(1) + '%';
    await tick();
    let m;
    try { m = d.build(); } catch (e) { console.error('build failed', d.id, e); continue; }
    const g = geometryFrom(m);
    const mesh = new THREE.Mesh(g, MATS.base);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.id = d.id;
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    mesh.userData.center = c;
    world.add(mesh);
    const b = { id: d.id, def: d, info, mesh, center: c, region: d.region, sub: d.sub, side: d.side, key: d.key };
    bones.push(b); byId.set(d.id, b);
    tris += m.indices.length / 3;
    if (i % 12 === 0) { invalidateShadow(); }
    if (i % 4 === 0) { invalidate(); renderFrame(); }
  }
  loadTxt.textContent = 'cartilage and teeth…';
  await tick();
  const addDeco = (d, owners) => {
    const g = geometryFrom(d.mesh);
    const mesh = new THREE.Mesh(g, d.kind === 'teeth' ? teethMat : cartMat);
    mesh.castShadow = d.kind === 'teeth'; mesh.receiveShadow = true;
    world.add(mesh); deco.push({ mesh, kind: d.kind, owners: owners.map((id) => byId.get(id)).filter(Boolean) });
  };
  for (const d of [...decorative(), ...staticCartilage()]) addDeco(d, d.owners || []);
  loadTxt.textContent = 'joint cartilage…';
  await tick();
  const tc = performance.now();
  const caps = articularCaps(bones.map((b) => ({ id: b.id, region: b.region, positions: b.mesh.geometry.attributes.position.array, normals: b.mesh.geometry.attributes.normal.array, indices: b.mesh.geometry.index.array })));
  for (const c of caps) addDeco(c, [c.owner]);
  const capsMs = performance.now() - tc;
  bar.style.width = '100%';
  console.log(`built ${bones.length} bones, ${(tris / 1e6).toFixed(2)}M triangles in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  window.__stats = { bones: bones.length, tris, secs: (performance.now() - t0) / 1000, capsMs: Math.round(capsMs), caps: deco.length };
}

// ---------------------------------------------------------------- GPU picking
const pickRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: true });
const pickBuf = new Uint8Array(4);
const idMats = [];
function setupPicking() {
  bones.forEach((b, i) => {
    const id = i + 1;
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color((id & 255) / 255, ((id >> 8) & 255) / 255, 0), toneMapped: false });
    m.color.setRGB((id & 255) / 255, ((id >> 8) & 255) / 255, 0, THREE.LinearSRGBColorSpace);
    b.idMat = m;
  });
}
function pick(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = clientX - r.left, y = clientY - r.top;
  if (x < 0 || y < 0 || x > r.width || y > r.height) return null;
  const saved = [];
  for (const b of bones) { saved.push(b.mesh.material); b.mesh.material = b.idMat; b.mesh.castShadow = false; }
  const dsaved = deco.map((d) => d.mesh.visible); deco.forEach((d) => { d.mesh.visible = false; });
  const osaved = organs.map((o) => o.mesh.material); organs.forEach((o) => { o.mesh.material = o.idMat; o.mesh.castShadow = false; });
  const oldBG = scene.background; const oldEnv = scene.environment; scene.environment = null;
  const pr = renderer.getPixelRatio();
  camera.setViewOffset(r.width, r.height, x, y, 1, 1);
  const prevTone = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
  const prevSM = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false;
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(pickRT);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.readRenderTargetPixels(pickRT, 0, 0, 1, 1, pickBuf);
  renderer.setRenderTarget(prevTarget);
  renderer.shadowMap.enabled = prevSM; renderer.toneMapping = prevTone;
  camera.clearViewOffset();
  scene.environment = oldEnv;
  bones.forEach((b, i) => { b.mesh.material = saved[i]; b.mesh.castShadow = b.mesh.userData.cast !== false && b.state !== 'ghost'; });
  deco.forEach((d, i) => { d.mesh.visible = dsaved[i]; });
  organs.forEach((o, i) => { o.mesh.material = osaved[i]; o.mesh.castShadow = o.state !== 'ghost'; });
  const id = pickBuf[0] + (pickBuf[1] << 8);
  if (id > bones.length && id <= bones.length + organs.length) return organs[id - bones.length - 1];
  return id > 0 && id <= bones.length ? bones[id - 1] : null;
}

// ---------------------------------------------------------------- states & visibility
function boneVisible(b) {
  if (S.boneMode === 'hidden') return false;
  if (S.hiddenRegions.has(b.region)) return false;
  if (S.isolate && S.selected && S.selected !== b) return false;
  return true;
}
const anySel = () => S.selected || S.selOrgan;
function boneState(b) {
  if (S.selected === b) return 'select';
  if (S.hovered === b) return 'hover';
  if (anySel() && S.dim) return 'ghost';
  if (S.boneMode === 'ghost') return 'ghost';
  return 'base';
}
function organState(o) {
  if (S.selOrgan === o) return 'select';
  if (S.hoverOrgan === o) return 'hover';
  if (anySel() && S.dim) return 'ghost';
  return 'base';
}
function applyOrgans() {
  for (const o of organs) {
    const sys = sysBuilt.get(o.system);
    o.mesh.visible = !!(sys && sys.on && o.on && S.explode < 0.02) && !(S.isolate && S.selOrgan && S.selOrgan !== o);
    const st = organState(o);
    if (o.state !== st) { o.state = st; o.mesh.material = ORG[st]; o.mesh.castShadow = st !== 'ghost'; }
  }
}
function applyStates() {
  for (const b of bones) {
    const vis = boneVisible(b);
    b.mesh.visible = vis;
    const st = boneState(b);
    if (b.state !== st) {
      b.state = st; b.mesh.material = MATS[st];
      b.mesh.castShadow = st !== 'ghost'; b.mesh.receiveShadow = st !== 'ghost';
    }
  }
  for (const d of deco) {
    const own = d.owners;
    const shown = d.kind === 'cartilage' ? S.cartilage : S.teeth;
    const bonesOk = own.length === 0 || own.every((o) => o.mesh.visible);
    const isolated = S.isolate && anySel() && !own.includes(S.selected);
    d.mesh.visible = shown && bonesOk && !isolated;
    const ghost = (anySel() && S.dim && !own.includes(S.selected)) || (S.boneMode === 'ghost' && !S.selected);
    d.mesh.material = ghost ? ghostCart : (d.kind === 'teeth' ? teethMat : cartMat);
  }
  applyOrgans();
  invalidateShadow();
  updateListState();
}

// ---------------------------------------------------------------- explode
function computeExplode() {
  const sub = new Map(), all = new THREE.Vector3(); let n = 0;
  for (const b of bones) { const k = b.region + '|' + b.sub; const s = sub.get(k) || { c: new THREE.Vector3(), n: 0 }; s.c.add(b.center); s.n++; sub.set(k, s); all.add(b.center); n++; }
  all.divideScalar(n); all.y = 90;
  for (const s of sub.values()) s.c.divideScalar(s.n);
  for (const b of bones) {
    const sc = sub.get(b.region + '|' + b.sub).c;
    const a = b.center.clone().sub(all); a.y *= 0.55;
    const l = b.center.clone().sub(sc);
    b.explodeVec = a.multiplyScalar(0.55).add(l.multiplyScalar(0.9));
  }
}
function setExplode(v) {
  S.explode = v;
  for (const b of bones) b.mesh.position.copy(b.explodeVec).multiplyScalar(v);
  // cartilage and teeth ride along with the bones they belong to (a disc sits midway between its two vertebrae)
  for (const d of deco) {
    if (!d.owners.length) continue;
    d.mesh.position.set(0, 0, 0);
    for (const o of d.owners) d.mesh.position.add(o.mesh.position);
    d.mesh.position.divideScalar(d.owners.length);
  }
  S.decoHidden = false;
  applyStates();
  invalidateShadow();
}

// ---------------------------------------------------------------- camera
let tween = null;
function flyTo(pos, target, ms = 800) {
  if (reduceMotion) ms = 1;
  tween = { t0: performance.now(), ms, p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos.clone(), t1: target.clone() };
  invalidate();
}
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function stepTween(now) {
  if (!tween) return;
  const u = Math.min(1, (now - tween.t0) / tween.ms), e = ease(u);
  camera.position.lerpVectors(tween.p0, tween.p1, e);
  controls.target.lerpVectors(tween.t0v, tween.t1, e);
  if (u >= 1) tween = null;
  dirty = true;
}
const BODY_C = new THREE.Vector3(0, 90, 0);
function fitDistance(h, aspect) { const v = (h / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); return Math.max(v, (h * aspect / 2) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect)) * 1.0; }
function viewDir(name) {
  return { front: [0, 0.04, 1], back: [0, 0.04, -1], left: [1, 0.04, 0], right: [-1, 0.04, 0], top: [0, 1, 0.001], bottom: [0, -1, 0.001] }[name];
}
function setView(name) {
  const d = viewDir(name); const v = new THREE.Vector3(...d).normalize();
  let target = BODY_C.clone(), dist = fitDistance(200, 1) * 1.05;
  if (innerWidth <= 900) { dist *= 1.18; target.y -= 16; }
  if (S.selected) { const b = S.selected; const bb = new THREE.Box3().setFromObject(b.mesh); const c = bb.getCenter(new THREE.Vector3()); const r = bb.getSize(new THREE.Vector3()).length() / 2; target = c; dist = Math.max(4, r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.15); }
  if (name === 'top' && !S.selected) { target = new THREE.Vector3(0, 100, 0); dist = 260; }
  flyTo(target.clone().add(v.multiplyScalar(dist)), target);
  $$('.views button').forEach((b) => b.classList.toggle('on', b.dataset.view === name));
}
function focusBone(b, keepDir = true) {
  const bb = new THREE.Box3().setFromObject(b.mesh);
  const c = bb.getCenter(new THREE.Vector3());
  const r = Math.max(bb.getSize(new THREE.Vector3()).length() / 2, 0.15);
  const vh = THREE.MathUtils.degToRad(camera.fov / 2), hh = Math.atan(Math.tan(vh) * camera.aspect);
  const mobile = innerWidth <= 900;
  const dist = Math.max(1.6, r / Math.sin(Math.min(vh, hh)) * (mobile ? 1.55 : 1.25));
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (dir.length() < 0.5) dir.set(0, 0, 1);
  const tgt = c.clone();
  if (mobile) tgt.y -= dist * 0.2;
  flyTo(tgt.clone().add(dir.multiplyScalar(dist)), tgt);
  $$('.views button').forEach((x) => x.classList.remove('on'));
}

// ---------------------------------------------------------------- selection
function select(b, opts = {}) {
  if (b && b.isOrgan) return selectOrgan(b, opts);
  S.selOrgan = null;
  S.selected = b || null;
  applyStates();
  renderDetails();
  if (b && opts.focus !== false) focusBone(b);
  if (b) { try { history.replaceState(null, '', '#' + b.id); } catch (e) { try { location.hash = b.id; } catch (e2) {} } }
  else { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  scrollListTo(b);
  if (!b) $('#right').classList.remove('open');
  else $('#right').classList.add('open');
}
function hover(x) {
  const o = x && x.isOrgan ? x : null, b = x && !x.isOrgan ? x : null;
  if (S.hovered === b && S.hoverOrgan === o) return;
  S.hovered = b; S.hoverOrgan = o;
  applyStatesLite();
  tip(x || null);
}
function applyStatesLite() {
  for (const b of bones) {
    const st = boneState(b);
    if (b.state !== st) { b.state = st; b.mesh.material = MATS[st]; b.mesh.castShadow = st !== 'ghost'; }
  }
  applyOrgans();
  $$('.item.hov').forEach((i) => i.classList.remove('hov'));
  if (S.hovered) { const it = itemEls.get(S.hovered.id); if (it) it.classList.add('hov'); }
  invalidate();
}

// ---------------------------------------------------------------- tooltip
const tipEl = $('#tip');
let tipPos = { x: 0, y: 0 };
function tip(b) {
  if (!b) { tipEl.style.opacity = 0; return; }
  if (b.isOrgan) { const sy = SYSTEMS.find((q) => q.id === b.system); tipEl.innerHTML = `<b>${b.info.name}</b><span>${sy ? sy.name : ''}</span>`; tipEl.style.opacity = 1; placeTip(); return; }
  tipEl.innerHTML = `<b>${displayName(b)}</b><span>${b.region}</span>`;
  tipEl.style.opacity = 1; placeTip();
}
function placeTip() { tipEl.style.transform = `translate(${tipPos.x + 14}px, ${tipPos.y + 14}px)`; }
function displayName(b) {
  const nm = b.info.name || b.key;
  return b.side ? `${nm} <i>${SIDE_NAME[b.side].toLowerCase()}</i>` : nm;
}
function plainName(b) { const nm = b.info.name || b.key; return b.side ? `${nm} (${SIDE_NAME[b.side].toLowerCase()})` : nm; }

// ---------------------------------------------------------------- left list
const itemEls = new Map();
const sectionEls = new Map();
function buildList() {
  const tree = $('#tree'); tree.innerHTML = '';
  for (const region of REGIONS) {
    const sec = el('section', 'reg');
    const list = bones.filter((b) => b.region === region);
    const head = el('div', 'rhead');
    head.innerHTML = `<button class="rtoggle" aria-expanded="true"><span class="sw" style="background:${REGION_COLORS[region]}"></span><span class="rn">${region}</span><span class="rc">${list.length}</span></button><button class="eye" title="Show or hide this region" aria-pressed="true">${eyeSvg}</button>`;
    sec.appendChild(head);
    const body = el('div', 'rbody');
    let curSub = null;
    for (const b of list) {
      if (b.sub !== curSub) { curSub = b.sub; const subs = bones.filter((x) => x.region === region && x.sub === curSub).length; body.appendChild(el('h4', 'sub', `${curSub}<em>${subs}</em>`)); }
      const it = el('button', 'item');
      it.dataset.id = b.id;
      it.innerHTML = `<span class="nm">${b.info.name || b.key}</span>${b.side ? `<span class="sd ${b.side}">${b.side}</span>` : ''}`;
      it.addEventListener('click', () => { select(b); if (innerWidth < 900) $('#left').classList.remove('open'); });
      it.addEventListener('pointerenter', () => hover(b));
      it.addEventListener('pointerleave', () => hover(null));
      body.appendChild(it); itemEls.set(b.id, it);
      b.searchText = [b.info.name, b.info.latin, b.region, b.sub, b.info.type, b.key, b.side ? SIDE_NAME[b.side] : ''].join(' ').toLowerCase();
    }
    sec.appendChild(body);
    head.firstChild.addEventListener('click', () => { const open = body.hidden = !body.hidden; head.firstChild.setAttribute('aria-expanded', String(!open)); sec.classList.toggle('closed', open); });
    head.lastChild.addEventListener('click', (e) => {
      const off = S.hiddenRegions.has(region);
      if (off) S.hiddenRegions.delete(region); else S.hiddenRegions.add(region);
      e.currentTarget.setAttribute('aria-pressed', String(off)); sec.classList.toggle('off', !off);
      applyStates();
    });
    tree.appendChild(sec); sectionEls.set(region, sec);
  }
}
const eyeSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path class="slash" d="M4 4l16 16"/></svg>';
function updateListState() {
  for (const b of bones) { const it = itemEls.get(b.id); if (it) it.classList.toggle('sel', S.selected === b); }
}
function scrollListTo(b) { if (!b) return; const it = itemEls.get(b.id); if (!it) return; const sec = it.closest('section'); const body = $('.rbody', sec); if (body.hidden) { body.hidden = false; sec.classList.remove('closed'); } it.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); }
function runSearch(q) {
  q = q.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const b of bones) {
    const ok = !words.length || words.every((w) => b.searchText.includes(w));
    itemEls.get(b.id).hidden = !ok; if (ok) shown++;
  }
  for (const [region, sec] of sectionEls) {
    const items = $$('.item', sec); const vis = items.filter((i) => !i.hidden).length;
    sec.hidden = vis === 0;
    $$('.sub', sec).forEach((h) => { let n = h.nextElementSibling, any = false; while (n && !n.classList.contains('sub')) { if (!n.hidden) any = true; n = n.nextElementSibling; } h.hidden = !any; });
    if (words.length) { const body = $('.rbody', sec); body.hidden = false; sec.classList.remove('closed'); }
  }
  $('#qcount').textContent = words.length ? `${shown} match${shown === 1 ? '' : 'es'}` : '206 bones';
}

// ---------------------------------------------------------------- details panel
const outline = `<svg viewBox="0 0 100 190" class="body" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity=".5"><circle cx="50" cy="12" r="9"/><path d="M42 24c-9 2-17 5-20 10l-3 30-6 38-2 10M58 24c9 2 17 5 20 10l3 30 6 38 2 10M42 24c-1 18 0 44 3 60M58 24c1 18 0 44-3 60M45 84c-6 4-9 10-9 18l5 40 2 38M55 84c6 4 9 10 9 18l-5 40-2 38"/></g><circle id="mdot" r="4.2" fill="#e8b04a"/><circle id="mring" r="8" fill="none" stroke="#e8b04a" stroke-width="1"/></svg>`;
function resolveArt(b, token) {
  const out = [];
  const both = token.endsWith('*'); const opp = token.endsWith('@opp'); const key = token.replace(/(\*|@opp)$/, '');
  const cand = bones.filter((x) => x.key === key);
  for (const c of cand) {
    if (both) out.push(c);
    else if (opp) { if (c.side && c.side !== b.side) out.push(c); }
    else if (!c.side) out.push(c);
    else if (b.side) { if (c.side === b.side) out.push(c); }
    else out.push(c);
  }
  return out;
}
function renderDetails() {
  const root = $('#detail');
  const b = S.selected;
  if (!b && S.selOrgan) return renderOrganDetails(root);
  if (!b) {
    root.innerHTML = `<div class="empty"><h2>Pick a bone</h2><p>Click any bone in the 3D view, or choose one from the list. You will see its name, size, function and how it connects to its neighbours.</p>
      <ul class="facts"><li><b>206</b><span>bones in an adult skeleton</span></li><li><b>80</b><span>axial bones: skull, spine, ribs, sternum</span></li><li><b>126</b><span>appendicular bones: limbs and girdles</span></li><li><b>~270</b><span>bones at birth, many fuse as we grow</span></li></ul>
      <p class="muted">Tip: drag to rotate, scroll to zoom, right-drag to pan. Use the view buttons for front, side and top.</p></div>`;
    return;
  }
  const i = b.info;
  const vs = vertSize(b.key); const rows = vs || sizeRows(b.def, i);
  let lenCm = i.lenCm || 10;
  if (vs) lenCm = Math.round(vs.width * 10) / 10;
  if (b.def.rib) { const n = b.def.rib; lenCm = Math.round(ribLenCache[n] || (ribLenCache[n] = ribArcLength(n))); }
  const rel = Math.max(3, Math.min(100, Math.sqrt(lenCm / 48) * 100));
  const arts = [];
  const seen = new Set();
  for (const t of (i.art || [])) for (const x of resolveArt(b, t)) { if (x === b || seen.has(x.id)) continue; seen.add(x.id); arts.push(x); }
  const series = b.def.rib ? [`rib-${b.def.rib - 1}`, `rib-${b.def.rib + 1}`] : null;
  const html = `
    <div class="hd">
      <div class="crumb"><span class="sw" style="background:${REGION_COLORS[b.region]}"></span>${b.region} <i>/</i> ${b.sub}</div>
      <h2>${i.name || b.key}</h2>
      <div class="lat"><em>${i.latin || ''}</em>${b.side ? `<span class="side ${b.side}">${SIDE_NAME[b.side]}</span>` : '<span class="side M">Midline</span>'}</div>
      <div class="type">${i.type || ''}</div>
    </div>
    <div class="nav">
      <button id="prev" title="Previous bone in the list ( ← )">← Prev</button>
      <button id="mirror" ${b.side ? '' : 'disabled'} title="Jump to the matching bone on the other side">${b.side ? 'Other side ⇄' : 'Single bone'}</button>
      <button id="next" title="Next bone in the list ( → )">Next →</button>
    </div>
    <section class="size"><h3>Size <span class="muted">typical adult</span></h3>
      <div class="big"><b>${lenCm >= 1 ? lenCm.toString().replace(/\.0$/, '') : (lenCm * 10).toFixed(0)}</b><span>${lenCm >= 1 ? 'cm' : 'mm'}</span><em>longest dimension</em></div>
      <div class="scale"><i style="width:${rel}%"></i></div><div class="scalecap"><span>vs the femur, the longest bone (48 cm)</span></div>
      <dl>${rows.map((r) => `<dt>${r.k}</dt><dd>${r.v}</dd>`).join('')}</dl>
    </section>
    <section><h3>Function</h3><p>${i.fn || ''}</p></section>
    ${i.feat && i.feat.length ? `<section><h3>Key features</h3><ul class="feat">${i.feat.map((f) => `<li>${f}</li>`).join('')}</ul></section>` : ''}
    ${arts.length ? `<section><h3>Articulates with</h3><div class="chips">${arts.map((x) => `<button class="chip" data-id="${x.id}">${(x.info.short || x.info.name || x.key)}${x.side ? ` <i>${x.side}</i>` : ''}</button>`).join('')}</div></section>` : ''}
    ${i.att ? `<section><h3>Attachments</h3><p>${i.att}</p></section>` : ''}
    ${i.fact ? `<section class="fact"><h3>Good to know</h3><p>${i.fact}</p></section>` : ''}
    <section class="loc"><h3>Where it is</h3><div class="locrow">${outline}<div><p class="muted">Position in the skeleton, seen from the front. The highlighted bone is shown in amber in the 3D view.</p><div class="btns"><button id="focus">Zoom to bone</button><button id="iso" aria-pressed="${S.isolate}">${S.isolate ? 'Show all bones' : 'Isolate this bone'}</button></div></div></div></section>`;
  root.innerHTML = html;
  // location dot
  const c = b.center;
  const px = 50 + (c.x / 34) * 38, py = 190 - (c.y / 176) * 178 - 4;
  const dot = $('#mdot', root), ring = $('#mring', root);
  dot.setAttribute('cx', Math.max(4, Math.min(96, px))); dot.setAttribute('cy', py); ring.setAttribute('cx', dot.getAttribute('cx')); ring.setAttribute('cy', py);
  $$('.chip', root).forEach((ch) => ch.addEventListener('click', () => select(byId.get(ch.dataset.id))));
  $('#prev', root).onclick = () => step(-1); $('#next', root).onclick = () => step(1);
  $('#mirror', root).onclick = () => { const o = bones.find((x) => x.key === b.key && x.side && x.side !== b.side); if (o) select(o); };
  $('#focus', root).onclick = () => focusBone(b);
  $('#iso', root).onclick = () => { S.isolate = !S.isolate; applyStates(); renderDetails(); };
  root.scrollTop = 0;
}
function step(dir) {
  const vis = bones.filter((b) => !b.mesh || true);
  const idx = bones.indexOf(S.selected);
  const n = bones.length; const nb = bones[(idx + dir + n) % n];
  select(nb);
}

// ---------------------------------------------------------------- labels
const LABELS = [
  ['frontal', '', 'front'], ['parietal', 'L', 'any'], ['temporal', 'L', 'any'], ['zygomatic', 'L', 'front'], ['maxilla', 'R', 'front'], ['mandible', '', 'front'], ['occipital', '', 'back'], ['hyoid', '', 'any'],
  ['C1', '', 'any'], ['C7', '', 'any'], ['T1', '', 'any'], ['T6', '', 'any'], ['T12', '', 'any'], ['L1', '', 'any'], ['L3', '', 'any'], ['L5', '', 'any'], ['sacrum', '', 'back'], ['coccyx', '', 'any'],
  ['sternum', '', 'front'], ['rib-1', 'L', 'any'], ['rib-4', 'R', 'any'], ['rib-7', 'L', 'any'], ['rib-12', 'R', 'any'],
  ['clavicle', 'L', 'front'], ['clavicle', 'R', 'front'], ['scapula', 'L', 'back'], ['scapula', 'R', 'back'],
  ['humerus', 'L', 'any'], ['humerus', 'R', 'any'], ['radius', 'L', 'any'], ['radius', 'R', 'any'], ['ulna', 'L', 'any'], ['ulna', 'R', 'any'],
  ['capitate', 'L', 'any'], ['capitate', 'R', 'any'], ['metacarpal-3', 'L', 'any'], ['metacarpal-3', 'R', 'any'], ['finger-3-prox', 'L', 'any'], ['finger-3-prox', 'R', 'any'],
  ['hip-bone', 'L', 'any'], ['hip-bone', 'R', 'any'], ['femur', 'L', 'any'], ['femur', 'R', 'any'], ['patella', 'L', 'front'], ['patella', 'R', 'front'],
  ['tibia', 'L', 'any'], ['tibia', 'R', 'any'], ['fibula', 'L', 'any'], ['fibula', 'R', 'any'], ['talus', 'L', 'any'], ['talus', 'R', 'any'], ['calcaneus', 'L', 'any'], ['calcaneus', 'R', 'any'],
  ['metatarsal-1', 'L', 'any'], ['metatarsal-1', 'R', 'any'], ['toe-1-dist', 'L', 'any'], ['toe-1-dist', 'R', 'any'],
];
const labelLayer = $('#labels'), lineSvg = $('#lines');
let labelItems = [];
function buildLabels() {
  labelLayer.innerHTML = ''; lineSvg.innerHTML = ''; labelItems = [];
  for (const [key, side, view] of LABELS) {
    const b = bones.find((x) => x.key === key && x.side === side);
    if (!b) continue;
    const d = el('button', 'lb');
    const nm = (b.info.short || b.info.name) + (b.side ? ' ' + b.side : '');
    d.textContent = nm; d.addEventListener('click', () => select(b));
    d.addEventListener('pointerenter', () => hover(b)); d.addEventListener('pointerleave', () => hover(null));
    labelLayer.appendChild(d);
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'path'); ln.setAttribute('class', 'ln'); lineSvg.appendChild(ln);
    labelItems.push({ b, d, ln, view });
  }
}
const _v = new THREE.Vector3();
function updateLabels() {
  const on = S.labels && !S.decoHidden;
  labelLayer.style.display = on ? '' : 'none'; lineSvg.style.display = on ? '' : 'none';
  if (!on) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const camDir = camera.position.clone().sub(controls.target); const front = camDir.z > 0; const side = Math.abs(camDir.x) > Math.abs(camDir.z) * 1.6; const top = Math.abs(camDir.y) > Math.max(Math.abs(camDir.x), Math.abs(camDir.z)) * 1.4;
  const zoomed = camDir.length() < 120;
  const cols = { L: [], R: [] };
  for (const it of labelItems) {
    let show = boneVisible(it.b) && !zoomed && !top;
    if (show && it.view === 'front' && (!front || side)) show = false;
    if (show && it.view === 'back' && (front || side)) show = false;
    if (show && (S.selected || S.selOrgan) && S.dim && S.selected !== it.b) show = false;
    it.show = show;
    if (!show) { it.d.style.display = 'none'; it.ln.style.display = 'none'; continue; }
    _v.copy(it.b.center).add(it.b.mesh.position).project(camera);
    it.sx = (_v.x * 0.5 + 0.5) * w; it.sy = (-_v.y * 0.5 + 0.5) * h; it.vis = _v.z < 1 && it.sx > 0 && it.sx < w && it.sy > 0 && it.sy < h;
    if (!it.vis) { it.d.style.display = 'none'; it.ln.style.display = 'none'; it.show = false; continue; }
    (it.sx < w / 2 ? cols.L : cols.R).push(it);
  }
  const tb = $('.toolbar'); const gap = 17, top0 = 30, bot = h - (tb ? tb.offsetHeight + 40 : 70);
  for (const key of ['L', 'R']) {
    const arr = cols[key].sort((a, b) => a.sy - b.sy);
    let y = top0 - gap;
    for (const it of arr) { it.ly = Math.max(it.sy, y + gap); y = it.ly; }
    let over = y - bot; if (over > 0) { let yy = bot + gap; for (let k = arr.length - 1; k >= 0; k--) { arr[k].ly = Math.min(arr[k].ly, yy - gap); yy = arr[k].ly; } }
    for (const it of arr) {
      const d = it.d; d.style.display = '';
      const lw = d.offsetWidth;
      const x = key === 'L' ? 14 : w - 14 - lw;
      d.style.transform = `translate(${x}px, ${it.ly - 9}px)`;
      d.classList.toggle('left', key === 'L'); d.classList.toggle('hot', S.hovered === it.b || S.selected === it.b);
      const ex = key === 'L' ? x + lw + 3 : x - 3;
      it.ln.style.display = '';
      it.ln.setAttribute('d', `M${ex.toFixed(1)} ${it.ly.toFixed(1)} L${(ex + (key === 'L' ? 18 : -18)).toFixed(1)} ${it.ly.toFixed(1)} L${it.sx.toFixed(1)} ${it.sy.toFixed(1)}`);
      it.ln.classList.toggle('hot', S.hovered === it.b || S.selected === it.b);
    }
  }
}

// ---------------------------------------------------------------- render loop
function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(10, r.width), h = Math.max(10, r.height);
  renderer.setSize(w, h, false); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate();
}
function renderFrame() {
  if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
  renderer.render(scene, camera);
  updateLabels();
  dirty = false;
}
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  stepTween(now);
  if (S.autorotate && !tween) { const a = (now - last) / 1000 * 0.35; const p = camera.position.clone().sub(controls.target); const x = p.x * Math.cos(a) - p.z * Math.sin(a), z = p.x * Math.sin(a) + p.z * Math.cos(a); camera.position.set(controls.target.x + x, camera.position.y, controls.target.z + z); dirty = true; }
  last = now;
  if (controls.update()) dirty = true;
  if (dirty || shadowDirty) renderFrame();
}

// ---------------------------------------------------------------- pointer
let down = null, moveQueued = false, lastMove = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), btn: e.button }; tween = null; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); const dt = performance.now() - down.t;
  if (down.btn === 0 && moved < 5 && dt < 500) { const b = pick(e.clientX, e.clientY); if (b) select(b); else if (S.selected) select(null); }
  down = null;
});
canvas.addEventListener('pointermove', (e) => {
  tipPos = { x: e.clientX - canvas.getBoundingClientRect().left, y: e.clientY - canvas.getBoundingClientRect().top }; placeTip();
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
  lastMove = e;
  if (!moveQueued) { moveQueued = true; setTimeout(() => { moveQueued = false; if (lastMove && !down) { const b = pick(lastMove.clientX, lastMove.clientY); hover(b); canvas.style.cursor = b ? 'pointer' : 'grab'; } }, 40); }
});
canvas.addEventListener('pointerleave', () => hover(null));
controls.addEventListener('start', () => { tween = null; canvas.style.cursor = 'grabbing'; });
controls.addEventListener('end', () => { canvas.style.cursor = 'grab'; });
controls.addEventListener('change', invalidate);

// ---------------------------------------------------------------- toolbar
function bindUI() {
  $$('.views button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  const tog = (id, key, after) => { const b = $(id); b.addEventListener('click', () => { S[key] = !S[key]; b.setAttribute('aria-pressed', String(S[key])); after && after(); applyStates(); invalidate(); }); b.setAttribute('aria-pressed', String(S[key])); };
  $('#t-bones').addEventListener('click', () => setBoneMode({ solid: 'ghost', ghost: 'hidden', hidden: 'solid' }[S.boneMode]));
  buildSystemsUI();
  tog('#t-labels', 'labels'); tog('#t-cart', 'cartilage'); tog('#t-teeth', 'teeth'); tog('#t-dim', 'dim'); tog('#t-rot', 'autorotate');
  let baseDist = null;
  $('#explode').addEventListener('input', (e) => {
    const v = +e.target.value / 100; setExplode(v); $('#exv').textContent = e.target.value + '%';
    if (!S.selected && !tween) {
      const off = camera.position.clone().sub(controls.target);
      if (baseDist === null || v === 0) baseDist = off.length() / (1 + 0.6 * (S.lastExplode || 0));
      camera.position.copy(controls.target).add(off.normalize().multiplyScalar(baseDist * (1 + 0.6 * v)));
      S.lastExplode = v; if (v === 0) baseDist = null;
    }
  });
  $('#reset').addEventListener('click', () => { select(null); S.isolate = false; S.boneMode = 'solid'; setBoneMode('solid'); for (const st of sysBuilt.values()) st.on = false; syncSysUI(); S.hiddenRegions.clear(); $$('.reg').forEach((s) => { s.classList.remove('off'); $('.eye', s).setAttribute('aria-pressed', 'true'); }); $('#explode').value = 0; $('#exv').textContent = '0%'; setExplode(0); setView('front'); });
  $('#q').addEventListener('input', (e) => runSearch(e.target.value));
  $('#openleft').addEventListener('click', () => $('#left').classList.toggle('open'));
  $('#closeright').addEventListener('click', () => select(null));
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === 'ArrowRight') { step(1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
    else if (e.key === 'Escape') select(null);
    else if (e.key === 'f' && S.selected) focusBone(S.selected);
    else if (e.key === 'l') $('#t-labels').click();
    else if (e.key === '/') { $('#q').focus(); e.preventDefault(); }
  });
  addEventListener('resize', resize);
}

// ---------------------------------------------------------------- body systems (built on first use)
const paintFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 24)));
function selectOrgan(o, opts = {}) {
  S.selected = null; S.selOrgan = o || null; S.hovered = null; S.hoverOrgan = null;
  applyStates(); renderDetails();
  if (o && opts.focus !== false) focusBone(o);
  $('#right').classList.toggle('open', !!o);
  syncSysUI();
}
function renderOrganDetails(root) {
  const o = S.selOrgan, i = o.info, sy = SYSTEMS.find((q) => q.id === o.system);
  root.innerHTML = `
    <div class="hd">
      <div class="crumb"><span class="sw" style="background:${sy.hex}"></span>${sy.name} <i>/</i> Soft tissue</div>
      <h2>${i.name}</h2>
      <div class="lat"><em>${i.latin || ''}</em></div>
    </div>
    <section class="size"><h3>Size <span class="muted">typical adult</span></h3>
      <dl>${(i.size || []).map((r) => `<dt>${r.k}</dt><dd>${r.v}</dd>`).join('')}</dl></section>
    <section><h3>Function</h3><p>${i.fn || ''}</p></section>
    ${i.fact ? `<section class="fact"><h3>Good to know</h3><p>${i.fact}</p></section>` : ''}
    <section class="loc"><div class="btns"><button id="ofocus">Zoom to it</button><button id="oiso" aria-pressed="${S.isolate}">Isolate</button><button id="ohide">Hide it</button></div>
      <p class="muted" style="margin-top:10px">Soft-tissue shapes are stylised models placed against the skeleton, not scans. Sizes are typical adult values.</p></section>`;
  $('#ofocus', root).onclick = () => focusBone(o);
  $('#oiso', root).onclick = () => { S.isolate = !S.isolate; applyStates(); renderDetails(); };
  $('#ohide', root).onclick = () => { o.on = false; selectOrgan(null); renderDetails(); syncSysUI(); applyStates(); };
  root.scrollTop = 0;
}
function setBoneMode(m) {
  S.boneMode = m;
  const b = $('#t-bones'); if (b) { b.textContent = 'Bones: ' + { solid: 'Solid', ghost: 'Ghost', hidden: 'Off' }[m]; b.setAttribute('aria-pressed', String(m !== 'solid')); }
  applyStates(); invalidate();
}
function addOrganMeshes(items) {
  for (const it of items) {
    const mesh = new THREE.Mesh(geometryFrom(it.mesh), ORG.base);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.visible = false;
    world.add(mesh);
    const o = { ...it, mesh, on: true, isOrgan: true, state: 'base', region: 'Systems', sub: it.system };
    organs.push(o);
    const id = bones.length + organs.length;
    o.idMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    o.idMat.color.setRGB((id & 255) / 255, ((id >> 8) & 255) / 255, 0, THREE.LinearSRGBColorSpace);
    it.organ = o;
  }
}
async function toggleSystem(id) {
  let st = sysBuilt.get(id);
  const row = $(`.sysrow[data-sys="${id}"]`);
  if (!st) {
    row.classList.add('busy'); await paintFrame();
    const t0 = performance.now();
    const items = buildSystem(id, { pos: (bid) => byId.get(bid).mesh.geometry.attributes.position.array });
    addOrganMeshes(items);
    st = { items, on: true }; sysBuilt.set(id, st);
    console.log(`built system ${id}: ${items.length} parts, ${Math.round(performance.now() - t0)} ms`);
    if (S.boneMode === 'solid') setBoneMode('ghost');
    row.classList.remove('busy');
    fillSysItems(id);
    row.classList.add('open');
  } else st.on = !st.on;
  syncSysUI(); applyStates(); invalidateShadow();
}
function fillSysItems(id) {
  const st = sysBuilt.get(id), box = $(`.sysrow[data-sys="${id}"] .sysitems`);
  box.innerHTML = '';
  for (const it of st.items) {
    const o = it.organ, d = el('div', 'sysit');
    d.innerHTML = `<button class="nm">${o.info.name}</button><button class="e" title="Show or hide">◉</button>`;
    $('.nm', d).addEventListener('click', () => { o.on = true; if (!st.on) { st.on = true; } selectOrgan(o); });
    $('.e', d).addEventListener('click', () => { o.on = !o.on; if (S.selOrgan === o && !o.on) selectOrgan(null); syncSysUI(); applyStates(); });
    d.dataset.key = o.id; box.appendChild(d); o.row = d;
  }
}
function syncSysUI() {
  for (const sy of SYSTEMS) {
    const row = $(`.sysrow[data-sys="${sy.id}"]`); if (!row) continue;
    const st = sysBuilt.get(sy.id);
    $('.systog', row).setAttribute('aria-pressed', String(!!(st && st.on)));
    if (st) for (const it of st.items) { const o = it.organ; o.row.classList.toggle('off', !o.on); o.row.classList.toggle('sel', S.selOrgan === o); $('.e', o.row).textContent = o.on ? '◉' : '○'; }
  }
}
function buildSystemsUI() {
  const box = $('#sys'); if (!box) return;
  box.innerHTML = '<div class="sysh"><span>Body systems</span><em>built when first opened</em></div>';
  for (const sy of SYSTEMS) {
    const row = el('div', 'sysrow'); row.dataset.sys = sy.id;
    row.innerHTML = `<button class="systog" aria-pressed="false" ${sy.soon ? 'disabled' : ''} title="${sy.blurb}"><span class="sw" style="background:${sy.hex}"></span><span class="rn">${sy.name}</span><span class="rc">${sy.soon ? 'soon' : ''}</span></button><button class="sysexp" aria-label="List parts" ${sy.soon ? 'disabled' : ''}>▾</button><div class="sysitems"></div>`;
    if (!sy.soon) {
      $('.systog', row).addEventListener('click', () => toggleSystem(sy.id));
      $('.sysexp', row).addEventListener('click', () => { if (sysBuilt.has(sy.id)) row.classList.toggle('open'); else toggleSystem(sy.id); });
    }
    box.appendChild(row);
  }
}

// ---------------------------------------------------------------- boot
async function boot() {
  resize();
  const BODY = new THREE.Vector3(0, 90, 0);
  controls.target.copy(BODY); camera.position.set(0, 96, 330); controls.update();
  await buildAll();
  setupPicking(); computeExplode(); buildList(); buildLabels(); bindUI(); renderDetails();
  S.hovered = null; applyStates();
  bones.forEach((b) => { b.mesh.userData.cast = true; });
  loadEl.classList.add('done'); setTimeout(() => loadEl.remove(), 700);
  setView('front');
  const h = location.hash.slice(1);
  if (h && byId.has(h)) setTimeout(() => select(byId.get(h)), 900);
  requestAnimationFrame(loop);
  window.__app = { pick, select, byId, bones, S, setView, setExplode, focusBone, camera, controls, scene, renderer };
}
boot();
